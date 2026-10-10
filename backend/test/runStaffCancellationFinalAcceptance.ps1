param([string]$ChromePath, [string]$BackendImage = 'fitm-intern-backend')
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskRunId = [Guid]::NewGuid().ToString('N')
$taskEvidence = Join-Path $taskRoot "logs/staff-cancellation-final-$taskRunId"
New-Item -ItemType Directory -Path $taskEvidence | Out-Null
$taskSummaryPath = Join-Path $taskEvidence 'final-summary.json'
$taskStageNames = @('preflight', 'cancellation', 'documents', 'focused-sql', 'backend-full', 'frontend-regression', 'frontend-build', 'evidence-validation', 'cleanup-verification')
$taskStages = @($taskStageNames | ForEach-Object { @{ id = $_; status = 'BLOCKED'; exitCode = $null; reason = 'A preceding stage has not passed'; log = "$_/suite.log" } })
$taskSummary = @{ runId = $taskRunId; status = 'IMPLEMENTED / NEEDS VERIFICATION'; startedAt = [DateTime]::UtcNow.ToString('o'); stages = $taskStages; artifactRoot = $taskEvidence }
$taskExitCode = 1
function Save-AcceptanceSummary {
    $taskSummary | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $taskSummaryPath -Encoding UTF8
}
function Invoke-AcceptanceStage {
    param([string]$Stage, [string]$Executable, [string[]]$CommandArguments)
    $taskEntry = $taskStages | Where-Object { $_.id -eq $Stage } | Select-Object -First 1
    $taskEntry.status = 'RUNNING'; $taskEntry.reason = ''; $taskEntry.startedAt = [DateTime]::UtcNow.ToString('o')
    $taskLog = Join-Path $taskEvidence $taskEntry.log
    New-Item -ItemType Directory -Path (Split-Path -Parent $taskLog) -Force | Out-Null
    Save-AcceptanceSummary
    Write-Output "RUN $Stage - $taskLog"
    try {
        $taskCommandPath = Join-Path (Split-Path -Parent $taskLog) 'process-command.json'
        $taskResultPath = Join-Path (Split-Path -Parent $taskLog) 'process-result.json'
        # Only test commands/paths are supplied here; child runners generate their
        # credentials internally. Do not pass credentials/JWT through this descriptor.
        @{ executable = $Executable; args = @($CommandArguments); cwd = $taskRoot; logPath = $taskLog; resultPath = $taskResultPath } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskCommandPath -Encoding UTF8
        & node (Join-Path $PSScriptRoot '../scripts/staffAcceptanceProcess.js') $taskCommandPath > (Join-Path (Split-Path -Parent $taskLog) 'process-controller.log')
        if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $taskResultPath)) { throw 'Stage process controller failed' }
        $taskProcessResult = Get-Content -Raw -LiteralPath $taskResultPath | ConvertFrom-Json
        $taskEntry.exitCode = $taskProcessResult.exitCode
        $taskEntry.reason = if ($taskProcessResult.launchError) { 'Process launch failed' } elseif ($taskProcessResult.terminated) { 'Process was terminated' } elseif ($taskEntry.exitCode -ne 0) { 'Native suite returned a nonzero exit; inspect suite.log' } else { '' }
        $taskEntry.status = if ($taskEntry.exitCode -eq 0) { 'PASS' } else { 'FAIL' }
    } catch {
        # Do not serialize command arguments, environment, credentials or raw exceptions.
        $taskEntry.exitCode = 1; $taskEntry.status = 'FAIL'
        $taskEntry.reason = 'Stage process controller could not complete'
        'Stage process controller could not complete; inspect process-controller.log.' | Add-Content -LiteralPath $taskLog
    }
    $taskEntry.finishedAt = [DateTime]::UtcNow.ToString('o')
    Save-AcceptanceSummary
    Write-Output "$Stage $($taskEntry.status), exit $($taskEntry.exitCode)"
    if ($taskEntry.status -ne 'PASS') { throw "Blocking failure in $Stage; remaining dependent suites are BLOCKED" }
}
Save-AcceptanceSummary
Push-Location $taskRoot
try {
    if (!$ChromePath) {
        $ChromePath = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    }
    # Child runners own their resources and always perform guarded cleanup before returning.
    $taskBrowserArguments = @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'runStaffBrowserAcceptance.ps1'))
    if ($ChromePath) { $taskBrowserArguments += @('-ChromePath', $ChromePath) }
    Invoke-AcceptanceStage 'preflight' 'powershell.exe' ($taskBrowserArguments + @('-CheckEnvironment', '-BackendImageCheck', $BackendImage))
    Invoke-AcceptanceStage 'cancellation' 'powershell.exe' ($taskBrowserArguments + @('-Cancellation', '-FinalAcceptanceRunId', $taskRunId))
    Invoke-AcceptanceStage 'documents' 'powershell.exe' ($taskBrowserArguments + @('-FinalAcceptanceRunId', $taskRunId))
    $taskDatabaseArguments = @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'runTeacherAdvisorAcceptance.ps1'), '-BackendImage', $BackendImage, '-FastExit', '-FinalAcceptanceRunId', $taskRunId)
    # A single focused file covers cancellation, owner readback, audits, concurrency and approval.
    Invoke-AcceptanceStage 'focused-sql' 'powershell.exe' ($taskDatabaseArguments + @('-BackendOnly', '-FocusedBackendTests', 'roleWorkflow.database.test.js', '-AcceptanceSuite', 'focused-sql'))
    Invoke-AcceptanceStage 'backend-full' 'powershell.exe' ($taskDatabaseArguments + @('-BackendOnly', '-FullBackend', '-AcceptanceSuite', 'backend-full'))
    Invoke-AcceptanceStage 'frontend-regression' 'powershell.exe' ($taskDatabaseArguments + @('-FrontendOnly', '-AcceptanceSuite', 'frontend-regression'))
    Invoke-AcceptanceStage 'frontend-build' 'cmd.exe' @('/d', '/s', '/c', 'npm.cmd --prefix frontend run build -- --configLoader native')
    Invoke-AcceptanceStage 'evidence-validation' 'node' @('backend/scripts/staffCancellationFinalEvidence.js', 'evidence', $taskEvidence)
    $taskExitCode = 0
} catch {
    Write-Output 'Final acceptance stopped. Inspect the failed suite log; unexecuted dependent suites remain BLOCKED.'
    $taskExitCode = 1
} finally {
    # This check is independent of suite success and does not delete any resource.
    try { Invoke-AcceptanceStage 'cleanup-verification' 'node' @('backend/scripts/staffCancellationFinalEvidence.js', 'cleanup', $taskEvidence) }
    catch { $taskExitCode = 1 }
    if ($taskExitCode -eq 0) { $taskSummary.status = 'VERIFIED' }
    $taskSummary.finishedAt = [DateTime]::UtcNow.ToString('o')
    $taskSummary.exitCode = $taskExitCode
    $taskCountsPath = Join-Path $taskEvidence 'test-counts.json'
    if (Test-Path -LiteralPath $taskCountsPath) { $taskSummary.testCounts = Get-Content -Raw -LiteralPath $taskCountsPath | ConvertFrom-Json }
    $taskSummary.counts = @{}
    foreach ($taskStatus in @('PASS', 'FAIL', 'SKIP', 'BLOCKED')) { $taskSummary.counts[$taskStatus] = @($taskStages | Where-Object { $_.status -eq $taskStatus }).Count }
    Save-AcceptanceSummary
    Pop-Location
    Write-Output "$($taskSummary.status): $($taskSummary.counts.PASS) PASS / $($taskSummary.counts.FAIL) FAIL / $($taskSummary.counts.SKIP) SKIP / $($taskSummary.counts.BLOCKED) BLOCKED"
    Write-Output "Evidence: $taskEvidence"
    Write-Output "Final summary: $taskSummaryPath"
    if ($taskSummary.testCounts) { Write-Output 'Test counts and explicitly skipped optional tests: see test-counts.json / final-summary.json' }
}
exit $taskExitCode
