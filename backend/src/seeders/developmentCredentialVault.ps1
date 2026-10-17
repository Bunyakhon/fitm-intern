param([ValidateSet('Protect','Read')][string]$Mode, [string]$Payload, [switch]$InternalPipeline)
$ErrorActionPreference = 'Stop'
$vaultRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\.local-dev-accounts'))
$vaultFile = Join-Path $vaultRoot 'intern-system-development.bin'
try {
  if (!$InternalPipeline) { throw 'Internal private pipeline required' }
  Add-Type -AssemblyName System.Security
  $entropy = [Text.Encoding]::UTF8.GetBytes('FITM-INTERN DEVELOPMENT ACCOUNT VAULT V1')
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $system = New-Object Security.Principal.SecurityIdentifier('S-1-5-18')
  if ($Mode -eq 'Protect') {
    if (Test-Path -LiteralPath $vaultFile) { throw 'Vault already exists' }
    if (!(Test-Path -LiteralPath $vaultRoot)) { [void][IO.Directory]::CreateDirectory($vaultRoot) }
    if ((Get-Item -LiteralPath $vaultRoot -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse point rejected' }
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true,$false)
    $acl.SetOwner($identity)
    foreach ($sid in @($identity,$system)) {
      $rule = New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
      [void]$acl.AddAccessRule($rule)
    }
    $tightened=$true
    try { Set-Acl -LiteralPath $vaultRoot -AclObject $acl }
    catch [UnauthorizedAccessException] { $tightened=$false }
    if (!$Payload) { throw 'Private payload required' }
    $plain = [Text.Encoding]::UTF8.GetBytes($Payload)
    $encrypted = [Security.Cryptography.ProtectedData]::Protect($plain,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $stream = New-Object IO.FileStream($vaultFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try { $stream.Write($encrypted,0,$encrypted.Length);$stream.Flush($true) } finally { $stream.Dispose() }
    [Array]::Clear($plain,0,$plain.Length)
    Write-Output $(if($tightened){'PROTECTED_DPAPI_PRIVATE_ACL'}else{'PROTECTED_DPAPI_INHERITED_ACL'})
  } else {
    if ((Get-Item -LiteralPath $vaultFile -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse point rejected' }
    $plain = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($vaultFile),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    Write-Output ([Text.Encoding]::UTF8.GetString($plain))
    [Array]::Clear($plain,0,$plain.Length)
  }
} catch { [Console]::Error.Write(('PRIVATE_VAULT_OPERATION_FAILED '+$_.Exception.GetType().Name+' line '+$_.InvocationInfo.ScriptLineNumber));exit 1 }
