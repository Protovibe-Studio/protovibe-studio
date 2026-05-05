# Protovibe init-installation-via-curl (Windows PowerShell)
#
# One-liner (run in PowerShell):
#   iwr -useb https://raw.githubusercontent.com/Protovibe-Studio/protovibe-studio/main/init-installation-via-curl.ps1 | iex
#
# Custom install location:
#   $env:PROTOVIBE_DIR = "C:\code\protovibe"
#   iwr -useb https://raw.githubusercontent.com/Protovibe-Studio/protovibe-studio/main/init-installation-via-curl.ps1 | iex

$ErrorActionPreference = 'Stop'

$RepoSlug   = if ($env:PROTOVIBE_REPO_SLUG) { $env:PROTOVIBE_REPO_SLUG } else { 'Protovibe-Studio/protovibe-studio' }
$InstallDir = if ($env:PROTOVIBE_DIR)       { $env:PROTOVIBE_DIR }       else { Join-Path $HOME 'Protovibe' }
$Branch     = if ($env:PROTOVIBE_BRANCH)    { $env:PROTOVIBE_BRANCH }    else { 'main' }
$ZipUrl     = "https://codeload.github.com/$RepoSlug/zip/refs/heads/$Branch"

function Say  { param($m) Write-Host $m -ForegroundColor Cyan }
function Ok   { param($m) Write-Host "✔ $m" -ForegroundColor Green }
function Fail { param($m) Write-Host "✖ $m" -ForegroundColor Red; exit 1 }

Say "Source: $ZipUrl"
Say "Target: $InstallDir"
Write-Host ''

# ── Refuse to clobber an existing non-empty directory ───────────────────────
if ((Test-Path $InstallDir) -and (Get-ChildItem -Force $InstallDir -ErrorAction SilentlyContinue | Select-Object -First 1)) {
  Fail "$InstallDir already exists and is not empty. Remove it or pick a different location via `$env:PROTOVIBE_DIR."
}

# ── Download & extract ──────────────────────────────────────────────────────
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

$TmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ("protovibe-" + [System.Guid]::NewGuid().ToString('N') + ".zip")
$TmpExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("protovibe-" + [System.Guid]::NewGuid().ToString('N'))

try {
  Say 'Downloading...'
  # Use TLS 1.2 for older PowerShell defaults
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -Uri $ZipUrl -OutFile $TmpZip

  Say 'Extracting...'
  New-Item -ItemType Directory -Path $TmpExtract -Force | Out-Null
  Expand-Archive -Path $TmpZip -DestinationPath $TmpExtract -Force

  # The zip wraps everything in a single top-level "<repo>-<branch>" folder.
  $Inner = Get-ChildItem -Force $TmpExtract | Where-Object { $_.PSIsContainer } | Select-Object -First 1
  if (-not $Inner) { Fail 'Downloaded archive was empty or malformed.' }

  Get-ChildItem -Force -LiteralPath $Inner.FullName | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination $InstallDir -Force
  }
}
finally {
  if (Test-Path $TmpZip)     { Remove-Item -LiteralPath $TmpZip -Force -ErrorAction SilentlyContinue }
  if (Test-Path $TmpExtract) { Remove-Item -LiteralPath $TmpExtract -Recurse -Force -ErrorAction SilentlyContinue }
}

Ok "Source ready at $InstallDir"

# ── Hand off to install.bat ─────────────────────────────────────────────────
Set-Location $InstallDir
if (-not (Test-Path '.\install.bat')) { Fail 'install.bat missing from the downloaded archive.' }
Write-Host ''
Say 'Running install.bat...'
& cmd /c '.\install.bat'
exit $LASTEXITCODE
