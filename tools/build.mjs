// npm run build — compiles Tailwind and regenerates sw.js (precache list + content-hash cache version).
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

execSync('npx tailwindcss -c tailwind.config.js -i css/src.css -o css/tailwind.css --minify', { stdio: 'inherit' });
const skip = (p) => ['sw.js', 'css/src.css', 'package.json', 'package-lock.json', 'tailwind.config.js', 'README.md', 'start.bat', 'start.sh'].includes(p)
  || p.startsWith('tools/') || p.startsWith('node_modules/') || p.startsWith('raw/') || p.startsWith('.');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk('.').map((p) => relative('.', p).replaceAll('\\', '/')).filter((p) => !skip(p)).sort();
const h = createHash('sha1'); files.forEach((p) => { h.update(p); h.update(readFileSync(p)); });
const version = h.digest('hex').slice(0, 10);
writeFileSync('sw.js', readFileSync('tools/sw.template.js', 'utf8').replace('__VERSION__', version).replace('__ASSETS__', JSON.stringify(['./', ...files], null, 1)));
console.log(`sw.js v${version} — ${files.length} precached files`);
