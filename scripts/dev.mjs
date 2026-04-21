import { concurrently } from 'concurrently';

// Force disable colors for all child processes spawned by this script
process.env.NO_COLOR = '1'; 
process.env.FORCE_COLOR = '0';

const MANAGER_READY = 'Local:';
const MANAGER_URL = 'http://127.0.0.1:5173/';
const EDITOR_URL_PATTERN = /(https?:\/\/\S+protovibe\.html)/;

let bannerShown = false;
let editorUrl = null;

function showBanner() {
  if (bannerShown) return;
  bannerShown = true;
  const green = (s) => `\x1b[32m${s}\x1b[0m`;
  console.log(green(`\nProject Manager:  ${MANAGER_URL}`));
  console.log(green(`Protovibe Editor: ${editorUrl ?? '(not detected)'}\n`));
}

const { commands } = concurrently(
  [
    {
      command: 'pnpm --dir protovibe-project-manager dev',
      name: 'manager',
      prefixColor: 'cyan',
    },
    {
      command: 'pnpm --dir protovibe-project-template/plugins/protovibe dev',
      name: 'plugin',
      prefixColor: 'yellow',
    },
    {
      command: 'pnpm --dir protovibe-project-template dev',
      name: 'template',
      prefixColor: 'green',
    },
  ],
  { prefix: 'name', killOthers: ['failure'] },
);

// Show banner after output settles across all processes
let managerReady = false;
let debounceTimer = null;

function scheduleBanner() {
  if (!managerReady) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(showBanner, 1000);
}

function parseLine(line) {
  return (typeof line === 'string' ? line : Buffer.from(line).toString())
    .replace(/\x1b\[[0-9;]*m/g, '');
}

commands[0].stdout.subscribe((line) => {
  const plain = parseLine(line);
  if (plain.includes(MANAGER_READY)) managerReady = true;
  scheduleBanner();
});

// commands[2] is the template dev server
commands[2].stdout.subscribe((line) => {
  const plain = parseLine(line);
  const match = plain.match(EDITOR_URL_PATTERN);
  if (match) editorUrl = match[1];
  scheduleBanner();
});

for (const cmd of commands) {
  cmd.stdout.subscribe(() => scheduleBanner());
  cmd.stderr.subscribe(() => scheduleBanner());
}
