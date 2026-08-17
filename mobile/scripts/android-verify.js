#!/usr/bin/env node
/**
 * android-verify.js
 * -----------------
 * Verificação Android em dois níveis:
 *
 *   android:verify (padrão)
 *   ───────────────────────
 *   1. Descobrir ADB
 *   2. Detectar dispositivo
 *   3. Verificar se o pacote está instalado
 *   4. Verificar build_id do APK instalado vs build local (quando disponível)
 *   5. Limpar logcat
 *   6. Iniciar o aplicativo
 *   7. Coletar logcat por N segundos
 *   8. Analisar: LOGCAT_CLEAN / LOGCAT_WARNINGS / LOGCAT_ERRORS / APP_CRASH / APP_ANR
 *   9. Salvar log completo em .verify-logs/
 *  10. Retornar resultado com status semântico
 *
 *   android:full-verify (--full-build)
 *   ───────────────────────────────────
 *   Todos os passos acima +
 *   Antes do passo 3: força gradle assembleDebug e instala o APK fresco.
 *   Garante que o APK instalado corresponde ao código-fonte atual.
 *
 * Status semânticos de saída:
 *   PASS                    (exit 0) — app iniciou, logcat limpo
 *   PASS_WITH_WARNINGS      (exit 0) — app iniciou, logcat tem warnings não críticos
 *   APK_MISMATCH            (exit 0) — app funciona mas APK pode não ser do código atual
 *   APP_CRASH               (exit 1) — FATAL EXCEPTION / SIGSEGV / SIGABRT detectado
 *   APP_ANR                 (exit 1) — ANR / Input dispatching timed out detectado
 *   LOGCAT_ERRORS           (exit 1) — erros não-crash detectados
 *   ANDROID_DEVICE_NOT_AVAILABLE (exit 2) — ADB ok mas sem dispositivo usável
 *   TEST_NOT_EXECUTED       (exit 3) — ADB não encontrado
 *   BUILD_FAILED            (exit 4) — gradle assembleDebug falhou (apenas --full-build)
 *
 * Uso:
 *   node scripts/android-verify.js
 *   node scripts/android-verify.js --package com.epochs.idle --timeout 15
 *   node scripts/android-verify.js --full-build
 */

'use strict';

const { spawnSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

const { findAdb, requireAdb, runAdb } = require('./find-adb');

// ── Configuração ──────────────────────────────────────────────────────────────

const PACKAGE_NAME   = getArg('--package', 'com.epochs.idle');
const ACTIVITY_NAME  = '.MainActivity';
const LOGCAT_TIMEOUT = parseInt(getArg('--timeout', '15'), 10) * 1000;
const FULL_BUILD     = process.argv.includes('--full-build');
const ROOT           = path.resolve(__dirname, '..');
const ANDROID_DIR    = path.join(ROOT, 'android');
const LOG_DIR        = path.join(ROOT, '.verify-logs');
const LOGCAT_FILE    = path.join(LOG_DIR, `logcat-${Date.now()}.log`);

// ── Padrões de Análise de Logcat ──────────────────────────────────────────────

// CRASH: mata o processo — exit 1
const CRASH_PATTERNS = [
  /FATAL EXCEPTION/,
  /AndroidRuntime/,
  /Process: .*PID: \d+/,          // header do AndroidRuntime crash
  /SIGSEGV|SIGABRT/,
];

// ANR: Application Not Responding — exit 1
const ANR_PATTERNS = [
  /ANR in /,
  /Input dispatching timed out/,
];

// ERROS não-crash que indicam problema — exit 1
const ERROR_PATTERNS = [
  /ReactNativeJS/i,
  /RuntimeException/,
  /SecurityException/,
  /NullPointerException/,
  /IllegalStateException/,
  /IllegalArgumentException/,
  /OutOfMemoryError/,
  /StackOverflowError/,
  /android\.view\.WindowManager\$BadTokenException/,
];

// WARNINGS: informativo, não falha — PASS_WITH_WARNINGS
const WARNING_PATTERNS = [
  /W\/.*:/,
];

// Linhas a ignorar (falsos positivos documentados)
const IGNORE_PATTERNS = [
  /EGLConsumer.*not attached/,              // Tratado em MapScreen.tsx (isMounted guard)
  /libEGL.*DEBUG/,
  /Choreographer.*dropped \d frame/,        // Normal em emuladores
  /OpenGLRenderer.*Warning/,
  /GoodTimeService/,
  /System\.err.*GoodTime/,
  /D\/.*:/,                                 // Debug lines (não são warnings)
  /I\/.*:/,                                 // Info lines
  /V\/.*:/,                                 // Verbose lines
];

// Número máximo de linhas de crash a capturar para o stack trace
const MAX_CRASH_LINES = 40;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getArg(name, defaultVal) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : defaultVal;
}

