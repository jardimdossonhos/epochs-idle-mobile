# PARTE A — ESTADO ATUAL COMPROVADO (BASELINE FACTUAL)

**Data da auditoria:** 25 de Setembro de 2026 (Fechamento)
**Branch:** chore/onboarding-docs
**HEAD analisado:** 857f78ff0aab2dc0ec5774cb413c343d6c079168
**Escopo da Auditoria:** A auditoria foi realizada sobre o **working tree atual**. Isto significa que os fatos relatados englobam o estado do repositório considerando as modificações locais ativas (ainda não commitadas) nos sistemas citados.

---

## 1. FOTOGRAFIA DO REPOSITÓRIO (GIT BASELINE)

**Raiz do Repositório Auditado:** C:\Users\joti.SIMPLO\Documents\Epochs_Idle\mobile\

**Estado Commitado (HEAD):** 
857f78ff0aab2dc0ec5774cb413c343d6c079168 (Branch: chore/onboarding-docs)

**Alterações Locais Não Commitadas:**
*   mobile/AGENTS.md
*   mobile/src/core/simulation/helpers/demographics-helper.ts
*   mobile/src/core/simulation/systems/economy-system.ts
*   mobile/src/core/simulation/systems/population-system.ts
*   mobile/src/core/simulation/systems/technology-system.ts

**Arquivos Untracked:**
*   *Documentação e Testes (ainda não incorporados ao estado commitado):*
    *   docs/architecture/
    *   docs/design/ (incluindo EPOCHS-IDLE-DESIGN-SPEC.md formatado no passo anterior)
    *   docs/project/p15c2-bundle-test/
    *   src/__tests__/t1-systems-normalization.test.ts
*   *Arquivos locais não rastreados, aparentemente gerados por auditoria/build; não classificados como parte do produto sem evidência adicional:*
    *   apk-contents/, app-debug.apk, app-debug.zip
    *   modules/react-native-map-buffer/android/.cxx/, modules/react-native-map-buffer/android/build/
    *   branch_info.txt, check_soak_output.txt, ci_info.txt, docs_tree.txt, env_files.txt, git_diff_audit.txt, git_log_audit.txt, issue_info.txt, key_files.txt, lint_output.txt, log_info.txt, p6.txt, p7.txt, p9.txt, pr_info.txt, proj_status.txt, ps_processes.txt, eadme.txt, oadmap.txt, soak_info.txt, src_tree.txt, stash_info.txt, status_info.txt, 	ech_debt.txt, 	est_output.txt, 	odos.txt, 	sc_output.txt

---

## 2. AUDITORIA FORENSE POR DOMÍNIO

### A) CULTURA
| Afirmação | Evidência exata | Certeza | Observação/Limitação |
| :--- | :--- | :--- | :--- |
| A criação permite seleção de Cultura | mobile/src/ui/screens/steps/CultureSelectStep.tsx | FATO OBSERVADO | Atribui estaticamente o CultureId inicial no state. |
| O Fragmento regional assimilation existe | mobile/src/infrastructure/war/local-war-resolver.ts | FATO OBSERVADO | O valor de assimilation cai no momento exato do cálculo da conquista da região. |
| Economia utiliza um stub constante de assimilação | mobile/src/core/simulation/systems/economy-system.ts | FATO OBSERVADO | Linha 137 contém a constante literal const aassimilation = 1.0; // Not yet in ECS. |
| Difusão cultural dinâmica iterativa | Busca repo-wide por culture-system ou consumidores de diffusion | NÃO DEMONSTRADO | Não foi localizado nenhum propagador que altere a assimilação de forma contínua no tempo inter-regional. |

