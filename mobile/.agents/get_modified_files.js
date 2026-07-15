const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (file === 'node_modules' || file === '.git' || file === '.agents' || file === '.expo' || file === '.idea' || file === 'dist' || file === 'dist-test') {
        continue;
      }
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getFiles(filePath, fileList);
      } else {
        fileList.push({ path: filePath, mtime: stat.mtime });
      }
    }
  } catch (err) {
    // Ignore permission/missing file errors
  }
  return fileList;
}

try {
  const rootDir = 'c:/Users/joti.SIMPLO/Documents/CURSOR/Epochs Idle/mobile';
  const allFiles = getFiles(rootDir);
  allFiles.sort((a, b) => b.mtime - a.mtime);
  const top5 = allFiles.slice(0, 5);
  console.log(JSON.stringify(top5, null, 2));
} catch (e) {
  console.error(e);
}
