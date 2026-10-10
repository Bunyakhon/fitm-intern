param([string]$ChromePath, [switch]$DailyLog, [switch]$Supervision, [switch]$SupervisionResults, [switch]$ActivityCalendar, [switch]$Cancellation, [switch]$CheckEnvironment, [ValidatePattern('^[a-f0-9]{32}$')][string]$FinalAcceptanceRunId, [string]$BackendImageCheck)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskRunId = [Guid]::NewGuid().ToString('N')
$taskPostgres = "fitm-staff-browser-$taskRunId"
$taskCreateAttempted = $false
$taskExitCode = 1
$taskPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$taskEnvNames = @('FITM_STAFF_BROWSER_DATABASE_URL', 'FITM_STAFF_BROWSER_CHROME', 'FITM_STAFF_BROWSER_RUN_ID', 'FITM_STAFF_CANCELLATION_BROWSER', 'FITM_DAILY_LOG_BROWSER', 'FITM_SUPERVISION_BROWSER', 'FITM_SUPERVISION_RESULTS_BROWSER', 'FITM_ACTIVITY_CALENDAR_BROWSER', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'NODE_ENV', 'JWT_SECRET')
$taskPrevious = @{}
$taskEnvNames += 'FITM_STAFF_FINAL_ACCEPTANCE_RUN_ID'
$taskCleanupErrors = @()
foreach ($taskName in $taskEnvNames) { $taskPrevious[$taskName] = [Environment]::GetEnvironmentVariable($taskName, 'Process') }
try {
    [Environment]::SetEnvironmentVariable('FITM_STAFF_FINAL_ACCEPTANCE_RUN_ID', $FinalAcceptanceRunId, 'Process')
    if ($Cancellation -and ($DailyLog -or $Supervision -or $SupervisionResults -or $ActivityCalendar)) { throw 'Cancellation must run separately from the other browser modes' }
    if (!$ChromePath) {
        $taskCandidates = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
        $ChromePath = $taskCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    }
    if (!$ChromePath) { throw 'Installed Chrome not found. Supply -ChromePath with the installed executable; no browser is installed automatically' }
    if (!(Test-Path -LiteralPath $ChromePath)) { throw 'Chrome executable unavailable' }
    $ChromePath = (Resolve-Path -LiteralPath $ChromePath).Path
    if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 24 or newer must be available on PATH' }
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker CLI must be available on PATH' }
    & node (Join-Path $PSScriptRoot '../scripts/staffBrowserEnvironment.js')
    if ($LASTEXITCODE -ne 0) { throw 'Node.js 24+ and existing backend/frontend node_modules are required. Install from the existing package files in your ordinary terminal' }
    & docker version --format '{{.Server.Version}}'
    if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is unavailable to this terminal. Use ordinary Windows CMD where Docker is permitted; do not change ACLs or sandbox policy' }
    & docker image inspect postgres:16-alpine --format '{{.Id}}'
    if ($LASTEXITCODE -ne 0) { throw 'Required cached postgres:16-alpine image is unavailable. Prepare the image in your ordinary terminal, then rerun' }
    if ($BackendImageCheck) {
        & docker image inspect $BackendImageCheck --format '{{.Id}}'
        if ($LASTEXITCODE -ne 0) { throw 'Required cached backend image is unavailable' }
    }
    Write-Output 'Preflight passed: Chrome, Node/dependencies, Docker and PostgreSQL image. API/Vite/CDP/database ports are allocated dynamically on loopback; no existing server is stopped.'
    if ($CheckEnvironment) { $taskExitCode = 0 }
    else {
    $taskCreateAttempted = $true
    & docker run -d --name $taskPostgres --label "fitm.test-run=$taskRunId" --tmpfs /var/lib/postgresql/data -p '127.0.0.1::5432' -e "POSTGRES_PASSWORD=$taskPassword" -e POSTGRES_DB=fitm_staff_browser_test postgres:16-alpine -c fitm.a017_disposable=on
    if ($LASTEXITCODE -ne 0) { throw 'Could not start isolated browser PostgreSQL' }
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        & docker exec $taskPostgres pg_isready -U postgres -d fitm_staff_browser_test *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 1
    }
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL readiness failed' }
    $taskPorts = & docker inspect --format '{{json .NetworkSettings.Ports}}' $taskPostgres | ConvertFrom-Json
    $taskPort = $taskPorts.'5432/tcp'[0].HostPort
    if ($LASTEXITCODE -ne 0 -or $taskPort -notmatch '^\d+$') { throw 'Could not resolve isolated PostgreSQL port' }
    $env:FITM_STAFF_BROWSER_DATABASE_URL = "postgres://postgres:${taskPassword}@127.0.0.1:${taskPort}/fitm_staff_browser_test"
    $env:FITM_STAFF_BROWSER_CHROME = $ChromePath
    $env:FITM_STAFF_BROWSER_RUN_ID = $taskRunId
    $env:FITM_STAFF_CANCELLATION_BROWSER = if ($Cancellation) { '1' } else { '0' }
    $env:FITM_DAILY_LOG_BROWSER = if ($DailyLog) { '1' } else { '0' }
    $env:FITM_SUPERVISION_BROWSER = if ($Supervision -or $SupervisionResults) { '1' } else { '0' }
    $env:FITM_SUPERVISION_RESULTS_BROWSER = if ($SupervisionResults) { '1' } else { '0' }
    $env:FITM_ACTIVITY_CALENDAR_BROWSER = if ($ActivityCalendar) { '1' } else { '0' }
    $env:DB_HOST = '127.0.0.1'; $env:DB_PORT = $taskPort; $env:DB_NAME = 'fitm_staff_browser_test'; $env:DB_USER = 'postgres'; $env:DB_PASSWORD = $taskPassword
    $env:NODE_ENV = 'test'; $env:JWT_SECRET = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    & node (Join-Path $PSScriptRoot '../scripts/runDisposableStaffBrowserAcceptance.js')
    if ($LASTEXITCODE -ne 0) { throw 'Real Staff browser acceptance failed; see test output' }
    $taskExitCode = 0
    }
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    $taskExitCode = 1
} finally {
    foreach ($taskName in $taskEnvNames) { [Environment]::SetEnvironmentVariable($taskName, $taskPrevious[$taskName], 'Process') }
    if ($taskCreateAttempted) {
        try {
            $taskOwnedContainers = & docker ps -a --filter "name=^/$taskPostgres`$" --format '{{.Names}}'
            if ($LASTEXITCODE -ne 0) { throw 'Could not verify owned disposable container during cleanup' }
            if ($taskOwnedContainers -contains $taskPostgres) {
                $taskLabels = & docker inspect --format '{{json .Config.Labels}}' $taskPostgres | ConvertFrom-Json
                if ($LASTEXITCODE -ne 0 -or $taskLabels.'fitm.test-run' -ne $taskRunId) { throw 'Cleanup refused: disposable container ownership could not be verified' }
                & docker rm -f $taskPostgres
                if ($LASTEXITCODE -ne 0) { throw 'Owned disposable PostgreSQL cleanup failed' }
            }
            $taskRemaining = & docker ps -a --filter "name=^/$taskPostgres`$" --format '{{.Names}}'
            if ($LASTEXITCODE -ne 0 -or $taskRemaining -contains $taskPostgres) { throw 'Owned disposable PostgreSQL remains after cleanup' }
        } catch { $taskCleanupErrors += 'Owned disposable PostgreSQL cleanup could not be verified'; Write-Error -Message $_.Exception.Message -ErrorAction Continue; $taskExitCode = 1 }
    }
    if ($FinalAcceptanceRunId -and !$CheckEnvironment) {
        $taskSuite = if ($Cancellation) { 'cancellation' } else { 'documents' }
        $taskEvidence = Join-Path $taskRoot "logs/staff-cancellation-final-$FinalAcceptanceRunId/$taskSuite"
        New-Item -ItemType Directory -Path $taskEvidence -Force | Out-Null
        @{ runId = $taskRunId; finalRunId = $FinalAcceptanceRunId; container = $taskPostgres; attempted = $taskCreateAttempted; status = $(if ($taskCleanupErrors.Count) { 'FAIL' } else { 'PASS' }); cleanupErrors = @($taskCleanupErrors) } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskEvidence 'resource-cleanup.json') -Encoding UTF8
    }
}
exit $taskExitCode