### B) EVENTOS E CAUSALIDADE
| Afirmação | Evidência exata | Certeza | Observação/Limitação |
| :--- | :--- | :--- | :--- |
| O modelo armazena os fatos isolados | mobile/src/core/models/events.ts (Interface DomainEvent com actorKingdomId e payload) | FATO OBSERVADO | O esquema não declara campo formal de parentesco/causalidade estrutural (ex: parentEventId). |
| O motor avança correntes controladas (event chains) | mobile/src/core/simulation/systems/event-chain-system.ts | FATO OBSERVADO | Opera gatilhos em estágios sequenciais baseados na leitura randômica versus número do *tick*. |
| Cadeia causal geral vinculando todos os sistemas e rastreável pela UI | Auditoria nas interfaces de log, esquemas de evento e sistemas correntes | NÃO DEMONSTRADO | O encadeamento de uma consequência lógica à sua causa matriz global e a reconstrução dessa árvore pela UI não foram observados operacionais. |

### C) DIPLOMACIA E GUERRA
| Afirmação | Evidência exata | Certeza | Observação/Limitação |
| :--- | :--- | :--- | :--- |
| O motor distingue múltiplos Tratados | mobile/src/infrastructure/diplomacy/local-diplomacy-resolver.ts e enum | FATO OBSERVADO | Tratados implementados em lista: Aliança, Paz, Não Agressão, Vassalo, Tributo. |
| A declaração de Guerra e Paz operam *cooldowns* de tempo | local-war-resolver.ts (WAR_DECLARATION_COOLDOWN_MS, WAR_TRUCE_COOLDOWN_MS) | FATO OBSERVADO | O bloqueio temporal é avaliado via timestamp lastUpdatedAt. |
| As cascatas diplomáticas incluem Aliados e Vassalos | local-war-resolver.ts | FATO OBSERVADO | A declaração de guerra coleta ativamente IDs vinculados por TreatyType.Alliance ou Vassalage. |
| O Limiar numérico dita o *flip* | local-war-resolver.ts (usa estritamente warScore >= CONQUEST_THRESHOLD fixo em 34) | FATO OBSERVADO | A guerra resolve posse instantânea perante este limiar isolado. Outras resoluções negociadas não foram plenamente mapeadas. |
| O warScore flutua numericamente através do tempo contínuo | war-system.ts | FATO OBSERVADO | Há mutação periódica do warScore perante o diferencial abstrato de "poder". |

### D) MINISTROS E CONSELHO
| Afirmação | Evidência exata | Certeza | Observação/Limitação |
| :--- | :--- | :--- | :--- |
| O estado funcional persiste de forma regular | mobile/src/core/models/administration.ts (Interface Minister) | FATO OBSERVADO | As chaves mecânicas base (Nível, XP, Lealdade, Salário, Stats RPG) residem integralmente e são mutadas em GameState.kingdoms. |
| A identidade / Traits baseiam-se em reconstituição | mobile/src/core/simulation/systems/character-interpreter.ts e modifier-cache.ts | FATO OBSERVADO | As variáveis imersivas e os modificadores aplicados não persistem nominalmente. A infraestrutura deriva os traits rodando um determinístico mulberry32 sobre a identificação toda vez que o conselho precisa ser renderizado ou influenciar taxas. |

### E) PERSONAGENS ÉPICOS / LENDÁRIOS
| Afirmação | Evidência exata | Certeza | Observação/Limitação |
| :--- | :--- | :--- | :--- |
| Existência do schema epic-characters.ts | Define descrições visuais, portraits e bônus fixos de UI | FATO OBSERVADO | Localizado em src/assets/data e consumido por AvatarRenderer.tsx. |
| Existência do schema legendaries.ts | Define RPG Pleno (Stats de 5 colunas), regras e narrativas descritivas | FATO OBSERVADO | Localizado em src/core/data e consumido por character-interpreter.ts. |
| Equivalência referencial | Os dois arquivos utilizam chaves e strings para as exatas mesmas entidades históricas (Ex: Fundadores). | INFERÊNCIA | Trata-se do mesmo conceito consumido em vias não combinadas (UI vs Simulação) operando schemas paralelos. |

