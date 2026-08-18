# CHANGELOG

## [Unreleased] - Agosto 2026

### Auditoria de Economia e UI (ECS vs O.O.)
- **Diagnóstico da UI vs Build**: Identificamos que a interface visual exibe "Seu domínio" lendo corretamente do ECS (`regionOwner`), mas o comando de construção avalia o dono com base no sistema antigo Orientado a Objetos (`world.regions[id].ownerId`), resultando em bloqueios de "Você só pode construir em seus próprios territórios".
- **Diagnóstico da Economia**: Identificada a dupla autoridade no balanço de ouro. Tanto o sistema ECS (`MacroEconomySystem`) quanto o legado O.O. (`EconomySystem`) estavam gravando saldos de ouro simultaneamente. Isso causava a dedução contínua (-2.28) derivada do custo fixo burocrático inicial contra uma base econômica pequena no loop O.O.
- **Diagnóstico de Simulação**: O sistema ficava preso no Tick 1 pois a simulação inicia em pausa forçada (`paused = true` em `GameSession.bootstrap`), bloqueando o avanço do clock real.

### Engenharia de Diplomacia & Consequências de Guerra
- **Fim da Trégua Fantasma**: A engine não força mais a paz automaticamente quando a guerra estagna. As facções lutam até a vitória ou rendição oficial.
- **Desastres de Exaustão**: Implementado um subsistema punitivo. Se a Exaustão de Guerra ultrapassar 80% (0.8), há chance de engatilhar eventos críticos:
  - Fome de Guerra (perda massiva de suprimento alimentar).
  - Praga de Batalha (perda de população).
  - Revolta (Queda brusca de estabilidade).
- **Rendição Orgânica (Vassalagem)**: NPCs perdendo esmagadoramente e exaustos agora enviam uma proposta formal de Vassalagem implorando pela vida.
- **Paz Branca (Stalemate)**: Se ambas as facções estiverem esgotadas e a guerra estiver empatada no front, os NPCs enviarão uma proposta de Paz Branca para salvar suas economias.
- **Paradoxo do Tributo Corrigido ("Peace-on-Treaty")**: Assinar um tratado vinculativo (Tributo, Vassalagem, Aliança, Pacto de Não Agressão) com uma nação inimiga agora encerra automaticamente as hostilidades, forçando o status diplomático para Trégua e convertendo o acordo de forma pacífica.
- **Polimento Geográfico nos Logs**: O Sistema de Logs agora consulta o Dicionário do Mundo para traduzir IDs de Regiões para nomes legíveis (ex: de `r_hex_38521` para `Vale Sombrio`) durante avisos de risco de revolta e atividades administrativas.
