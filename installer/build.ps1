# Build Protovibe-Setup.exe via Inno Setup 6.
#
# Prereq: Inno Setup 6 — https://jrsoftware.org/isdl.php
#         (or: winget install -e --id JRSoftware.InnoSetup)
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File installer\build.ps1
#
# Output: installer\dist\Protovibe-Setup.exe

$ErrorActionPreference = 'Stop'
Set-Location -Path (Split-Path -Parent $PSCommandPath)

$iscc = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $iscc) {
    Write-Host "Inno Setup 6 not found. Install with:" -ForegroundColor Yellow
    Write-Host "  winget install -e --id JRSoftware.InnoSetup" -ForegroundColor Yellow
    Write-Host "  ...or download from https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using ISCC: $iscc" -ForegroundColor Cyan
& $iscc 'protovibe.iss'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$out = Join-Path $PSScriptRoot 'dist\Protovibe-Setup.exe'
if (Test-Path $out) {
    $size = '{0:N1} MB' -f ((Get-Item $out).Length / 1MB)
    Write-Host ""
    Write-Host "Built: $out ($size)" -ForegroundColor Green
}
