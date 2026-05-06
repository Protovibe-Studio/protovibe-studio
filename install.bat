@echo off
setlocal EnableDelayedExpansion EnableExtensions
title Protovibe Installer

REM ── Protovibe one-shot installer (Windows) ─────────────────────────────────
REM  - Logs everything to install.log (each step appends)
REM  - Lock file prevents concurrent runs
REM  - Pre-flight: internet check + winget availability
REM  - Self-test after install verifies node/pnpm/vite/plugin
REM  - Path-independent shortcut (reads %USERPROFILE%\.protovibe\project-path)

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "PM_DIR=%ROOT%\protovibe-project-manager"
set "TPL_DIR=%ROOT%\protovibe-project-template"
set "PLUGIN_DIST=%TPL_DIR%\plugins\protovibe\dist"
set "LOG=%ROOT%\install.log"
set "LOCK=%ROOT%\.install.lock"
set "STEP=(starting up)"

REM ── Unattended mode (used by the Inno Setup wrapper) ─────────────────────
REM  /UNATTENDED arg or PROTOVIBE_UNATTENDED=1 env var — suppresses pauses,
REM  the trailing "press any key" banner, and the auto-launch at the end.
set "UNATTENDED=0"
if /i "%~1"=="/UNATTENDED" set "UNATTENDED=1"
if /i "%PROTOVIBE_UNATTENDED%"=="1" set "UNATTENDED=1"

REM ── Auto-elevate (Admin needed for global npm install) ───────────────────
net session >nul 2>&1
if errorlevel 1 (
  if "%UNATTENDED%"=="1" (
    echo [FAIL] /UNATTENDED requires the script to already be running as Administrator.
    exit /b 1
  )
  echo.
  echo Administrator privileges are required to configure Node.js and install pnpm globally.
  echo Requesting elevation...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs } catch { exit 1 }"
  if errorlevel 1 (
    echo.
    echo [FAIL] Elevation declined. Please run this script as Administrator.
    pause
    exit /b 1
  )
  exit /b 0
)

REM ── Initialize log ────────────────────────────────────────────────────────
> "%LOG%" echo == Protovibe install %date% %time% ==
>>"%LOG%" echo Repo: %ROOT%
>>"%LOG%" echo User: %USERNAME%   ComputerName: %COMPUTERNAME%
>>"%LOG%" echo.

if not exist "%PM_DIR%" ( call :die "protovibe-project-manager not found at %PM_DIR%" & exit /b 1 )
if not exist "%TPL_DIR%" ( call :die "protovibe-project-template not found at %TPL_DIR%" & exit /b 1 )

REM ── Concurrency lock ──────────────────────────────────────────────────────
if exist "%LOCK%" (
  set /p PREV_PID=<"%LOCK%"
  tasklist /FI "PID eq !PREV_PID!" 2>nul | find "!PREV_PID!" >nul
  if not errorlevel 1 (
    call :die "Another install is running (PID !PREV_PID!). Wait or end that process."
    exit /b 1
  )
  call :warn "Stale lock file — removing."
  del /f /q "%LOCK%" >nul 2>&1
)
echo %~n0 > "%LOCK%" 2>nul

echo.
echo ====== Protovibe Installer ======
echo Log: %LOG%
echo.

REM ── Pre-flight: internet ──────────────────────────────────────────────────
set "STEP=pre-flight: internet"
call :step
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 -Uri 'https://registry.npmjs.org/' | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  call :warn "Could not reach https://registry.npmjs.org/ — continuing, but expect failures if it isn't transient."
  if defined HTTPS_PROXY echo   HTTPS_PROXY=%HTTPS_PROXY%
  if defined HTTP_PROXY  echo   HTTP_PROXY=%HTTP_PROXY%
)

