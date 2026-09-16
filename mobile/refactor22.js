const fs = require('fs');
let p = 'src/infrastructure/sync/local-sync-adapter.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(/,\r?\n  StateSnapshot/, '');
code = code.replace(/  public async getSnapshots[\s\S]*?\}\r?\n/g, '');
code = code.replace(/  public async getSnapshot[\s\S]*?\}\r?\n/g, '');
code = code.replace(/  public async downloadSnapshot[\s\S]*?\}\r?\n/g, '');
code = code.replace(/  public async uploadSnapshot[\s\S]*?\}\r?\n/g, '');
code = code.replace(/  public async listSnapshots[\s\S]*?\}\r?\n/g, '');
code = code.replace(/  public async processPeerSnapshot[\s\S]*?\}\r?\n/g, '');

fs.writeFileSync(p, code);