// plugins/protovibe/src/ui/api/client.ts

export async function fetchSourceInfo(id: string, componentId?: string) {
  const res = await fetch('/__get-source-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, componentId }),
  });
  if (!res.ok) throw new Error('Failed to fetch source info');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function fetchZones(file: string, startLine: number, startCol: number | null | undefined, endLine: number) {
  const res = await fetch('/__get-zones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, startLine, startCol, endLine }),
  });
  if (!res.ok) throw new Error('Failed to fetch zones');
  return await res.json();
}

export async function fetchComponents() {
  const res = await fetch('/__get-components');
  if (!res.ok) throw new Error('Failed to fetch components');
  return await res.json();
}

export async function blockAction(action: string, blockId: string | string[], file: string, text?: string, locInfo?: { startLine?: number; nameEnd?: number[] }) {
  const payload: Record<string, unknown> = Array.isArray(blockId)
    ? { action, blockIds: blockId, file, text }
    : { action, blockId, file, text };
  if (locInfo) {
    payload.startLine = locInfo.startLine;
    payload.nameEnd = locInfo.nameEnd;
  }
  const res = await fetch('/__block-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to perform block action');
  return await res.json();
}


export async function convertToSketchpad(params: {
  file: string;
  snapshot: unknown;
  options: { layoutMode: 'flex' | 'absolute' | 'flat'; keepComponents: string[] };
}): Promise<{ success: boolean; blockCount: number; imports: Array<{ name: string; path: string }>; warnings: string[] }> {
  const res = await fetch('/__convert-to-sketchpad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to convert element');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function unwrapBlock(params: {
  file: string;
  blockId: string;
  targetLayoutMode: 'flow' | 'absolute';
  childPositions?: Record<string, { left: number; top: number; width: number; wasAbsolute: boolean }>;
}) {
  const res = await fetch('/__unwrap-block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to unwrap block');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function deleteBlocks(file: string, blockIds: string[]) {
  const res = await fetch('/__delete-blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, blockIds }),
  });
  if (!res.ok) throw new Error('Failed to delete blocks');
  return await res.json();
}

export async function addBlock(params: {
  file: string;
  zoneId?: string;
  afterBlockId?: string;
  isPristine?: boolean;
  elementType: string;
  compName?: string;
  importPath?: string;
  defaultProps?: string;
  defaultContent?: string;
  additionalImportsForDefaultContent?: Array<{ name: string; path: string }>;
  targetStartLine?: number;
  targetEndLine?: number;
  targetLayoutMode?: string;
  pasteX?: number;
  pasteY?: number;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}) {
  const res = await fetch('/__add-block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to add block');
  return await res.json();
}

export async function updateSource(params: {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  oldClass: string;
  oldClasses?: string[];
  newClass: string;
  action: string;
  hasClass?: boolean;
  nameEnd?: number[];
  cStart?: number[];
  cEnd?: number[];
}) {
  const res = await fetch('/__update-source', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update source');
  return await res.json();
}

export async function updateProp(params: {
  file: string;
  action: string;
  propName: string;
  propValue?: string;
  loc?: any;
  nameEnd?: number;
}) {
  const res = await fetch('/__update-prop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update prop');
  return await res.json();
}

export async function takeSnapshot(file: string, activeId: string, extraFiles?: string[], note?: string) {
  const currentURLQueryString = window.location.search;
  const body = extraFiles?.length
    ? { files: [file, ...extraFiles], activeId, currentURLQueryString, note }
    : { file, activeId, currentURLQueryString, note };
  const res = await fetch('/__take-snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to take snapshot');
  return await res.json();
}

export async function undo() {
  const res = await fetch('/__undo', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to undo');
  return await res.json();
}

export async function redo() {
  const res = await fetch('/__redo', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to redo');
  return await res.json();
}

export interface ThemeColor {
  val: string;
  hex: string;
  lightValue?: string;
  darkValue?: string;
}

export async function updateThemeColor(tokenName: string, themeMode: 'light' | 'dark', value: string): Promise<void> {
  const res = await fetch('/__update-theme-color', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenName, themeMode, value }),
  });
  if (!res.ok) throw new Error('Failed to update theme color');
}

export interface ThemeToken {
  name: string;
  value: string;
  category: string;
}

export async function fetchThemeTokens(): Promise<ThemeToken[]> {
  const res = await fetch('/__get-theme-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error('Failed to fetch theme tokens');
  const data = await res.json();
  return data.tokens || [];
}

export async function updateThemeToken(tokenName: string, value: string): Promise<void> {
  const res = await fetch('/__update-theme-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenName, value }),
  });
  if (!res.ok) throw new Error('Failed to update theme token');
}

export async function updateFontFamily(tokenName: string, value: string, googleFontName?: string): Promise<void> {
  const res = await fetch('/__update-font-family', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenName, value, googleFontName }),
  });
  if (!res.ok) throw new Error('Failed to update font family');
}

export async function uploadImage(file: File): Promise<string> {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch('/__upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, base64Data }),
  });
  if (!res.ok) throw new Error('Failed to upload image');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url;
}