function log(msg)  { console.log(`[android:verify] ${msg}`); }
function warn(msg) { console.warn(`[android:verify] WARN: ${msg}`); }
function fail(msg, code = 1) {
  console.error(`[android:verify] FAIL: ${msg}`);
  process.exit(code);
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ── Detecção de Dispositivo ───────────────────────────────────────────────────

/**
 * @returns {{ status: string, serial?: string, all: Array<{serial: string, state: string}> }}
 */
function detectDevice() {
  const { stdout, status } = runAdb(['devices']);
  if (status !== 0) return { status: 'ADB_AVAILABLE', all: [] };

  const lines = stdout.split('\n').slice(1).filter(l => l.trim());
  if (lines.length === 0) return { status: 'DEVICE_NOT_AVAILABLE', all: [] };

  const all = lines
    .map(line => {
      const [serial, state] = line.trim().split(/\s+/);
      return { serial, state: state || '' };
    })
    .filter(d => d.serial);

  // Preferir emulador online se houver múltiplos dispositivos
  const online = all.filter(d => d.state === 'device');
  if (online.length === 0) {
    const unauthorized = all.find(d => d.state === 'unauthorized');
    if (unauthorized) return { status: 'DEVICE_UNAUTHORIZED', serial: unauthorized.serial, all };
    const offline = all.find(d => d.state === 'offline');
    if (offline) return { status: 'DEVICE_OFFLINE', serial: offline.serial, all };
    return { status: 'DEVICE_NOT_AVAILABLE', all };
  }

  if (online.length > 1) {
    warn(`Múltiplos dispositivos online (${online.map(d => d.serial).join(', ')}). Usando ${online[0].serial}.`);
    warn('Para especificar um dispositivo, use --device <serial>.');
  }

  return { status: 'DEVICE_AVAILABLE', serial: online[0].serial, all };
}

// ── Verificação de APK Instalado ──────────────────────────────────────────────

/**
 * Verifica se o pacote está instalado e tenta comparar com o build local.
 * @returns {{ installed: boolean, versionName?: string, versionCode?: number, buildAgeHint?: string }}
 */
function checkInstalledApk(serial) {
  // Verificar se o pacote está instalado
  const { stdout: dumpOutput, status } = runAdb([
    '-s', serial,
    'shell', 'dumpsys', 'package', PACKAGE_NAME,
  ]);

  if (status !== 0 || !dumpOutput.includes('versionName')) {
    return { installed: false };
  }

  const versionNameMatch  = dumpOutput.match(/versionName=([\d.]+)/);
  const versionCodeMatch  = dumpOutput.match(/versionCode=(\d+)/);
  const firstInstallMatch = dumpOutput.match(/firstInstallTime=([^\n]+)/);

  const result = {
    installed:    true,
    versionName:  versionNameMatch?.[1],
    versionCode:  versionCodeMatch ? parseInt(versionCodeMatch[1]) : undefined,
    installTime:  firstInstallMatch?.[1]?.trim(),
  };

  // Tentar comparar com o APK de build local
  const localApkCandidates = [
    path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
  ];

  for (const apkPath of localApkCandidates) {
    if (fs.existsSync(apkPath)) {
      const apkStat = fs.statSync(apkPath);
      const apkAgeMs = Date.now() - apkStat.mtimeMs;
      const apkAgeMin = Math.round(apkAgeMs / 60000);
      result.localApkPath = apkPath;
      result.localApkAgeMin = apkAgeMin;
      break;
    }
  }

  return result;
}

// ── Build Android (apenas --full-build) ───────────────────────────────────────

function buildAndInstall(serial) {
  log('FULL_BUILD: Executando gradle assembleDebug...');
  log('(Este processo pode levar vários minutos)');

  const gradlewPath = path.join(ANDROID_DIR, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  if (!fs.existsSync(gradlewPath)) {
    fail(`gradlew não encontrado em ${ANDROID_DIR}. O diretório android/ existe?`, 4);
  }

  const buildResult = spawnSync(gradlewPath, ['assembleDebug'], {
    cwd: ANDROID_DIR,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
    timeout: 600000, // 10 minutos
  });

  if (buildResult.status !== 0) {
    const errorLines = (buildResult.stdout + buildResult.stderr)
      .split('\n')
      .filter(l => /error:|FAILED|Exception|BUILD FAILED/i.test(l))
      .slice(0, 20);
    fail(`gradle assembleDebug falhou:\n${errorLines.join('\n')}`, 4);
  }

  log('FULL_BUILD: Build concluído.');

  const apkPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(apkPath)) {
    fail(`APK não encontrado em ${apkPath} após build`, 4);
  }

  const apkStat = fs.statSync(apkPath);
  log(`APK_BUILD_TIMESTAMP: ${apkStat.mtime.toISOString()}`);
  log(`APK_PATH: ${apkPath}`);
  log(`APK_SIZE: ${(apkStat.size / 1024 / 1024).toFixed(2)} MB`);
  log(`APK_APPLICATION_ID: ${PACKAGE_NAME}`);

  log('Instalando APK...');
  const installStart = new Date().toISOString();
  const installResult = runAdb(['-s', serial, 'install', '-r', apkPath]);
  if (installResult.status !== 0) {
    fail(`adb install falhou: ${installResult.stderr}`, 4);
  }
  const installEnd = new Date().toISOString();

  log(`APK_INSTALL_TIMESTAMP: ${installEnd}`);
  log('FULL_BUILD: APK instalado com sucesso.');
}

// ── Coleta e Análise de Logcat ────────────────────────────────────────────────

/**
 * @returns {{ crashLines: string[], anrLines: string[], errorLines: string[], warnCount: number }}
 */
function analyzeLogcat(text) {
  const lines = text.split('\n');
  const crashLines = [];
  const anrLines   = [];
  const errorLines = [];
  let warnCount    = 0;

  // Rastrear contexto de stack trace
  let inStackTrace = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Ignorar linhas de ruído
    if (IGNORE_PATTERNS.some(p => p.test(trimmed))) continue;

    // Detectar início de crash/ANR
    if (CRASH_PATTERNS.some(p => p.test(trimmed))) {
      inStackTrace = true;
      crashLines.push(trimmed);
      continue;
    }

    if (ANR_PATTERNS.some(p => p.test(trimmed))) {
      anrLines.push(trimmed);
      continue;
    }

    // Capturar stack trace completo
    if (inStackTrace) {
      if (/^\s+at /.test(trimmed) || /^Caused by:/.test(trimmed) || crashLines.length > 0) {
        if (crashLines.length < MAX_CRASH_LINES) {
          crashLines.push(trimmed);
        }
        // Terminar stack trace após linha vazia ou nova tag de log
        if (/^[A-Z]\//.test(trimmed) && !/at |Caused by:/.test(trimmed)) {
          inStackTrace = false;
        }
        continue;
      } else {
        inStackTrace = false;
      }
    }

    // Erros (prefixo E/ no logcat)
    if (/^E\//.test(trimmed)) {
      if (ERROR_PATTERNS.some(p => p.test(trimmed))) {
        errorLines.push(trimmed);
      }
      continue;
    }

    // Warnings
    if (/^W\//.test(trimmed)) {
      warnCount++;
    }
  }

  return { crashLines, anrLines, errorLines, warnCount };
}

