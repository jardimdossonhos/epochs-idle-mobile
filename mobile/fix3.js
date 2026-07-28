const fs = require('fs');

let bootPath = 'src/application/boot/create-initial-state.ts';
let bootContent = fs.readFileSync(bootPath, 'utf8');
bootContent = bootContent.replace(/armies:\s*\[\s*\{/g, 'armies: [{ _poolIdx: -1, generation: 0, isActive: true, ownerId: id,');
fs.writeFileSync(bootPath, bootContent, 'utf8');

let govPath = 'src/ui/screens/GovScreen.tsx';
let govContent = fs.readFileSync(govPath, 'utf8');
govContent = govContent.replace(/playerFaith/g, 'playerLegitimacy');
govContent = govContent.replace(/playerStability/g, 'playerLegitimacy');
govContent = govContent.replace(/session\.currentState/g, '(session as any).state');
fs.writeFileSync(govPath, govContent, 'utf8');
console.log('Fixed');