REM ── Node ──────────────────────────────────────────────────────────────────
set "STEP=Node.js"
call :step
where node >nul 2>&1
if errorlevel 1 (
  call :info "Node.js not found. Attempting install via winget..."
  where winget >nul 2>&1
  if errorlevel 1 (
    call :die "winget is unavailable. Install Node.js LTS manually from https://nodejs.org and re-run."
    exit /b 1
  )
  echo.
  echo --- winget install OpenJS.NodeJS.LTS [downloads MSI, installs to Program Files] ---
  echo.
  call :run_streamed "winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements"
  if errorlevel 1 (
    call :die "winget failed to install Node.js. See %LOG%."
    exit /b 1
  )
  
  call :refresh_path

  where node >nul 2>&1
  if errorlevel 1 (
    call :die "Node.js installed but not on PATH in this session. Open a new terminal and re-run install.bat"
    exit /b 1
  )
)
for /f "tokens=*" %%v in ('node --version') do set "NODE_VER=%%v"
call :ok "Node !NODE_VER! found."

REM ── pnpm ──────────────────────────────────────────────────────────────────
REM Install via `npm install -g pnpm@9.15.9` — the same way a dev would
REM install it themselves. Avoids corepack, which Node 25+ no longer ships.
set "STEP=install pnpm"
call :step
where pnpm >nul 2>&1
if not errorlevel 1 (
  call :ok "pnpm already installed."
) else (
  echo.
  echo --- npm install -g pnpm@9.15.9 ---
  echo.
  call :run_streamed "npm install -g pnpm@9.15.9"
  if errorlevel 1 (
    call :die "npm install -g pnpm@9.15.9 failed. See %LOG%."
    exit /b 1
  )
)
where pnpm >nul 2>&1
if errorlevel 1 (
  call :die "pnpm is still not on PATH after install. Check 'npm config get prefix' and ensure <prefix> is on PATH."
  exit /b 1
)
for /f "tokens=*" %%v in ('cmd /c "pnpm --version"') do set "PNPM_VER=%%v"
call :ok "pnpm !PNPM_VER! ready."

REM On reinstall, --force re-verifies every linked file in node_modules and
REM re-fetches anything corrupt/missing from the pnpm store. Catches the
REM "Cannot find module .../vite/dist/node/chunks/dep-XXX.js" failure mode.
set "PNPM_INSTALL_CMD=pnpm install"
if "%PROTOVIBE_REINSTALL%"=="1" set "PNPM_INSTALL_CMD=pnpm install --force"

REM ── pnpm install (project-manager) ────────────────────────────────────────
set "STEP=pnpm install (project-manager)"
call :step
echo.
echo --- !PNPM_INSTALL_CMD! (project-manager) ---
echo.
pushd "%PM_DIR%"
call :run_streamed "!PNPM_INSTALL_CMD!"
if errorlevel 1 (
  popd
  call :proxy_hint
  call :die "pnpm install failed in project-manager. See %LOG%."
  exit /b 1
)
popd

REM ── pnpm install (project-template) ───────────────────────────────────────
set "STEP=pnpm install (project-template, builds vite plugin)"
call :step
echo.
echo --- !PNPM_INSTALL_CMD! (project-template) — also runs postinstall to build the vite plugin ---
echo.
pushd "%TPL_DIR%"
call :run_streamed "!PNPM_INSTALL_CMD!"
if errorlevel 1 (
  popd
  call :proxy_hint
  call :die "pnpm install failed in project-template. See %LOG%."
  exit /b 1
)
popd
call :ok "All deps installed."

REM ── Create shortcut ───────────────────────────────────────────────────────
set "STEP=create desktop shortcut"
call :step
echo.
echo --- create desktop launcher ---
echo.
pushd "%PM_DIR%"
call :run_streamed "node scripts/create-shortcut.js"
set "SHORTCUT_RC=!ERRORLEVEL!"
popd
if not "!SHORTCUT_RC!"=="0" (
  call :warn "Shortcut creation reported an error. See %LOG%. Continuing."
)

REM ── Self-test ─────────────────────────────────────────────────────────────
set "STEP=self-test"
call :step
set "SELF_FAIL=0"

