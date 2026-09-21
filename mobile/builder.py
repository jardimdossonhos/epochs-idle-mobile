import os

with open('docs/project/TECHNICAL-DEBT.md', 'r', encoding='utf-8') as f:
    tech = f.read()

with open('docs/project/PROJECT-STATUS.md', 'r', encoding='utf-8') as f:
    status = f.read()

with open('docs/project/ROADMAP.md', 'r', encoding='utf-8') as f:
    roadmap = f.read()

out = f"""# Contexto Histórico Pré-P15 (Revisado)

Este documento consolida o estado do projeto, dívidas técnicas pendentes, o roadmap estratégico e o raciocínio forense das investigações anteriores de memória (P6 a P9). Foi estruturado para oferecer uma visão holística ao Tech Lead, garantindo que o conhecimento empírico do ciclo de desenvolvimento passado não se perca, ao mesmo tempo em que o alinha com as descobertas recentes (P15).

---

## 1. Dívida Técnica (TECHNICAL-DEBT.md)

```markdown
{tech}
```

> **Nota Atualizada Pós-P15:** As falhas intencionais mencionadas na primeira linha (`progression-build` e economia) foram rigorosamente reproduzidas no commit-base. Atualmente, existem **4 falhas exatas** na suíte `npm run test` associadas a essas dívidas pré-existentes, e não constituem regressão causada por P15. Todas estão rastreadas nas Issues abertas do GitHub (#1, #2, #3, #5).

---

## 2. Status do Projeto (PROJECT-STATUS.md)

```markdown
{status}
```

---

## 3. Roadmap (ROADMAP.md)

```markdown
{roadmap}
```

---

## 4. Investigações de Memória Anteriores (P6, P7 e P9)

As fases anteriores (P6 a P9) dedicaram-se a rastrear o rápido consumo de memória (*Native Heap*) reportado em Android. As três investigações convergiram para a mesma conclusão na época. Abaixo está a transcrição final do **Marco de Controle (P9)**, que resume de forma idêntica a tese adotada por todas elas:

```markdown
## 12. CONCLUSÃO OPERACIONAL
**CAUSA MAIS PROVÁVEL:** Propagação síncrona agressiva do GameState em múltiplas abas concorrentes do React Navigation simultaneamente. (Fabric ShadowTree Flood).
**EVIDÊNCIA:** P6.11 limitou o propagador e o vazamento secou. A UI reage de forma imperativa (clones pesados de dicionários kingdoms a cada quarto de segundo em telas escondidas).
**O QUE FOI DESCARTADO:** Engine JS (Sistemas Puros), I/O de Command Logging, Autosave Array Buffer, e vazamento estático por tempo.
**O QUE AINDA NÃO SABEMOS:** A parcela de lixo específica gerada (Ex: Fabric Text Node Leak vs JSI View Props Leak).
**EXPERIMENTO ÚNICO MAIS INFORMATIVO:** unmountOnBlur: true nas tabs do React Navigation.
**VARIÁVEL INDEPENDENTE:** Abas ocultas consumindo ciclos de render JSI.
**CRITÉRIO DE SUCESSO:** Redução substancial ou obliteração do slope RssAnon/MBminuto.
**CRITÉRIO DE FALHA:** Slope inalterado (obrigando a focar unicamente no canvas gráfico vivo).
```

### ⚠️ AVISO HOLÍSTICO (Correção Pós-P15)

É fundamental que o novo Tech Lead leia a conclusão acima (P9) entendendo que a interpretação de que o React Navigation causaria um leak progressivo e inevitável (levando a OOM) **não foi sustentada** pela recente investigação **P15**.

* **O Erro de Interpretação Antigo:** P6, P7 e P9 assumiam que a rápida alocação (o "Fabric ShadowTree Flood") constituía um *vazamento infinito* (Memory Leak) fatal.
* **A Verdade Observada (P15):** Nos cenários e janelas testados, o crescimento observado no bucket Android `Unknown` está fortemente associado ao heap Hermes (`hades-segment`). Esse heap apresentou crescimento seguido de estabilização, sem que fosse identificada uma causa de memory leak persistente nos caminhos investigados. O mecanismo interno exato dessa estabilização não foi diretamente medido e permanece fora do escopo comprovado.

### Status Correto da Memória: MONITORADO / NÃO BLOQUEANTE

* Heap Hermes/Hades observado crescendo.
* Estabilização observada nas janelas testadas.
* Nenhuma causa de leak persistente identificada.
* Nenhuma refatoração arquitetural de memória (como o `unmountOnBlur` global sugerido em P9) é justificada neste momento.
* Reabertura da investigação somente diante de evidência nova de degradação real (ex: Soak Test prolongado).

### Direção do Projeto após P15

P15 está encerrada. 
* O baseline de testes foi preservado (4 falhas).
* A otimização `React.memo(TopHUD)` provou-se uma otimização real de renderização/CPU e foi mantida.
* Nenhuma cirurgia arquitetural adicional será feita agora. 

**A prioridade correta passa a ser a Fundação Temporal (P1)** prevista no roadmap: 1 tick = 1 dia, calendário, velocidades 1x–30x, offline progression e validação das consequências temporais sobre os sistemas dependentes, visto que o tempo é uma dependência de primeira ordem do ECS.
"""

with open('docs/onboarding/pre-p15-context.md', 'w', encoding='utf-8') as f:
    f.write(out)
