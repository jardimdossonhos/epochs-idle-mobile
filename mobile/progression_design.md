# Epochs Idle — Documento de Progressao (GDD Real)

> Este documento e gerado por **auditoria direta do codigo** (nao e especulativo).
> Todos os valores foram extraidos de: game-session.ts, create-initial-state.ts, technology-tree.ts, technology-system.ts, character-system.ts

---

## 1. Relogio do Jogo (Matematica)

| Parametro | Valor no Codigo |
|-----------|-----------------|
| tickDurationMs (padrao) | **3.000 ms** (3 segundos por tick) |
| Ticks por mes de jogo | **1 tick = 1 mes** |
| Meses por ano de jogo | **12 meses** |
| **1 ano de jogo (x1)** | **36 segundos de tempo real** |
| speedMultiplier disponivel | 0.5, 1, 5, 10, 30 |
| **1 ano de jogo (x30)** | ~1.2 segundos de tempo real |
| Clock fisico (NativeClockService) | Pulsa a cada 250ms |

---

## 2. Linha do Tempo — Progressao Tecnologica (Velocidade x1)

### Pre-Historia (Anos 1-5 | ~3 min)
| Tecnologia | Custo | Tempo estimado (x1) |
|------------|-------|---------------------|
| fire_mastery (ja desbloqueada) | 40 | — |
| bone_tools (pesquisa inicial) | 60 | ~4 min |
| animism | 70 | ~5 min |
| hunting_parties | 85 | ~6 min |

**Taxa de pesquisa:** ~0.8 pts/tick em condicoes normais.
**Com foco ativo no dominio certo:** ate ~1.5 pts/tick.

### Revolucao Neolitica (Anos 5-15 | ~10-30 min)
| Tecnologia | Custo | Pre-requisitos | Tempo estimado (x1) |
|------------|-------|----------------|---------------------|
| oral_tradition | 100 | animism | ~7 min |
| sedentism | 250 | fire_mastery + bone_tools | ~17 min |
| basic_agriculture | 380 | sedentism | ~25 min |

> AVISO: sedentism (custo 250) e basic_agriculture (custo 380) sao as pesquisas mais caras implementadas.
> A arvore tecnologica no codigo **termina aqui** — apenas 7 tecnologias estao implementadas.

---

## 3. Estado Atual da Arvore Tecnologica (Completo)

| ID | Nome | Dominio | Custo | Efeito |
|----|------|---------|-------|--------|
| fire_mastery | Dominio do Fogo | Economy | 40 | +10% comida, +5% pop growth |
| bone_tools | Ferramentas de Osso | Engineering | 60 | +5% impostos |
| animism | Animismo | Religion | 70 | +10 coesao, +5 legitimidade |
| hunting_parties | Grupos de Caca | Military | 85 | +50 manpower |
| oral_tradition | Tradicao Oral | Administration | 100 | +10 cap. adm. |
| sedentism | Sedentarismo | Engineering | 250 | x2.0 limite populacional |
| basic_agriculture | Agricultura Primitiva | Economy | 380 | +40% producao de comida |

**Total de tecnologias implementadas: 7 (arvore curta, precisa expansao)**

---

## 4. Progressao do Soberano (Ruler/Character System)

| Parametro | Valor no Codigo |
|-----------|-----------------|
| Atributos base | 1 em cada |
| Pontos para distribuir | 25 pontos |
| Maximo por atributo (compra) | 10 (clamp 1-10) |
| Bonus de cultura | +1 a +2 atributos especificos |
| Level | Campo existe (level, experience, unspentTalentPoints) |
| XP ganho por evento | NAO IMPLEMENTADO — campo existe, sem logica |
| Level maximo | NAO DEFINIDO — sem cap de nivel |
| Morte por velhice | Baseado em age calculado por birthTick vs. tick/12 |

---

## 5. Sistemas Ativos no Loop Principal

| Sistema | Status |
|---------|--------|
| Economia (ECS) | Ativo |
| Populacao (ECS) | Ativo |
| Militar (ECS) | Ativo |
| Tecnologia | Ativo |
| Religiao | Ativo |
| Conselho/Ministros | Ativo |
| IA NPC (UtilityNpcDecisionService) | Ativo |
| Diplomacia (LocalDiplomacyResolver) | Ativo |
| Guerra (LocalWarResolver) | Ativo |
| Eventos Historicos (EventBus) | Ativo |
| Character System (mortes/herancas) | Ativo |
| XP / Level do Soberano | Parcial (modelo existe, sem logica de ganho) |

---

## 6. Experiencia Estimada do Jogador (Velocidade x1)

| Marco de Jogo | Tempo Real Estimado |
|---------------|---------------------|
| Primeiro mes de jogo | 3 segundos |
| Primeiro ano de jogo | 36 segundos |
| Primeiras 10 pesquisas (x1) | ~1h30min |
| Todas as 7 techs pesquisadas | ~1h (com foco) |
| Soberano morre por velhice | ~70 anos = ~42 min |

### Com velocidade x30
| Marco de Jogo | Tempo Real Estimado |
|---------------|---------------------|
| 1 ano | 1.2 segundos |
| 10 anos | 12 segundos |
| 100 anos (4 geracoes) | 2 minutos |
| Arvore completa (7 techs) | ~2-3 minutos |

---

## 7. Lacunas para Proximas Implementacoes

| Prioridade | Feature Faltando |
|------------|------------------|
| Alta | Arvore tecnologica mais extensa (Bronze, Ferro, Medieval, Industrial) |
| Alta | Logica de XP/Level real para o Soberano |
| Media | Eventos historicos narrativos via IA/EventBus |
| Media | Expansao da IA NPC (colonizacao, guerras proativas) |
| Baixa | Tutoriais interativos |
| Baixa | Condicoes de vitoria expandidas (VictoryPath existe sem gatilho final) |

---

*Gerado via auditoria do codigo em: 2026-07-14*
*Arquivos auditados: game-session.ts, create-initial-state.ts, technology-tree.ts, technology-system.ts, character-system.ts, GameProvider.tsx*
