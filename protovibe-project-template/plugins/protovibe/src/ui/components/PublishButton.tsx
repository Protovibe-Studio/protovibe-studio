import React, { useState, useRef, useEffect } from 'react';
import { Share, Loader2, ChevronRight, ChevronDown, CircleCheck, Pencil, Lightbulb, MoreHorizontal, LogOut } from 'lucide-react';
import { theme } from '../theme';
import {
  fetchCloudflarePublishMetadata,
  saveCloudflareProjectName,
  startCloudflarePublish,
  fetchCloudflarePublishStatus,
  startCloudflareLogin,
  cloudflareLogout,
  type CloudflarePublishStatus,
} from '../api/client';

// Inject spin keyframes once
if (typeof document !== 'undefined' && !document.querySelector('#pv-spin-style')) {
  const s = document.createElement('style');
  s.id = 'pv-spin-style';
  s.textContent = '@keyframes pvSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

function CloudflareLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cloudflare"
      role="img"
      viewBox="0 0 512 512"
      width={size}
      height={size}
    >
      <path
        fill="#f38020"
        d="M331 326c11-26-4-38-19-38l-148-2c-4 0-4-6 1-7l150-2c17-1 37-15 43-33 0 0 10-21 9-24a97 97 0 0 0-187-11c-38-25-78 9-69 46-48 3-65 46-60 72 0 1 1 2 3 2h274c1 0 3-1 3-3z"
      />
      <path
        fill="#faae40"
        d="M381 224c-4 0-6-1-7 1l-5 21c-5 16 3 30 20 31l32 2c4 0 4 6-1 7l-33 1c-36 4-46 39-46 39 0 2 0 3 2 3h113l3-2a81 81 0 0 0-78-103"
      />
    </svg>
  );
}

