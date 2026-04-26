#!/usr/bin/env node
// Creates a desktop launcher for Protovibe.
//
// Path-independence: the project root is written to ~/.protovibe/project-path
// during install. The launcher reads that file at runtime, so re-running the
// installer after moving the repo is enough to fix the shortcut.
//
// macOS  → .mac-installer/Protovibe.app (drag to /Applications)
// Win    → %USERPROFILE%\.protovibe\Protovibe.bat + Desktop\Protovibe.lnk
// Linux  → ~/Desktop/Protovibe.desktop
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Monorepo root (one above protovibe-project-manager/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_DIR = path.join(__dirname, 'assets');
const APP_NAME = 'Protovibe';

const HOME = os.homedir();
const PROTOVIBE_CONFIG_DIR = path.join(HOME, '.protovibe');
const PROJECT_PATH_FILE = path.join(PROTOVIBE_CONFIG_DIR, 'project-path');

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
};
const log = {
  info: (m) => console.log(`${c.cyan}${m}${c.reset}`),
  warn: (m) => console.log(`${c.yellow}⚠  ${m}${c.reset}`),
  ok:   (m) => console.log(`${c.green}${c.bold}✔ ${m}${c.reset}`),
  err:  (m) => console.error(`${c.red}✖ ${m}${c.reset}`),
};

function writeProjectPathConfig() {
  fs.mkdirSync(PROTOVIBE_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(PROJECT_PATH_FILE, PROJECT_ROOT + '\n', 'utf8');
  log.info(`Wrote project path to ${PROJECT_PATH_FILE}`);
}

function resolveDesktopDir() {
  const candidates = [
    path.join(HOME, 'Desktop'),
    path.join(HOME, 'OneDrive', 'Desktop'),
    path.join(HOME, 'iCloud Drive', 'Desktop'),
    path.join(HOME, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Desktop'),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  log.warn(`Desktop directory not found — falling back to: ${HOME}`);
  return HOME;
}

function checkIcon(filename) {
  const p = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(p)) {
    log.warn(`Icon asset missing: scripts/assets/${filename} (proceeding without custom icon)`);
    return null;
  }
  return p;
}

// ───────────────────────────── macOS ─────────────────────────────
function createMacShortcut() {
  const installerDir = path.join(PROJECT_ROOT, '.mac-installer');
  const appPath = path.join(installerDir, `${APP_NAME}.app`);
  const symlinkPath = path.join(installerDir, 'Applications');
  const iconPath = checkIcon('icon.icns');

  fs.mkdirSync(installerDir, { recursive: true });
  if (fs.existsSync(appPath)) {
    fs.rmSync(appPath, { recursive: true, force: true });
  }

  // AppleScript reads the project path from the config file at every launch,
  // so the .app keeps working after being dragged to /Applications, and re-
  // running install.sh is enough to rebind it after moving the project.
  const appleScript = `on run
    set configPath to (POSIX path of (path to home folder)) & ".protovibe/project-path"
    try
        set projectRoot to do shell script "cat " & quoted form of configPath
    on error
        display dialog "Protovibe is not configured." & return & return & "Run ./install.sh from the Protovibe project directory first." buttons {"OK"} default button "OK" with icon stop with title "Protovibe"
        return
    end try
    try
        do shell script "test -d " & quoted form of projectRoot
    on error
        display dialog "Protovibe folder not found at:" & return & projectRoot & return & return & "If you moved it, re-run ./install.sh from the new location." buttons {"OK"} default button "OK" with icon stop with title "Protovibe"
        return
    end try
    set logPath to projectRoot & "/dev.log"
    -- Load nvm and pick a Node that actually has pnpm. The 'default' alias is
    -- often unset, so fall through to --lts, then to the latest installed
    -- Node, then scan nvm versions directly. Falls back to rc files for
    -- non-nvm setups (e.g. Homebrew-installed Node).
    set cmd to "export NVM_DIR=\\"$HOME/.nvm\\"; [ -s \\"$NVM_DIR/nvm.sh\\" ] && . \\"$NVM_DIR/nvm.sh\\"; if command -v nvm >/dev/null 2>&1; then nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || true; fi; if ! command -v pnpm >/dev/null 2>&1; then source ~/.zshrc >/dev/null 2>&1 || source ~/.bash_profile >/dev/null 2>&1 || true; fi; if ! command -v pnpm >/dev/null 2>&1 && [ -d \\"$NVM_DIR/versions/node\\" ]; then for d in \\"$NVM_DIR\\"/versions/node/*/bin; do [ -x \\"$d/pnpm\\" ] && export PATH=\\"$d:$PATH\\" && break; done; fi; cd " & quoted form of projectRoot & " && pnpm --dir protovibe-project-manager dev 2>&1 | tee " & quoted form of logPath
    tell application "Terminal"
        activate
        do script cmd
    end tell
end run`;

  const tmpScpt = path.join(installerDir, '_protovibe.applescript');
  fs.writeFileSync(tmpScpt, appleScript, 'utf8');

  try {
    execSync(`osacompile -o "${appPath}" "${tmpScpt}"`, { stdio: 'pipe' });
  } catch (e) {
    log.err(`osacompile failed: ${e.message}`);
    fs.rmSync(tmpScpt, { force: true });
    process.exit(1);
  }
  fs.rmSync(tmpScpt, { force: true });

  if (iconPath) {
    const dest = path.join(appPath, 'Contents', 'Resources', 'applet.icns');
    try {
      fs.copyFileSync(iconPath, dest);
    } catch (e) {
      log.warn(`Failed to apply custom icon: ${e.message}`);
    }
  }

  // Ad-hoc codesign and clear quarantine so Gatekeeper is less hostile on
  // first launch (this is locally-built, not downloaded, so it shouldn't
  // carry quarantine — but belt and suspenders).
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'pipe' });
  } catch (e) {
    log.warn(`Ad-hoc codesign failed: ${e.message.split('\n')[0]}`);
  }
  try {
    execSync(`xattr -dr com.apple.quarantine "${appPath}"`, { stdio: 'pipe' });
  } catch {}
  try { execSync(`touch "${appPath}"`); } catch {} // refresh icon cache

  // Symlink to /Applications (idempotent)
  try {
    if (fs.lstatSync(symlinkPath, { throwIfNoEntry: false })) {
      fs.rmSync(symlinkPath, { force: true });
    }
  } catch {}
  try {
    fs.symlinkSync('/Applications', symlinkPath, 'dir');
  } catch (e) {
    log.warn(`Failed to create /Applications symlink: ${e.message}`);
  }

  spawnSync('open', [installerDir], { stdio: 'ignore' });

  log.ok(`Created ${APP_NAME}.app at ${appPath}`);
  log.info(`Drag ${APP_NAME}.app onto Applications in the window that just opened.`);
}

