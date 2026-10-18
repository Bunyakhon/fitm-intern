param([switch]$TeacherMembership)
# Backup and additive Development DDL only. No account/password provisioning.
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
try {
  $runner=Join-Path $PSScriptRoot 'prepareSuperAdminSchema.js'
  if($TeacherMembership){$runner=Join-Path $PSScriptRoot 'prepareTeacherAdminSchema.js'}
  $targetJson=& node $runner --preflight
  if($LASTEXITCODE -ne 0){throw 'Preflight blocked'}
  $target=$targetJson | ConvertFrom-Json
  $backupSystem=(& docker exec intern_postgres psql -X -U postgres -d intern_system -Atc 'SELECT system_identifier FROM pg_control_system()').Trim()
  if($LASTEXITCODE -ne 0 -or $backupSystem -cne $target.system_identifier){throw 'Backup target mismatch'}
  # The container-local temporary dump is removed by the shell trap. Its bytes
  # go only into captured memory, then DPAPI CurrentUser ciphertext on the host.
  $dumpCommand='set -eu; set -o pipefail; backup_file=$(mktemp /tmp/fitm-admin-backup.XXXXXX); trap ''rm -f "$backup_file"'' EXIT; pg_dump -U postgres -d intern_system -Fc -f "$backup_file"; pg_restore --list "$backup_file" >/dev/null; base64 "$backup_file"'
  $encoded=@(& docker exec intern_postgres sh -c $dumpCommand)
  if($LASTEXITCODE -ne 0 -or !$encoded.Count){throw 'Backup failed'}
  $plain=[Convert]::FromBase64String(($encoded -join ''))
  $encoded=$null
  if([Text.Encoding]::ASCII.GetString($plain,0,5) -cne 'PGDMP'){throw 'Invalid archive'}
  Add-Type -AssemblyName System.Security
  $entropy=[Text.Encoding]::UTF8.GetBytes('FITM-INTERN ADMIN DATABASE BACKUP V1')
  $cipher=[Security.Cryptography.ProtectedData]::Protect($plain,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../.local-dev-accounts/super-admin-backups'))
  [void][IO.Directory]::CreateDirectory($root)
  if((Get-Item -LiteralPath $root -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unsafe backup location'}
  $backupFile=Join-Path $root ((Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[Guid]::NewGuid().ToString('N')+'.dump.bin')
  $stream=[IO.File]::Open($backupFile,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($cipher,0,$cipher.Length);$stream.Flush($true)}finally{$stream.Dispose()}
  $restored=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($backupFile),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $sha=[Security.Cryptography.SHA256]::Create()
  try{$digest=([BitConverter]::ToString($sha.ComputeHash($plain))).Replace('-','').ToLowerInvariant();$verified=([BitConverter]::ToString($sha.ComputeHash($restored))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
  if($digest -cne $verified){throw 'Backup roundtrip failed'}
  Write-Output 'PASS: verified PostgreSQL custom archive + DPAPI CurrentUser backup; existing credentials not displayed'
  [Array]::Clear($plain,0,$plain.Length);[Array]::Clear($restored,0,$restored.Length)
  $proof=@{backup_file=$backupFile;plain_sha256=$digest;system_identifier=$target.system_identifier} | ConvertTo-Json -Compress
  $proof | & node $runner --apply-schema
  if($LASTEXITCODE -ne 0){throw 'Schema preparation blocked'}
} catch {
  Write-Output ('BLOCKED: backup/target/schema preflight; '+$_.Exception.GetType().Name)
  exit 1
} finally {
  if($plain){[Array]::Clear($plain,0,$plain.Length)}
  if($restored){[Array]::Clear($restored,0,$restored.Length)}
  $plain=$null;$restored=$null;$encoded=$null;$proof=$null
}
