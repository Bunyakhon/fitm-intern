param([string]$BackendImage = 'fitm-intern-backend', [switch]$FullBackend, [switch]$FrontendOnly, [switch]$BackendOnly, [string[]]$FocusedBackendTests, [switch]$FastExit, [ValidatePattern('^[a-f0-9]{32}$')][string]$FinalAcceptanceRunId, [ValidateSet('focused-sql', 'backend-full', 'frontend-regression')][string]$AcceptanceSuite)
$ErrorActionPreference = 'Stop'
$taskRunId = [Guid]::NewGuid().ToString('N')
$taskNetwork = "fitm-teacher-test-$taskRunId"
$taskPostgres = "fitm-teacher-postgres-$taskRunId"
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$networkCreated = $false
$containerCreated = $false
$taskExitCode = 0
$taskCleanupErrors = @()
$taskRunner = "fitm-teacher-runner-$taskRunId"
function Invoke-TeacherTestDocker {
    param([string[]]$DockerArguments)
    & docker @DockerArguments
    if ($LASTEXITCODE -ne 0) { throw 'Isolated Teacher advisor verification failed' }
}
try {
    if ($FinalAcceptanceRunId -and !$AcceptanceSuite) { throw 'Final acceptance suite identity is required' }
    $networkCreated = $true
    Invoke-TeacherTestDocker @('network', 'create', '--internal', '--label', "fitm.test-run=$taskRunId", $taskNetwork)
    $containerCreated = $true
    Invoke-TeacherTestDocker @('run', '-d', '--name', $taskPostgres, '--label', "fitm.test-run=$taskRunId", '--network', $taskNetwork, '--network-alias', 'teacher-test-postgres', '--network-alias', 'a013-postgres', '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=fitm_advisor_test', 'postgres:16-alpine', '-c', 'fitm.a013_disposable=on', '-c', 'fitm.a014_disposable=on', '-c', 'fitm.a015_disposable=on', '-c', 'fitm.a018_disposable=on', '-c', 'fitm.a019_disposable=on', '-c', 'fitm.a020_disposable=on', '-c', 'fitm.a021_disposable=on')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        & docker exec $taskPostgres pg_isready -h 127.0.0.1 -U postgres -d fitm_advisor_test *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 1
    }
    if ($LASTEXITCODE -ne 0) { throw 'Disposable PostgreSQL did not become ready' }
    foreach ($database in @('fitm_role_test', 'fitm_project_test', 'fitm_evaluation_test', 'fitm_documents_test', 'fitm_migration_test', 'fitm_recruitment_test', 'fitm_legacy_recruitment_test', 'fitm_logs_test', 'fitm_supervision_test', 'fitm_supervision_results_test', 'fitm_activities_test')) {
        Invoke-TeacherTestDocker @('exec', $taskPostgres, 'createdb', '-h', '127.0.0.1', '-U', 'postgres', $database)
    }
    $runner = @('run', '--rm', '--network', $taskNetwork, '--mount', "type=bind,source=$taskRoot,target=/workspace,readonly", '-w', '/workspace/backend', '-e', 'NODE_PATH=/app/node_modules', '-e', 'DB_HOST=teacher-test-postgres', '-e', 'DB_PORT=5432', '-e', 'DB_NAME=fitm_role_test', '-e', 'DB_USER=postgres', '-e', 'DB_PASSWORD=unused-test-only', '-e', 'JWT_SECRET=isolated-teacher-test-key', '-e', 'FRONTEND_URL=http://localhost:5173', '-e', 'ROLE_BACKEND_INTEGRATION_TEST=true', '-e', 'ROLE_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_role_test', '-e', 'COOP_ADVISOR_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_advisor_test', '-e', 'COOP_PROJECT_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_project_test', '-e', 'COOP_UI_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_role_test')
    # Sequential files prevent tests sharing a disposable DB from racing DDL.
    $runner += @('--name', $taskRunner, '--label', "fitm.test-run=$taskRunId")
    $runner += @('-e', 'STAFF_DOCUMENTS_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_documents_test')
    $runner += @('-e', 'INTERNSHIP_LOG_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_logs_test')
    $runner += @('-e', 'SUPERVISION_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_supervision_test')
    $runner += @('-e', 'SUPERVISION_RESULTS_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_supervision_results_test')
    $runner += @('-e', 'COOP_ACTIVITIES_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_activities_test')
    $backendTests = @('test/coopProjectAdvisor.database.test.js', 'test/coopProjectAdvisorMigration.test.js', 'test/devTeacherCredential.database.test.js', 'test/studentCoopProject.database.test.js', 'test/coopProjectMigration.test.js', 'test/roleWorkflow.database.test.js', 'test/roleAuth.test.js', 'test/staffAuth.test.js', 'test/staffDocuments.database.test.js', 'test/studentAdvisor.test.js', 'test/coopPrerequisites.test.js', 'test/coopDirectWorkflow.test.js')
    if ($FullBackend) {
        $runner += @('-e', 'DB_NAME=fitm_legacy_recruitment_test', '-e', 'TURNSTILE_SECRET_KEY=mock-provider-only', '-e', 'RECRUITMENT_INTEGRATION_TEST=true', '-e', 'STUDENT_FILE_MIGRATION_TEST=true', '-e', 'COOP_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_role_test', '-e', 'COMPANY_EVALUATION_DISPOSABLE_DATABASE_URL=postgres://postgres@teacher-test-postgres/fitm_evaluation_test')
        if (!$FrontendOnly) { Invoke-TeacherTestDocker ($runner + @($BackendImage, 'node', 'src/db/migrate.js', 'up')) }
        $backendTests = Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.test.js' | ForEach-Object { "test/$($_.Name)" }
    }
    if ($FocusedBackendTests) {
        $backendTests = foreach ($focusedTest in $FocusedBackendTests) {
            if ($focusedTest -notmatch '^[A-Za-z0-9_.-]+\.test\.js$' -or !(Test-Path -LiteralPath (Join-Path $PSScriptRoot $focusedTest))) { throw 'Invalid focused backend test file' }
            "test/$focusedTest"
        }
    }
    # Optional on Node versions supporting --test-force-exit: all tests and
    # awaited cleanup finish before exit; avoid waiting for idle client pools.
    $taskNodeExit = if ($FastExit) { @('--test-force-exit') } else { @() }
    if (!$FrontendOnly) { Invoke-TeacherTestDocker ($runner + @($BackendImage, 'node', '--test', '--test-reporter=tap', '--test-concurrency=1') + $taskNodeExit + $backendTests) }
    $frontendTests = Get-ChildItem -LiteralPath (Join-Path $taskRoot 'frontend/test') -Filter '*.test.js' | ForEach-Object { "/workspace/frontend/test/$($_.Name)" }
    if (!$BackendOnly) { Invoke-TeacherTestDocker ($runner + @($BackendImage, 'node', '--test', '--test-reporter=tap', '--test-concurrency=1') + $taskNodeExit + $frontendTests) }
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    $taskExitCode = 1
} finally {
    # Exact names AND owner labels; verify absence, including partial creation.
    if ($containerCreated) {
        foreach ($taskContainer in @($taskRunner, $taskPostgres)) {
            try {
                $taskPresent = & docker ps -a --filter "name=^/$taskContainer`$" --format '{{.Names}}'
                if ($LASTEXITCODE -ne 0) { throw 'Could not enumerate owned container' }
                if ($taskPresent -contains $taskContainer) {
                    $labels = & docker inspect --format '{{json .Config.Labels}}' $taskContainer | ConvertFrom-Json
                    if ($LASTEXITCODE -ne 0 -or $labels.'fitm.test-run' -ne $taskRunId) { throw 'Container ownership check failed' }
                    Invoke-TeacherTestDocker @('rm', '-f', $taskContainer)
                }
                $taskPresent = & docker ps -a --filter "name=^/$taskContainer`$" --format '{{.Names}}'
                if ($LASTEXITCODE -ne 0 -or $taskPresent -contains $taskContainer) { throw 'Owned container remains' }
            } catch { $taskCleanupErrors += 'Owned container cleanup could not be verified'; $taskExitCode = 1 }
        }
    }
    if ($networkCreated) {
        try {
            $taskPresent = & docker network ls --filter "name=^$taskNetwork`$" --format '{{.Name}}'
            if ($LASTEXITCODE -ne 0) { throw 'Could not enumerate owned network' }
            if ($taskPresent -contains $taskNetwork) {
                $labels = & docker network inspect --format '{{json .Labels}}' $taskNetwork | ConvertFrom-Json
                if ($LASTEXITCODE -ne 0 -or $labels.'fitm.test-run' -ne $taskRunId) { throw 'Network ownership check failed' }
                Invoke-TeacherTestDocker @('network', 'rm', $taskNetwork)
            }
            $taskPresent = & docker network ls --filter "name=^$taskNetwork`$" --format '{{.Name}}'
            if ($LASTEXITCODE -ne 0 -or $taskPresent -contains $taskNetwork) { throw 'Owned network remains' }
        } catch { $taskCleanupErrors += 'Owned network cleanup could not be verified'; $taskExitCode = 1 }
    }
    if ($FinalAcceptanceRunId -and $AcceptanceSuite) {
        $taskEvidence = Join-Path $taskRoot "logs/staff-cancellation-final-$FinalAcceptanceRunId/$AcceptanceSuite"
        New-Item -ItemType Directory -Path $taskEvidence -Force | Out-Null
        @{ runId = $taskRunId; finalRunId = $FinalAcceptanceRunId; containers = @($taskRunner, $taskPostgres); network = $taskNetwork; attempted = $networkCreated; status = $(if ($taskCleanupErrors.Count) { 'FAIL' } else { 'PASS' }); cleanupErrors = @($taskCleanupErrors) } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskEvidence 'resource-cleanup.json') -Encoding UTF8
    }
    Write-Output "PostgreSQL owned-container/network cleanup: $(if ($taskCleanupErrors.Count) { 'FAIL' } else { 'PASS' })"
}
exit $taskExitCode
