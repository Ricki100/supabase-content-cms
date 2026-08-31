import { readFile, access } from 'node:fs/promises';

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

const filesToScan = await Promise.all(required
  .filter((file) => /\.(?:js|html|sql|md)$/.test(file))
  .map(async (file) => [file, await readFile(new URL(`../${file}`, import.meta.url), 'utf8')]));

const forbidden = [
  /ftneltjlpiatfkcwougg/i,
  /rchitagu@gmail\.com/i,
  /ricreations\.co\.za/i,
  /eyJ[a-zA-Z0-9_-]{20,}\./
];

for (const [file, content] of filesToScan) {
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error(`Site-specific value found in ${file}: ${pattern}`);
  }
}

console.log(`Verified ${required.length} required files; no site-specific credentials or identifiers found.`);
