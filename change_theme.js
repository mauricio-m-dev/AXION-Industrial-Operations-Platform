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
    .replace(/slate/g, 'zinc')
    .replace(/#020817/g, '#000000') // Replace very dark blue with pure black
    .replace(/#0f172a/g, '#09090b') // Replace slate-900 dark with zinc-950
    .replace(/#1e293b/g, '#18181b') // Replace slate-800 with zinc-900
    .replace(/#0f172a/gi, '#09090b');
    
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`Updated colors in ${filepath}`);
  }
});
