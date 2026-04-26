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
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements >>"%LOG%" 2>&1
  if errorlevel 1 (
    call :die "winget failed to install Node.js. See %LOG%."
    exit /b 1
  )
  REM Refresh PATH from registry for this session
  for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "USER_PATH=%%b"
  for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| findstr /i "Path"') do set "SYS_PATH=%%b"
  set "PATH=%SYS_PATH%;%USER_PATH%"

  where node >nul 2>&1
  if errorlevel 1 (
    call :die "Node.js installed but not on PATH in this session. Open a new terminal and re-run install.bat"
    exit /b 1
  )
)
for /f "tokens=*" %%v in ('node --version') do set "NODE_VER=%%v"
call :ok "Node !NODE_VER! found."

REM ── pnpm via corepack ─────────────────────────────────────────────────────
set "STEP=pnpm via corepack"
call :step
call corepack enable pnpm >>"%LOG%" 2>&1
call corepack prepare pnpm@9.15.9 --activate >>"%LOG%" 2>&1
if errorlevel 1 (
  call :die "Failed to activate pnpm via corepack. See %LOG%."
  exit /b 1
)
for /f "tokens=*" %%v in ('pnpm --version') do set "PNPM_VER=%%v"
call :ok "pnpm !PNPM_VER! ready."

REM ── pnpm install (project-manager) ────────────────────────────────────────
set "STEP=pnpm install (project-manager)"
call :step
pushd "%PM_DIR%"
call pnpm install >>"%LOG%" 2>&1
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
pushd "%TPL_DIR%"
call pnpm install >>"%LOG%" 2>&1
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
node "%PM_DIR%\scripts\create-shortcut.js" >>"%LOG%" 2>&1
if errorlevel 1 (
  call :warn "Shortcut creation reported an error. See %LOG%. Continuing."
)

REM ── Self-test ─────────────────────────────────────────────────────────────
set "STEP=self-test"
call :step
set "SELF_FAIL=0"
node -v >nul 2>&1 || ( call :err "self-test: node missing" & set "SELF_FAIL=1" )
pnpm -v >nul 2>&1 || ( call :err "self-test: pnpm missing" & set "SELF_FAIL=1" )
if not exist "%PLUGIN_DIST%\*" (
  call :err "self-test: vite-plugin-protovibe dist/ empty or missing (%PLUGIN_DIST%)"
  set "SELF_FAIL=1"
)
pushd "%PM_DIR%"
call pnpm exec vite --version >nul 2>&1
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

REM ── Launch the app in a new window ────────────────────────────────────────
echo.
echo ====== Setup complete! ======
echo  A "Protovibe" shortcut has been placed on your Desktop.
echo  Launching the app now... (next time, just double-click the Desktop icon)
echo.
echo  If you ever move this folder, re-run install.bat to rebind the shortcut.
echo.
del /f /q "%LOCK%" >nul 2>&1
start "" "%USERPROFILE%\.protovibe\Protovibe.bat"
exit /b 0


REM ── helpers ───────────────────────────────────────────────────────────────
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
pause
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
