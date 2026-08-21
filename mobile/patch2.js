const fs = require('fs');
let code = fs.readFileSync('src/application/game-session.ts', 'utf8');

code = code.replace(
    'ownerId: canonicalOwner,\n        actionCooldowns: {}',
    'ownerId: canonicalOwner,\n        actionCooldowns: {},\n        regionId: regionId,\n        controllerId: canonicalOwner'
);

fs.writeFileSync('src/application/game-session.ts', code, 'utf8');