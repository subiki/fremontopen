param(
    [switch]$Rebuild,
    [switch]$Build
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$Uv = Join-Path $Root ".tools\uv\uv.exe"
$Yarn = Join-Path $Root ".tools\corepack\v1\yarn\1.22.22\bin\yarn.cmd"
$Report = Join-Path $Backend "single_name_aliases.json"

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

Invoke-BackendPython @("single_name_aliases.py")
Write-Host ""
Write-Host "Review candidates in $Report and copy the aliases you want into backend/player_aliases.json."
Write-Host "Then rerun this script with -Rebuild to apply the updated alias file through dedupe + export."

if ($Rebuild) {
    Invoke-BackendPython @("sync_job.py", "--dedupe-only")
    Invoke-BackendPython @("export_static.py")

    if ($Build) {
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
}
