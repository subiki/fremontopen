param(
    [string]$Repo = "subiki/fremontopen"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$Uv = Join-Path $Root ".tools\uv\uv.exe"
$Script = Join-Path $Root "scripts\ops_review.py"
$OutDir = Join-Path $Root ".run-logs\ops-review"

function Invoke-RepoPython {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    Push-Location $Root
    try {
        if (Test-Path $VenvPython) {
            & $VenvPython @Arguments
        } elseif (Test-Path $Uv) {
            & $Uv run python @Arguments
        } else {
            & python @Arguments
        }
    } finally {
        Pop-Location
    }
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
Invoke-RepoPython @($Script, "--repo", $Repo, "--out-dir", $OutDir)

