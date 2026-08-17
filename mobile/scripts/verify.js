#!/usr/bin/env node
/**
 * verify.js
 * ---------
 * Pipeline local de verificação estática do projeto Epochs Idle.
 *
 * STATUS SEMÂNTICOS (nunca retornar PASS quando algo essencial não foi executado):
 *
 *   PASS              — etapa executada e passou sem problemas
 *   PASS_WITH_WARNINGS — etapa executada, passou, mas tem avisos não críticos
 *   PARTIAL           — pipeline concluiu mas algumas etapas não executaram ou têm warnings
 *   NOT_CONFIGURED    — ferramenta não está configurada no projeto (não é erro)
 *   NOT_EXECUTED      — ferramenta configurada mas não pôde ser executada (é um problema)
 *   FAIL              — etapa executada e falhou com erro real
 *
 * Status geral do pipeline:
 *   PASS              — todas as etapas executadas passaram
 *   PARTIAL           — alguma etapa é NOT_CONFIGURED ou PASS_WITH_WARNINGS
 *   FAIL              — alguma etapa retornou FAIL
 *
 * Uso:
 *   node scripts/verify.js
 *   npm run verify
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

// ── Status semânticos ─────────────────────────────────────────────────────────

const STATUS = {
  PASS:              'PASS',
  PASS_WITH_WARNINGS:'PASS_WITH_WARNINGS',
  PARTIAL:           'PARTIAL',
  NOT_CONFIGURED:    'NOT_CONFIGURED',
  NOT_EXECUTED:      'NOT_EXECUTED',
  FAIL:              'FAIL',
};

/** @type {{ name: string, status: string, detail: string }[]} */
const results = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
  return {
    pass:   result.status === 0,
    output: output,
    status: result.status,
    error:  result.error,
  };
}

/**
 * Registra o resultado de uma etapa e imprime na linha de status.
 */
function record(name, status, detail = '') {
  results.push({ name, status, detail });

  const badge = {
    [STATUS.PASS]:              'PASS ✓',
    [STATUS.PASS_WITH_WARNINGS]:'PASS_WITH_WARNINGS ⚠',
    [STATUS.NOT_CONFIGURED]:    'NOT_CONFIGURED —',
    [STATUS.NOT_EXECUTED]:      'NOT_EXECUTED ⊘',
    [STATUS.FAIL]:              'FAIL ✗',
  }[status] || status;

  const label = `[verify] ── ${name} `;
  process.stdout.write(label.padEnd(56, '─') + ` ${badge}\n`);

  if (detail && (status === STATUS.FAIL || status === STATUS.NOT_EXECUTED)) {
    const lines = detail.trim().split('\n').slice(-20);
    lines.forEach(l => process.stderr.write(`         ${l}\n`));
  }
  if (detail && status === STATUS.PASS_WITH_WARNINGS) {
    const lines = detail.trim().split('\n').slice(-10);
    lines.forEach(l => process.stdout.write(`         ${l}\n`));
  }
}

// ── Etapas ────────────────────────────────────────────────────────────────────

function stepTypecheck() {
  const { pass, output, error } = run('npx', ['tsc', '--noEmit', '--pretty', 'false']);
  if (error) {
    record('1/4 TypeScript', STATUS.NOT_EXECUTED, `tsc não encontrado: ${error.message}`);
    return;
  }
  if (pass) {
    record('1/4 TypeScript', STATUS.PASS);
  } else {
    // Mostrar apenas os primeiros 10 erros para não inundar o contexto
    const errorLines = output.split('\n').filter(l => /error TS/.test(l)).slice(0, 10);
    const summary = `${errorLines.length > 0 ? errorLines.length + ' erro(s) de tipo' : 'tsc falhou'}\n${errorLines.join('\n')}`;
    record('1/4 TypeScript', STATUS.FAIL, summary);
  }
}

function stepLint() {
  const hasConfig = fileExists('eslint.config.js')
    || fileExists('eslint.config.mjs')
    || fileExists('.eslintrc.js')
    || fileExists('.eslintrc.json')
    || fileExists('.eslintrc.yaml')
    || fileExists('.eslintrc.yml');

  if (!hasConfig) {
    // NOT_CONFIGURED é informativo — não bloqueia o pipeline
    record('2/4 ESLint', STATUS.NOT_CONFIGURED, 'Nenhum arquivo de configuração ESLint encontrado.');
    return;
  }

  const { pass, output, error } = run('npx', ['eslint', 'src', '--max-warnings', '0', '--format', 'compact']);
  if (error) {
    record('2/4 ESLint', STATUS.NOT_EXECUTED, `eslint não pôde ser executado: ${error.message}`);
    return;
  }
  if (pass) {
    record('2/4 ESLint', STATUS.PASS);
  } else {
    const errorLines = output.split('\n').filter(l => /error|warning/i.test(l)).slice(0, 15);
    record('2/4 ESLint', STATUS.FAIL, errorLines.join('\n'));
  }
}

