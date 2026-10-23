const fs = require('fs');
const path = require('path');

function checkFetches(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') checkFetches(full);
    } else if (f.endsWith('.js') || f.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      const fetchRegex = /fetch\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = fetchRegex.exec(content)) !== null) {
        const url = match[1];
        if (url.startsWith('http') || url.startsWith('//') || url.startsWith('/.netlify') || url.startsWith('/api') || url.includes('${')) continue;
        
        let localPath = url;
        if (localPath.startsWith('/')) localPath = '.' + localPath;
        const resolved = path.resolve(localPath);
        if (!fs.existsSync(resolved)) {
          console.error('FETCH MISSING:', full, '->', url, 'resolved:', resolved);
        } else {
          const parent = path.dirname(resolved);
          const base = path.basename(resolved);
          const actualFiles = fs.readdirSync(parent);
          if (!actualFiles.includes(base)) {
            console.error('FETCH CASE MISMATCH:', full, '->', url, 'actual:', actualFiles.find(x => x.toLowerCase() === base.toLowerCase()));
          }
        }
      }
    }
  }
}

checkFetches('.');
console.log('All fetch calls verified.');
