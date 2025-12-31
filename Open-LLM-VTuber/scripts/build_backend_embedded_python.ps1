#
# Build backend using Embedded Python (NOT PyInstaller)
# This approach is much more compatible with corporate security software
# because it uses the official Python interpreter instead of a packed executable.
#
# The resulting bundle contains:
#   - python.exe (official Python embeddable)
#   - All pip packages in Lib/site-packages
#   - Backend source code
#   - run_server.py entry point
#
# Electron will run: python.exe run_server.py
#

param(
  [string]$PythonVersion = "3.11.9",
  [string]$ElectronBackendDist = "..\Open-LLM-VTuber-Web\backend-dist"
)

$ErrorActionPreference = "Stop"

Write-Host "== Building backend with Embedded Python ==" -ForegroundColor Cyan
Write-Host "Python version: $PythonVersion" -ForegroundColor Cyan

# Paths
$BackendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BuildDir = Join-Path $BackendRoot "build-embedded"
$PythonZip = Join-Path $BuildDir "python-embed.zip"
$PythonDir = Join-Path $BuildDir "python-embedded"

# Clean build directory
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# Download Python embeddable package
$PythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
Write-Host "Downloading Python embeddable from: $PythonUrl" -ForegroundColor Cyan

try {
    Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonZip -UseBasicParsing
} catch {
    Write-Host "Failed to download Python. Trying alternative version..." -ForegroundColor Yellow
    $PythonVersion = "3.11.8"
    $PythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
    Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonZip -UseBasicParsing
}

# Extract Python
Write-Host "Extracting Python..." -ForegroundColor Cyan
Expand-Archive -Path $PythonZip -DestinationPath $PythonDir -Force

# Enable pip by modifying python311._pth
# The ._pth file controls the module search path
$PthFile = Get-ChildItem -Path $PythonDir -Filter "python*._pth" | Select-Object -First 1
if ($PthFile) {
    $PthContent = Get-Content $PthFile.FullName
    # Uncomment "import site" line and add Lib\site-packages
    $NewPthContent = @()
    foreach ($line in $PthContent) {
        if ($line -match "^#import site") {
            $NewPthContent += "import site"
        } else {
            $NewPthContent += $line
        }
    }
    # Add site-packages path
    $NewPthContent += "Lib\site-packages"
    $NewPthContent | Set-Content $PthFile.FullName -Encoding utf8
    Write-Host "Modified $($PthFile.Name) to enable pip" -ForegroundColor Green
}

# Create Lib\site-packages directory
$SitePackages = Join-Path $PythonDir "Lib\site-packages"
New-Item -ItemType Directory -Force -Path $SitePackages | Out-Null

# Download and install pip
Write-Host "Installing pip..." -ForegroundColor Cyan
$GetPipUrl = "https://bootstrap.pypa.io/get-pip.py"
$GetPipPath = Join-Path $BuildDir "get-pip.py"
Invoke-WebRequest -Uri $GetPipUrl -OutFile $GetPipPath -UseBasicParsing

$PythonExe = Join-Path $PythonDir "python.exe"
& $PythonExe $GetPipPath --no-warn-script-location

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan

# First, install torch CPU version (smaller, no CUDA needed for basic use)
Write-Host "Installing PyTorch (CPU)..." -ForegroundColor Cyan
& $PythonExe -m pip install --no-warn-script-location --index-url https://download.pytorch.org/whl/cpu torch

# Install from requirements.txt (excluding torch since we installed CPU version)
$ReqPath = Join-Path $BackendRoot "requirements.txt"
if (Test-Path $ReqPath) {
    $ReqWin = Join-Path $BuildDir "requirements.win.txt"
    Get-Content $ReqPath |
        Where-Object { $_ -notmatch '^\s*torch==' } |
        Set-Content -Path $ReqWin -Encoding utf8
    
    Write-Host "Installing requirements..." -ForegroundColor Cyan
    & $PythonExe -m pip install --no-warn-script-location -r $ReqWin
} else {
    Write-Host "requirements.txt not found, installing from pyproject.toml..." -ForegroundColor Yellow
    & $PythonExe -m pip install --no-warn-script-location -e $BackendRoot
}

# Install silero-vad (needed for voice activity detection)
Write-Host "Installing silero-vad..." -ForegroundColor Cyan
& $PythonExe -m pip install --no-warn-script-location silero-vad

# Copy backend source code
Write-Host "Copying backend source code..." -ForegroundColor Cyan
$BackendFiles = @(
    "run_server.py",
    "conf.yaml",
    "model_dict.json",
    "mcp_servers.json",
    "pyproject.toml"
)
$BackendDirs = @(
    "src",
    "characters",
    "live2d-models",
    "prompts",
    "config_templates",
    "upgrade_codes",
    "web_tool"
)

foreach ($file in $BackendFiles) {
    $src = Join-Path $BackendRoot $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $PythonDir -Force
        Write-Host "  Copied: $file" -ForegroundColor Gray
    }
}

foreach ($dir in $BackendDirs) {
    $src = Join-Path $BackendRoot $dir
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $PythonDir -Recurse -Force
        Write-Host "  Copied: $dir\" -ForegroundColor Gray
    }
}

# Create a simple batch launcher (optional, for manual testing)
$LauncherContent = @"
@echo off
cd /d "%~dp0"
python.exe run_server.py %*
pause
"@
Set-Content -Path (Join-Path $PythonDir "start_backend.bat") -Value $LauncherContent -Encoding ascii

# Copy to Electron backend-dist
$TargetDir = Join-Path $BackendRoot $ElectronBackendDist
if (Test-Path $TargetDir) {
    Write-Host "Cleaning existing backend-dist..." -ForegroundColor Cyan
    Get-ChildItem -Path $TargetDir -Force | Where-Object { $_.Name -ne "README.txt" } | Remove-Item -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

Write-Host "Copying to backend-dist: $TargetDir" -ForegroundColor Cyan
Copy-Item -Path (Join-Path $PythonDir "*") -Destination $TargetDir -Recurse -Force

# Write build ID for Electron cache invalidation
$BuildId = $env:GITHUB_SHA
if (-not $BuildId) {
    $BuildId = (Get-Date -Format "yyyyMMdd-HHmmss")
}
Set-Content -Path (Join-Path $TargetDir "backend-build-id.txt") -Value $BuildId -Encoding utf8
Write-Host "Backend build ID: $BuildId" -ForegroundColor Cyan

# Show size
$Size = (Get-ChildItem -Path $TargetDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Total backend size: $([math]::Round($Size, 2)) MB" -ForegroundColor Green

Write-Host "`n✅ Backend built successfully with Embedded Python!" -ForegroundColor Green
Write-Host "The backend will run as: python.exe run_server.py" -ForegroundColor Green
Write-Host "This is much more compatible with corporate security software." -ForegroundColor Green

