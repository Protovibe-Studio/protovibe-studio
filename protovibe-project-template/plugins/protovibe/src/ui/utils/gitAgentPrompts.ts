// plugins/protovibe/src/ui/utils/gitAgentPrompts.ts
// Ready-to-paste prompts for the user's coding agent when anything Git-related
// goes wrong in Protovibe.
//
// Protovibe's users are designers and copywriters — many have never opened a
// terminal and don't know what a repository or a remote is. So these prompts do
// two jobs: they tell the agent what to fix, and they tell it *how to talk*
// while fixing it (one numbered step at a time, plain words, nothing assumed).
//
// The GitHub sign-in prompt is the important one: almost every "sync failed" a
// designer hits is really "this computer was never signed in to GitHub", and the
// fix is the GitHub CLI plus `gh auth login` — which the user has to type
// themselves, so the agent must walk them all the way from "where is the
// Terminal app" to "you can go back to Protovibe now".

export type OsKind = 'macOS' | 'Windows' | 'Linux';

export function detectOs(): OsKind {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Win/i.test(ua)) return 'Windows';
  return 'Linux';
}

/**
 * Why a git operation failed, as far as the UI needs to care.
 *  - `auth`           GitHub/the remote refused these credentials.
 *  - `remote-missing` the online copy of the project couldn't be found.
 *  - `other`          anything else (merge trouble, network, unknown).
 *
 * All three lead to the same offer of help — a designer can't act on the
 * difference — but the first two get a more confident on-screen sentence.
 */
export type GitFailureKind = 'auth' | 'remote-missing' | 'other';

const AUTH_RE =
  /permission denied|authentication failed|could not read (username|password|from remote)|terminal prompts disabled|invalid username or password|support for password authentication|publickey|access denied|access rights|unable to access|host key verification failed|\b(401|403)\b|forbidden|not granted|please tell me who you are/i;

const REMOTE_MISSING_RE =
  /repository not found|\b404\b|does not appear to be a git repository|no such remote|couldn't find remote ref|no configured push destination|no upstream|remote origin/i;

export function classifyGitFailure(text: string): GitFailureKind {
  if (REMOTE_MISSING_RE.test(text)) return 'remote-missing';
  if (AUTH_RE.test(text)) return 'auth';
  return 'other';
}

/** True when the failure is one the user's GitHub sign-in most likely explains. */
export function isGithubAccessFailure(text: string): boolean {
  const kind = classifyGitFailure(text);
  return kind === 'auth' || kind === 'remote-missing';
}

// ---------------------------------------------------------------------------
// shared prompt sections
// ---------------------------------------------------------------------------

// The agent has to answer the way the prompt is written — a correct fix
// explained in jargon is a failed fix for this user.
const TONE = `HOW TO TALK TO ME — this matters just as much as the fix:
- I am not technical at all. Assume I have never opened a Terminal, never used GitHub, and don't know what a repository, a remote, a command line, a package manager or credentials are.
- Explain it the way you would explain it to your grandmother: short numbered steps, everyday words, no jargon. If a technical word is unavoidable, say what it means in one plain sentence first.
- Give me ONE step at a time, then wait for me to say "done" before giving me the next one. Please don't paste a long list of steps at once.
- For every step, tell me exactly where to click or what to type (write the text out in full, exactly as I should type it), and tell me what I should see on screen afterwards so I know it worked.
- If what I describe doesn't match what you expected, ask me what I can see on my screen instead of guessing.
- Do everything you can do yourself. Only ask me to type something when it really has to be me.
- Please don't make me feel silly for not knowing any of this.`;

function installGhSection(os: OsKind): string {
  const perOs: Record<OsKind, string> = {
    macOS: `- If Homebrew is already installed on this Mac, use it: \`brew install gh\`
- If Homebrew is NOT installed, please do not install Homebrew just for this — it is a big detour for me. Instead download the official standalone GitHub CLI package for macOS (the \`.pkg\` file from https://github.com/cli/cli/releases/latest) and install that.`,
    Windows: `- If \`winget\` is available on this PC, use it: \`winget install --id GitHub.cli\`
- If \`winget\` is NOT available, please do not install a package manager just for this. Instead download the official standalone GitHub CLI installer for Windows (the \`.msi\` file from https://github.com/cli/cli/releases/latest) and run it.`,
    Linux: `- Prefer my distribution's official GitHub CLI package (the apt/dnf instructions at https://github.com/cli/cli/blob/trunk/docs/install_linux.md).
- If that isn't possible, please do not install a package manager just for this. Instead download the official standalone GitHub CLI build for Linux (the \`.tar.gz\` from https://github.com/cli/cli/releases/latest) and put \`gh\` on my PATH.`,
  };

  return `STEP 1 — INSTALL THE GITHUB HELPER (please do this part yourself, don't hand it to me)
Install the GitHub CLI — the \`gh\` command. It's the little helper that lets my computer prove to GitHub that I'm me.
${perOs[os]}
- When it's installed, check it yourself by running \`gh --version\`.
- Then just tell me, in one sentence, that you installed a helper and that I only have to do the next bit.`;
}

