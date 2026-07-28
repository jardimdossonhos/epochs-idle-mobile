const fs = require('fs');
let lines = fs.readFileSync('src/main.ts', 'utf8').split('\n');

function deleteFunction(funcName) {
    let start = lines.findIndex(l => l.includes('function ' + funcName));
    if (start === -1) return;
    let braces = 0;
    let end = start;
    for (let i = start; i < lines.length; i++) {
        braces += (lines[i].match(/\{/g) || []).length;
        braces -= (lines[i].match(/\}/g) || []).length;
        if (braces === 0 && i > start) {
            end = i;
            break;
        }
    }
    lines.splice(start, end - start + 1);
}

deleteFunction('renderGovernmentInputs');
deleteFunction('renderCouncil');
deleteFunction('renderTechnologyTree');
deleteFunction('renderTechnology');

fs.writeFileSync('src/main.ts', lines.join('\n'));
console.log('Cleaned main.ts functions');

