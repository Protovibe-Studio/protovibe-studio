import React, { useState, useRef, useEffect } from 'react';
import { Share, Loader2, ChevronRight, ChevronDown, CircleCheck, Pencil, Lightbulb, MoreHorizontal, LogOut, Link2, Lock, Copy, Check } from 'lucide-react';
import { theme, primarySolidHover } from '../theme';
import { handleExternalLinkClick } from '../utils/openExternal';
import {
  fetchCloudflarePublishMetadata,
  fetchCloudflareAuthStatus,
  saveCloudflareProjectName,
  startCloudflarePublish,
  fetchCloudflarePublishStatus,
  startCloudflareLogin,
  cloudflareLogout,
  type CloudflarePublishStatus,
  type CloudflareDeployHistoryEntry,
} from '../api/client';
import { getCurrentAppPath } from '../utils/appPath';

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

function formatPublishDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

function DeployHistory({ history, open, onToggle }: { history: CloudflareDeployHistoryEntry[]; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.text_secondary, fontSize: '12px', fontFamily: theme.font_ui, padding: '0',
        }}
      >
        Previous versions ({history.length})
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
          {history.map((entry) => {
            const date = formatPublishDate(entry.publishedAt);
            return (
              <div key={entry.url} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <a href={entry.url} target="_blank" rel="noreferrer" onClick={handleExternalLinkClick}
                  style={{ fontSize: '12px', color: theme.text_secondary, wordBreak: 'break-all', lineHeight: '1.4', textDecoration: 'none' }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = theme.accent_default; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = theme.text_secondary; }}
                >
                  {entry.url}
                </a>
                {date && (
                  <span style={{ fontSize: '12px', color: theme.text_tertiary }}>Published {date}</span>
                )}
              </div>
            );
          })}
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
  const [lastPublishedAt, setLastPublishedAt] = useState('');
  const [deployHistory, setDeployHistory] = useState<CloudflareDeployHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Cloudflare connection state — known up-front so the popover can explain
  // the flow to logged-out users before anything is deployed.
  const [auth, setAuth] = useState<'unknown' | 'logged-out' | 'logged-in'>('unknown');
  const [accountEmail, setAccountEmail] = useState('');

  // UI state
  const [editingName, setEditingName] = useState(false);
  // When true, saving the project name immediately starts a publish (first-run
  // flow) instead of just persisting the name (edit flow).
  const [namePublishIntent, setNamePublishIntent] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggedOutFlash, setLoggedOutFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Publish state
  const [status, setStatus] = useState<CloudflarePublishStatus['status']>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [errorText, setErrorText] = useState('');

  // Refs mirrored for use inside the poll interval (avoids stale closures).
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);
  const savedProjectNameRef = useRef(savedProjectName);
  useEffect(() => { savedProjectNameRef.current = savedProjectName; }, [savedProjectName]);
  // Set when the user starts a login as part of publishing, so the flow can
  // continue automatically once OAuth completes.
  const pendingPublishRef = useRef(false);

  const applyMetadata = (data: { projectName: string; url: string; lastPublishedAt: string; deployHistory: CloudflareDeployHistoryEntry[] }) => {
    setSavedProjectName(data.projectName);
    setPublishedUrl(data.url);
    setLastPublishedAt(data.lastPublishedAt ?? '');
    setDeployHistory(data.deployHistory ?? []);
  };

  const refreshAuth = (refresh = false) => {
    fetchCloudflareAuthStatus(refresh)
      .then((a) => {
        setAuth(a.loggedIn ? 'logged-in' : 'logged-out');
        setAccountEmail(a.email ?? '');
      })
      .catch(() => {
        // Can't determine the state — assume logged out; the connect flow and
        // the backend's own whoami check both recover gracefully from this.
        setAuth('logged-out');
      });
  };

  // Load metadata + auth state once on mount
  useEffect(() => {
    fetchCloudflarePublishMetadata().then((data) => {
      applyMetadata(data);
      setProjectName(data.projectName);
    }).catch(() => {});
    refreshAuth();
  }, []);

  // Re-check auth whenever the popover opens (served from a backend cache, so cheap)
  useEffect(() => {
    if (open) refreshAuth();
    // Closing the popover dismisses a finished publish — reopening should land
    // on the default "Published to" view, ready to publish an update.
    if (!open && statusRef.current === 'success') handleReset();
  }, [open]);

  // Called when the OAuth login completes: refresh the connection badge and,
  // if the user was mid-publish, continue the flow without another click.
  const handleLoginComplete = () => {
    setAuthUrl('');
    fetchCloudflareAuthStatus(true)
      .then((a) => {
        setAuth(a.loggedIn ? 'logged-in' : 'logged-out');
        setAccountEmail(a.email ?? '');
      })
      .catch(() => { setAuth('logged-in'); });
    if (!pendingPublishRef.current) return;
    pendingPublishRef.current = false;
    if (savedProjectNameRef.current) {
      handlePublish();
    } else {
      setProjectName((prev) => (prev.trim() ? prev : generateProjectName()));
      setNamePublishIntent(true);
      setEditingName(true);
      requestAnimationFrame(() => nameInputRef.current?.select());
    }
  };

  // Poll while a deploy is active
  const isPolling = ['installing-wrangler', 'building', 'publishing', 'waiting-for-browser-approval'].includes(status);
  useEffect(() => {
    if (!isPolling) return;
    const id = setInterval(async () => {
      try {
        const s = await fetchCloudflarePublishStatus();
        const wasWaitingForLogin = statusRef.current === 'waiting-for-browser-approval';
        setStatus(s.status);
        setStatusMessage(s.message ?? '');
        if (s.accounts) { setAccounts(s.accounts); setSelectedAccount(s.accounts[0]?.id ?? ''); }
        if (s.url) setPublishedUrl(s.url);
        if (s.authUrl) setAuthUrl(s.authUrl);
        // Login finished (backend drops back to idle) — continue automatically
        if (wasWaitingForLogin && s.status === 'idle') {
          handleLoginComplete();
        }
        // Deploy finished — refresh metadata; the success view stays up until dismissed
        if (s.status === 'success') {
          setAuthUrl('');
          setApiToken('');
          fetchCloudflarePublishMetadata().then(applyMetadata).catch(() => {});
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
      setAuth('logged-out');
      setAccountEmail('');
      pendingPublishRef.current = false;
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

  const openNameForm = (publishAfter: boolean) => {
    if (!projectName.trim() && !savedProjectName) {
      setProjectName(generateProjectName());
    } else if (savedProjectName) {
      setProjectName(savedProjectName);
    }
    setNamePublishIntent(publishAfter);
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
      if (namePublishIntent) {
        setNamePublishIntent(false);
        handlePublish();
      }
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

  // Start the Cloudflare OAuth login and remember to continue publishing once
  // it completes.
  const handleConnect = async () => {
    pendingPublishRef.current = true;
    setErrorText('');
    setAuthUrl('');
    setStatus('waiting-for-browser-approval');
    setStatusMessage('Generating login link…');
    try {
      await startCloudflareLogin();
    } catch (err) {
      setStatus('error');
      setErrorText(String(err));
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const handleReset = () => {
    setStatus('idle');
    setStatusMessage('');
    setErrorText('');
    setAccounts([]);
    setSelectedAccount('');
    setAuthUrl('');
    setApiToken('');
    setNamePublishIntent(false);
    pendingPublishRef.current = false;
  };

  const btnRect = btnRef.current?.getBoundingClientRect();
  const spinStyle: React.CSSProperties = { animation: 'pvSpin 1s linear infinite' };

  // ── shared sub-styles ──────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: theme.text_default, marginBottom: '4px' };
  const subStyle: React.CSSProperties = { fontSize: '13px', color: theme.text_secondary, lineHeight: '1.4', marginBottom: '16px' };
  const actionBtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    width: '100%', height: '36px', borderRadius: '8px',
    border: `1px solid ${theme.border_default}`, cursor: 'pointer',
    backgroundColor: theme.bg_secondary, color: theme.text_default,
    fontSize: '13px', fontWeight: 500, fontFamily: theme.font_ui,
    transition: 'background-color 0.15s ease',
  };
  const primaryBtnStyle: React.CSSProperties = {
    ...actionBtnBase,
    border: 'none',
    background: theme.primary_solid,
    color: '#fff',
  };
  const ghostBtnStyle: React.CSSProperties = {
    ...actionBtnBase, backgroundColor: 'transparent', border: 'none', color: theme.text_secondary,
  };
  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = theme.bg_secondary; };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = theme.bg_secondary; };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: '32px', padding: '0 10px',
    borderRadius: '6px', border: `1px solid ${theme.border_default}`,
    backgroundColor: theme.bg_secondary, color: theme.text_default,
    fontSize: '12px', fontFamily: theme.font_ui, outline: 'none',
  };

  const sectionHeader = (label: string, icon?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: theme.text_default, marginBottom: '0px' }}>
      {icon}
      {label}
    </div>
  );

  const benefitRow = (icon: React.ReactNode, text: React.ReactNode) => (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px'}}>
        {icon}
      </div>
      <div style={{ fontSize: '13px', color: theme.text_secondary, lineHeight: '1.4' }}>{text}</div>
    </div>
  );

  // Intro shown to users who aren't connected to Cloudflare yet — explains what
  // publishing does before anything happens.
  const renderIntro = () => (
    <>
      <div style={labelStyle}>Publish your app</div>
      <div style={{ ...subStyle, marginBottom: '14px' }}>
        Let others view your app, e.g. share it with your client or during usability tests.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {benefitRow(
          <Link2 size={14} style={{ color: theme.accent_default }} />,
          <>Anyone with the link will be able to view your app</>,
        )}
        {benefitRow(
          <CloudflareLogo size={15} />,
          <>Publishing runs on <span style={{ color: theme.text_default }}>your own free Cloudflare account</span> — robust hosting at no cost.</>,
        )}
        {benefitRow(
          <Lock size={14} style={{ color: theme.accent_default }} />,
          <>You own your files. The Protovibe team never sees your project.</>,
        )}
      </div>
      <button style={primaryBtnStyle} {...primarySolidHover(true)} onClick={handleConnect}>
        <CloudflareLogo size={16} />
        Connect Cloudflare
      </button>
      <a
        href="https://dash.cloudflare.com/sign-up"
        target="_blank"
        rel="noreferrer"
        onClick={handleExternalLinkClick}
        style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '12px', color: theme.text_secondary, textDecoration: 'none' }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.color = theme.accent_default; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.color = theme.text_secondary; }}
      >
        No Cloudflare account yet? Sign up free
      </a>
    </>
  );

  // ── popover body ───────────────────────────────────────────────────────────
  const renderBody = () => {
    // Backend discovered mid-publish that we're logged out — show the intro,
    // which explains the flow and offers the connect button.
    if (status === 'not-logged-in') {
      return renderIntro();
    }

    // In-progress states
    if (status === 'waiting-for-browser-approval') {
      return (
        <>
          <div style={labelStyle}>Connect Cloudflare</div>
          <div style={subStyle}>
            {authUrl
              ? 'Click below to open Cloudflare and approve access. We\'ll continue automatically once you\'re done.'
              : (statusMessage || 'Preparing your secure login link…')}
          </div>
          {authUrl ? (
            <a href={authUrl} target="_blank" rel="noreferrer" onClick={handleExternalLinkClick} style={{ ...primaryBtnStyle, textDecoration: 'none' }}>
              Open Cloudflare login
            </a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.text_secondary, fontSize: '12px' }}>
              <Loader2 size={14} style={spinStyle} />
              Generating link…
            </div>
          )}
          <button style={{ ...ghostBtnStyle, marginTop: '8px' }} onClick={handleReset}>
            Cancel
          </button>
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
            <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer" onClick={handleExternalLinkClick} style={{ color: theme.accent_default, textDecoration: 'none' }}>
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
            style={{ ...ghostBtnStyle, marginTop: '8px' }}
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
          <div style={labelStyle}>Publishing your app…</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.text_secondary, fontSize: '12px', marginTop: '12px' }}>
            <Loader2 size={14} style={spinStyle} />
            {statusMessage || 'Working…'}
          </div>
          <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: theme.bg_secondary, borderRadius: '6px', marginTop: '12px' }}>
            <Lightbulb size={14} style={{ color: theme.accent_default, flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: theme.text_secondary, lineHeight: '1.4' }}>
              Free Cloudflare plan has a monthly limit of 500 deployments. Try not to publish too often.
            </div>
          </div>
        </>
      );
    }

    if (status === 'account-selection') {
      return (
        <>
          <div style={labelStyle}>Select Cloudflare account</div>
          <div style={{ ...subStyle, marginBottom: '12px' }}>
            Your Cloudflare login has access to several accounts. Pick the one to publish with.
          </div>
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
                <span style={{ color: theme.text_secondary, fontSize: '12px' }}>{a.id.slice(0, 8)}…</span>
              </label>
            ))}
          </div>
          <button style={actionBtnBase} onMouseEnter={hoverOn} onMouseLeave={hoverOff}
            onClick={() => handlePublish(selectedAccount)}
            disabled={!selectedAccount}
          >
            <CloudflareLogo size={16} />
            Publish with this account
          </button>
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <div style={labelStyle}>Publishing failed</div>
          <div style={{ fontSize: '12px', color: '#e05252', marginBottom: '16px', lineHeight: '1.4', wordBreak: 'break-word', maxHeight: '80px', overflowY: 'auto' }}>
            {errorText || 'An unknown error occurred.'}
          </div>
          {savedProjectName && (
            <button style={{ ...actionBtnBase, marginBottom: '8px' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff} onClick={() => handlePublish()}>
              Try again
            </button>
          )}
          <button style={savedProjectName ? ghostBtnStyle : actionBtnBase} onClick={handleReset}>
            Dismiss
          </button>
        </>
      );
    }

    // Deep-link the published site to the page currently open on the canvas.
    const publishedLink = (() => {
      if (!publishedUrl) return '';
      try {
        return new URL(getCurrentAppPath(), publishedUrl).toString();
      } catch {
        return publishedUrl;
      }
    })();

    // Deploy finished — celebrate and hand over the link.
    if (status === 'success') {
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...labelStyle }}>
            <CircleCheck size={16} color="#34c759" />
            Your app is published
          </div>
          <div style={{ ...subStyle, marginBottom: '10px' }}>
            Anyone with this link can view it:
          </div>
          <a href={publishedLink || publishedUrl} target="_blank" rel="noreferrer" onClick={handleExternalLinkClick}
            style={{ display: 'block', fontSize: '13px', color: theme.accent_default, wordBreak: 'break-all', lineHeight: '1.4', textDecoration: 'none', marginBottom: '14px' }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
          >
            {publishedLink || publishedUrl}
          </a>
          <button style={primaryBtnStyle} {...primarySolidHover(true)} onClick={() => handleCopyLink(publishedLink || publishedUrl)}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button style={{ ...ghostBtnStyle, marginTop: '8px' }} onClick={handleReset}>
            Done
          </button>
        </>
      );
    }

    // ── Idle — the "home" view ────────────────────────────────────────────────
    const nameIsSaved = !!savedProjectName;

    // Full popover view for editing / choosing the project name
    if (editingName) {
      return (
        <>
          <div style={labelStyle}>{namePublishIntent ? 'Name your project' : 'Edit project name'}</div>
          <div style={{ ...subStyle, marginBottom: '12px' }}>
            Your app will live at <span style={{ color: theme.text_secondary }}>{(projectName.trim() || 'my-app')}.pages.dev</span>. You can change the name any time.
          </div>
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
              ...(namePublishIntent ? primaryBtnStyle : actionBtnBase),
              opacity: !projectName.trim() ? 0.4 : 1,
              cursor: !projectName.trim() ? 'not-allowed' : 'pointer',
            }}
            {...(namePublishIntent
              ? primarySolidHover(!!projectName.trim())
              : {
                  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { if (projectName.trim()) hoverOn(e); },
                  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { if (projectName.trim()) hoverOff(e); },
                })}
          >
            {namePublishIntent ? 'Publish' : 'Save'}
          </button>
          <button
            style={{ ...ghostBtnStyle, marginTop: '8px' }}
            onClick={() => { setEditingName(false); setNamePublishIntent(false); }}
          >
            Cancel
          </button>
        </>
      );
    }

    // Not connected to Cloudflare — explain the flow before anything happens.
    if (auth === 'logged-out') {
      return renderIntro();
    }

    // Connection state not resolved yet — brief transient state on first open.
    if (auth === 'unknown') {
      return (
        <>
          <div style={labelStyle}>Publish your app</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.text_secondary, fontSize: '12px', marginTop: '8px' }}>
            <Loader2 size={14} style={spinStyle} />
            Checking your Cloudflare connection…
          </div>
        </>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ── Popover heading ────────────────────────────────────── */}
        <div style={{ ...labelStyle, marginBottom: '0' }}>Publish your app</div>

        {/* ── Published to section (shown first when a URL exists) ── */}
        {publishedUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {sectionHeader('Published to', <CircleCheck size={14} color="#34c759" />)}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <a href={publishedLink} target="_blank" rel="noreferrer" onClick={handleExternalLinkClick}
                style={{ display: 'block', flex: 1, fontSize: '12px', color: theme.accent_default, wordBreak: 'break-all', lineHeight: '1.4', textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
              >
                {publishedLink}
              </a>
              <button
                onClick={() => handleCopyLink(publishedLink)}
                data-tooltip="Copy link"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '20px', height: '20px', flexShrink: 0,
                  height: '15px',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: copied ? '#34c759' : theme.text_secondary,
                }}
                onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = theme.text_default; }}
                onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = theme.text_secondary; }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            {lastPublishedAt && (
              <span style={{ fontSize: '12px', color: theme.text_tertiary }}>Last published {formatPublishDate(lastPublishedAt)}</span>
            )}
            {deployHistory.length > 0 && (
              <DeployHistory history={deployHistory} open={historyOpen} onToggle={() => setHistoryOpen(v => !v)} />
            )}
          </div>
        )}

        {/* ── Deploy section ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {sectionHeader(publishedUrl ? 'Publish changes' : 'Publish project')}

          {nameIsSaved ? (
            <>
              {/* Show saved project name as a label with Edit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: theme.text_secondary, fontWeight: 500 }}>{savedProjectName}</span>
                <button
                  onClick={() => openNameForm(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                    color: theme.text_secondary, fontSize: '12px', fontFamily: theme.font_ui,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme.text_default; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = theme.text_secondary; }}
                >
                  <Pencil size={10} />
                  Edit project name
                </button>
              </div>
              {publishedUrl && (
                <span style={{ fontSize: '12px', color: theme.text_tertiary}}>
                  The link stays the same.
                </span>
              )}
              <button
                onClick={() => handlePublish()}
                style={{ ...primaryBtnStyle, marginTop: '8px' }}
                {...primarySolidHover(true)}
              >
                {publishedUrl ? 'Publish update' : 'Publish to Cloudflare'}
              </button>
            </>
          ) : (
            /* No project name yet — the publish button opens the name form and then publishes */
            <button
              onClick={() => openNameForm(true)}
              style={{ ...actionBtnBase, marginTop: '8px' }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <CloudflareLogo size={16} />
              Publish to Cloudflare
            </button>
          )}
        </div>

        {/* ── Connection footer ──────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: theme.text_secondary, borderTop: `1px solid ${theme.border_secondary}`, paddingTop: '10px' }}>
          <CloudflareLogo size={14} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {accountEmail ? `Connected as ${accountEmail}` : 'Connected to Cloudflare'}
          </span>
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
          backgroundColor: open ? theme.bg_secondary : hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
          color: open ? theme.text_default : theme.text_secondary,
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
            width: '320px',
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
                border: 'none', background: menuOpen ? theme.bg_secondary : 'transparent',
                color: theme.text_secondary, cursor: 'pointer',
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
                fontSize: '12px', lineHeight: '1.4',
              }}
            >
              <CircleCheck size={13} color="#34c759" style={{ flexShrink: 0 }} />
              <span>You logged out of Cloudflare. Connect again anytime to publish.</span>
            </div>
          )}
          {renderBody()}
        </div>
      )}
    </>
  );
}
