#
# Build backend using Embedded Python (NOT PyInstaller)
# This approach is much more compatible with corporate security software
# because it uses the official Python interpreter instead of a packed executable.
#
# The resulting bundle contains:
#   - python.exe (official Python embeddable)
#   - python311.zip (standard library)
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
$PythonZipDownload = Join-Path $BuildDir "python-embed.zip"
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
    Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonZipDownload -UseBasicParsing
} catch {
    Write-Host "Failed to download Python. Trying alternative version..." -ForegroundColor Yellow
    $PythonVersion = "3.11.8"
    $PythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
    Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonZipDownload -UseBasicParsing
}

# Extract Python
Write-Host "Extracting Python..." -ForegroundColor Cyan
Expand-Archive -Path $PythonZipDownload -DestinationPath $PythonDir -Force

# Get the Python version number for file naming (e.g., "311" from "3.11.9")
$PyVerShort = $PythonVersion.Split('.')[0] + $PythonVersion.Split('.')[1]
Write-Host "Python short version: $PyVerShort" -ForegroundColor Cyan

# CRITICAL: Modify python3XX._pth file to enable pip and site-packages
# The ._pth file controls Python's module search path
# IMPORTANT: Must write WITHOUT BOM - PowerShell's -Encoding utf8 adds BOM which corrupts Python!
$PthFile = Get-ChildItem -Path $PythonDir -Filter "python*._pth" | Select-Object -First 1
if ($PthFile) {
    Write-Host "Found ._pth file: $($PthFile.Name)" -ForegroundColor Cyan
    
    # Read original content to see what's there
    $OriginalContent = Get-Content $PthFile.FullName -Raw
    Write-Host "Original ._pth content:" -ForegroundColor Gray
    Write-Host $OriginalContent -ForegroundColor Gray
    
    # Build new content - must include the stdlib zip file!
    # The embedded Python stdlib is in pythonXXX.zip (e.g., python311.zip)
    $StdlibZip = "python$PyVerShort.zip"
    
    # New ._pth content (order matters!)
    $NewPthContent = @"
$StdlibZip
.
Lib\site-packages
import site
"@
    
    # Write WITHOUT BOM using .NET method (PowerShell's -Encoding utf8 adds BOM!)
    $Utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($PthFile.FullName, $NewPthContent, $Utf8NoBom)
    
    Write-Host "Modified $($PthFile.Name) content:" -ForegroundColor Green
    Write-Host $NewPthContent -ForegroundColor Green
    
    # Verify the stdlib zip exists
    $StdlibZipPath = Join-Path $PythonDir $StdlibZip
    if (Test-Path $StdlibZipPath) {
        Write-Host "✅ Found standard library: $StdlibZip" -ForegroundColor Green
    } else {
        Write-Host "⚠️ WARNING: Standard library zip not found: $StdlibZipPath" -ForegroundColor Red
        # List what files are in the directory
        Write-Host "Files in Python directory:" -ForegroundColor Yellow
        Get-ChildItem -Path $PythonDir | ForEach-Object { Write-Host "  $_" }
    }
} else {
    Write-Host "⚠️ WARNING: No ._pth file found!" -ForegroundColor Red
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

# Test that Python works before installing pip
Write-Host "Testing Python installation..." -ForegroundColor Cyan
& $PythonExe -c "import sys; print(f'Python {sys.version} OK')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python test failed! Check the ._pth file." -ForegroundColor Red
    exit 1
}

& $PythonExe $GetPipPath --no-warn-script-location
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ pip installation failed!" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan

# First, install torch CPU version (smaller, no CUDA needed for basic use)
Write-Host "Installing PyTorch (CPU)..." -ForegroundColor Cyan
& $PythonExe -m pip install --no-warn-script-location --index-url https://download.pytorch.org/whl/cpu torch

# Install from requirements.txt (excluding torch since we installed CPU version)
$ReqPath = Join-Path $BackendRoot "requirements.txt"
if (Test-Path $ReqPath) {
    $ReqWin = Join-Path $BuildDir "requirements.win.txt"
    # Use .NET method to write without BOM
    $ReqContent = Get-Content $ReqPath | Where-Object { $_ -notmatch '^\s*torch==' }
    $Utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines($ReqWin, $ReqContent, $Utf8NoBom)
    
    Write-Host "Installing requirements..." -ForegroundColor Cyan
    & $PythonExe -m pip install --no-warn-script-location -r $ReqWin
} else {
    Write-Host "requirements.txt not found, installing from pyproject.toml..." -ForegroundColor Yellow
    & $PythonExe -m pip install --no-warn-script-location -e $BackendRoot
}

# Install silero-vad (needed for voice activity detection)
Write-Host "Installing silero-vad..." -ForegroundColor Cyan
& $PythonExe -m pip install --no-warn-script-location silero-vad

# Final test that Python still works with all packages
Write-Host "Final Python test..." -ForegroundColor Cyan
& $PythonExe -c "import sys; import encodings; print('encodings module OK'); import fastapi; print('FastAPI OK')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: Final Python test had issues" -ForegroundColor Yellow
}

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

# Verify critical files in target
Write-Host "Verifying backend-dist contents..." -ForegroundColor Cyan
$CriticalFiles = @("python.exe", "python$PyVerShort.zip", "python$PyVerShort._pth", "run_server.py")
foreach ($cf in $CriticalFiles) {
    $cfPath = Join-Path $TargetDir $cf
    if (Test-Path $cfPath) {
        Write-Host "  ✅ $cf" -ForegroundColor Green
    } else {
        Write-Host "  ❌ MISSING: $cf" -ForegroundColor Red
    }
}

# Show the ._pth file content in target
$TargetPth = Join-Path $TargetDir "python$PyVerShort._pth"
if (Test-Path $TargetPth) {
    Write-Host "Final ._pth content in backend-dist:" -ForegroundColor Cyan
    Get-Content $TargetPth | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}

# Write build ID for Electron cache invalidation
$BuildId = $env:GITHUB_SHA
if (-not $BuildId) {
    $BuildId = (Get-Date -Format "yyyyMMdd-HHmmss")
}
# Write without BOM
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $TargetDir "backend-build-id.txt"), $BuildId, $Utf8NoBom)
Write-Host "Backend build ID: $BuildId" -ForegroundColor Cyan

# Show size
$Size = (Get-ChildItem -Path $TargetDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Total backend size: $([math]::Round($Size, 2)) MB" -ForegroundColor Green

Write-Host "`n✅ Backend built successfully with Embedded Python!" -ForegroundColor Green
Write-Host "The backend will run as: python.exe run_server.py" -ForegroundColor Green
Write-Host "This is much more compatible with corporate security software." -ForegroundColor Green


