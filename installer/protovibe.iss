; Protovibe Studio — Inno Setup wrapper around install.bat.
; Build with: powershell -ExecutionPolicy Bypass -File installer\build.ps1
; Output: installer\dist\Protovibe-Setup.exe

#define MyAppName        "Protovibe"
#define MyAppVersion     "1.0.0"
#define MyAppPublisher   "Protovibe Studio"
#define MyAppURL         "https://protovibe-studio.github.io"
#define MyAppExeName     "Protovibe.exe"
#define RepoRoot         "..\"

[Setup]
; Stable AppId — never change once shipped (used to detect upgrades/uninstall).
AppId={{9FDB9445-2FD4-4054-B40A-DB54EAC65CB9}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={userpf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
LicenseFile={#RepoRoot}LICENSE
OutputDir=dist
OutputBaseFilename=Protovibe-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; Elevate once via UAC. install.bat needs admin for `winget install Node.js`
; and `npm i -g pnpm`. With PrivilegesRequired=admin, {userpf} still resolves
; to the *original* (non-admin) user's local Programs dir, so the running
; Protovibe project-manager — launched non-elevated — can write to projects/.
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile={#RepoRoot}protovibe-project-manager\scripts\assets\icon.ico
UninstallDisplayIcon={app}\protovibe-project-manager\scripts\assets\icon.ico
UninstallDisplayName={#MyAppName}
CloseApplications=force

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; Top-level files
Source: "{#RepoRoot}install.bat";  DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}install.sh";   DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}LICENSE";      DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}README.md";    DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}AGENTS.md";    DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}CLAUDE.md";    DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}CONTRIBUTING.md"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#RepoRoot}package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#RepoRoot}tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#RepoRoot}playwright.config.ts"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Sub-projects. Excludes mirror what would otherwise bloat the installer
; (node_modules, prebuilt dist, logs, lock files, VCS metadata).
Source: "{#RepoRoot}protovibe-project-manager\*"; DestDir: "{app}\protovibe-project-manager"; \
  Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "node_modules,*.log,.turbo,.cache,dist"

Source: "{#RepoRoot}protovibe-project-template\*"; DestDir: "{app}\protovibe-project-template"; \
  Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "node_modules,*.log,.turbo,.cache,plugins\protovibe\dist"

; Starter projects (e.g. landing-page). Skip node_modules — pnpm install will
; recreate them. projects.json carries the registry that the manager reads.
Source: "{#RepoRoot}projects\*"; DestDir: "{app}\projects"; \
  Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "node_modules,*.log,.turbo,.cache,dist"

[Run]
; Drive the existing installer logic. /UNATTENDED suppresses pauses and the
; auto-launch banner so Inno's own Finish page handles "Launch Protovibe".
Filename: "{app}\install.bat"; \
  Parameters: "/UNATTENDED"; \
  WorkingDir: "{app}"; \
  StatusMsg: "Installing Node.js, pnpm, and dependencies (this can take 5-10 minutes)..."; \
  Flags: waituntilterminated

; Finish-page launch. create-shortcut.js produces Protovibe.exe when csc.exe is
; available; otherwise Protovibe.bat. Probe both with shellexec.
Filename: "{%USERPROFILE}\.protovibe\Protovibe.exe"; \
  Description: "Launch {#MyAppName}"; \
  Flags: postinstall nowait skipifsilent shellexec skipifdoesntexist
Filename: "{%USERPROFILE}\.protovibe\Protovibe.bat"; \
  Description: "Launch {#MyAppName}"; \
  Flags: postinstall nowait skipifsilent shellexec skipifdoesntexist

[UninstallDelete]
; Wipe the heavy bits so the install dir doesn't linger. The user's projects
; under {app}\projects\ are deleted by Inno's normal uninstall sweep — if you
; want to preserve them, move projects/ out before uninstalling.
Type: filesandordirs; Name: "{app}\protovibe-project-manager\node_modules"
Type: filesandordirs; Name: "{app}\protovibe-project-template\node_modules"
Type: filesandordirs; Name: "{app}\protovibe-project-template\plugins\protovibe\dist"
Type: files;          Name: "{app}\install.log"
Type: files;          Name: "{app}\.install.lock"

[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ProtovibeDir: String;
  Response: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    ProtovibeDir := ExpandConstant('{%USERPROFILE}\.protovibe');
    if DirExists(ProtovibeDir) then
    begin
      Response := MsgBox(
        'Remove Protovibe launcher and config at ' + ProtovibeDir + '?' + #13#10 +
        '(This also removes the desktop shortcut.)',
        mbConfirmation, MB_YESNO);
      if Response = IDYES then
        DelTree(ProtovibeDir, True, True, True);
    end;
  end;
end;
