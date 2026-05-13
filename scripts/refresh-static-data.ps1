param(
    [switch]$Replace,
    [switch]$SkipSync,
    [switch]$SkipValidation,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$Uv = Join-Path $Root ".tools\uv\uv.exe"
$Yarn = Join-Path $Root ".tools\corepack\v1\yarn\1.22.22\bin\yarn.cmd"

function Invoke-BackendPython {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    Push-Location $Backend
    try {
        if (Test-Path $VenvPython) {
            & $VenvPython @Arguments
        } elseif (Test-Path $Uv) {
            & $Uv run --with sqlalchemy --with aiosqlite --with python-dotenv python @Arguments
        } else {
            & python @Arguments
        }
    } finally {
        Pop-Location
    }
}

if (-not $SkipSync) {
    $syncArgs = @("sync_job.py")
    if ($Replace) {
        $syncArgs += "--replace"
    }
    Invoke-BackendPython $syncArgs
    Invoke-BackendPython @("sync_job.py", "--dedupe-only")
}

if (-not $SkipValidation) {
    Invoke-BackendPython @("validation_report.py")
}

Invoke-BackendPython @("export_static.py")

if (-not $SkipBuild) {
    Push-Location $Frontend
    try {
        $env:REACT_APP_STATIC_DATA = "true"
        if (Test-Path $Yarn) {
            & $Yarn build
        } else {
            & yarn build
        }
    } finally {
        Pop-Location
    }
}
