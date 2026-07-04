import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. button hover states
    content = content.replace(/hover:bg-brand-600/g, 'hover:bg-brand-400');
    
    // 2. slate to stone
    content = content.replace(/slate-/g, 'stone-');
    
    // 3. shadows
    content = content.replace(/shadow-sm/g, 'shadow-warm');
    content = content.replace(/shadow-2xl/g, 'shadow-warm-lg');
    content = content.replace(/shadow-xl/g, 'shadow-warm-lg');
    content = content.replace(/shadow-lg/g, 'shadow-warm-lg');

    // 4. card radius (rounded-2xl to rounded-3xl on main containers, need some heuristic or replace all and fix manually)
    // Actually, style guide says "Selectively change rounded-2xl to rounded-3xl on top-level cards/sections/modals only... don't blind-replace". 
    // I will not blind-replace rounded-2xl here, I'll do that manually for the specific cards in the components.

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