// ───────────────────────────── Windows ───────────────────────────
function createWindowsShortcut() {
  const desktop = resolveDesktopDir();
  const launcherDir = PROTOVIBE_CONFIG_DIR;
  const launcherBat = path.join(launcherDir, 'Protovibe.bat');
  const lnkPath = path.join(desktop, `${APP_NAME}.lnk`);
  const iconPath = checkIcon('icon.ico');

  fs.mkdirSync(launcherDir, { recursive: true });

  // Launcher reads project path from config file at runtime (path-independent).
  const batLines = [
    '@echo off',
    'setlocal',
    'title Protovibe',
    'set "CFG=%USERPROFILE%\\.protovibe\\project-path"',
    'if not exist "%CFG%" (',
    '  echo Protovibe is not configured.',
    '  echo Run install.bat from the Protovibe project directory first.',
    '  pause',
    '  exit /b 1',
    ')',
    'set /p PROJECT_ROOT=<"%CFG%"',
    'if not exist "%PROJECT_ROOT%" (',
    '  echo Protovibe folder not found at:',
    '  echo   %PROJECT_ROOT%',
    '  echo If you moved it, re-run install.bat from the new location.',
    '  pause',
    '  exit /b 1',
    ')',
    'cd /d "%PROJECT_ROOT%"',
    'call pnpm --dir protovibe-project-manager dev',
    'if errorlevel 1 (',
    '  echo.',
    '  echo Dev server exited with an error.',
    '  pause',
    ')',
  ];
  fs.writeFileSync(launcherBat, batLines.join('\r\n') + '\r\n', 'utf8');

  if (fs.existsSync(lnkPath)) fs.rmSync(lnkPath, { force: true });

  const psEscape = (s) => s.replace(/`/g, '``').replace(/"/g, '`"');
  const psLines = [
    `$WshShell = New-Object -ComObject WScript.Shell`,
    `$Shortcut = $WshShell.CreateShortcut("${psEscape(lnkPath)}")`,
    `$Shortcut.TargetPath = "${psEscape(launcherBat)}"`,
    `$Shortcut.WorkingDirectory = "${psEscape(launcherDir)}"`,
    `$Shortcut.WindowStyle = 1`,
    `$Shortcut.Description = "Run Protovibe Project Manager"`,
  ];
  if (iconPath) psLines.push(`$Shortcut.IconLocation = "${psEscape(iconPath)}"`);
  psLines.push(`$Shortcut.Save()`);

  const psPath = path.join(launcherDir, '_create-shortcut.ps1');
  fs.writeFileSync(psPath, psLines.join('\r\n'), 'utf8');

  try {
    execSync(`powershell.exe -ExecutionPolicy Bypass -NoProfile -File "${psPath}"`, { stdio: 'pipe' });
  } catch (e) {
    log.err(`PowerShell shortcut creation failed: ${e.message}`);
    log.err(`Hint: Windows Script Host may be disabled by group policy.`);
    fs.rmSync(psPath, { force: true });
    process.exit(1);
  }
  fs.rmSync(psPath, { force: true });

  // Clean up legacy in-repo bat from older installs
  const legacyBat = path.join(PROJECT_ROOT, 'start-protovibe.bat');
  if (fs.existsSync(legacyBat)) { try { fs.rmSync(legacyBat, { force: true }); } catch {} }

  log.ok(`Shortcut created: ${lnkPath}`);
  log.info(`Launcher: ${launcherBat}`);
}

// ───────────────────────────── Linux ─────────────────────────────
function createLinuxShortcut() {
  const desktop = resolveDesktopDir();
  const desktopFile = path.join(desktop, `${APP_NAME}.desktop`);
  const iconPath = checkIcon('icon.png');

  // Path-independent: read config at runtime.
  const execLine = `bash -c 'CFG="$HOME/.protovibe/project-path"; if [ ! -f "$CFG" ]; then echo "Protovibe not configured. Run ./install.sh first."; exec bash; fi; ROOT=$(cat "$CFG"); if [ ! -d "$ROOT" ]; then echo "Protovibe folder not found at $ROOT. Re-run ./install.sh."; exec bash; fi; export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; if command -v nvm >/dev/null 2>&1; then nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || true; fi; if ! command -v pnpm >/dev/null 2>&1; then source ~/.bashrc >/dev/null 2>&1 || true; fi; if ! command -v pnpm >/dev/null 2>&1 && [ -d "$NVM_DIR/versions/node" ]; then for d in "$NVM_DIR"/versions/node/*/bin; do [ -x "$d/pnpm" ] && export PATH="$d:$PATH" && break; done; fi; cd "$ROOT" && pnpm --dir protovibe-project-manager dev 2>&1 | tee "$ROOT/dev.log"; exec bash'`;

  const lines = [
    `[Desktop Entry]`,
    `Version=1.0`,
    `Type=Application`,
    `Name=${APP_NAME}`,
    `Comment=Run Protovibe Project Manager`,
    `Exec=${execLine}`,
    `Terminal=true`,
    `Categories=Development;`,
  ];
  if (iconPath) lines.push(`Icon=${iconPath}`);

  fs.writeFileSync(desktopFile, lines.join('\n') + '\n', 'utf8');
  try { fs.chmodSync(desktopFile, 0o755); } catch (e) { log.warn(`chmod failed: ${e.message}`); }

  // Mark as trusted on GNOME — best-effort, ignore if gio missing.
  try {
    execSync(`gio set "${desktopFile}" metadata::trusted true`, { stdio: 'pipe' });
  } catch {}

  log.ok(`Desktop entry created: ${desktopFile}`);
}

// ─────────────────────────────  main  ────────────────────────────
function main() {
  const platform = os.platform();
  log.info(`Detected platform: ${platform}`);
  log.info(`Project root: ${PROJECT_ROOT}`);

  writeProjectPathConfig();

  switch (platform) {
    case 'darwin': createMacShortcut(); break;
    case 'win32':  createWindowsShortcut(); break;
    case 'linux':  createLinuxShortcut(); break;
    default:
      log.err(`Unsupported platform: ${platform}`);
      process.exit(1);
  }
}

main();