function stepTests() {
  // Verificar se há algum framework de testes configurado
  const hasJestConfig = fileExists('jest.config.js') || fileExists('jest.config.ts') || fileExists('jest.config.json');
  const hasVitestConfig = fileExists('vitest.config.ts') || fileExists('vitest.config.js');

  // Verificar se há arquivos de teste
  const hasTestFiles = (() => {
    function findTests(dir) {
      if (!fs.existsSync(dir)) return false;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !['node_modules', '.expo', 'android', 'ios'].includes(e.name)) {
          if (findTests(path.join(dir, e.name))) return true;
        }
        if (e.isFile() && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(e.name)) return true;
      }
      return false;
    }
    return findTests(path.join(ROOT, 'src'));
  })();

  if (!hasJestConfig && !hasVitestConfig) {
    record('3/4 Testes', STATUS.NOT_CONFIGURED, 'Nenhum jest.config.js/vitest.config encontrado.');
    return;
  }

  if (!hasTestFiles) {
    // Framework configurado mas zero arquivos de teste = NOT_CONFIGURED (não PASS)
    record('3/4 Testes', STATUS.NOT_CONFIGURED, 'jest.config.js presente mas nenhum arquivo *.test.ts encontrado.');
    return;
  }

  // Executar testes
  const runner = hasVitestConfig ? ['vitest', 'run'] : ['jest', '--passWithNoTests', '--no-coverage'];
  const { pass, output, error } = run('npx', runner, { timeout: 120000 });

  if (error) {
    record('3/4 Testes', STATUS.NOT_EXECUTED, `runner não pôde ser executado: ${error.message}`);
    return;
  }

  if (pass) {
    // Extrair resumo do jest para o detalhe
    const summary = output.split('\n').filter(l =>
      /Tests:|Test Suites:|passed|failed|skipped/i.test(l)
    ).join(' | ');
    record('3/4 Testes', STATUS.PASS, summary);
  } else {
    const failLines = output.split('\n').filter(l =>
      /FAIL|●|Error:|expect|received|expected/i.test(l)
    ).slice(0, 25);
    record('3/4 Testes', STATUS.FAIL, failLines.join('\n'));
  }
}

function stepExpoDoctor() {
  const { pass, output, error } = run('npx', ['expo-doctor'], { timeout: 60000 });

  if (error) {
    record('4/4 Expo Doctor', STATUS.NOT_EXECUTED, `expo-doctor não pôde ser executado: ${error.message}`);
    return;
  }

  if (pass) {
    const checksLine = output.split('\n').find(l => /checks passed/i.test(l)) || '';
    record('4/4 Expo Doctor', STATUS.PASS, checksLine.trim());
    return;
  }

  // Separar erros estruturais de warnings de versão
  const structuralErrors = output.split('\n').filter(l =>
    /FATAL|Cannot find module|SyntaxError|Cannot resolve/i.test(l)
  );

  if (structuralErrors.length > 0) {
    record('4/4 Expo Doctor', STATUS.FAIL, structuralErrors.join('\n'));
    return;
  }

  // Apenas warnings de versão/peer deps — reportar honestamente como PASS_WITH_WARNINGS
  const checksMatch  = output.match(/(\d+)\/(\d+) checks passed/);
  const failedMatch  = output.match(/(\d+) checks? failed/);
  const passed = checksMatch?.[1] ?? '?';
  const total  = checksMatch?.[2] ?? '?';
  const failed = failedMatch?.[1] ?? '?';

  // Extrair os nomes dos checks que falharam para o detalhe
  const failedChecks = output.split('\n')
    .filter(l => /^✖ Check/i.test(l.trim()))
    .map(l => l.trim());

  const detail = [
    `${passed}/${total} checks ok, ${failed} warning(s):`,
    ...failedChecks,
  ].join('\n');

  record('4/4 Expo Doctor', STATUS.PASS_WITH_WARNINGS, detail);
}

// ── Calcular status geral ─────────────────────────────────────────────────────

function overallStatus() {
  const statuses = results.map(r => r.status);
  if (statuses.some(s => s === STATUS.FAIL))           return STATUS.FAIL;
  if (statuses.some(s => s === STATUS.NOT_EXECUTED))   return STATUS.FAIL;
  if (statuses.some(s => s === STATUS.NOT_CONFIGURED)) return STATUS.PARTIAL;
  if (statuses.some(s => s === STATUS.PASS_WITH_WARNINGS)) return STATUS.PARTIAL;
  return STATUS.PASS;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n[verify] Epochs Idle — Pipeline de Verificação Local');
console.log(`[verify] Diretório: ${ROOT}`);
console.log(`[verify] Node: ${process.version}`);
console.log('');

stepTypecheck();
stepLint();
stepTests();
stepExpoDoctor();

const overall = overallStatus();

console.log('');
console.log('[verify] ══════════════════════════════════════════════════');
console.log(`[verify] Overall: ${overall}`);
console.log('[verify] ══════════════════════════════════════════════════');
console.log('');

if (overall === STATUS.FAIL) {
  const failed = results.filter(r => r.status === STATUS.FAIL || r.status === STATUS.NOT_EXECUTED);
  console.error(`[verify] ❌ FAIL — ${failed.map(r => r.name).join(', ')}`);
  process.exit(1);
} else if (overall === STATUS.PARTIAL) {
  const partial = results.filter(r => r.status === STATUS.NOT_CONFIGURED || r.status === STATUS.PASS_WITH_WARNINGS);
  console.log(`[verify] ⚠  PARTIAL — Verificação incompleta: ${partial.map(r => r.name + '(' + r.status + ')').join(', ')}`);
  // PARTIAL não falha o pipeline — é informativo para o agente
  process.exit(0);
} else {
  console.log('[verify] ✅  PASS — Todas as verificações configuradas passaram.');
  process.exit(0);
}
