const fs = require('fs');
let code = fs.readFileSync('src/main.ts', 'utf8');

// remove from renderState
code = code.replace(/    renderCouncil\(state\);\n/g, '');
code = code.replace(/    renderGovernmentInputs\(state\);\n/g, '');
code = code.replace(/    renderTechnology\(state\);\n/g, '');

fs.writeFileSync('src/main.ts', code);
console.log('Cleaned main.ts calls');

