const fs = require('fs');
let code = fs.readFileSync('src/application/game-session.ts', 'utf8');
code += '\n}\n';
fs.writeFileSync('src/application/game-session.ts', code);