### F) RANDOMICIDADE
| Afirmação | Evidência exata | Certeza | Observação/Limitação |
| :--- | :--- | :--- | :--- |
| Funções cruciais de *gameplay* executam aleatoriedade física local | character-system.ts (stats de herança), disaster-system.ts, migration-system.ts (spawn inicial) executam internamente Math.random() ativamente | FATO OBSERVADO | |
| Efeitos sobre a determinação do cenário progressivo | O avanço natural baseia-se na execução destas chamadas físicas avulsas e não rastreáveis do Math.random(). | INFERÊNCIA (IMPLICAÇÃO TÉCNICA) | Deduz-se arquiteturalmente que execuções idênticas divergirão, contudo a divergência isolada não foi demonstrada via prova experimental controlada nesta auditoria. |
| Impacto técnico inerente sobre o Determinismo, Replay e Multiplayer | Natureza nativa da função do browser face a estado persistente rigoroso | INFERÊNCIA (IMPLICAÇÃO TÉCNICA) | Execuções independentes não são garantidamente reproduzíveis nas condições atuais devido ao uso de Math.random() em caminhos da simulação. |

### G) TEMPO E OFFLINE
| Afirmação | Evidência exata | Certeza | Observação/Limitação |
| :--- | :--- | :--- | :--- |
| Duração base do *Tick* na constante estática | TEMPORAL_CONFIG.BASE_TICK_DURATION_MS = 10000 | FATO OBSERVADO | Fixada em 10 segundos. |
| Cálculo aritmético do salto | desiredTicks = Math.floor(elapsedMs / Math.max(1, state.meta.tickDurationMs)) em GameSession.ts | FATO OBSERVADO | Há truncamento nativo para baixo; as frações residuais de tempo morrem no processo sem buffer compensatório explícito acumulado no loop de captura do offline. |
| Teto da compensação inativa (maxOfflineTicks) | O teto default operado em variável constante é 12000 | FATO OBSERVADO | Não foi detectada persistência dessa variável no payload salvo configurável pela UI até o momento (utiliza a definição de configuração/dependência de startup). |
| Comportamento da Velocidade | O elapsedMs perante 	ickDurationMs exclui speedMultiplier no salto da ausência. | FATO OBSERVADO | O Catch-up lê o tempo real decorrido; ignorando se o jogo estava em "30x" ou "1x" no momento do fechamento. |
| Comportamento do fluxo ao Descongelar o Catch-up | A Sessão força explicitamente as variáveis 	his.currentState.meta.speedMultiplier = 0.5 e 	his.currentState.meta.paused = true logo após a aplicação. | FATO OBSERVADO | |

---

## 3. TESTES NO DIRETÓRIO src/__tests__

