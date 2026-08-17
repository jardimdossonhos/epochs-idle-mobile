#!/usr/bin/env node
/**
 * find-adb.js
 * -----------
 * Descobre o executável adb de forma portável e sem hardcode de caminhos.
 *
 * Ordem de busca:
 *   1. `adb` no PATH do sistema
 *   2. $ANDROID_HOME/platform-tools/adb[.exe]
 *   3. $ANDROID_SDK_ROOT/platform-tools/adb[.exe]
 *   4. %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe  (Windows padrão)
 *   5. ~/Android/Sdk/platform-tools/adb                   (Linux/macOS padrão)
 *   6. ~/Library/Android/sdk/platform-tools/adb           (macOS via Android Studio)
 *
 * Uso:
 *   node scripts/find-adb.js              → imprime o caminho e sai com 0
 *   node scripts/find-adb.js --version    → imprime `adb version` e sai
 *   node scripts/find-adb.js --devices    → imprime `adb devices` e sai
 *
 * Exporta `findAdb()` para uso por outros scripts Node.
 */

'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const IS_WIN = process.platform === 'win32';
const ADB_BIN = IS_WIN ? 'adb.exe' : 'adb';

/**
 * Retorna o caminho absoluto do executável adb, ou null se não encontrado.
 * @returns {string|null}
 */
function findAdb() {
  // 1. Verificar no PATH
  try {
    const which = IS_WIN ? 'where' : 'which';
    const result = execFileSync(which, ['adb'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const candidate = result.trim().split(/\r?\n/)[0];
    if (candidate && fs.existsSync(candidate)) return candidate;
  } catch (_) { /* não está no PATH */ }

  // 2-3. Variáveis de ambiente
  const envCandidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
  ];

  // 4-6. Localizações padrão por plataforma
  const home = os.homedir();
  if (IS_WIN) {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    envCandidates.push(path.join(localAppData, 'Android', 'Sdk'));
  } else {
    envCandidates.push(
      path.join(home, 'Android', 'Sdk'),
      path.join(home, 'Library', 'Android', 'sdk'),
    );
  }

  for (const base of envCandidates) {
    if (!base) continue;
    const candidate = path.join(base, 'platform-tools', ADB_BIN);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Retorna o caminho do adb ou lança um erro descritivo.
 * @returns {string}
 */
function requireAdb() {
  const adb = findAdb();
  if (!adb) {
    const msg = [
      'ERROR: adb não encontrado.',
      'Instale o Android SDK e defina ANDROID_HOME ou ANDROID_SDK_ROOT,',
      'ou adicione platform-tools ao PATH.',
      '',
      'Localizações verificadas:',
      '  - PATH do sistema',
      '  - $ANDROID_HOME/platform-tools/',
      '  - $ANDROID_SDK_ROOT/platform-tools/',
      IS_WIN
        ? '  - %LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\'
        : '  - ~/Android/Sdk/platform-tools/  e  ~/Library/Android/sdk/platform-tools/',
    ].join('\n');
    throw new Error(msg);
  }
  return adb;
}

/**
 * Executa `adb <args>` e retorna { stdout, stderr, status }.
 * @param {string[]} args
 * @param {object} [opts]
 * @returns {{ stdout: string, stderr: string, status: number }}
 */
function runAdb(args, opts = {}) {
  const adb = requireAdb();
  const result = spawnSync(adb, args, {
    encoding: 'utf8',
    ...opts,
  });
  return {
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    status: result.status ?? 1,
  };
}

module.exports = { findAdb, requireAdb, runAdb };

// ── CLI ───────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const arg = process.argv[2];
  try {
    const adb = requireAdb();
    if (arg === '--version') {
      const { stdout } = runAdb(['version']);
      console.log(stdout);
    } else if (arg === '--devices') {
      const { stdout } = runAdb(['devices']);
      console.log(stdout);
    } else {
      console.log(adb);
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
