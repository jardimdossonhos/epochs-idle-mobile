# Registro de Decisões de Game Design (Design Memory)

Este documento guarda TODAS as leis sistêmicas estabelecidas de Game Design.

### DD-001
**Título:** Semântica Temporal Fundamental
**Status:** DECIDIDO
**Decisão:** 
1 tick = 1 dia.
12 meses = 1 ano.

O calendário deve representar claramente:
- Ano
- Mês
- Dia, se a UI futura comportar esse nível de detalhe.

O speedMultiplier altera a velocidade com que os ticks são processados, mas NÃO altera a duração conceitual de um tick.
**Implementação:** PENDENTE (O código atual ainda trata 1 tick = 1 mês).

### DD-002
**Título:** Exibição do Calendário
**Status:** DECIDIDO
**Contexto:** Facilidade de interpretação temporal.
**Decisão:** O calendário deve ficar visível no HUD. Detalhes adicionais ficam acessíveis ao clicar em "Ano X · Mês Y".

### DD-003
**Título:** Coerência Cultural-Geográfica no Início
**Status:** DECIDIDO (Implementação: Pendente Refinamento)
**Contexto:** Compatibilidade de lore e simulação.
**Decisão:** A cultura selecionada deve ser compatível com a região geográfica inicial. O jogador não deve poder escolher uma cultura e depois nascer em uma região incompatível arbitrariamente.

### DD-004
**Título:** Fidelidade do Spawn Geográfico
**Status:** DECIDIDO (Implementado)
**Contexto:** Resolução de AF-006.
**Decisão:** A seleção geográfica apresentada na criação de personagem deve corresponder semanticamente ao local efetivo de spawn na matriz, através de limites rigorosos. Não exibir "Península Ibérica" e lançar o jogador no Saara.

### DD-005
**Título:** Legado Cultural Contínuo
**Status:** PROPOSTA
**Contexto:** Cultura precisa de efeitos ativos.
**Decisão:** Culturas podem possuir características permanentes ou de longo prazo, positivas e negativas.

### DD-006
**Título:** Árvore Tecnológica Cultural
**Status:** PROPOSTA
**Decisão:** Culturas podem futuramente possuir árvores tecnológicas próprias, além da árvore tecnológica geral.

### DD-007
**Título:** Coexistência Tecnológica
**Status:** DECIDIDO MAS NÃO IMPLEMENTADO
**Decisão:** A tecnologia cultural não deve substituir a árvore tecnológica geral. As duas podem coexistir.

### DD-008
**Título:** Gênese Religiosa
**Status:** DECIDIDO MAS NÃO IMPLEMENTADO
**Decisão:** A religião inicial pode ser herdada/sugerida pela cultura, mas o jogador possui liberdade fundamental para criar e formatar uma religião própria.

### DD-009
**Título:** Equilíbrio de Criação Religiosa
**Status:** PROPOSTA
**Decisão:** Religião customizável possui orçamento de pontos de design: vantagens custam pontos; desvantagens podem liberar pontos; o sistema deve manter equilíbrio de poder.

### DD-010
**Título:** Escopo de Customização Religiosa
**Status:** PROPOSTA
**Decisão:** O jogador pode definir: nome da religião; objeto de culto; doutrinas; benefícios; penalidades; identidade religiosa.

### DD-011
**Título:** Culto à Personalidade Dinástica
**Status:** PROPOSTA
**Decisão:** O governante pode ser objeto de culto ativo.

### DD-012
**Título:** A Fé como Moeda Ativa Estratégica
**Status:** DECIDIDO
**Decisão:** A Fé acumulada é uma MOEDA estratégica consumível. Não deve existir apenas como estatística visual inerte.
**Implementação:** PENDENTE.

### DD-013
**Título:** Escopo de Milagres
**Status:** DECIDIDO
**Decisão:** A Fé pode ser gasta em Milagres (Skill System ativo). Exemplos:
- cessar peste;
- cessar praga;
- cessar seca;
- cessar enchente;
- reduzir impacto de desastre;
- colheita abundante;
- prosperidade;
- proteção;
- efeitos militares;
- pragas contra inimigos;
- conversão;
- expansão religiosa.
**Implementação:** PENDENTE.

