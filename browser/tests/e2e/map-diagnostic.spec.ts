import { test } from '@playwright/test';

test('Diagnóstico Profundo do MapLibre e Vector Tiles', async ({ page }) => {
  // Amplia para 120 segundos para renderizações WebGL pesadas
  test.setTimeout(120000);

  const logs: string[] = [];
  const pbfRequests: { url: string, status: number }[] = [];

  page.on('pageerror', error => {
    logs.push(`[PAGE ERROR] ${error.name}: ${error.message}`);
  });

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
      logs.push(`[CONSOLE ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning' || msg.type() === 'log') {
      logs.push(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('.pbf')) {
      pbfRequests.push({ url: response.url(), status: response.status() });
    }
  });

  console.log('🚀 Iniciando teste diagnóstico automatizado do mapa...');

  // Navega para o jogo rodando localmente
  await page.goto('http://localhost:5173/');

  // Aguarda a tela inicial carregar totalmente
  await page.waitForSelector('#splash-new-btn');

  // Inicia a campanha e aciona a injeção gráfica
  await page.click('#splash-new-btn');
  await page.click('#splash-start-btn');

  console.log('⏳ Aguardando 20 segundos de renderização pesada do motor WebGL...');
  await page.waitForTimeout(20000);

  // Injeta um script no navegador para vasculhar as entranhas do DOM e MapLibre
  const diagnostic = await page.evaluate(() => {
    const container = document.querySelector('#map-canvas');
    const canvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
    const report = {
      containerExists: !!container,
      containerInnerHTML: container ? container.innerHTML : 'N/A',
      canvasExists: !!canvas,
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      webglContextLost: false,
      uiHidden: document.querySelector('#splash-screen')?.classList.contains('is-hidden')
    };

    if (canvas) {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      report.webglContextLost = gl ? (gl as WebGLRenderingContext).isContextLost() : true;
    }
    
    return report;
  });

  console.log('\n======================================================');
  console.log('📊 RELATÓRIO DIAGNÓSTICO FORENSE DO MAPA V2');
  console.log('======================================================');
  console.log('\n🖥️ ESTADO DO RENDERIZADOR (DOM/WebGL):');
  console.log(`- Splash Screen Desapareceu? ${diagnostic.uiHidden ? 'Sim' : 'Não'}`);
  console.log(`- Container #map-canvas Existe? ${diagnostic.containerExists ? 'Sim' : 'Não'}`);
  console.log(`- Canvas do Mapa Existe? ${diagnostic.canvasExists ? 'Sim' : 'Não'}`);
  if (!diagnostic.canvasExists && diagnostic.containerExists) {
    console.log(`- HTML Injetado no Container: ${diagnostic.containerInnerHTML}`);
  }
  console.log(`- Dimensões do Canvas: ${diagnostic.canvasWidth}x${diagnostic.canvasHeight} pixels`);
  console.log(`- Placa de Vídeo (WebGL) Crashou? ${diagnostic.webglContextLost ? 'SIM (CRÍTICO)' : 'Não (Saudável)'}`);

  console.log(`\n🌐 REDE: REQUISIÇÕES DE VECTOR TILES (.pbf):`);
  console.log(`- Total de pacotes de mapa solicitados: ${pbfRequests.length}`);
  const failedTiles = pbfRequests.filter(req => req.status !== 200);
  console.log(`- Pacotes com falha (404/500): ${failedTiles.length}`);

  console.log(`\n📝 LOGS DE CONSOLE (Avisos e Erros - ${logs.length}):`);
  logs.forEach(log => console.log(`  -> ${log}`));
  console.log('======================================================\n');

  // Tira a fotografia no final. Envolto em try/catch para não quebrar o teste se o WebGL se mover eternamente.
  try {
    console.log('📸 Tentando capturar fotografia do WebGL...');
    await page.screenshot({ path: 'map-diagnostic-screenshot.png', timeout: 15000 });
    console.log('📸 Fotografia salva com sucesso! Verifique a raiz do projeto.');
  } catch (e) {
    console.log('⚠️ Aviso: A captura de tela falhou/desistiu, mas os dados diagnósticos foram impressos com sucesso.');
  }
});
