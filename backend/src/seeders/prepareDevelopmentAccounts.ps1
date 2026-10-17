param([switch]$Apply,[switch]$Verify,[switch]$Fixtures,[switch]$VerifyDatabase,[switch]$PdfTest,[switch]$ShowCredentials,[ValidateSet('intern_system')][string]$Confirm)
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$runner=Join-Path $PSScriptRoot 'prepareDevelopmentAccounts.js'
$helper=Join-Path $PSScriptRoot 'developmentCredentialVault.ps1'
$vaultFile=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\.local-dev-accounts\intern-system-development.bin'))
if ($ShowCredentials) {
  # Explicit local-user action only. No clipboard, console plaintext, browser, or credential export.
  $privateJson=& $helper -Mode Read -InternalPipeline
  $accounts=($privateJson | ConvertFrom-Json).accounts
  Add-Type -AssemblyName System.Windows.Forms
  $form=New-Object Windows.Forms.Form
  $form.Text='FITM-INTERN Development credentials';$form.Width=540;$form.Height=235;$form.StartPosition='CenterScreen'
  $select=New-Object Windows.Forms.ComboBox
  $select.Left=18;$select.Top=20;$select.Width=480;$select.DropDownStyle='DropDownList';$select.DisplayMember='email'
  foreach($account in $accounts){[void]$select.Items.Add($account)}
  $passwordBox=New-Object Windows.Forms.TextBox
  $passwordBox.Left=18;$passwordBox.Top=68;$passwordBox.Width=480;$passwordBox.ReadOnly=$true;$passwordBox.UseSystemPasswordChar=$true
  $reveal=New-Object Windows.Forms.CheckBox
  $reveal.Left=18;$reveal.Top=108;$reveal.Width=480;$reveal.Text='Show selected Development password on this screen'
  $select.Add_SelectedIndexChanged({$passwordBox.UseSystemPasswordChar=$true;$reveal.Checked=$false;$passwordBox.Text=$select.SelectedItem.password})
  $reveal.Add_CheckedChanged({$passwordBox.UseSystemPasswordChar=!$reveal.Checked})
  $form.Controls.AddRange(@($select,$passwordBox,$reveal));$select.SelectedIndex=0
  try{[void]$form.ShowDialog()}finally{$passwordBox.Clear();$form.Dispose();$accounts=$null;$privateJson=$null}
  exit 0
}
if (!$Apply -and !$Verify -and !$Fixtures -and !$VerifyDatabase) { & node $runner;exit $LASTEXITCODE }
if ($Confirm -ne 'intern_system') { throw 'Explicit Development database confirmation required' }
$privateJson=$null
try {
  if (!(Test-Path -LiteralPath $vaultFile)) {
    if (!$Apply) { throw 'Private credential vault required' }
    $secure=Read-Host 'Teacher Development password (hidden)' -AsSecureString
    $bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
      $privateJson=$plain | & node $runner --prepare-vault
      if ($LASTEXITCODE -ne 0) { throw 'Private credential generation failed' }
    } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr);$plain=$null;$secure.Dispose() }
    $protection=& $helper -Mode Protect -Payload $privateJson -InternalPipeline
    if($protection -eq 'PROTECTED_DPAPI_INHERITED_ACL'){Write-Host 'Credential vault: DPAPI CurrentUser encryption; inherited ACL retained by sandbox.'}
    $verified=& $helper -Mode Read -InternalPipeline
    if ($verified -cne $privateJson) { throw 'Private vault verification failed' }
    $verified=$null
  } else { $privateJson=& $helper -Mode Read -InternalPipeline }
  $runnerArgs=@('--vault-stdin','--confirm=intern_system')
  if ($Apply) { $runnerArgs+='--apply' }
  if ($Verify) { $runnerArgs+='--verify' }
  if ($Fixtures) { $runnerArgs+='--fixtures' }
  if ($VerifyDatabase) { $runnerArgs+='--verify-database' }
  if ($PdfTest) { $runnerArgs+='--pdf-test' }
  $privateJson | & node $runner @runnerArgs
  $result=$LASTEXITCODE
} finally { $privateJson=$null }
exit $result