### DD-014
**Título:** Custo Real de Milagres
**Status:** DECIDIDO
**Decisão:** Milagres devem possuir custo real e ponderado em Fé para evitar trivialização da economia.
**Implementação:** PENDENTE.

### DD-015
**Título:** Dicotomia Religiosa (Território vs Banco)
**Status:** DECIDIDO
**Decisão:** Fé e extensão territorial/religiosa são conceitos diferentes. "Quantidade de Fé armazenada" não equivale a "quantidade de território convertido".
**Implementação:** PENDENTE.

### DD-016
**Título:** Automação Ministerial de Fé
**Status:** DECIDIDO
**Decisão:** Deve existir automação de gasto de Fé com as políticas: sobrevivência, prosperidade, guerra, expansão religiosa e reserva mínima de fé.
**Implementação:** PENDENTE.

### DD-017
**Título:** Multifatorialidade de Resposta a Desastres
**Status:** PROPOSTA
**Decisão:** Desastres devem possuir múltiplas formas de resposta. Exemplos: administrativa, tecnológica, econômica, natural, religiosa.

### DD-018
**Título:** Coerência Arquitetural de Infraestrutura
**Status:** DECIDIDO MAS NÃO IMPLEMENTADO (Parcialmente quebrado na base atual)
**Contexto:** Impede contradições temporais (ex: Universidade Nômade).
**Decisão:** A infraestrutura deve refletir a evolução tecnológica e cultural. Construções que dependem de tecnologias/eras/culturas não devem aparecer como disponíveis no início sem justificativa.

### DD-019
**Título:** Horizonte Naval
**Status:** PROPOSTA
**Decisão:** Portos, pesca, navegação e guerra naval são sistemas futuros, mas devem ser considerados na arquitetura base (Ex: Grade Espacial do ECS) para não criar bloqueios.

### DD-020
**Título:** Adaptação Geográfica Extrema
**Status:** PROPOSTA
**Contexto:** O ambiente deve moldar o sucesso da população.
**Decisão:** Culturas podem possuir adaptação geográfica (Frio, Deserto, Tropical, Marítima) que afetará produção, sobrevivência e custos (Valores ainda NÃO definidos).

### DD-021
**Título:** Reinos São Entidades Políticas Dinâmicas
**Status:** DECIDIDO
**Decisão:** O número de reinos do mundo NÃO é fixo. A campanha começa com um conjunto inicial de entidades políticas, mas ao longo da cronologia o mundo deve ser capaz de produzir:
- nascimento de novos reinos;
- crescimento territorial e populacional;
- divisão, fragmentação, guerras civis e sucessões que levem à fragmentação;
- anexação de territórios e conquista total de um reino;
- desaparecimento de um reino;
- transformação em vassalos e emancipação de vassalos;
- formação de novos estados a partir de vassalos ou rebeldes;
- perda de território, redução a pequenas entidades ou reinos sem território;
- retorno de territórios à condição selvagem/natureza e posterior colonização.
**Consequência Fundamental:** Os NPCs iniciais exibidos (Harappa, Xia, Nilo, Uruk) são apenas os reinos iniciais e formam o "estado inicial das relações diplomáticas". Eles NÃO constituem um limite quantitativo, lista permanente de civilizações, nem limite para diplomacia, guerra, cultura, religião ou tecnologia.
**Distinção Obrigatória:**
- *Implementação Atual:* 6 entidades políticas no estado inicial (1 player + 4 NPC + 1 natureza).
- *Game Design:* Quantidade de reinos dinâmica e emergente.

---

## OPEN QUESTIONS (Questões de Design Ainda Não Decididas)

**1. UX de construções bloqueadas:**
- Esconder?
- Disabled (Mostrar em cinza)?
- Mostrar requisitos?
- Categoria "futuro"?

**2. Balanceamento da Fé:**
- Geração;
- Armazenamento;
- Custo de milagres;
- Cooldown;
- Limites anti-spam;
- Relação entre tamanho do império e poder religioso.

**3. Tecnologia cultural:**
- Árvore separada?
- Árvore complementar?
- Desbloqueios híbridos?

**4. Compatibilidade cultura/geografia:**
- Restrição absoluta?
- Cultura sugerida + exceções?
- Penalidades por incompatibilidade?

NÃO DECIDIR ESSAS QUESTÕES AGORA.
