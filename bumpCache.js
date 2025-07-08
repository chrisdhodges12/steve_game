import fs from 'fs';

const swPath = './sw.js';
const swContent = fs.readFileSync(swPath, 'utf8');

const updatedContent = swContent.replace(
  /(const CACHE_NAME\s*=\s*['"].+?-v)(\d+)(['"])/,
  (match, prefix, version, suffix) => {
    const newVersion = parseInt(version) + 1;
    console.log(`Bumping cache version: v${version} → v${newVersion}`);
    return `${prefix}${newVersion}${suffix}`;
  }
);

fs.writeFileSync(swPath, updatedContent, 'utf8');

console.log('✅ sw.js cache version updated.');