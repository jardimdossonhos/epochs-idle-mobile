# Original User Request

## Initial Request — 2026-07-03T09:12:18-03:00

# Teamwork Project Prompt — Epoch Idle Quality Sprint

Corrigir 6 problemas de qualidade e bugs no jogo mobile Epochs Idle (React Native + Expo), incluindo: troca de login na tela principal, internacionalização em PT-BR, correção da exibição do relógio de jogo, correção do autosave, criação de um modo desenvolvedor secreto com ferramentas avançadas e uma auditoria geral de performance e bugs.

Working directory: c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle
Integrity mode: development

---

## Contexto Técnico

- O projeto mobile está em: `c:\Users\joti.SIMPLO\Documents\CURSOR\Epochs Idle\mobile`
- Stack: React Native + Expo + TypeScript
- Motor de jogo: `src/application/game-session.ts` (classe `GameSession`)
- UI Provider: `src/ui/GameProvider.tsx` (contexto com `useGameState()`)
- Tela principal pós-login: `src/ui/screens/MainMenuScreen.tsx`
- Tela de autenticação: `src/ui/screens/AuthScreen.tsx`
- Contexto de auth: `src/ui/context/AuthContext.tsx`
- HUD do jogo: `src/ui/components/TopHUD.tsx`
- Save slots: `src/infrastructure/persistence/save-slots.ts` (AUTOSAVE_SLOT_ID = "auto-1")
- Auto-save é disparado pelo método `runAutosave()` em `game-session.ts` a cada 300 ticks, e por `forceSaveToDisk()` ao entrar em background.

---

## Requirements

### R1. Troca de Usuário na Tela Principal (MainMenuScreen)

O banner de perfil do usuário no topo da `MainMenuScreen` (que exibe nome + provedor de login) deve ser transformado em um botão clicável. Ao clicar, deve abrir um modal ou action sheet que ofereça ao usuário a opção de **Trocar de Conta** (que executa logout e navega para `AuthScreen`). Essa funcionalidade deve ser adicional — não substituir o botão de logout existente nas configurações.

### R2. Internacionalização PT-BR

Todo texto visível na interface do jogo deve estar em Português Brasileiro como idioma padrão. Deve ser implementado um sistema de i18n simples (objeto de strings ou biblioteca leve) que permita trocar para outros idiomas no futuro. A tela de Configurações (`SettingsScreen.tsx`) deve ter um seletor de idioma com pelo menos PT-BR e EN-US. Textos hardcoded em inglês como "New Game", "Load Game", "Enter the Realms", "Continue as Guest", labels dos recursos, etc., devem ser traduzidos.

### R3. Correção da Exibição do Relógio (Mês/Ano no HUD)

O `TopHUD.tsx` exibe mês e ano com base em `gameState.meta.tick`. O problema relatado é que a exibição pula meses sem mostrar os intermediários — o usuário reportou passar do Mês 2 diretamente para o Mês 5. A causa provável é que `gameState` só é re-renderizado em certos intervalos, e os ticks processados em batch (MAX_TICKS_PER_FRAME=5) não disparam re-renders intermediários. A solução deve garantir que cada múltiplo de "tick de mês" (a cada 1 tick = 1 mês, ou conforme a lógica definida) seja refletido na UI sem pular frames visíveis.

### R4. Correção do Auto-Save (Slot "AUTO-1" vazio no Load Game)

O auto-save está sendo logado no terminal mas o slot `auto-1` aparece como vazio na tela de Load Game. O problema está em `doCommitAutosave()` em `game-session.ts`: o snapshot é construído corretamente em `buildSaveSlotSnapshot()`, mas a gravação no `saveRepository` pode estar falhando silenciosamente (o método `saveToSlot` pode estar sendo chamado de forma assíncrona sem await, ou a instância de `saveRepository` sendo usada por `forceSaveToDisk` é diferente da usada por `LoadGameModal`). A correção deve garantir que: (a) o autosave escreva no storage com `await`; (b) o `LoadGameModal` leia do mesmo repositório; (c) o slot `auto-1` apareça visualmente na lista com um label "Auto Save" claro.

### R5. Modo Desenvolvedor Secreto (DevMode)

