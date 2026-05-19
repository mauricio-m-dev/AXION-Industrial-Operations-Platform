import fs from 'fs';
import path from 'path';

const walk = (dir, callback) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.snyk', '.vscode', 'e2e'].includes(file)) {
        walk(filepath, callback);
      }
    } else {
      if (filepath.match(/\.(ts|tsx|js|html|json|yml|md|sh|ps1|conf)$/) && !file.includes('package-lock.json')) {
        callback(filepath);
      }
    }
  }
};

walk('.', (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let newContent = content
    .replace(/axion/g, 'axion')
    .replace(/Axion/g, 'Axion')
    .replace(/AXION/g, 'AXION');
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`Updated ${filepath}`);
  }
});
