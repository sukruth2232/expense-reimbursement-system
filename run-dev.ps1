# ---------------------------------------------------------------------------
# Expenso - start everything for local development (Windows PowerShell)
#
#   cd C:\Users\<you>\expense-reimbursement-system
#   powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
#
# What it does (each step is skipped when already done):
#   1. Checks .NET, Node and that PostgreSQL is listening on localhost:5432
#   2. Removes template files left over from "dotnet new" / "ng new"
#   3. Sets up user-secrets (asks for your PostgreSQL password the first time)
#   4. Installs the EF Core CLI and creates the first migration if missing
#   5. Builds the backend, installs npm packages
#   6. Opens two windows: the API (http://localhost:5180) and Angular (http://localhost:4200)
# ---------------------------------------------------------------------------
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$apiProject = Join-Path $backend "ExpenseReimbursement.API"

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "`nERROR: $text" -ForegroundColor Red; exit 1 }

# 1. Prerequisites ------------------------------------------------------------
Step "Checking prerequisites"
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { Fail ".NET SDK not found. Install the .NET 10 SDK." }
if (-not (dotnet --list-sdks | Select-String "^10\.")) { Fail ".NET 10 SDK not found (dotnet --list-sdks)." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "Node.js/npm not found. Install Node.js 22 or 24 LTS." }

$pg = New-Object System.Net.Sockets.TcpClient
try { $pg.Connect("localhost", 5432) } catch { }
if (-not $pg.Connected) {
    Fail "PostgreSQL is not running on localhost:5432. Install PostgreSQL (https://www.postgresql.org/download/windows/) or start its Windows service, then run this script again."
}
$pg.Close()
Write-Host ".NET, Node and PostgreSQL found."

# 2. Template leftovers ----------------------------------------------------------
Step "Removing scaffold leftovers (if any)"
@(
    "backend\ExpenseReimbursement.API\WeatherForecast.cs",
    "backend\ExpenseReimbursement.API\Controllers\WeatherForecastController.cs",
    "frontend\src\app\app.html",
    "frontend\src\app\app.scss",
    "frontend\src\app\app.spec.ts"
) | ForEach-Object {
    $file = Join-Path $root $_
    if (Test-Path $file) { Remove-Item $file; Write-Host "removed $_" }
}

# 3. Secrets ------------------------------------------------------------------
Step "Checking user-secrets"
$secrets = dotnet user-secrets list --project $apiProject 2>$null
if (-not ($secrets -match "ConnectionStrings:Default") -or -not ($secrets -match "Jwt:SigningKey")) {
    & (Join-Path $backend "setup-dev-secrets.ps1")
} else {
    Write-Host "Secrets already set."
}

# 4. EF Core CLI + first migration ---------------------------------------------
Step "Checking EF Core migrations"
if (-not (dotnet tool list --global | Select-String "dotnet-ef")) {
    dotnet tool install --global dotnet-ef --version "10.*"
    $env:PATH += ";$env:USERPROFILE\.dotnet\tools"
}
$migrations = Join-Path $backend "ExpenseReimbursement.Infrastructure\Data\Migrations"
Push-Location $backend
try {
    dotnet build ExpenseReimbursement.slnx --nologo -v quiet
    if ($LASTEXITCODE -ne 0) { Fail "Backend build failed (see errors above)." }

    if (-not (Test-Path $migrations)) {
        dotnet ef migrations add InitialCreate -p ExpenseReimbursement.Infrastructure -s ExpenseReimbursement.API -o Data/Migrations
        if ($LASTEXITCODE -ne 0) { Fail "Creating the migration failed (see errors above)." }
    } else {
        Write-Host "Migrations already exist."
    }
} finally { Pop-Location }

# 5. npm packages ----------------------------------------------------------------
Step "Checking npm packages"
if (-not (Test-Path (Join-Path $frontend "node_modules\@angular\material"))) {
    Push-Location $frontend
    try { npm install } finally { Pop-Location }
} else {
    Write-Host "node_modules already installed."
}

# 6. Start both apps ---------------------------------------------------------------
Step "Starting API and Angular in two new windows"
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle='Expenso API'; cd '$backend'; dotnet run --project ExpenseReimbursement.API --launch-profile http"
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle='Expenso Angular'; cd '$frontend'; npm start"

Write-Host ""
Write-Host "API:     http://localhost:5180/swagger" -ForegroundColor Green
Write-Host "App:     http://localhost:4200  (ready in ~20 seconds)" -ForegroundColor Green
Write-Host "Logins:  employee1@expenso.local / manager@expenso.local, password from setup (default Expenso@123)"
