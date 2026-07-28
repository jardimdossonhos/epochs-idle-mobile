import { test } from '@playwright/test';

test('Diagnóstico de Performance e Gargalos de Memória', async ({ page }) => {
  // Define tempo limite para 3 minutos, permitindo a coleta massiva de dados sem dar timeout
  test.setTimeout(180000); 
  // Define tempo limite para 5 minutos para impedir o crash geral
  test.setTimeout(300000); 

  console.log('🚀 Iniciando teste de perfilamento de recursos...');

  // Conecta diretamente ao protocolo de baixo nível do Google Chrome para ler a CPU e RAM
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');

  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:5173/');
  await page.waitForSelector('#splash-new-btn');

  console.log('📊 Estado Inicial (Antes de injetar os 62.000 polígonos):');
  let metrics = await client.send('Performance.getMetrics');
  let jsHeap = metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
  console.log(`- Memória JS Alocada: ${(jsHeap / 1024 / 1024).toFixed(2)} MB`);

  await page.click('#splash-new-btn');
  await page.click('#splash-start-btn');

  console.log('⏳ Rodando a simulação pesada por 60 segundos para auditar a memória...');

  const memorySamples: number[] = [];
  const fpsSamples: number[] = [];

  // Coleta dados de 5 em 5 segundos por 1 minuto inteiro
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    metrics = await client.send('Performance.getMetrics');
    jsHeap = metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
    const nodes = metrics.metrics.find(m => m.name === 'Nodes')?.value || 0;
    
    // Calcula FPS dinâmico avaliando se a CPU está engasgada ou não
    // Medidor de FPS protegido contra estrangulamento da CPU
    const fps = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let frames = 0;
        let start = performance.now();
        let timeoutId = setTimeout(() => resolve(frames), 1500); // Trava de segurança (Timeout Fallback)
        
        function tick() {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(tick);
          } else {
            clearTimeout(timeoutId);
            resolve(frames);
          }
        }
        requestAnimationFrame(tick);
      });
    });

    memorySamples.push(jsHeap);
    fpsSamples.push(fps);
    console.log(`[T+${(i+1)*5}s] Memória RAM: ${(jsHeap / 1024 / 1024).toFixed(2)} MB | DOM Nodes: ${nodes} | FPS Real: ${fps}`);
  }

  const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
  const memStart = memorySamples[0] / 1024 / 1024;
  const memEnd = memorySamples[memorySamples.length - 1] / 1024 / 1024;
  const memGrowth = memEnd - memStart;

  console.log('\n======================================================');
  console.log('📈 RELATÓRIO DE RECURSOS E PERFORMANCE (62k Entidades)');
  console.log('======================================================');
  console.log(`🖥️ Desempenho da CPU (FPS):`);
  console.log(`- Média Constante: ${avgFps.toFixed(1)} quadros por segundo`);
  console.log(avgFps < 30 ? '⚠️ ALERTA: Main Thread da CPU está estrangulada (Engasgos e Travamentos)!' : '✅ Frame rate perfeito.');

  console.log(`\n🧠 Consumo de Memória RAM (Heap V8):`);
  console.log(`- Custo do Mundo Aberto: ${memEnd.toFixed(2)} MB`);
  console.log(`- Crescimento de Lixo (Leak): ${memGrowth > 0 ? '+' : ''}${memGrowth.toFixed(2)} MB durante o minuto`);
  if (memEnd > 500) {
    console.log('⚠️ ALERTA CRÍTICO: Uso extremo de memória detectado (Risco de Crash)!');
  }
  console.log('======================================================\n');
});