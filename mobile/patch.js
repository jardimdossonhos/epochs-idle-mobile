const fs = require('fs');
let code = fs.readFileSync('src/ui/GameProvider.tsx', 'utf8');

code = code.replace(
    /Diagnostic\.trace\("SESSION-LIFECYCLE", "GameProvider montado"\);/,
    "Diagnostic.trace(\"SESSION-LIFECYCLE\", \"GameProvider montado\");\n    console.log(`[AUDIT-ECONOMY-LIFECYCLE] GameProvider onMount - Player Gold: ${initialState.kingdoms['k_player']?.economy.stock.gold}, UsedCap: ${initialState.kingdoms['k_player']?.administration.usedCapacity}`);"
);

fs.writeFileSync('src/ui/GameProvider.tsx', code, 'utf8');