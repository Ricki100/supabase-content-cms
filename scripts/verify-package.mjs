import { readFile, access, readdir } from 'node:fs/promises';

const required = [
  'admin/index.html',
  'admin/admin.js',
  'admin/admin.css',
  'assets/js/cms-public.js',
  'assets/js/supabase-config.js',
  'assets/js/supabase-config.example.js',
  'supabase/schema.sql',
  'README.md',
  'SECURITY.md'
];

for (const file of required) await access(new URL(`../${file}`, import.meta.url));

const root = new URL('../', import.meta.url);
const textFilePattern = /\.(?:css|html|js|json|md|mjs|sql|txt|yml|yaml)$/i;

async function collectTextFiles(directory = root, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const entryUrl = new URL(`${relativePath}${entry.isDirectory() ? '/' : ''}`, root);
    if (entry.isDirectory()) files.push(...await collectTextFiles(entryUrl, relativePath));
    else if (textFilePattern.test(entry.name)) files.push(relativePath);
  }
  return files;
}

const scanFiles = await collectTextFiles();
const filesToScan = await Promise.all(scanFiles
  .map(async (file) => [file, await readFile(new URL(file, root), 'utf8')]));

const forbidden = [
  /https:\/\/(?!YOUR_PROJECT_REF)[a-z0-9-]+\.supabase\.co/i,
  /sb_publishable_[a-zA-Z0-9_-]{16,}/,
  /eyJ[a-zA-Z0-9_-]{20,}\./
];

for (const [file, content] of filesToScan) {
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error(`Site-specific value found in ${file}: ${pattern}`);
  }
}

const config = await readFile(new URL('assets/js/supabase-config.js', root), 'utf8');
const portablePlaceholders = [
  "url: 'https://YOUR_PROJECT_REF.supabase.co'",
  "publishableKey: 'YOUR_PUBLISHABLE_KEY'",
  "siteName: 'My Site'",
  "siteUrl: 'https://example.com'"
];

for (const placeholder of portablePlaceholders) {
  if (!config.includes(placeholder)) {
    throw new Error(`assets/js/supabase-config.js must remain generic. Missing: ${placeholder}`);
  }
}

console.log(`Verified ${required.length} required files and scanned ${scanFiles.length} text files; no site-specific credentials or identifiers found.`);
