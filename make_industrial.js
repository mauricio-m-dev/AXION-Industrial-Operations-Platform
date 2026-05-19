import fs from 'fs';
import path from 'path';

const walk = (dir, callback) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.snyk', '.vscode'].includes(file)) {
        walk(filepath, callback);
      }
    } else {
      if (filepath.match(/\.(ts|tsx|css)$/)) {
        callback(filepath);
      }
    }
  }
};

walk('./src', (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let newContent = content
    .replace(/rounded-2xl/g, 'rounded-sm')
    .replace(/rounded-xl/g, 'rounded-sm')
    .replace(/rounded-3xl/g, 'rounded-none')
    .replace(/rounded-lg/g, 'rounded-sm')
    // Remove shadow colors that give a soft look, replace with hard simple shadows if any
    .replace(/shadow-xl/g, 'shadow-md')
    .replace(/shadow-lg/g, 'shadow-md');
    
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`Sharpened UI edges in ${filepath}`);
  }
});
