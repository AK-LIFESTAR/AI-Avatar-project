#
# Build backend using Nuitka - Compiles Python to native C code
# This creates a REAL Windows executable, not bundled Python bytecode.
#
# Benefits:
#   - Better antivirus compatibility (not flagged as suspicious)
#   - Faster startup (native code vs bytecode interpretation)
#   - Single executable file
#   - Works reliably on corporate Windows machines
#
# Electron will run: backend.exe (a native Windows application)
#

param(
    [string]$ElectronBackendDist = "..\Open-LLM-VTuber-Web\backend-dist"
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Building Backend with Nuitka Compiler" -ForegroundColor Cyan
Write-Host "  (Python -> C -> Native Windows .exe)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Paths
$BackendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BuildDir = Join-Path $BackendRoot "build-nuitka"
$TargetDir = Join-Path $BackendRoot $ElectronBackendDist

Write-Host "`nBackend root: $BackendRoot" -ForegroundColor Gray
Write-Host "Build directory: $BuildDir" -ForegroundColor Gray
Write-Host "Target directory: $TargetDir" -ForegroundColor Gray

# Clean build directory
if (Test-Path $BuildDir) {
    Write-Host "`nCleaning previous build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# Step 1: Install Nuitka and dependencies
Write-Host "`n[1/6] Installing Nuitka compiler..." -ForegroundColor Cyan
pip install --upgrade nuitka ordered-set zstandard

# Step 2: Install backend dependencies (needed for Nuitka to analyze imports)
Write-Host "`n[2/6] Installing backend dependencies..." -ForegroundColor Cyan
$ReqPath = Join-Path $BackendRoot "requirements.txt"
if (Test-Path $ReqPath) {
    # Install PyTorch CPU version first (smaller)
    Write-Host "  Installing PyTorch (CPU)..." -ForegroundColor Gray
    pip install --index-url https://download.pytorch.org/whl/cpu torch
    
    # Install other requirements
    Write-Host "  Installing other requirements..." -ForegroundColor Gray
    pip install -r $ReqPath
}

# Step 3: Compile with Nuitka
Write-Host "`n[3/6] Compiling Python to native code with Nuitka..." -ForegroundColor Cyan
Write-Host "  This may take 10-20 minutes on first run..." -ForegroundColor Yellow

$NuitkaArgs = @(
    "--standalone"                          # Create standalone distribution
    "--onefile"                             # Create single executable
    "--assume-yes-for-downloads"            # Auto-download dependencies (like MinGW)
    "--output-dir=$BuildDir"                # Output directory
    "--output-filename=backend.exe"         # Name of the executable
    
    # Include necessary packages explicitly
    "--include-package=fastapi"
    "--include-package=uvicorn"
    "--include-package=pydantic"
    "--include-package=starlette"
    "--include-package=torch"
    "--include-package=numpy"
    "--include-package=yaml"
    "--include-package=loguru"
    "--include-package=websockets"
    "--include-package=httpx"
    "--include-package=openai"
    "--include-package=anthropic"
    "--include-package=edge_tts"
    "--include-package=sounddevice"
    "--include-package=scipy"
    "--include-package=pydub"
    "--include-package=silero_vad"
    "--include-package=src"
    "--include-package=upgrade_codes"
    
    # Include data files
    "--include-data-dir=$BackendRoot\characters=characters"
    "--include-data-dir=$BackendRoot\live2d-models=live2d-models"
    "--include-data-dir=$BackendRoot\prompts=prompts"
    "--include-data-dir=$BackendRoot\config_templates=config_templates"
    "--include-data-dir=$BackendRoot\web_tool=web_tool"
    "--include-data-files=$BackendRoot\conf.yaml=conf.yaml"
    "--include-data-files=$BackendRoot\model_dict.json=model_dict.json"
    "--include-data-files=$BackendRoot\mcp_servers.json=mcp_servers.json"
    
    # Windows-specific options
    "--windows-console-mode=disable"        # No console window (run in background)
    "--windows-icon-from-ico=$BackendRoot\..\Open-LLM-VTuber-Web\resources\icon.ico"
    
    # Optimization
    "--lto=yes"                             # Link-time optimization for smaller binary
    "--python-flag=no_site"                 # Faster startup
    
    # The main script to compile
    "$BackendRoot\run_server.py"
)

Write-Host "  Running Nuitka..." -ForegroundColor Gray
& python -m nuitka $NuitkaArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Nuitka compilation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Nuitka compilation completed!" -ForegroundColor Green

# Step 4: Copy compiled executable to target
Write-Host "`n[4/6] Copying to backend-dist..." -ForegroundColor Cyan

# Clean target directory
if (Test-Path $TargetDir) {
    Get-ChildItem -Path $TargetDir -Force | Where-Object { $_.Name -ne "README.txt" } | Remove-Item -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

# Find the compiled executable
$CompiledExe = Get-ChildItem -Path $BuildDir -Filter "backend.exe" -Recurse | Select-Object -First 1
if (-not $CompiledExe) {
    # Nuitka might create it with original name
    $CompiledExe = Get-ChildItem -Path $BuildDir -Filter "run_server.exe" -Recurse | Select-Object -First 1
}

if ($CompiledExe) {
    Copy-Item -Path $CompiledExe.FullName -Destination (Join-Path $TargetDir "backend.exe") -Force
    Write-Host "  ✅ Copied: backend.exe" -ForegroundColor Green
} else {
    # If onefile didn't work, copy the dist folder
    Write-Host "  Looking for standalone folder..." -ForegroundColor Yellow
    $DistFolder = Get-ChildItem -Path $BuildDir -Directory -Filter "*.dist" | Select-Object -First 1
    if ($DistFolder) {
        Copy-Item -Path (Join-Path $DistFolder.FullName "*") -Destination $TargetDir -Recurse -Force
        Write-Host "  ✅ Copied standalone distribution" -ForegroundColor Green
    } else {
        Write-Host "❌ Could not find compiled output!" -ForegroundColor Red
        Get-ChildItem -Path $BuildDir -Recurse | ForEach-Object { Write-Host "  $_" }
        exit 1
    }
}

# Step 5: Write build ID
Write-Host "`n[5/6] Writing build ID..." -ForegroundColor Cyan
$BuildId = $env:GITHUB_SHA
if (-not $BuildId) {
    $BuildId = (Get-Date -Format "yyyyMMdd-HHmmss")
}
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $TargetDir "backend-build-id.txt"), $BuildId, $Utf8NoBom)
Write-Host "  Build ID: $BuildId" -ForegroundColor Gray

# Step 6: Verify and show size
Write-Host "`n[6/6] Verifying build..." -ForegroundColor Cyan
$ExePath = Join-Path $TargetDir "backend.exe"
if (Test-Path $ExePath) {
    $Size = (Get-Item $ExePath).Length / 1MB
    Write-Host "  ✅ backend.exe: $([math]::Round($Size, 2)) MB" -ForegroundColor Green
} else {
    $TotalSize = (Get-ChildItem -Path $TargetDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Total size: $([math]::Round($TotalSize, 2)) MB" -ForegroundColor Green
}

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "  ✅ Backend built successfully with Nuitka!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "`nThe backend is now a NATIVE Windows executable." -ForegroundColor Cyan
Write-Host "No Python installation required. No antivirus issues." -ForegroundColor Cyan