| Arquivo (*.test.ts) | Objetivo Real Observado | Resultado | Limitações |
| :--- | :--- | :--- | :--- |
| autosave-phase-c.test.ts | Verifica rotinas de disparo para salvamento em fases temporais. | NÃO EXECUTADO NESTA AUDITORIA | - |
| benchmark-save.test.ts | Caracteriza tamanho da serialização. | NÃO EXECUTADO NESTA AUDITORIA | - |
| bootstrap-aggregations.test.ts | Verifica preenchimento de agregadores em inicialização. | NÃO EXECUTADO NESTA AUDITORIA | - |
| c1-roundtrip.test.ts | Verifica serialização e desserialização perante hidratador de ECS. | NÃO EXECUTADO NESTA AUDITORIA | - |
| capital-integrity.test.ts | Verifica limites do ECS associados à flag Capital. | NÃO EXECUTADO NESTA AUDITORIA | - |
| create-initial-state.test.ts | Verifica montagem espacial primitiva do Array ECS em boot. | NÃO EXECUTADO NESTA AUDITORIA | - |
| economy-consolidation.test.ts | Verifica consolidação matemática de fluxos econômicos básicos. | NÃO EXECUTADO NESTA AUDITORIA | - |
| ecs-integrity.test.ts | Verifica *bounds* e *overflows* dos arrays pré-alocados. | NÃO EXECUTADO NESTA AUDITORIA | - |
| lifecycle-new-game.test.ts | Verifica transições de startup isoladas na Session. | NÃO EXECUTADO NESTA AUDITORIA | - |
| ownership-invariants.test.ts | Verifica se hexágonos evitam estados ilógicos de posse sobreposta. | NÃO EXECUTADO NESTA AUDITORIA | - |
| p1-characterization.test.ts | Caracteriza desvios numéricos do batch de simulação. | EVIDÊNCIA HISTÓRICA — procedência exata não determinada. | Resultado reflete a caracterização local pré-intervenção sobre os deltas do Pipeline, não validado integralmente no current tree desta exata rodada. |
| progression-build.test.ts | Verifica desconto de materiais em instâncias isoladas de edificação. | NÃO EXECUTADO NESTA AUDITORIA | - |
| egion-index.test.ts | Verifica acesso posicional string -> i. | NÃO EXECUTADO NESTA AUDITORIA | - |
| spawn-continent.test.ts | Verifica a continuidade do continente e flags litorâneas. | NÃO EXECUTADO NESTA AUDITORIA | - |
| stable-hash.test.ts | Verifica consistência hash sobre determinismo de objetos JS. | NÃO EXECUTADO NESTA AUDITORIA | - |
| structural-sharing-capital.test.ts | Verifica clonagem contra mutação cruzada (*by ref*). | NÃO EXECUTADO NESTA AUDITORIA | - |
| 	1-systems-normalization.test.ts | Caracteriza a disparidade estrita entre valores acumulados por "step-by-step" vs cálculo aglutinado num único delta ("runBatch"). | EVIDÊNCIA HISTÓRICA — procedência exata não determinada (contexto empírico do T1-A). | O teste comprova apenas quantitativamente a anomalia das formulações numéricas, não garante a intenção de Game Design global; resultado isolado da bateria geral atual. |
| 	emporal-contract.test.ts | Verifica limites de Tick vs Dia em pipelines temporais. | NÃO EXECUTADO NESTA AUDITORIA | - |
| utf8-integrity.test.ts | Verifica integridade de bytes sob encode tipado. | NÃO EXECUTADO NESTA AUDITORIA | - |
| alidate-save-real.test.ts | Verifica serialização em base sintética pesada sem mock raso. | NÃO EXECUTADO NESTA AUDITORIA | - |

---

## 4. CLASSIFICAÇÃO GERAL DE COBERTURA DA BASELINE

