param(
  [string]$PythonExe = "python",
  # Where to copy the built backend payload for the Electron installer
  [string]$ElectronBackendDist = "..\\Open-LLM-VTuber-Web\\backend-dist"
)

$ErrorActionPreference = "Stop"

Write-Host "== Open-LLM-VTuber Windows backend build ==" -ForegroundColor Cyan

# Move to backend repo root (this script lives in ./scripts)
$BackendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $BackendRoot

Write-Host "Backend root: $BackendRoot"

& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install --upgrade wheel setuptools
& $PythonExe -m pip install --upgrade pyinstaller

# Install backend dependencies WITH transitive deps.
# IMPORTANT: requirements.txt in this repo is generated with `--no-deps`, so it is NOT sufficient
# for a clean Windows build. Install from pyproject.toml instead.
Write-Host "Installing backend dependencies from pyproject.toml..." -ForegroundColor Cyan
& $PythonExe -m pip install -e .

Write-Host "Running PyInstaller..." -ForegroundColor Cyan
& $PythonExe -m PyInstaller .\\pyinstaller\\open_llm_vtuber_backend.spec --noconfirm --clean

$BuiltDir = Join-Path $BackendRoot "dist\\open-llm-vtuber-backend"
if (!(Test-Path $BuiltDir)) {
  throw "Build output not found: $BuiltDir"
}

$TargetDir = Resolve-Path (Join-Path $BackendRoot $ElectronBackendDist) -ErrorAction SilentlyContinue
if (!$TargetDir) {
  $TargetDir = Join-Path $BackendRoot $ElectronBackendDist
  New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
} else {
  $TargetDir = $TargetDir.Path
}

Write-Host "Copying backend payload to: $TargetDir" -ForegroundColor Cyan

# Clear old files (except README if present)
Get-ChildItem -Path $TargetDir -Force | Where-Object { $_.Name -ne "README.txt" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Copy-Item -Path (Join-Path $BuiltDir "*") -Destination $TargetDir -Recurse -Force

Write-Host "✅ Done. Now build the Windows installer in Open-LLM-VTuber-Web:" -ForegroundColor Green
Write-Host "   cd ..\\Open-LLM-VTuber-Web" -ForegroundColor Green
Write-Host "   npm install" -ForegroundColor Green
Write-Host "   npm run build:win" -ForegroundColor Green


