# Investigação de Memória — P15-E3 (Auditoria do RenderSyncSystem)

## 1. Instrumentação Aplicada (P10Counters)
O arquivo RenderSyncSystem.ts foi instrumentado sem alterar comportamento, capturando:
- Quantidade de vezes executado (enderSyncRuns).
- Existência da função postMessage (	ypeof self !== "undefined" && typeof (self as any).postMessage === "function").
- Quantidade de envios (postMessageCalls).
- Tamanhos dos arrays alocados e copiados.

## 2. Busca por Consumidores (onmessage)
A busca por onmessage, MessageEvent e ddEventListener('message') revelou que o único consumidor de mensagens SYNC_TICK reside em src/ui/hooks/use-game-engine.ts, o qual **não é importado nem utilizado em nenhum lugar da aplicação principal** (apenas no llm-service.ts em forma de comentário). O fluxo ativo em GameProvider.tsx ignora a infraestrutura de Worker.

## 3. Dados RAW da Janela (t=0s a t=20s)
`	ext
[P10] elapsedMs=9544 ticks=28 topHud=28 renderSyncRuns=28 pmAvailable=false pmCalls=0 regionL=2000 armyL=8192
[P10] elapsedMs=10017 ticks=30 topHud=30 renderSyncRuns=30 pmAvailable=false pmCalls=0 regionL=2000 armyL=8192
`

## 4. Análise dos Resultados
1. **enderSyncRuns acompanha 	icks perfeitamente (1:1):** O sistema executa 30 vezes em janelas de 10 segundos, acompanhando a simulação.
2. **pmAvailable=false:** A avaliação de self.postMessage em Hermes (Main Thread) resulta em FALSO, porque self no contexto React Native sem um Web Worker instanciado não possui a API de postMessage acoplada globalmente.
3. **pmCalls=0:** O envio de fato (a suposta serialização nativa para o JSI/Bridge) **NUNCA OCORRE**.
4. **Alocação Interna:** O sistema apenas faz um subarray (cópia de memória ultrarrápida, zero-allocation ou reutilização pura) para os buffers estáticos internos enderRegionOwner e enderArmyData.

## 5. Conclusão da Fase E3
O **RenderSyncSystem é FORTEMENTE REFUTADO** como a causa do acúmulo de memória Unknown progressiva, pois a sua mecânica de envio assíncrono à Bridge, que seria a responsável teórica pela serialização monstra não coletada, provou-se inoperante no runtime atual.

Como a hipótese falhou no E3 e pmCalls = 0, **não há sentido em executar E4** (Bypass/Isolamento).

A investigação deve recuar para Fase E2 (Auditoria Nativos) para identificar o verdadeiro gerador das retenções de ~8 MB a cada 10 segundos no nível nativo/Bridge/JSI. 
