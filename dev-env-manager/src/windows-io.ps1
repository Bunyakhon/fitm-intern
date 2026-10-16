param([ValidateSet('protectDirectory','inspect','copyAcl','replace')][string]$Operation)
$ErrorActionPreference = 'Stop'
try {
    $target = $env:FITM_DEV_IO_TARGET
    $source = $env:FITM_DEV_IO_SOURCE
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
    if ([string]::IsNullOrWhiteSpace($target)) { throw 'Missing path' }
    $item = Get-Item -LiteralPath $target -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse point rejected' }
    if ($Operation -eq 'protectDirectory') {
        if (-not $item.PSIsContainer) { throw 'Not a directory' }
        $acl = New-Object System.Security.AccessControl.DirectorySecurity
        $acl.SetOwner($sid)
        $acl.SetAccessRuleProtection($true, $false)
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($rule)
        Set-Acl -LiteralPath $target -AclObject $acl
    }
    if ($Operation -eq 'copyAcl') {
        Set-Acl -LiteralPath $target -AclObject (Get-Acl -LiteralPath $source)
    }
    if ($Operation -eq 'replace') {
        # Compare again in the native helper, immediately before atomic replace.
        $stream = [IO.File]::OpenRead($target)
        try {
            $sha = [Security.Cryptography.SHA256]::Create()
            $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
        } finally { $stream.Dispose() }
        if ($actual -ne $env:FITM_DEV_IO_EXPECTED) { throw 'Conflict' }
        # PowerShell 5.1 coerces $null to an empty string for this .NET overload.
        [IO.File]::Replace($source, $target, [System.Management.Automation.Language.NullString]::Value)
    }
    $acl = Get-Acl -LiteralPath $target
    $safe = $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -eq $sid.Value
    foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin @($sid.Value, 'S-1-5-18')) { $safe = $false }
    }
    @{ private = $safe; descriptor = $acl.Sddl } | ConvertTo-Json -Compress
} catch {
    # Never serialize exception paths, file contents or command diagnostics.
    [Console]::Error.WriteLine('Local file permission or atomic replacement check failed')
    exit 1
}
