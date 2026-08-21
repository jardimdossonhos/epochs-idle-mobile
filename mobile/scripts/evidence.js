const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const LOG_DIR = path.resolve(__dirname, '..', '.verify-logs');
const EVIDENCE_FILE = path.join(LOG_DIR, 'evidence.json');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getGitCommit() {
  try {
    return spawnSync('git', ['rev-parse', 'HEAD']).stdout.toString().trim();
  } catch (e) {
    return 'unknown';
  }
}

function getRelevantGitStatus() {
  try {
    const status = spawnSync('git', ['status', '--short']).stdout.toString().trim();
    if (!status) return '';
    const lines = status.split('\n');
    const relevantLines = lines.filter(line => {
      const match = line.match(/^.{2}\s+(.*)$/);
      if (!match) return false;
      let filePath = match[1].trim();
      if (filePath.startsWith('"') && filePath.endsWith('"')) {
        filePath = filePath.slice(1, -1);
      }
      
      if (filePath.startsWith('src/') || filePath.startsWith('android/') || filePath.startsWith('ios/')) return true;
      if (filePath === 'package.json' || filePath === 'package-lock.json' || filePath === 'app.json' || filePath === 'eas.json' || filePath === 'tsconfig.json') return true;
      if (filePath.startsWith('app.config.') || filePath.startsWith('babel.config.') || filePath.startsWith('metro.config.')) return true;
      if (filePath === 'scripts/find-adb.js' || filePath === 'scripts/verify.js' || filePath === 'scripts/android-verify.js' || filePath === 'scripts/evidence.js' || filePath === 'scripts/check-evidence.js') return true;
      
      return false;
    });
    return relevantLines.join('\n');
  } catch (e) {
    return 'unknown';
  }
}

function readEvidence() {
  if (fs.existsSync(EVIDENCE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(EVIDENCE_FILE, 'utf8'));
    } catch (e) {}
  }
  return { history: [] };
}

function updateEvidence(data) {
  ensureDir();
  const current = readEvidence();
  const commit = getGitCommit();
  const statusHash = getRelevantGitStatus();

  const entry = {
    timestamp: new Date().toISOString(),
    commit,
    statusHash,
    ...data
  };

  // Se já houver uma entrada para o mesmo commit e statusHash, podemos mesclar
  const last = current.history[current.history.length - 1];
  if (last && last.commit === commit && last.statusHash === statusHash) {
    Object.assign(last, entry);
  } else {
    current.history.push(entry);
    if (current.history.length > 10) current.history.shift(); // manter os últimos 10
  }

  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(current, null, 2));
  return entry;
}

function checkEvidenceValidity() {
  const current = readEvidence();
  const last = current.history[current.history.length - 1];
  if (!last) return { valid: false, reason: 'No evidence found' };

  const commit = getGitCommit();
  const statusHash = getRelevantGitStatus();

  if (last.commit !== commit) return { valid: false, reason: 'Commit changed' };
  if (last.statusHash !== statusHash) return { valid: false, reason: 'Uncommitted changes modified' };

  return { valid: true, evidence: last };
}

module.exports = {
  updateEvidence,
  checkEvidenceValidity
};
