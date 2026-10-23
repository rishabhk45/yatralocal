const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') checkDir(full);
    } else if (f.endsWith('.js') || f.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      const importRegex = /(?:from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|src=['"]([^'"]+\.js)['"])/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const target = match[1] || match[2] || match[3];
        if (target.startsWith('http') || target.startsWith('data:') || target.startsWith('twilio') || target === 'crypto') continue;
        const resolved = path.resolve(path.dirname(full), target);
        if (!fs.existsSync(resolved)) {
          console.error('MISSING TARGET:', full, '->', target);
        } else {
          const parent = path.dirname(resolved);
          const base = path.basename(resolved);
          const actualFiles = fs.readdirSync(parent);
          if (!actualFiles.includes(base)) {
            console.error('CASE MISMATCH:', full, '->', target, 'actual:', actualFiles.find(x => x.toLowerCase() === base.toLowerCase()));
          }
        }
      }
    }
  }
}
checkDir('.');
console.log('Done verifying imports.');
