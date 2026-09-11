# Investigação P15: Consumo de Memória UI/Hermes

## 1. Hipóteses Testadas e Vereditos

| Hipótese | Veredito | Justificativa |
| :--- | :--- | :--- |
| **Cascade TopHUD** (causa dominante de CPU) | **Confirmado** | A duplicação de instâncias gerava +40 renders redundantes. React.memo cortou o custo de CPU. |
| **Cascade TopHUD** (causa dominante de memória) | **Refutado** | Cortar a cascata de renders preservou o exato mesmo volume de alocação (~33MB). |
| **Context / useGameState** | **Refutado** | Substituição por acesso imperativo não alterou a curva de memória. |
| **Modals** (causa necessária para o crescimento) | **Refutado** | Substituição dos Modals por um placeholder inativo gerou o mesmo crescimento. |
| **RenderSyncSystem** (postMessage leak) | **Refutado** | As mensagens sequer estavam sendo postadas (Worker inativo nos testes). |
| **Android Unknown == Leak Nativo/JSI** | **Refutado** | Extração via smaps provou que a memória pertence exclusivamente ao [anon:hades-segment] (Hermes GC Heap). |

---

## 2. Dados Brutos dos Experimentos A/B

### D.3C (Cascade / React.memo)
*   **CondA (Memo OFF):** 46 renders/10s | Baseline 65.6 MB → pos-GC 100.0 MB (**+34.4 MB**)
*   **CondB (Memo ON):** 30 renders/10s | Baseline 65.3 MB → pos-GC 98.8 MB (**+33.5 MB**)

### E4 (Atribuição de Memória via smaps)
*   **Scudo (Native/JSI/Fabric):** 494.45 MB → 409.82 MB (Flat/Queda)
*   **Dalvik (Java/ART):** cresce +6.8MB e estabiliza a partir de T20 — mesma forma do Hades, magnitude menor (14.50 MB → 21.00 MB → 21.30 MB)
*   **Hades (Hermes GC Heap):** 15.60 MB → 32.61 MB (Crescimento Rápido e Platô)

### E5 (Contexto vs Imperativo)
| Medição | CondA (Context) | CondB (Imperativo) |
| :--- | :--- | :--- |
| T0 | 20.05 MB | 13.98 MB |
| T10 | 31.89 MB | 20.35 MB |
| T20 | 32.26 MB | 32.25 MB |
| T30 | 32.63 MB | 32.69 MB |
| Pós-GC | 33.15 MB | 33.27 MB |

### E6 (Modals Ativos vs Inertes)
| Medição | CondA (Modals Ativos) | CondB (Inertes/Placeholder) |
| :--- | :--- | :--- |
| T0 | 20.02 MB | 0.00 MB |
| T10 | 31.84 MB | 18.51 MB |
| T20 | 32.21 MB | 24.52 MB |
| T30 | 32.58 MB | 37.19 MB |
| Pós-GC | 33.16 MB | 37.75 MB |

> **Nota Crítica sobre E6:** A remoção dos Modals não eliminou o crescimento; portanto Modals não são condição necessária para o crescimento. O teste não permite afirmar que a trajetória/timing do crescimento é idêntica entre as condições (Cond A e B não partem do mesmo T0 e A estabiliza em T10, enquanto B sobe em T30).

---

## 3. As 4 Leis da Engenharia de Performance no Epochs Idle

1. **Não usar contagem de renders isoladamente como proxy de memory leak.** (Ex: +renders do TopHUD derrubam CPU, mas não retêm memória indefinidamente).
2. **Não assumir que "Unknown" no Android meminfo é nativo/JSI — usar smaps para atribuição real de categoria.** (O GC do Hermes é anônimo).
3. **Não alterar arquitetura de ECS/Simulation sem evidência específica de que ela é a causa de um problema.**
4. **Toda investigação de performance/memória deve ter critério de saída definido antes de começar.**

---

## 4. Status Final

**Comportamento observado como crescimento do heap Hermes/Hades com estabilização dentro das janelas de teste realizadas (10-55s), medido via smaps em build de debug. Nenhum memory leak clássico foi demonstrado nos caminhos investigados. O mecanismo interno exato do crescimento não foi determinado e permanece fora do escopo de P15. A tabela de correlação entre smaps e HermesInternal.getInstrumentedStats() (Tarefa 2, item 5) define como esse baseline se traduz para o que é observável em produção.**

### Critério de Reabertura (Soak Test & Produção)
A investigação apenas será reaberta sob uma destas condições mensuráveis:
*   Heap Hades (smaps) excede 2x o platô observado (~70MB) em sessão contínua, OU o equivalente em HermesInternal segundo a correlação estabelecida.
*   Crescimento sustentado por mais de 30min após passar do platô esperado (~35MB), sem nova estabilização.
*   OOM ou ANR reproduzível associado a sessão longa.
*   Crescimento mensurável entre sessões equivalentes sem restart do app.

---

## 5. Soak Test em Andamento
Para validar a curva ao longo de horas de tela e ciclos de background:
*   **Comando:** Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File .\scripts\soak-test-p15.ps1 -DurationMinutes 180" -WindowStyle Hidden
*   **Início:** 2026-09-11 16:08:02
*   **Duração Esperada:** 3 horas
*   **Log:** soak-test-results.csv
*   **Ação Requerida:** Após o prazo, rodar .\scripts\check-soak-results.ps1 e atualizar a tabela de correlação de critérios. O encerramento definitivo de sessões longas e calibração de produção dependem deste resultado.

---

## 6. Histórico de Commits e Dívida Técnica
*   **Baseline Pré-P15:** e152847 (contém 3 falhas nos testes documentadas em issues [dívida pré-P15]).
*   **D.3C, E4, E5, E6:** Execuções baseadas na branch do TopHUD (3d9b84f e afins), testadas localmente via un_e*.ps1.