| Componente | Classificação | Escopo Efetivamente Comprovado |
| :--- | :--- | :--- |
| **Boot** | AUDITADO | Ações mecânicas de create-initial-state.ts com arrays do ECS lidas e confirmadas. |
| **Save/Load** | PARCIALMENTE AUDITADO | O bypass nativo do ECS (TickPipeline) listado; ciclo de objeto serializado pleno não mapeado internamente ao longo da GameSession. |
| **Pause/Play** | AUDITADO | Leitura integral da injeção de trava na Fila de Tick (GameSession.pumpSimulationQueue). |
| **Offline** | AUDITADO | Limitadores, math.floor e salto numérico em chunk constatados objetivamente. |
| **Speed** | AUDITADO | Comprovado que apenas acelera o delta diário no motor interno, descolado da fração base estrita. |
| **Calendar** | AUDITADO | O contrato 30/12/360 existe estático como base de conversão no código. |
| **Automation** | PARCIALMENTE AUDITADO | A UI (GovScreen) apresenta diretivas, mas o fluxo resolutivo reativo da IA do conselho aos eventos não foi traçado de ponta-a-ponta. |
| **Administration** | PARCIALMENTE AUDITADO | A persistência estrutural de atributos do Minister no model foi vista; efeito em cadeia do XP do ministro ao longo da simulação diária não constatado de ponta-a-ponta. |
| **Council** | PARCIALMENTE AUDITADO | Confirmação da dualidade de traços (Híbrido) e recrutamento mapeada, porém influências dinâmicas diretas do conselho nas crises temporais não exploradas totalmente. |
| **Migration** | PARCIALMENTE AUDITADO | Observou-se dependência do Math.random() na base; loop funcional inter-tick da migração demográfica perimetral integral não percorrido profundamente. |
| **Economy** | PARCIALMENTE AUDITADO | Stub fixo explícito no fator assimilation visto; iteração fundamental de stocks vista no teste/simulação local; modelo dinâmico geral não dissecado nesta passagem. |
| **Military** | PARCIALMENTE AUDITADO | Efeitos diretos de bônus vindos de tech na capacidade marcial observados, porém o sistema de movimento e conflitos diretos de exército nativo não periciado. |
| **Logistics** | NÃO AUDITADO | - |
| **Combat** | NÃO AUDITADO | - |
| **Conquest** | PARCIALMENTE AUDITADO | Flip territorial instanciado sob limiares explícitos (ex: CONQUEST_THRESHOLD); não mapeada a rotina granular intra-batalha antecedente ao flip. |
| **Diplomacy** | PARCIALMENTE AUDITADO | Mecânica de tratados e cascatas de aliança/vassalos lidas em código de forma isolada; ciclo ativo contínuo da Diplomacia não completamente esgotado na árvore. |
| **Religion** | PARCIALMENTE AUDITADO | Difusão espacial cruzada atestada operando fisicamente (via limites e aithShareEcs); impacto orgânico de Heresia e eventos centrais sistêmicos associados inteiros não isolados exaustivamente. |
| **Technology** | PARCIALMENTE AUDITADO | A injeção instantânea das resoluções tecnológicas na forma de constantes está evidente; progresso acumulado diário inter-reinos não completamente verificado de ponta a ponta. |
| **Population** | PARCIALMENTE AUDITADO | Iterador restrospectivo diário interno (step < tickScale) lido e evidente. Processo amplo de transições de classes estruturais não avaliado por inteiro. |
| **Culture** | PARCIALMENTE AUDITADO | Criação inicial confirmada em UI; fragmentos no ECS constatados como estáticos para efeito ativo inter-reinos; o sistema integral de propagação não foi demonstrado. |
| **Characters** | PARCIALMENTE AUDITADO | O processamento da Identidade efêmera isolada x estado físico restritivo lido. Impacto do player life-cycle ou RPG em tempo longo de Gameplay não esgotado. |
| **Dynasty** | PARCIALMENTE AUDITADO | A árvore de herança comprova a introdução do Math.Random(); desfechos mecânicos prolongados de ruptura dinástica ou usurpação completa não esgotados. |
| **Events** | PARCIALMENTE AUDITADO | As entidades (DomainEvent) e EventChainSystem isoladas estão validadas estruturalmente; Causalidade de log completa e vinculativa a longo prazo não demonstrada. |
| **World Activity** | NÃO AUDITADO | - |
| **Rendering/Data Aggregation** | NÃO AUDITADO | - |
| **Dynamic Kingdoms** | PARCIALMENTE AUDITADO | O MAX_FACTIONS (255) está atestado no limite ECS. Fragmentação macro-sistêmica emergente ou o nascimento integral do zero não demonstrados na trilha central inspecionada. |
| **Procedural Generation** | PARCIALMENTE AUDITADO | Demonstrou ser um conceito fragmentado, variando entre mulberry32 previsível (Traits) e nativo físico (Math.random). Demais geradores lógicos da *world-gen* não exauridos globalmente. |
| **Initial State** | PARCIALMENTE AUDITADO | Montagem básica das propriedades TOTAL_HEXES confirmada na topologia, sem dissecar o pipeline completo que pinta os biomas integralmente. |
| **Onboarding UI** | PARCIALMENTE AUDITADO | Componentes declarados em views localizados, porém o fluxo lógico integral do onboarding na React Tree não exaurido. |

---

**STATUS: BASELINE FACTUAL PARCIAL — COBERTURA RESTANTE IDENTIFICADA**
