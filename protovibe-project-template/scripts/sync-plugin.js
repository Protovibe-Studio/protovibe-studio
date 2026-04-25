import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateDir = path.resolve(__dirname, '..');
const sourceDir = path.join(templateDir, 'plugins', 'protovibe');
const projectsDir = path.resolve(templateDir, '..', 'projects');

const EXCLUDE = new Set(['node_modules', 'dist']);

if (!fs.existsSync(sourceDir)) {
  console.error(`Source plugin not found at ${sourceDir}`);
  process.exit(1);
}

if (!fs.existsSync(projectsDir)) {
  console.error(`Projects directory not found at ${projectsDir}`);
  process.exit(1);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    if (!entry.isDirectory() && entry.name.endsWith('.lock')) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanDir(src, dest) {
  if (!fs.existsSync(dest)) return;
  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    if (!entry.isDirectory() && entry.name.endsWith('.lock')) continue;
    const destPath = path.join(dest, entry.name);
    const srcPath = path.join(src, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(srcPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      } else {
        cleanDir(srcPath, destPath);
      }
    } else {
      if (!fs.existsSync(srcPath)) {
        fs.unlinkSync(destPath);
      }
    }
  }
}

let synced = 0;
let skipped = 0;

for (const projectName of fs.readdirSync(projectsDir)) {
  const projectPath = path.join(projectsDir, projectName);
  if (!fs.statSync(projectPath).isDirectory()) continue;

  const targetDir = path.join(projectPath, 'plugins', 'protovibe');
  if (!fs.existsSync(targetDir)) {
    console.log(`⊘ ${projectName} — no plugins/protovibe/, skipping`);
    skipped++;
    continue;
  }

  console.log(`↗ ${projectName}`);
  cleanDir(sourceDir, targetDir);
  copyDir(sourceDir, targetDir);

  const dataPath = path.join(projectPath, 'protovibe-data.json');
  let data = {};
  if (fs.existsSync(dataPath)) {
    try { data = JSON.parse(fs.readFileSync(dataPath, 'utf-8')); } catch { /* overwrite */ }
  }
  data['plugin-last-updated'] = new Date().toISOString().split('T')[0];
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');

  synced++;
}

console.log(`\nDone. Synced: ${synced}, Skipped: ${skipped}`);