export async function fetchThemeColors(): Promise<ThemeColor[]> {
  const res = await fetch('/__get-theme-colors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error('Failed to fetch theme colors');
  const data = await res.json();
  return data.colors || [];
}

export async function restartServer() {
  const res = await fetch('/__restart-server', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restart server');
  return await res.json();
}

export interface CloudflareDeployHistoryEntry {
  url: string;
  publishedAt?: string;
}

export interface CloudflarePublishMetadata {
  projectName: string;
  url: string;
  lastPublishedAt: string;
  deployHistory: CloudflareDeployHistoryEntry[];
}

export async function fetchCloudflarePublishMetadata(): Promise<CloudflarePublishMetadata> {
  const res = await fetch('/__cloudflare-publish-metadata');
  if (!res.ok) throw new Error('Failed to fetch Cloudflare metadata');
  return res.json();
}

export interface CloudflareAuthStatus {
  loggedIn: boolean;
  email?: string;
  accounts?: Array<{ id: string; name: string }>;
}

export async function fetchCloudflareAuthStatus(refresh = false): Promise<CloudflareAuthStatus> {
  const res = await fetch(`/__cloudflare-auth-status${refresh ? '?refresh=1' : ''}`);
  if (!res.ok) throw new Error('Failed to fetch Cloudflare auth status');
  return res.json();
}

export async function saveCloudflareProjectName(projectName: string): Promise<void> {
  const res = await fetch('/__cloudflare-publish-save-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || 'Failed to save project name');
  }
}

export async function startCloudflarePublish(accountId?: string, apiToken?: string): Promise<void> {
  const res = await fetch('/__cloudflare-publish-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId: accountId ?? null, apiToken: apiToken ?? null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || 'Failed to start publish');
  }
}

export async function startCloudflareLogin(): Promise<void> {
  const res = await fetch('/__cloudflare-login-start', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start login');
}

export async function cloudflareLogout(): Promise<void> {
  const res = await fetch('/__cloudflare-logout', { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || 'Failed to log out');
  }
}

export interface CloudflarePublishStatus {
  status: 'idle' | 'installing-wrangler' | 'building' | 'publishing' | 'waiting-for-browser-approval' | 'needs-api-token' | 'account-selection' | 'not-logged-in' | 'success' | 'error';
  message: string;
  url?: string;
  authUrl?: string;
  accounts?: Array<{ id: string; name: string }>;
  error?: string;
}

export async function fetchCloudflarePublishStatus(): Promise<CloudflarePublishStatus> {
  const res = await fetch('/__cloudflare-publish-status');
  if (!res.ok) throw new Error('Failed to fetch publish status');
  return res.json();
}

// ---------------------------------------------------------------------------
// Git sync
// ---------------------------------------------------------------------------

export interface GitStatus {
  gitInstalled: boolean;
  isRepo: boolean;
  root: string;
  branch: string | null;
  hasUpstream: boolean;
  hasOrigin: boolean;
  dirty: boolean;
  changedCount: number;
  ahead: number;
  behind: number;
  remoteUrl: string | null;
  remoteKind: 'github-https' | 'ssh-or-other' | null;
}

export type GitOp = 'sync' | 'commit' | 'pull' | 'push' | 'backup';
export type GitOpStatus = 'idle' | 'committing' | 'pulling' | 'pushing' | 'success' | 'error';

export interface GitOpState {
  status: GitOpStatus;
  message: string;
  op?: GitOp;
  resolvedConflict?: boolean;
  error?: string;
  needsInstall?: boolean;
  installUrl?: string;
  repoUrl?: string;
}

export interface GithubStatus {
  connected: boolean;
  login: string | null;
  avatarUrl: string | null;
  installUrl: string;
  managerReachable?: boolean;
  managerUrl?: string | null;
}

export interface GithubRepoAccess {
  state: 'ok' | 'no-push' | 'not-covered' | 'not-connected' | 'no-remote' | 'not-github';
  owner?: string;
  repo?: string;
  installUrl: string;
  tokenInvalid?: boolean;
}

export async function fetchGithubStatus(probe = false): Promise<GithubStatus> {
  const res = await fetch(`/__github-status${probe ? '?probe=1' : ''}`);
  if (!res.ok) throw new Error('Failed to fetch GitHub status');
  return res.json();
}

export async function fetchGithubRepoAccess(): Promise<GithubRepoAccess> {
  const res = await fetch('/__github-repo-access');
  if (!res.ok) throw new Error('Failed to check repository access');
  return res.json();
}

export async function githubLogout(): Promise<void> {
  const res = await fetch('/__github-logout', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to log out of GitHub');
}

export async function fetchGitStatus(opts?: { fetch?: boolean }): Promise<GitStatus> {
  const res = await fetch(`/__git-status${opts?.fetch ? '?fetch=1' : ''}`);
  if (!res.ok) throw new Error('Failed to fetch git status');
  return res.json();
}

export async function startGitOp(op: GitOp, message?: string): Promise<void> {
  const res = await fetch('/__git-op-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, message: message ?? null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `Failed to start ${op}`);
  }
}

export async function fetchGitOpStatus(): Promise<GitOpState> {
  const res = await fetch('/__git-op-status');
  if (!res.ok) throw new Error('Failed to fetch git op status');
  return res.json();
}
