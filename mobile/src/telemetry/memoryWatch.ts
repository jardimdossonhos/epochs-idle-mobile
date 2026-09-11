// Telemetria leve de memória para produção
// Faz sampling do Hermes GC periodicamente.

export function startMemoryWatch(intervalMs = 60000) {
    if (typeof global.HermesInternal === 'undefined' || !global.HermesInternal?.getInstrumentedStats) {
        console.log('[MemoryWatch] HermesInternal não está disponível nesta versão/build.');
        return;
    }

    // Apenas loga uma vez para inspecionar os campos exatos em staging/teste
    const initialStats = global.HermesInternal.getInstrumentedStats();
    console.log('[MemoryWatch] HermesInternal fields available:', Object.keys(initialStats));

    setInterval(() => {
        try {
            const stats = global.HermesInternal.getInstrumentedStats();
            // Para o Soak Test via adb logcat:
            console.log('[SOAK_HERMES_STATS] ' + JSON.stringify(stats));

            // TODO: Integrar com provedor real (Sentry/Crashlytics) quando existir
            // ex: Sentry.setTag('hermes_heap_size', stats.GC_Heap_Size);
        } catch (e) {
            console.warn('[MemoryWatch] Erro ao capturar estatísticas do Hermes', e);
        }
    }, intervalMs);
}
