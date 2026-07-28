const fs = require('fs');
const path = require('path');

function replaceFile(filePath, searchRegex, replacement) {
    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8');
    const newContent = content.replace(searchRegex, replacement);
    fs.writeFileSync(fullPath, newContent, 'utf8');
}

// 1. MobileGameStateRepository
replaceFile(
  'src/infrastructure/persistence/MobileGameStateRepository.ts',
  /async saveToSlot\(slotId: SaveSlotId, snapshot: SaveSnapshot\): Promise<void> \{\s*mmkvStorage\.set\(`save_\$\{slotId\}`/g,
  'async saveToSlot(snapshot: SaveSnapshot): Promise<void> {\n    const slotId = snapshot.summary.slotId;\n    mmkvStorage.set(`save_${slotId}`'
);

// 2. LoadGameModal
replaceFile(
  'src/ui/components/LoadGameModal.tsx',
  /const keys = mmkvStorage.getAllKeys\(\)\.filter\(k => k\.startsWith\('save_'\)\);/g,
  "const keys = mmkvStorage.getAllKeys().filter((k: string) => k.startsWith('save_'));"
);
replaceFile(
  'src/ui/components/LoadGameModal.tsx',
  /const formattedSlots = keys\.map\(k => \(\{ slotId: k, culture: 'N\/A' \}\)\);/g,
  "const formattedSlots = keys.map((k: string) => ({ slotId: k, culture: 'N/A' }));"
);

// 3. MainMenu
replaceFile(
  'src/ui/screens/MainMenu.tsx',
  /setSaveList\(keys\.filter\(k => k\.startsWith\('save_'\)\)\);/g,
  "setSaveList(keys.filter((k: string) => k.startsWith('save_')));"
);

// 4. GameProvider imports
replaceFile(
  'src/ui/GameProvider.tsx',
  /import \{ MemoryCommandLogRepository \}.*;\n/g,
  ''
);
replaceFile(
  'src/ui/GameProvider.tsx',
  /import \{ MemorySnapshotRepository \}.*;\n/g,
  ''
);

console.log("Fixes applied.");