function openTerminalSteps(os: OsKind): string {
  const perOs: Record<OsKind, string> = {
    macOS: `Hold down the Command key (⌘ — it's right next to the space bar) and, while holding it, press the Spacebar. A little search box appears in the middle of the screen. Type the word Terminal and press Enter. A small window full of plain text opens — that window is the Terminal.`,
    Windows: `Press the Windows key on the keyboard (the one with the Windows logo, bottom-left, next to the space bar). A menu with a search box appears. Type the word PowerShell and press Enter. A window full of plain text opens — that window is the Terminal.`,
    Linux: `Hold down the Ctrl key and the Alt key together and press the letter T. A window full of plain text opens — that window is the Terminal. If nothing happens, look for an app called "Terminal" in my list of applications and open it.`,
  };

  return perOs[os];
}

function signInSection(os: OsKind): string {
  return `STEP 2 — SIGN ME IN TO GITHUB (I have to type this part myself, so please hold my hand)
1. First, help me open the Terminal app. I honestly do not know where it is or what it looks like. Tell me this, in your own gentle words:
   "${openTerminalSteps(os)}"
   Then ask me to tell you when I can see that window.
2. Ask me to click once inside that window (so it's listening to my keyboard), then type exactly this and press Enter:
   gh auth login
3. It will then ask me a few questions, one screen at a time. Walk me through them ONE at a time, and for each one tell me exactly which line to choose — I move up and down the list with the arrow keys and choose with the Enter key:
   - "What account do you want to log into?" → GitHub.com
   - "What is your preferred protocol for Git operations?" → HTTPS
   - "Authenticate Git with your GitHub credentials?" → Yes
   - "How would you like to authenticate GitHub CLI?" → Login with a web browser
4. It will then show me a short code of letters and numbers (something like ABCD-1234). Tell me to write it down or copy it, then press Enter — my web browser will open a GitHub page. Then tell me to type that code into the box, click Continue, sign in to GitHub if it asks me to (or create a free GitHub account if I don't have one — walk me through that too), and finally click the green Authorize button.
5. Back in the Terminal, ask me to type exactly this and press Enter:
   gh auth setup-git
   (this is the bit that lets my project actually upload — please don't skip it)
6. Tell me when I'm finished and can close the Terminal window.`;
}

const VERIFY_SECTION = `STEP 3 — CHECK IT REALLY WORKS (your job, not mine)
- In my project folder, run \`git push\` (or \`git fetch\` if there's nothing to send) yourself and make sure it goes through without asking for a password.
- Also check the project is pointing at the right place online: look at \`git remote -v\`. If there's no address at all, or it points at something that no longer exists, create or point it at the right GitHub project for me — make it private — set the upstream branch for my current branch, and push.
- If GitHub says I'm not allowed to upload to that project, explain in plain words who I should ask for access, or offer to move my work into a new private project under my own account.

WHEN IT'S ALL WORKING
Tell me in one simple sentence: "You can go back to Protovibe now and click Sync with Git again." Don't finish with a summary full of technical words — a short, friendly sentence is perfect.`;

function projectLine(root: string): string {
  return root ? `\n\nMy project folder is here: ${root}` : '';
}

function errorLine(error?: string): string {
  return error && error.trim()
    ? `\n\nThis is the exact error Protovibe got (I don't understand it):\n${error.trim()}`
    : '';
}

// ---------------------------------------------------------------------------
// prompts
// ---------------------------------------------------------------------------

function openingFor(kind: GitFailureKind, os: OsKind): string {
  const intro = `I'm using Protovibe — a visual design tool — on ${os}. I clicked the "Sync with Git" button to save and share my work, and it failed.`;

  if (kind === 'auth') {
    return `${intro}

Protovibe thinks GitHub refused to accept my work because this computer isn't signed in to GitHub. Please set up my GitHub sign-in on this computer for me, and then get my work synced.`;
  }
  if (kind === 'remote-missing') {
    return `${intro}

Protovibe couldn't find my project's online copy on GitHub. That usually means either this computer isn't signed in to GitHub (so GitHub pretends the project isn't there), or the project's online address is missing or wrong. Please sort both out for me, and then get my work synced.`;
  }
  return `${intro}

I don't understand the error message. Please look at it, fix whatever is wrong with Git or GitHub on this computer, and get my work synced. If it turns out this computer simply isn't signed in to GitHub, please set that up for me as well — that's the most common reason.`;
}

