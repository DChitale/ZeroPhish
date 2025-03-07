const fs = require('fs');
const path = require('path');

// Files to copy
const files = [
  'background.js',
  'content.js',
  'manifest.json',
  'icon.png'
];

// Copy each file from public to dist
files.forEach(file => {
  const sourcePath = path.join(__dirname, 'public', file);
  const destPath = path.join(__dirname, 'dist', file);
  
  try {
    const data = fs.readFileSync(sourcePath);
    fs.writeFileSync(destPath, data);
    console.log(`Copied ${file} successfully!`);
  } catch (err) {
    console.error(`Error copying ${file}:`, err);
  }
});

console.log('All files copied to dist directory!'); 