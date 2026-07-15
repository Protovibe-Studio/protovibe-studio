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

# ── Preserve any existing install by renaming it aside ─────────────────────
# We never delete user projects. If $InstallDir exists and is non-empty,
# rename it aside. After extraction, projects\ is moved into the fresh
# install, node_modules are stripped from the backup (they are recreated by
# install.bat and only waste space), and the backup lands in
# $InstallDir\backups\ where only the 2 most recent are kept.
$BackupDir = $null
$BackupStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if ((Test-Path $InstallDir) -and (Get-ChildItem -Force $InstallDir -ErrorAction SilentlyContinue | Select-Object -First 1)) {
  $ParentDir = Split-Path -Parent $InstallDir
  $BaseName  = Split-Path -Leaf   $InstallDir
  $BackupDir = Join-Path $ParentDir ("{0}_backup_{1}" -f $BaseName, $BackupStamp)
  Say "Existing install found — renaming to $BackupDir"
  Move-Item -LiteralPath $InstallDir -Destination $BackupDir -Force
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

# ── Restore user's projects\ from the backup (never deleted) ───────────────
if ($BackupDir) {
  $BackupProjects = Join-Path $BackupDir 'projects'
  if (Test-Path -LiteralPath $BackupProjects) {
    $NewProjects = Join-Path $InstallDir 'projects'
    if (Test-Path -LiteralPath $NewProjects) {
      Remove-Item -LiteralPath $NewProjects -Recurse -Force -ErrorAction SilentlyContinue
    }
    Say 'Restoring projects\ from previous install...'
    Move-Item -LiteralPath $BackupProjects -Destination $NewProjects -Force
  }
}

# ── Tuck the backup into $InstallDir\backups\, keep the 2 most recent ──────
if ($BackupDir) {
  $BackupsRoot = Join-Path $InstallDir 'backups'
  # Carry backup history from the previous install forward.
  $OldBackupsRoot = Join-Path $BackupDir 'backups'
  if (Test-Path -LiteralPath $OldBackupsRoot) {
    Move-Item -LiteralPath $OldBackupsRoot -Destination $BackupsRoot -Force
  }
  New-Item -ItemType Directory -Path $BackupsRoot -Force | Out-Null

  # node_modules are recreated by install.bat — dropping them shrinks the
  # backup from gigabytes to megabytes.
  Say 'Trimming node_modules from backup...'
  Get-ChildItem -LiteralPath $BackupDir -Recurse -Directory -Filter node_modules -ErrorAction SilentlyContinue |
    Sort-Object { $_.FullName.Length } |
    ForEach-Object {
      if (Test-Path -LiteralPath $_.FullName) {
        Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
      }
    }

  $FinalBackup = Join-Path $BackupsRoot ("backup-{0}" -f $BackupStamp)
  Move-Item -LiteralPath $BackupDir -Destination $FinalBackup -Force
  Ok "Previous install backed up to $FinalBackup"

  # Keep only the 2 most recent backups (timestamped names sort chronologically).
  Get-ChildItem -LiteralPath $BackupsRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'backup-*' } |
    Sort-Object Name -Descending |
    Select-Object -Skip 2 |
    ForEach-Object {
      Say ("Removing old backup {0}" -f $_.Name)
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ── Hand off to install.bat ─────────────────────────────────────────────────
Set-Location $InstallDir
if (-not (Test-Path '.\install.bat')) { Fail 'install.bat missing from the downloaded archive.' }
Write-Host ''
Say 'Running install.bat...'
# Signal a reinstall to install.bat so dependency installs use --force,
# which re-verifies every file in node_modules and recovers from a corrupt
# pnpm store (e.g. missing vite chunks left over from an interrupted run).
if ($BackupDir) { $env:PROTOVIBE_REINSTALL = '1' }
& cmd /c '.\install.bat'
exit $LASTEXITCODE