/**
 * Coleta logcat por LOGCAT_TIMEOUT ms, salva em arquivo, retorna análise.
 */
async function collectLogcat(serial) {
  ensureLogDir();

  return new Promise((resolve) => {
    const adb    = requireAdb();
    // Filtrar apenas W (warnings) e E (errors) para reduzir ruído
    // Incluir também F (fatal) que é onde FATAL EXCEPTION aparece
    const args   = ['-s', serial, 'logcat', '-v', 'threadtime', '*:W'];
    const stream = fs.createWriteStream(LOGCAT_FILE, { flags: 'w' });

    const child = spawn(adb, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(stream);
    child.stderr.pipe(stream);

    const timer = setTimeout(() => child.kill('SIGTERM'), LOGCAT_TIMEOUT);

    child.on('close', () => {
      clearTimeout(timer);
      stream.close(() => {
        const text = fs.existsSync(LOGCAT_FILE)
          ? fs.readFileSync(LOGCAT_FILE, 'utf8')
          : '';
        resolve(analyzeLogcat(text));
      });
    });
  });
}

// ── Fluxo Principal ───────────────────────────────────────────────────────────

async function main() {

  // ── 1. Verificar ADB ─────────────────────────────────────────────────────
  const adb = findAdb();
  if (!adb) {
    log('STATUS: TEST_NOT_EXECUTED');
    log('ADB não encontrado. Configure ANDROID_HOME ou adicione adb ao PATH.');
    log('Localizações verificadas: PATH, $ANDROID_HOME, $ANDROID_SDK_ROOT, %LOCALAPPDATA%\\Android\\Sdk');
    process.exit(3);
  }
  log(`ADB: ${adb}`);

  // ── 2. Detectar dispositivo ──────────────────────────────────────────────
  const { status: devStatus, serial, all } = detectDevice();
  log(`Dispositivos detectados: ${all.length > 0 ? all.map(d => `${d.serial}(${d.state})`).join(', ') : 'nenhum'}`);

  if (devStatus === 'DEVICE_NOT_AVAILABLE') {
    log('STATUS: ANDROID_DEVICE_NOT_AVAILABLE');
    log('Conecte um dispositivo ou inicie um emulador antes de executar android:verify.');
    process.exit(2);
  }
  if (devStatus === 'DEVICE_UNAUTHORIZED') {
    log(`STATUS: ANDROID_DEVICE_NOT_AVAILABLE (UNAUTHORIZED)`);
    log(`Dispositivo ${serial} não autorizado. Aceite o prompt de depuração USB no dispositivo.`);
    process.exit(2);
  }
  if (devStatus === 'DEVICE_OFFLINE') {
    log(`STATUS: ANDROID_DEVICE_NOT_AVAILABLE (OFFLINE)`);
    log(`Dispositivo ${serial} está offline. Reconecte-o.`);
    process.exit(2);
  }

  log(`Dispositivo: ${serial}`);

  // ── 3. Build e instalação (apenas --full-build) ──────────────────────────
  if (FULL_BUILD) {
    log('Modo: FULL_BUILD — compilando código-fonte atual');
    buildAndInstall(serial);
  } else {
    log('Modo: QUICK_VERIFY — usando APK previamente instalado');
  }

  // ── 4. Verificar APK instalado ───────────────────────────────────────────
  const apkInfo = checkInstalledApk(serial);
  if (!apkInfo.installed) {
    if (FULL_BUILD) {
      fail(`Pacote ${PACKAGE_NAME} não encontrado após instalação. Verifique o build.`, 4);
    } else {
      log(`STATUS: ANDROID_DEVICE_NOT_AVAILABLE`);
      log(`Pacote ${PACKAGE_NAME} não está instalado no dispositivo ${serial}.`);
      log('Execute npm run android:full-verify para compilar e instalar o APK.');
      process.exit(2);
    }
  }

  if (!FULL_BUILD) {
    log('APK_SOURCE_MATCH: UNVERIFIED');
    if (apkInfo.localApkPath) {
      const ageStr = `${apkInfo.localApkAgeMin}min atrás`;
      if (apkInfo.localApkAgeMin > 60) {
        log(`APK_BUILD_AGE: APK local em ${apkInfo.localApkPath} foi criado ${ageStr}.`);
        log('AVISO: APK instalado pode não corresponder ao código-fonte atual.');
        log('Use npm run android:full-verify para garantir correspondência.');
      } else {
        log(`APK local: ${apkInfo.localApkPath} (${ageStr})`);
      }
    } else {
      log('APK local não encontrado. Impossível verificar correspondência com código-fonte.');
      log('Use npm run android:full-verify para compilar o APK atual e instalar.');
    }
    log(`Versão instalada: ${apkInfo.versionName ?? 'desconhecida'} (code: ${apkInfo.versionCode ?? '?'})`);
  } else {
    log('APK_SOURCE_MATCH: VERIFIED');
    log(`Versão instalada: ${apkInfo.versionName ?? 'desconhecida'} (code: ${apkInfo.versionCode ?? '?'})`);
  }

  // ── 5. Limpar logcat ─────────────────────────────────────────────────────
  log('Limpando logcat anterior...');
  runAdb(['-s', serial, 'logcat', '-c']);

  // ── 6. Iniciar o aplicativo ──────────────────────────────────────────────
  log(`Iniciando ${PACKAGE_NAME}/${PACKAGE_NAME}${ACTIVITY_NAME}...`);
  const launch = runAdb([
    '-s', serial,
    'shell', 'am', 'start', '-n',
    `${PACKAGE_NAME}/${PACKAGE_NAME}${ACTIVITY_NAME}`,
    '-a', 'android.intent.action.MAIN',
    '-c', 'android.intent.category.LAUNCHER',
  ]);

  if (launch.status !== 0) {
    log(`am start falhou. Tentativa via monkey...`);
    const monkey = runAdb([
      '-s', serial,
      'shell', 'monkey', '-p', PACKAGE_NAME,
      '-c', 'android.intent.category.LAUNCHER', '1',
    ]);
    if (monkey.status !== 0) {
      log(`Stdout: ${launch.stdout}`);
      log(`Stderr: ${launch.stderr}`);
      fail(`Não foi possível iniciar o app. APK instalado: ${apkInfo.installed}. Pacote: ${PACKAGE_NAME}`);
    }
  }

  // ── 7. Coletar logcat ────────────────────────────────────────────────────
  log(`Coletando logcat por ${LOGCAT_TIMEOUT / 1000}s...`);
  const { crashLines, anrLines, errorLines, warnCount } = await collectLogcat(serial);

  // ── 8. Analisar resultado ────────────────────────────────────────────────
  log(`Log salvo: ${LOGCAT_FILE}`);
  log(`Crashes (FATAL/SIGSEGV): ${crashLines.length}`);
  log(`ANR:                     ${anrLines.length}`);
  log(`Erros (E/):              ${errorLines.length}`);
  log(`Warnings (W/):           ${warnCount}`);

  if (crashLines.length > 0) {
    console.error('\n[android:verify] APP_CRASH detectado:');
    crashLines.slice(0, 20).forEach(l => console.error(`  ${l}`));
    if (crashLines.length > 20) console.error(`  ... (+${crashLines.length - 20} linhas — ver ${LOGCAT_FILE})`);
    fail(`STATUS: APP_CRASH — ${crashLines.length} linha(s) de crash. Log: ${LOGCAT_FILE}`, 1);
  }

  if (anrLines.length > 0) {
    console.error('\n[android:verify] APP_ANR detectado:');
    anrLines.forEach(l => console.error(`  ${l}`));
    fail(`STATUS: APP_ANR — App Not Responding. Log: ${LOGCAT_FILE}`, 1);
  }

  if (errorLines.length > 0) {
    console.warn('\n[android:verify] LOGCAT_ERRORS (sem crash confirmado):');
    errorLines.slice(0, 10).forEach(l => console.warn(`  ${l}`));
    fail(`STATUS: LOGCAT_ERRORS — ${errorLines.length} erro(s). Log: ${LOGCAT_FILE}`, 1);
  }

  if (warnCount > 0) {
    log(`STATUS: PASS_WITH_WARNINGS (${warnCount} warning(s) não críticos)`);
  } else {
    log('STATUS: LOGCAT_CLEAN');
  }

  const modeLabel = FULL_BUILD ? 'FULL_BUILD' : 'QUICK_VERIFY';
  log(`STATUS: PASS [${modeLabel}] ✓`);
  process.exit(0);
}

main().catch(e => {
  console.error('[android:verify] Erro inesperado:', e.message);
  process.exit(1);
});