function DeployHistory({ history, open, onToggle }: { history: string[]; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.text_tertiary, fontSize: '11px', fontFamily: theme.font_ui, padding: '0',
        }}
      >
        Previous versions ({history.length})
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
          {history.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer"
              style={{ fontSize: '11px', color: theme.text_tertiary, wordBreak: 'break-all', lineHeight: '1.4', textDecoration: 'none' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = theme.accent_default; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = theme.text_tertiary; }}
            >
              {url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublishButton() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Persisted metadata
  const [projectName, setProjectName] = useState('');
  const [savedProjectName, setSavedProjectName] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [deployHistory, setDeployHistory] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // UI state
  const [editingName, setEditingName] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggedOutFlash, setLoggedOutFlash] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Publish state
  const [status, setStatus] = useState<CloudflarePublishStatus['status']>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [errorText, setErrorText] = useState('');

  // Load metadata once on mount
  useEffect(() => {
    fetchCloudflarePublishMetadata().then((data) => {
      setSavedProjectName(data.projectName);
      setProjectName(data.projectName);
      setPublishedUrl(data.url);
      setDeployHistory(data.deployHistory ?? []);
    }).catch(() => {});
  }, []);

  // Poll while a deploy is active
  const isPolling = ['installing-wrangler', 'building', 'publishing', 'waiting-for-browser-approval'].includes(status);
  useEffect(() => {
    if (!isPolling) return;
    const id = setInterval(async () => {
      try {
        const s = await fetchCloudflarePublishStatus();
        setStatus(s.status);
        setStatusMessage(s.message ?? '');
        if (s.accounts) { setAccounts(s.accounts); setSelectedAccount(s.accounts[0]?.id ?? ''); }
        if (s.url) setPublishedUrl(s.url);
        if (s.authUrl) setAuthUrl(s.authUrl);
        // On success, refresh history and return to the idle "home" view
        if (s.status === 'success') {
          setStatus('idle');
          setStatusMessage('');
          setAuthUrl('');
          setApiToken('');
          fetchCloudflarePublishMetadata().then((m) => setDeployHistory(m.deployHistory ?? [])).catch(() => {});
        }
        if (s.error) setErrorText(s.error);
      } catch { /* ignore transient fetch errors */ }
    }, 1500);
    return () => clearInterval(id);
  }, [isPolling]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Close menu on outside click (within the popover)
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setLoggingOut(true);
    try {
      await cloudflareLogout();
      // Reset all transient publish-flow state so the popover returns to its default view.
      setStatus('idle');
      setStatusMessage('');
      setErrorText('');
      setAccounts([]);
      setSelectedAccount('');
      setAuthUrl('');
      setApiToken('');
      setLoggedOutFlash(true);
    } catch (err) {
      setErrorText(String(err));
      setStatus('error');
    } finally {
      setLoggingOut(false);
    }
  };

  // Clear the banner whenever the view transitions out of idle so it doesn't
  // bleed into login/publish/error screens.
  useEffect(() => {
    if (loggedOutFlash && status !== 'idle') setLoggedOutFlash(false);
  }, [status, loggedOutFlash]);

  // Auto-generate a project name from the folder name
  const generateProjectName = (): string => {
    const path = window.location.pathname.replace(/\/$/, '');
    const folder = path.split('/').filter(Boolean).pop() || '';
    const base = folder
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    return base ? `${base}-${suffix}` : `my-app-${suffix}`;
  };

  const openNameForm = () => {
    if (!projectName.trim() && !savedProjectName) {
      setProjectName(generateProjectName());
    } else if (savedProjectName) {
      setProjectName(savedProjectName);
    }
    setEditingName(true);
    // Select text after React renders the input
    requestAnimationFrame(() => nameInputRef.current?.select());
  };

  const handleSaveName = async () => {
    const trimmed = projectName.trim();
    if (!trimmed) return;
    try {
      await saveCloudflareProjectName(trimmed);
      setSavedProjectName(trimmed);
      setEditingName(false);
    } catch (err) { setErrorText(String(err)); }
  };

  const handlePublish = async (accountId?: string, token?: string) => {
    setErrorText('');
    setStatus('publishing');
    setStatusMessage('Starting…');
    try {
      await startCloudflarePublish(accountId, token);
    } catch (err) {
      setStatus('error');
      setErrorText(String(err));
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setStatusMessage('');
    setErrorText('');
    setAccounts([]);
    setSelectedAccount('');
    setAuthUrl('');
    setApiToken('');
  };

  const btnRect = btnRef.current?.getBoundingClientRect();
  const spinStyle: React.CSSProperties = { animation: 'pvSpin 1s linear infinite' };

  // ── shared sub-styles ──────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: theme.text_default, marginBottom: '6px' };
  const subStyle: React.CSSProperties = { fontSize: '12px', color: theme.text_tertiary, lineHeight: '1.5', marginBottom: '16px' };
  const actionBtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    width: '100%', height: '36px', borderRadius: '8px',
    border: `1px solid ${theme.border_default}`, cursor: 'pointer',
    backgroundColor: theme.bg_secondary, color: theme.text_default,
    fontSize: '13px', fontWeight: 500, fontFamily: theme.font_ui,
    transition: 'background-color 0.15s ease',
  };
  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = theme.bg_tertiary; };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = theme.bg_secondary; };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: '32px', padding: '0 10px',
    borderRadius: '6px', border: `1px solid ${theme.border_default}`,
    backgroundColor: theme.bg_secondary, color: theme.text_default,
    fontSize: '12px', fontFamily: theme.font_ui, outline: 'none',
  };

  const sectionHeader = (label: string, icon?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: theme.text_default, letterSpacing: '0.2px' }}>
      {icon}
      {label}
    </div>
  );

  // ── popover body ───────────────────────────────────────────────────────────
  const renderBody = () => {
    if (status === 'not-logged-in') {
      return (
        <>
          <div style={labelStyle}>Login Required</div>
          <div style={subStyle}>
            You need to authenticate with Cloudflare to publish your app.
          </div>
          <button
            onClick={async () => {
              setStatus('waiting-for-browser-approval');
              await startCloudflareLogin();
            }}
            style={actionBtnBase}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <CloudflareLogo size={16} />
            Login to Cloudflare
          </button>
          <button
            style={{ ...actionBtnBase, marginTop: '8px', backgroundColor: 'transparent', border: 'none', color: theme.text_tertiary }}
            onClick={handleReset}
          >
            Cancel
          </button>
        </>
      );
    }

    // In-progress states
    if (status === 'waiting-for-browser-approval') {
      return (
        <>
          <div style={labelStyle}>Cloudflare Login</div>
          <div style={subStyle}>
            {authUrl ? 'Please click the link below to authorize Wrangler.' : (statusMessage || 'Working...')}
          </div>
          {authUrl ? (
            <a href={authUrl} target="_blank" rel="noreferrer" style={{ ...actionBtnBase, textDecoration: 'none', backgroundColor: theme.accent_default, color: '#fff', border: 'none' }}>
              Open Login Page
            </a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.text_tertiary, fontSize: '12px' }}>
              <Loader2 size={14} style={spinStyle} />
              Generating link…
            </div>
          )}
        </>
      );
    }

    if (status === 'needs-api-token') {
      return (
        <>
          <div style={labelStyle}>API Token Required</div>
          <div style={subStyle}>
            Your environment requires a Cloudflare API Token.
            <br /><br />
            <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer" style={{ color: theme.accent_default, textDecoration: 'none' }}>
              Get your token here
            </a>
            <br />
            (Use the "Edit Cloudflare Workers" template)
          </div>
          <input
            type="password"
            style={{ ...inputStyle, marginBottom: '12px' }}
            placeholder="Paste API Token..."
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePublish(undefined, apiToken); }}
            autoFocus
          />
          <button
            onClick={() => handlePublish(undefined, apiToken)}
            disabled={!apiToken.trim()}
            style={{
              ...actionBtnBase,
              opacity: !apiToken.trim() ? 0.4 : 1,
              cursor: !apiToken.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Submit & Deploy
          </button>
          <button
            style={{ ...actionBtnBase, marginTop: '8px', backgroundColor: 'transparent', border: 'none', color: theme.text_tertiary }}
            onClick={handleReset}
          >
            Cancel
          </button>
        </>
      );
    }

    if (isPolling) {
      return (
        <>
          <div style={labelStyle}>Publishing…</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.text_secondary, fontSize: '12px', marginTop: '12px' }}>
            <Loader2 size={14} style={spinStyle} />
            {statusMessage || 'Working…'}
          </div>
          <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: theme.bg_secondary, borderRadius: '6px', marginTop: '12px' }}>
            <Lightbulb size={14} style={{ color: theme.accent_default, flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '11px', color: theme.text_secondary, lineHeight: '1.5' }}>
              Free Cloudflare plan has a monthly limit of 500 deployments. Try not to deploy too often during development.
            </div>
          </div>
        </>
      );
    }

    if (status === 'account-selection') {
      return (
        <>
          <div style={labelStyle}>Select Cloudflare account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {accounts.map((a) => (
              <label
                key={a.id}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.text_default, cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="cf-account"
                  value={a.id}
                  checked={selectedAccount === a.id}
                  onChange={() => setSelectedAccount(a.id)}
                  style={{ accentColor: theme.text_default }}
                />
                <span style={{ fontWeight: 500 }}>{a.name}</span>
                <span style={{ color: theme.text_tertiary, fontSize: '10px' }}>{a.id.slice(0, 8)}…</span>
              </label>
            ))}
          </div>
          <button style={actionBtnBase} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
            onClick={() => handlePublish(selectedAccount)}
            disabled={!selectedAccount}
          >
            <CloudflareLogo size={16} />
            Deploy with this account
          </button>
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <div style={labelStyle}>Deploy failed</div>
          <div style={{ fontSize: '11px', color: '#e05252', marginBottom: '16px', lineHeight: '1.4', wordBreak: 'break-word', maxHeight: '80px', overflowY: 'auto' }}>
            {errorText || 'An unknown error occurred.'}
          </div>
          <button style={actionBtnBase} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={handleReset}>
            Dismiss
          </button>
        </>
      );
    }

    // ── Idle / Success — the "home" view with sections ──────────────────────
    const nameIsSaved = !!savedProjectName;

    // Full popover view for editing the project name
    if (editingName) {
      return (
        <>
          <div style={labelStyle}>Edit project name</div>
          <div style={{ ...subStyle, marginBottom: '12px' }}>This is the name of your Cloudflare Pages project.</div>
          <input
            ref={nameInputRef}
            style={{ ...inputStyle, marginBottom: '12px' }}
            placeholder="my-app"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
            autoFocus
          />
          <button
            onClick={handleSaveName}
            disabled={!projectName.trim()}
            style={{
              ...actionBtnBase,
              opacity: !projectName.trim() ? 0.4 : 1,
              cursor: !projectName.trim() ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (projectName.trim()) hoverOn(e); }}
            onMouseLeave={(e) => { if (projectName.trim()) hoverOff(e); }}
          >
            {nameIsSaved ? 'Save' : 'Continue'}
          </button>
        </>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ── Popover heading ────────────────────────────────────── */}
        <div style={labelStyle}>Publish your app</div>

        {/* ── Published to section (shown first when a URL exists) ── */}
        {publishedUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sectionHeader('Published to', <CircleCheck size={13} color="#34c759" />)}
            <a href={publishedUrl} target="_blank" rel="noreferrer"
              style={{ display: 'block', fontSize: '12px', color: theme.accent_default, wordBreak: 'break-all', lineHeight: '1.4', textDecoration: 'none' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
            >
              {publishedUrl}
            </a>
            {deployHistory.length > 0 && (
              <DeployHistory history={deployHistory} open={historyOpen} onToggle={() => setHistoryOpen(v => !v)} />
            )}
          </div>
        )}

        {/* ── Deploy section ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {sectionHeader('Deploy project')}

          {nameIsSaved ? (
            <>
              {/* Show saved project name as a label with Edit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: theme.text_secondary, fontWeight: 500 }}>{savedProjectName}</span>
                <button
                  onClick={openNameForm}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                    color: theme.text_tertiary, fontSize: '11px', fontFamily: theme.font_ui,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme.text_default; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = theme.text_tertiary; }}
                >
                  <Pencil size={10} />
                  Edit project name
                </button>
              </div>

              <button
                onClick={() => handlePublish()}
                style={{ ...actionBtnBase, marginTop: '8px' }}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <CloudflareLogo size={16} />
                Publish to Cloudflare
              </button>
            </>
          ) : (
            /* No project name yet — just show the publish button that opens the name form */
            <button
              onClick={openNameForm}
              style={{ ...actionBtnBase, marginTop: '8px' }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <CloudflareLogo size={16} />
              Publish to Cloudflare
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-tooltip="Publish"
        style={{
          marginLeft: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          height: '30px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: open ? theme.bg_tertiary : hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: open ? theme.text_default : theme.text_tertiary,
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
      >
        {isPolling
          ? <Loader2 size={15} strokeWidth={1.8} style={spinStyle} />
          : <Share size={15} strokeWidth={1.8} />}
      </button>

      {open && btnRect && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: btnRect.bottom + 8,
            right: window.innerWidth - btnRect.right,
            width: '300px',
            backgroundColor: theme.bg_default,
            border: `1px solid ${theme.border_default}`,
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            fontFamily: theme.font_ui,
          }}
        >
          {/* Kebab "more" menu — always visible in the popover's top-right */}
          <div ref={menuRef} style={{ position: 'absolute', top: '10px', right: '10px' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              data-tooltip="More"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '24px', height: '24px', borderRadius: '6px',
                border: 'none', background: menuOpen ? theme.bg_tertiary : 'transparent',
                color: theme.text_tertiary, cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (!menuOpen) e.currentTarget.style.backgroundColor = theme.bg_secondary; }}
              onMouseLeave={(e) => { if (!menuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute', top: '28px', right: '0',
                  minWidth: '200px',
                  backgroundColor: theme.bg_default,
                  border: `1px solid ${theme.border_default}`,
                  borderRadius: '8px',
                  padding: '4px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  zIndex: 10000,
                }}
              >
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '8px 10px',
                    background: 'transparent', border: 'none', borderRadius: '6px',
                    color: theme.text_default, fontSize: '12px', fontFamily: theme.font_ui,
                    cursor: loggingOut ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: loggingOut ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!loggingOut) e.currentTarget.style.backgroundColor = theme.bg_secondary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {loggingOut ? <Loader2 size={13} style={spinStyle} /> : <LogOut size={13} />}
                  Logout from Cloudflare
                </button>
              </div>
            )}
          </div>
          {loggedOutFlash && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px',
                marginRight: '32px', // leave room for the kebab button
                marginBottom: '14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(52, 199, 89, 0.12)',
                border: '1px solid rgba(52, 199, 89, 0.35)',
                color: theme.text_default,
                fontSize: '11px', lineHeight: '1.4',
              }}
            >
              <CircleCheck size={13} color="#34c759" style={{ flexShrink: 0 }} />
              <span>You logged out. Publish your project again to log in.</span>
            </div>
          )}
          {renderBody()}
        </div>
      )}
    </>
  );
}
