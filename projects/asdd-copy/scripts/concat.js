import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = process.argv[2] || 'all';
const rootDir = path.resolve(__dirname, '..');
const outputFile = path.resolve(rootDir, '..', `concatenated-${path.basename(rootDir)}-${mode}.txt`);

try {
  const filesSync = execSync('git ls-files', { cwd: rootDir, encoding: 'utf-8' });
  const files = filesSync.split('\n').filter(Boolean);

  const allowedExtensions = ['.ts', '.tsx', '.js', '.cjs', '.jsx', '.css', '.html', '.json', '.md', '.mdx'];
  let output = '';

  files.forEach(file => {
    const ext = path.extname(file);
    if (!allowedExtensions.includes(ext)) return;

    if (mode === 'plugins' && !file.startsWith('plugins/')) return;
    if (mode === 'no-ui' && file.includes('components/ui/')) return;

    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    output += `\n\n// =============================================\n`;
    output += `// FILE: ${file}\n`;
    output += `// =============================================\n\n`;
    output += content;
  });

  fs.writeFileSync(outputFile, output, 'utf-8');
  console.log(`✅ Successfully concatenated files for mode "${mode}".`);
  console.log(`📂 Output saved to: ${outputFile}\n`);
} catch (error) {
  console.error("Failed to concatenate project:", error.message);
}
