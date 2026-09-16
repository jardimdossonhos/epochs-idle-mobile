const { checkEvidenceValidity } = require('./evidence');

const { valid, reason, evidence } = checkEvidenceValidity();

if (!valid) {
  console.log(`EVIDENCE INVALIDATED: ${reason}`);
  process.exit(1);
} else {
  console.log('EVIDENCE VALID.');
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(0);
}
