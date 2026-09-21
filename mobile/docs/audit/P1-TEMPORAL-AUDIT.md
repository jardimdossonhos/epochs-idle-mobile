# P1 - Funda??o Temporal: Relat?rio Factual (Revis?o 8)

## 1. Runtime Temporal Ativo

**Arquivo:** src/ui/GameProvider.tsx e src/application/game-session.ts
**Linha:** GameProvider.tsx:86 e game-session.ts:3136
**Trecho do c?digo verificado:**
`	ypescript
    const newSession = new GameSession({
`
`	ypescript
    const maxTicks = this.deps.maxOfflineTicks ?? 12_000;
`
**Resumo do trecho:** O construtor visualizado n?o repassa a propriedade maxOfflineTicks na instancia??o da classe principal, fazendo com que, ao ler 	his.deps.maxOfflineTicks internamente, o fallback de coalesc?ncia repasse o teto num?rico 12.000.
**O que o trecho demonstra:** O GameProvider analisado cria uma inst?ncia de GameSession sem injetar maxOfflineTicks; nesse caminho, o fallback 12_000 ? utilizado.
**O que ele N?O demonstra:** N?o demonstra o escopo completo de onde outras eventuais inst?ncias da sess?o poderiam ser inicializadas.
**Classifica??o:** FATO OBSERVADO.

**Arquivo:** src/simulation/simulation-engine.ts
**Linha:** N/A
**Trecho do c?digo verificado:** (Nenhuma ocorr?ncia atestada)
**Resumo do trecho:** A busca pelo literal 
ew SimulationEngine n?o retornou resultados nas rotinas ativas verificadas.
**O que o trecho demonstra:** Aus?ncia de inicializa??o direta no c?digo pesquisado.
**O que ele N?O demonstra:** N?o demonstra que o c?digo ? definitivamente inativo, morto ou obsoleto no reposit?rio inteiro.
**Classifica??o:** INFER?NCIA (N?o foi encontrada instancia??o literal 
ew SimulationEngine na varredura realizada; isso sustenta a infer?ncia de que o engine secund?rio n?o participa do runtime ativo analisado).

## 2. Equival?ncia de Batch

**Arquivo:** src/core/simulation/tick-pipeline.ts, src/core/simulation/systems/economy-system.ts, src/core/simulation/systems/technology-system.ts
**Linha:** 	ick-pipeline.ts:168, 	ick-pipeline.ts:181, 	ick-pipeline.ts:213, economy-system.ts:191-192, 	echnology-system.ts:38
**Trecho do c?digo verificado:**
`	ypescript
        const events = this.runInPlace(nextState, deltaMs * tickScale, now, tickScale);
`
`	ypescript
  private runInPlace(nextState: GameState, deltaMs: number, now: number, tickScale: number): DomainEvent[] {
`
`	ypescript
    context.nextState.meta.tick += tickScale;
`
`	ypescript
                kingdom.economy.stock[resource] = roundTo(
                    kingdom.economy.stock[resource] + kingdom.economy.incomePerTick[resource] - kingdom.economy.upkeepPerTick[resource]
`
`	ypescript
        kingdom.technology.accumulatedResearch = roundTo(kingdom.technology.accumulatedResearch + researchDelta);
`
**Resumo do trecho:** A rotina 
unBatch invoca 
unInPlace passando o multiplicador na assinatura. 
unInPlace avan?a o tick master do estado pelo montante do multiplicador, mas o loop de sistemas iterado repassa o contexto sem que a Economia ou a Tecnologia consultem a vari?vel 	ickScale ao realizarem suas atualiza??es por adi??o.
**O que o trecho demonstra:** Quando coarseStepTicks > 1, 
unBatch() executa cada sistema uma vez por salto, enquanto meta.tick avan?a coarseStepTicks; nos trechos de Economia e Tecnologia examinados, as f?rmulas de atualiza??o n?o utilizam 	ickScale. Portanto, esses saltos n?o s?o semanticamente equivalentes a executar os ticks individualmente nesses trechos espec?ficos.
**O que ele N?O demonstra:** N?o demonstra se essa diverg?ncia matem?tica ? a causa raiz de um sintoma ou desbalanceamento global observ?vel na macroeconomia do jogo.
**Classifica??o:** BUG DE EQUIVAL?NCIA DE BATCH DEMONSTRADO.

## 3. Descarte do Excedente (Limite de 12.000)