// Protovibe's GitHub connection exists but isn't allowed near this repository.
// The obvious remedy — tick the repo on GitHub's app-installation page — is one
// our users often can't carry out: on a company repository an owner or admin has
// to approve it. So the prompt asks the agent to find whichever route works,
// including the one that skips the Protovibe connection entirely (this machine
// pushing as the user, via gh), rather than assuming a setting they can flip.
const APP_NOT_PERMITTED = `ONE MORE THING PROTOVIBE TOLD ME
My GitHub account is connected to Protovibe, but GitHub hasn't given Protovibe permission for this particular project. I don't know how to change that, and I may not even be allowed to — the project might belong to my company, where someone else decides these things. Please don't just tell me to go and tick a box on GitHub; I won't know which one, and it may refuse me.
Instead, please work out which of these actually applies and take me through it:
- If it's my own project and I can grant the permission myself, walk me through it click by click.
- If someone else has to approve it, tell me exactly who to ask and give me the short message to send them, written so I can copy and paste it.
- Best of all: set this computer up to upload as ME (the gh sign-in below), which doesn't depend on that permission at all. If that's enough to get my work synced, just do that and tell me it's sorted.`;

/** The main "sync failed" prompt: sign this computer in to GitHub, end to end. */
export function syncFailurePrompt(
  kind: GitFailureKind,
  os: OsKind,
  root: string,
  error?: string,
  appNotPermitted = false,
): string {
  return [
    openingFor(kind, os),
    ...(appNotPermitted ? [APP_NOT_PERMITTED] : []),
    TONE,
    'WHAT I NEED YOU TO DO, IN ORDER',
    installGhSection(os),
    signInSection(os),
    VERIFY_SECTION,
  ].join('\n\n') + projectLine(root) + errorLine(error);
}

/** Git itself isn't on the machine yet (Protovibe normally provisions it). */
export function installGitPrompt(os: OsKind, root: string): string {
  return [
    `I'm using Protovibe — a visual design tool — on ${os}, and it tells me that Git isn't installed on this computer, so I can't save and share my work with my team. Please install Git for me, and while you're there set up my GitHub sign-in too, so that syncing works the first time I try it.`,
    TONE,
    'WHAT I NEED YOU TO DO, IN ORDER',
    `STEP 0 — INSTALL GIT (please do this yourself)
Install Git on this computer using the normal way for ${os}, and check it worked by running \`git --version\`. Don't install a package manager like Homebrew just for this if it isn't already there — use the official standalone installer instead.`,
    installGhSection(os),
    signInSection(os),
    VERIFY_SECTION,
  ].join('\n\n') + projectLine(root);
}

/** No repository here yet — create one and put it on GitHub. */
export function setupRepoPrompt(os: OsKind, root: string, error?: string): string {
  return [
    `I'm using Protovibe — a visual design tool — on ${os}, and I want to save my work online so I can share it with my team and not lose it. Protovibe tells me this project isn't set up for that yet. Please set the whole thing up for me: put this project under Git, create a new private project for it on my GitHub account, and upload it.`,
    TONE,
    'WHAT I NEED YOU TO DO, IN ORDER',
    installGhSection(os),
    signInSection(os),
    `STEP 3 — SET THE PROJECT UP (your job, not mine)
- Start version tracking in my project folder (\`git init\`), make a first save of everything that's there, create a new PRIVATE project on my GitHub account for it, connect the folder to it, set the upstream branch, and upload.
- Tell me in one plain sentence what the project is called on GitHub and that it's private (only me and people I invite can see it).`,
    VERIFY_SECTION,
  ].join('\n\n') + projectLine(root) + errorLine(error);
}

/** There's a repo, but no shared online copy to sync with. */
export function connectRemotePrompt(os: OsKind, root: string, error?: string): string {
  return [
    `I'm using Protovibe — a visual design tool — on ${os}. My project is under Git already, but it isn't connected to a shared online copy, so I can't sync my work with my team. Please connect it to GitHub for me and upload what I have.`,
    TONE,
    'WHAT I NEED YOU TO DO, IN ORDER',
    installGhSection(os),
    signInSection(os),
    `STEP 3 — CONNECT THE PROJECT (your job, not mine)
- Connect my project folder to a GitHub project — use the right existing one if my team already has it, otherwise create a new PRIVATE one on my account. Set the upstream branch for my current branch and upload my work.
- Tell me in one plain sentence what the project is called on GitHub and who can see it.`,
    VERIFY_SECTION,
  ].join('\n\n') + projectLine(root) + errorLine(error);
}
