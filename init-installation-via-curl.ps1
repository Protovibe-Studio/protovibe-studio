# Protovibe init-installation-via-curl (Windows PowerShell)
#
# One-liner (run in PowerShell):
#   iwr -useb https://raw.githubusercontent.com/Protovibe-Studio/protovibe-studio/main/init-installation-via-curl.ps1 | iex
#
# Custom install location:
#   $env:PROTOVIBE_DIR = "C:\code\protovibe"
#   iwr -useb https://raw.githubusercontent.com/Protovibe-Studio/protovibe-studio/main/init-installation-via-curl.ps1 | iex

$ErrorActionPreference = 'Stop'

$RepoUrl     = if ($env:PROTOVIBE_REPO)   { $env:PROTOVIBE_REPO }   else { 'https://github.com/Protovibe-Studio/protovibe-studio.git' }
$InstallDir  = if ($env:PROTOVIBE_DIR)    { $env:PROTOVIBE_DIR }    else { Join-Path $HOME 'Protovibe' }
$Branch      = if ($env:PROTOVIBE_BRANCH) { $env:PROTOVIBE_BRANCH } else { 'main' }

function Say  { param($m) Write-Host $m -ForegroundColor Cyan }
function Ok   { param($m) Write-Host "✔ $m" -ForegroundColor Green }
function Fail { param($m) Write-Host "✖ $m" -ForegroundColor Red; exit 1 }

# ── Ensure git ──────────────────────────────────────────────────────────────
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Say "git is not installed — attempting install via winget..."
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Fail "winget is unavailable. Install Git from https://git-scm.com/download/win and re-run."
  }
  winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail "winget failed to install Git." }
  # Refresh PATH from registry so this session picks up git
  $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
  $sysPath  = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
  $env:Path = "$sysPath;$userPath"
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "Git was installed but is not on PATH in this session. Open a new PowerShell window and re-run the installer."
  }
}

Say "Repo:   $RepoUrl ($Branch)"
Say "Target: $InstallDir"
Write-Host ''

# ── Clone or update ─────────────────────────────────────────────────────────
if (Test-Path (Join-Path $InstallDir '.git')) {
  Say 'Existing checkout found — updating...'
  git -C $InstallDir fetch --depth=1 origin $Branch
  git -C $InstallDir checkout $Branch
  git -C $InstallDir reset --hard "origin/$Branch"
}
elseif ((Test-Path $InstallDir) -and (Get-ChildItem -Force $InstallDir | Select-Object -First 1)) {
  Fail "$InstallDir already exists and is not empty (and not a git checkout). Pick a different location via `$env:PROTOVIBE_DIR."
}
else {
  Say 'Cloning...'
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  git clone --depth=1 --branch $Branch $RepoUrl $InstallDir
}
Ok "Source ready at $InstallDir"

# ── Hand off to install.bat ─────────────────────────────────────────────────
Set-Location $InstallDir
if (-not (Test-Path '.\install.bat')) { Fail 'install.bat missing from the cloned repo.' }
Write-Host ''
Say 'Running install.bat...'
& cmd /c '.\install.bat'
exit $LASTEXITCODE