**Arquivo:** src/application/game-session.ts
**Linha:** 3067, 3075, 3076, 3144, 3147
**Trecho do c?digo verificado:**
`	ypescript
  private async runOfflineProgression(state: GameState, now: number): Promise<{ state: GameState; ticks: number; elapsedMs: number }> {
`
`	ypescript
    const desiredTicks = Math.floor(elapsedMs / Math.max(1, state.meta.tickDurationMs));
`
`	ypescript
    const ticksToSimulate = Math.max(0, Math.min(desiredTicks, maxTicks));
`
`	ypescript
    const offlineResult = await this.runOfflineProgression(baseState, now);
`
`	ypescript
    this.currentState.meta.lastUpdatedAt = now;
`
**Resumo do trecho:** A fun??o respons?vel calcula o tempo desejado (convertido para ticks) e o limita via Math.min contra o fallback de 12_000. Ap?s consumir esse limite em pacotes de batch, quem fez a requisi??o subscreve a data atualizada for?osamente sobre a marca rel?gio rec?m gerada, desvanecendo a fra??o bloqueada no truncamento.
**O que o trecho demonstra:** Ap?s a conclus?o da simula??o limitada a 	icksToSimulate, a vari?vel do calend?rio do jogo (lastUpdatedAt) ? fixada em 
ow. A diferen?a n?o processada (desiredTicks - ticksToSimulate) n?o ? preservada ou compensada em nenhuma outra vari?vel no fluxo analisado.
**O que ele N?O demonstra:** N?o generaliza que o descarte de excedente ocorra invariavelmente em todos os poss?veis caminhos offline n?o analisados.
**Classifica??o:** DESCARTE DO EXCEDENTE DEMONSTRADO NO FLUXO DE CARREGAMENTO ANALISADO.

## 4. Sem?ntica Temporal

**Arquivo:** src/core/simulation/systems/disaster-system.ts
**Linha:** 268
**Trecho do c?digo verificado:**
`	ypescript
      // DESASTRES DE GUERRA (Apenas se Exaust?o > 0.8) - 10% de chance por d?cada (loop roda a cada 10 meses, ent?o 1% por tick decenal ? ~12% ao ano)
`
**Resumo do trecho:** O coment?rio do autor da rotina estabelece diretamente a taxonomia e probabilidade atuarial referenciando o agrupamento de cada 10 ticks a uma d?cada transposta em meses.
**O que o trecho demonstra:** Premissa mensal explicitamente documentada no disaster-system.
**O que ele N?O demonstra:** N?o demonstra que o engine inteiro possui semanticamente 	ick = m?s.
**Classifica??o:** FATO OBSERVADO.

**Arquivo:** src/core/simulation/systems/character-system.ts
**Linha:** 166
**Trecho do c?digo verificado:**
`	ypescript
      const crossedYear = Math.floor(state.meta.tick / 12) !== Math.floor((state.meta.tick + (context.tickScale ?? 1)) / 12);
`
**Resumo do trecho:** O sistema valida matematicamente a mudan?a do ano baseando-se em divis?es do rel?gio inteiro pelo denominador fixo de 12.
**O que o trecho demonstra:** Uma conven??o de 12 ticks ? utilizada por essa transi??o anual espec?fica para governar o envelhecimento.
**O que ele N?O demonstra:** N?o demonstra que cada tick na f?sica de todos os outros sistemas significa logicamente um m?s.
**Classifica??o:** FATO OBSERVADO.

**Arquivo:** src/core/simulation/systems/economy-system.ts
**Linha:** 191-192
**Trecho do c?digo verificado:**
`	ypescript
                kingdom.economy.stock[resource] = roundTo(
                    kingdom.economy.stock[resource] + kingdom.economy.incomePerTick[resource] - kingdom.economy.upkeepPerTick[resource]
`
**Resumo do trecho:** Os bens s?o reatribu?dos a si mesmos somando as chaves indexadas estritamente com os valores providos via objeto bruto sem transforma??o de propor??o temporal baseada no rel?gio e calend?rio.
**O que o trecho demonstra:** Sistemas econ?micos examinados simplesmente executam uma atualiza??o escalar por chamada de system.run.
**O que ele N?O demonstra:** N?o demonstra depend?ncia formal ? restri??o de base de tempo anual/mensal nesse processamento de ac?mulo por tick.
**Classifica??o:** FATO OBSERVADO.
