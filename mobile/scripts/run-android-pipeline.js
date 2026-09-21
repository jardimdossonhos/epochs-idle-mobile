const { spawnSync } = require('child_process');

const isFull = process.argv.includes('--full-build');

console.log('\n[pipeline] Passo 1: Executando verify.js...');
const verify = spawnSync('node', ['scripts/verify.js'], { stdio: 'inherit' });
const verifyExit = verify.status;

console.log(`\n[pipeline] Passo 2: Executando android-verify.js${isFull ? ' --full-build' : ''}...`);
const args = ['scripts/android-verify.js'];
if (isFull) args.push('--full-build');
const android = spawnSync('node', args, { stdio: 'inherit' });
const androidExit = android.status;

console.log('\n[pipeline] ==========================================');
console.log(`[pipeline] VERIFY_EXIT  = ${verifyExit}`);
console.log(`[pipeline] ANDROID_EXIT = ${androidExit}`);
const finalStatus = (verifyExit === 0 && androidExit === 0) ? 0 : 1;
console.log(`[pipeline] FINAL_STATUS = ${finalStatus}`);
process.exit(finalStatus);