Criar um painel de desenvolvedor oculto, ativado por **5 cliques rápidos** no título "EPOCHS" da `MainMenuScreen` (padrão easter egg do Android). O painel deve ser uma tela ou modal sobreposto com visual escuro (background `#0D1117`) e as seguintes ferramentas:

- **a) Fog of War Toggle**: Botão para ativar/desativar a névoa de guerra no mapa instantaneamente.
- **b) +1000 Recursos**: Botões individuais para adicionar +1000 de cada recurso existente (Ouro, Madeira, Ferro, Comida, Fé, Legitimidade, Manpower, Riqueza).
- **c) Completar Pesquisa/Construção**: Botão que completa instantaneamente qualquer pesquisa ou construção em andamento no reino do jogador.
- **d) Desbloquear Todas as Eras**: Botão que avança o progresso das eras de civilização ao máximo.
- **e) Visualizador de Decisões da IA**: Painel em tempo real mostrando para cada reino NPC: nome, foco atual (ex: "Expandir", "Construir Exército"), alvo de ataque ou diplomacia e motivo. Deve ler do `gameState.kingdoms`.
- **f) Assumir Controle de Outra Civilização**: Dropdown com lista de reinos NPC; ao selecionar, troca o `playerKingdomId` para aquele reino.
- **g) Modo Simulação Rápida (Autoplaying)**: Botão toggle que acelera a velocidade da simulação para 100x temporariamente (modifica `tickDurationMs` do estado).
- **h) Matriz de Relacionamento**: Tabela visual mostrando o status diplomático entre todos os reinos (Aliado/Amigável/Hostil/Neutro).
- **i) Simulador de Combate Rápido**: Inputs para escolher dois reinos e simular um combate entre eles, exibindo o resultado estimado sem afetar o estado real.

O painel deve poder ser fechado e reaberto. Deve exibir um aviso "MODO DESENVOLVEDOR ATIVO" na UI quando estiver ativo.

### R6. Auditoria Geral de Performance e Bugs

Realizar uma auditoria técnica completa do código existente buscando:
- Funções assíncronas chamadas sem `await` que podem causar race conditions.
- Warnings do tipo `[SYS-PERF] Dívida de CPU massiva detectada` — investigar a causa raiz e ajustar o `MAX_TICKS_PER_FRAME` ou o `safety clamp` em `pumpSimulationQueue` para que o warning nunca ocorra em condições normais de uso (velocidades de 1x a 30x).
- Funcionalidades inacabadas, telas ou botões que não funcionam.
- Memory leaks em listeners não removidos.
- Qualquer tela ou componente que ainda esteja em inglês após o R2.

---

## Acceptance Criteria

### R1 — Troca de Usuário
- [ ] Clicar no banner de perfil abre um modal/action sheet com a opção "Trocar de Conta".
- [ ] Ao confirmar, o usuário é deslogado e navega para a `AuthScreen`.

### R2 — PT-BR
- [ ] Toda UI visível está em PT-BR por padrão (incluindo MainMenu, AuthScreen, HUD, Configurações, LoadGame).
- [ ] Existe seletor de idioma em Configurações com PT-BR e EN-US funcionais.

### R3 — Relógio
- [ ] A exibição do mês no HUD avança de forma sequencial (1, 2, 3, 4...) sem pular meses visíveis.

### R4 — Auto-Save
- [ ] O slot `auto-1` aparece na tela de Load Game após o autosave ser disparado.
- [ ] Ao carregar o slot `auto-1`, o jogo é restaurado corretamente ao estado salvo.

### R5 — DevMode
- [ ] O painel de dev abre com 5 cliques no título "EPOCHS" na MainMenuScreen.
- [ ] Cada uma das 9 ferramentas (a-i) está funcional e conectada ao `GameSession`.
- [ ] O painel é fechável e o estado `devMode: true/false` é gerenciado localmente.

### R6 — Auditoria
- [ ] Nenhum warning `[SYS-PERF]` deve aparecer nos logs durante uso normal em velocidades ≤ 30x.
- [ ] Relatório de auditoria listando todos os bugs encontrados e as correções aplicadas.
- [ ] TypeScript compila sem erros (`npx tsc --noEmit`).
