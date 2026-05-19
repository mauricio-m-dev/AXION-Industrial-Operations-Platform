import fs from 'fs';
import path from 'path';

const walk = (dir, callback) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        walk(filepath, callback);
      }
    } else {
      if (filepath.endsWith('.tsx') || filepath.endsWith('.ts') || filepath.endsWith('.css')) {
        callback(filepath);
      }
    }
  }
};

walk('src', (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let newContent = content
    .replace(/bg-blue-/g, 'bg-red-')
    .replace(/text-blue-/g, 'text-red-')
    .replace(/border-blue-/g, 'border-red-')
    .replace(/ring-blue-/g, 'ring-red-')
    .replace(/hover:bg-blue-/g, 'hover:bg-red-')
    .replace(/hover:text-blue-/g, 'hover:text-red-')
    .replace(/dark:text-blue-/g, 'dark:text-red-')
    .replace(/dark:bg-blue-/g, 'dark:bg-red-')
    .replace(/dark:border-blue-/g, 'dark:border-red-')
    .replace(/#2563EB/ig, '#DC2626')
    .replace(/#1D4ED8/ig, '#B91C1C')
    .replace(/#3b82f6/ig, '#ef4444');
    
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`Updated colors in ${filepath}`);
  }
});
