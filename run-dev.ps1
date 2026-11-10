# Expenso manager module - local development
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$apiProject = Join-Path $backend "ExpenseReimbursement.API"

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw ".NET 10 SDK is required." }
if (-not (dotnet --list-sdks | Select-String "^10\.")) { throw ".NET 10 SDK is required." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "Node.js/npm is required." }

function Test-Endpoint([string]$url) {
    for ($attempt = 0; $attempt -lt 5; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) { return $true }
        } catch {
            # The server may have opened its port before its HTTP endpoint is ready.
        }
        if ($attempt -lt 4) { Start-Sleep -Milliseconds 500 }
    }
    return $false
}

function Test-ListeningPort([int]$port) {
    return $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

$apiUrl = "http://localhost:5180/swagger/index.html"
$frontendUrl = "http://localhost:4200/"
$apiListening = Test-ListeningPort 5180
$frontendListening = Test-ListeningPort 4200
$apiRunning = $apiListening -and (Test-Endpoint $apiUrl)
$frontendRunning = $frontendListening -and (Test-Endpoint $frontendUrl)

if ($apiListening -and -not $apiRunning) {
    throw "Port 5180 is already in use, but the Expenso API did not respond. Close the process using that port and rerun this script."
}
if ($frontendListening -and -not $frontendRunning) {
    throw "Port 4200 is already in use, but the Angular app did not respond. Close the process using that port and rerun this script."
}

if ($apiRunning) {
    Write-Host "Expenso API is already running; reusing http://localhost:5180/swagger" -ForegroundColor Green
} else {
    $secrets = dotnet user-secrets list --project $apiProject 2>$null
    if (-not ($secrets -match "Jwt:SigningKey") -or -not ($secrets -match "Seed:DefaultPassword\s*=\s*Password@123") -or -not ($secrets -match "Data Source=expenso.db")) {
        & (Join-Path $backend "setup-dev-secrets.ps1")
    }

    Push-Location $backend
    try { dotnet build ExpenseReimbursement.slnx --nologo -v quiet; if ($LASTEXITCODE -ne 0) { throw "Backend build failed." } }
    finally { Pop-Location }
}

if (-not $frontendRunning -and -not (Test-Path (Join-Path $frontend "node_modules"))) {
    Push-Location $frontend
    try { npm install } finally { Pop-Location }
}

if (-not $apiRunning) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; dotnet run --project ExpenseReimbursement.API --launch-profile http"
} else {
    Write-Host "Skipping duplicate API process."
}

if (-not $frontendRunning) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm start"
} else {
    Write-Host "Angular app is already running; reusing http://localhost:4200" -ForegroundColor Green
}

Write-Host "API: http://localhost:5180/swagger"
Write-Host "Manager app: http://localhost:4200"