REM Using cmd /c isolates executions, preventing pnpm.cmd from killing our script!
cmd /c "node -v >nul 2>&1" || ( call :err "self-test: node missing" & set "SELF_FAIL=1" )
cmd /c "pnpm -v >nul 2>&1" || ( call :err "self-test: pnpm missing" & set "SELF_FAIL=1" )

if not exist "%PLUGIN_DIST%\*" (
  call :err "self-test: vite-plugin-protovibe dist/ empty or missing [%PLUGIN_DIST%]"
  set "SELF_FAIL=1"
)
pushd "%PM_DIR%"
cmd /c "pnpm exec vite --version >nul 2>&1"
if errorlevel 1 (
  call :err "self-test: vite not callable from project-manager"
  set "SELF_FAIL=1"
)
popd
if "%SELF_FAIL%"=="1" (
  call :die "Self-test failed. Install partially completed — see %LOG%."
  exit /b 1
)
call :ok "Self-test passed: node, pnpm, vite, plugin dist all good."

REM ── Success banner ────────────────────────────────────────────────────────
del /f /q "%LOCK%" >nul 2>&1

if "%UNATTENDED%"=="1" (
  echo.
  echo [ok ] Protovibe installed successfully.
  >>"%LOG%" echo [ok ] Protovibe installed successfully ^(unattended^).
  exit /b 0
)

echo.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Write-Host '';" ^
  "Write-Host '  +---------------------------------------+' -ForegroundColor Green;" ^
  "Write-Host '  |                                       |' -ForegroundColor Green;" ^
  "Write-Host '  |   Protovibe installed successfully!   |' -ForegroundColor Green;" ^
  "Write-Host '  |                                       |' -ForegroundColor Green;" ^
  "Write-Host '  +---------------------------------------+' -ForegroundColor Green;" ^
  "Write-Host '';" ^
  "Write-Host '  A shortcut has been placed on your Desktop.' -ForegroundColor Cyan;" ^
  "Write-Host '  To reinstall or move this folder, just re-run install.bat.' -ForegroundColor Cyan;" ^
  "Write-Host '';" ^
  "Write-Host '  Press any key to open Protovibe...' -ForegroundColor Green;" ^
  "$null = $host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')"
echo.
if exist "%USERPROFILE%\.protovibe\Protovibe.exe" (
  start "" "%USERPROFILE%\.protovibe\Protovibe.exe"
) else (
  start "" "%USERPROFILE%\.protovibe\Protovibe.bat"
)
exit /b 0


REM ── helpers ───────────────────────────────────────────────────────────────

:refresh_path
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%P"
exit /b 0

:run_streamed
REM OutputEncoding UTF8 prevents spacing issues; ErrorRecord conversion strips PS5.1 red stderr wrapping
powershell -NoProfile -ExecutionPolicy Bypass -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & { %~1 2>&1 } | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_ } } | Tee-Object -FilePath '%LOG%' -Append; exit $LASTEXITCODE"
exit /b

:step
echo [..] %STEP%
>>"%LOG%" echo [step] %STEP%
exit /b 0

:info
echo [info] %~1
>>"%LOG%" echo [info] %~1
exit /b 0

:ok
echo [ok ] %~1
>>"%LOG%" echo [ok ] %~1
exit /b 0

:warn
echo [warn] %~1
>>"%LOG%" echo [warn] %~1
exit /b 0

:err
echo [ERR ] %~1 1>&2
>>"%LOG%" echo [err ] %~1
exit /b 0

:die
echo.
echo [FAIL] during: %STEP%
echo        %~1
echo        Full log: %LOG%
>>"%LOG%" echo [FAIL] %STEP%: %~1
del /f /q "%LOCK%" >nul 2>&1
if not "%UNATTENDED%"=="1" pause
exit /b 1

:proxy_hint
if not defined HTTPS_PROXY if not defined HTTP_PROXY (
  echo.
  echo   Hint: if you are behind a corporate proxy, set HTTPS_PROXY and HTTP_PROXY:
  echo     set HTTPS_PROXY=http://your.proxy:port
  echo     set HTTP_PROXY=http://your.proxy:port
  echo   then re-run install.bat
  echo.
)
exit /b 0