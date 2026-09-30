# INVENTÁRIO DOCUMENTAL DO REPOSITÓRIO

**Data da Auditoria:** 29 de Setembro de 2026
**Branch:** `chore/onboarding-docs`
**HEAD:** `857f78ff0aab2dc0ec5774cb413c343d6c079168`
**Escopo:** Working tree atual (inclui alterações locais e untracked)
**Total de arquivos documentais encontrados (excluindo `.git`, `node_modules`, `android`, `ios`, `dist`, `build`, `apk-contents`):** 411
**Total de arquivos em `.agents/`:** 254 (infraestrutura de agentes — classificados em bloco abaixo)
**Total de arquivos fora de `.agents/`:** 157 (inventariados individualmente abaixo)

**Exclusões aplicadas:** `.git`, `node_modules`, `android`, `ios`, `dist`, `build`, `apk-contents`
**Extensões buscadas:** `.md`, `.mdx`, `.txt`, `.doc`, `.docx`, `.pdf`, `.rst`, `.adoc`, `.asciidoc`
**Nomes sem extensão buscados:** `README`, `LICENSE`, `CHANGELOG`, `CONTRIBUTING`, `AGENTS`, `CLAUDE`, `PROJECT`, `ROADMAP`

---

## 1. Classificação do diretório `.agents/` (254 arquivos)

**Categoria:** INFRAESTRUTURA DE AGENTES
**Git State:** Tracked (commitados)
**Autoridade:** Nenhuma sobre design de gameplay
**Conteúdo:** Briefings, handoffs, progress logs e original requests de sessões de agentes automatizados (teamwork_preview_*, orchestrator, worker, reviewer, challenger, auditor, etc.)
**Relevância para design:** IRRELEVANTE PARA DESIGN — com exceção de `.agents/skills/diagnose-anr/SKILL.md` e `.agents/skills/investigate-regression/SKILL.md` (instruções operacionais de diagnóstico, sem regras de gameplay)
**Conflito com Documento 1:** Nenhum
**Conteúdo revisado:** PARCIAL — verificadas amostras representativas (BRIEFING.md, progress.md) de 5 subdiretórios; conteúdo é exclusivamente de coordenação de agentes

---

## 2. Inventário Individual (157 arquivos fora de `.agents/`)

### 2.1. docs/design/

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/design/EPOCHS-IDLE-DESIGN-SPEC.md` | .md | Untracked | CANÔNICO — CANDIDATO A DOC 1 | Candidato a autoridade principal de produto | TOTAL | Máxima | N/A (É a fonte) | Aguardar aprovação formal pelo usuário |

### 2.2. docs/game-design/ (14 arquivos — TRACKED)

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/game-design/DESIGN-DECISIONS.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO (Registro de decisões DD-001 a DD-021) | TOTAL | Alta | SIM (ver Seção 3) | Preservar como registro histórico de decisões |
| `docs/game-design/DESIGN-VISION.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Média | SIM (ver Seção 3) | Preservar como registro histórico |
| `docs/game-design/CONSTRUCTION.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Média | Parcial (ver Seção 3) | Preservar |
| `docs/game-design/CULTURE.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Alta | SIM (ver Seção 3) | Preservar |
| `docs/game-design/DIPLOMACY.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Alta | Parcial (ver Seção 3) | Preservar |
| `docs/game-design/DISASTERS.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Média | Parcial (ver Seção 3) | Preservar |
| `docs/game-design/ECONOMY.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Alta | SIM (ver Seção 3) | Preservar |
| `docs/game-design/ERAS.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Média | Parcial (ver Seção 3) | Preservar |
| `docs/game-design/GEOGRAPHY.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Média | Nenhum aparente | Preservar |
| `docs/game-design/NAVAL.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Baixa | Nenhum aparente | Preservar |
| `docs/game-design/POPULATION.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Alta | Parcial (ver Seção 3) | Preservar |
| `docs/game-design/RELIGION.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Alta | SIM (ver Seção 3) | Preservar |
| `docs/game-design/TECHNOLOGY.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Média | SIM (ver Seção 3) | Preservar |
| `docs/game-design/WARFARE.md` | .md | Tracked | PRODUTO/DESIGN | HISTÓRICO | TOTAL | Alta | Parcial (ver Seção 3) | Preservar |

### 2.3. docs/architecture/

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/architecture/TEMPORAL-SYSTEM-MATRIX.md` | .md | Untracked | ARQUITETURA/TÉCNICO | Documentação técnica (não redefine design) | TOTAL | Referência para Doc 2 | Nenhum (usa "1 tick = 1 dia") | Preservar como referência técnica |

### 2.4. docs/audit/ (14 arquivos — TRACKED)

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/audit/P1-TEMPORAL-AUDIT.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | PARCIAL (cabeçalho e conclusões) | Referência temporal | Nenhum | Preservar |
| `docs/audit/P1-TEMPORAL-INVARIANTS.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | PARCIAL (cabeçalho e invariantes) | Referência temporal | Nenhum | Preservar |
| `docs/audit/P1-TEMPORAL-MAP.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | PARCIAL (tabela de mapeamento temporal) | Referência temporal | Nenhum | Preservar |
| `docs/audit/local-snapshot-2026-09-02/SNAPSHOT.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | TOTAL | Nenhuma | Nenhum | Preservar |
| `docs/audit/local-snapshot-2026-09-02/environment.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/git-diff.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO (1.39 MB) | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/git-diff-cached.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO (0 bytes) | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/git-diff-stat.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/git-status.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/git-status-full.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/ignored-files-all.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO (13.9 MB) | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/sha256-manifest.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/tracked-files.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/audit/local-snapshot-2026-09-02/untracked-files.txt` | .txt | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |

### 2.5. docs/investigations/

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/investigations/P15-memory.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | PARCIAL (hipóteses e vereditos) | Nenhuma | Nenhum | Preservar |

### 2.6. docs/onboarding/

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/onboarding/handoff-snapshot-2026-09-14.md` | .md | Tracked | HISTÓRICO | Nenhuma | PARCIAL (cabeçalho, estrutura) | Contexto de projeto | Nenhum | Preservar |
| `docs/onboarding/pre-p15-context.md` | .md | Tracked | HISTÓRICO | Nenhuma | PARCIAL (seções de dívida e roadmap) | Contexto de projeto | Nenhum | Preservar |

### 2.7. docs/project/ — Documentos Estruturais (9 arquivos)

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/project/BASELINE-FACTUAL.md` | .md | Untracked | EVIDÊNCIA/AUDITORIA | Baseline factual (Parte A) | TOTAL | Referência para Doc 2 | Nenhum | Preservar |
| `docs/project/DOCUMENTATION-INVENTORY.md` | .md | Untracked | PROCESSO | Este documento | TOTAL | Processo | Nenhum | Este arquivo |
| `docs/project/ARCHITECTURE-BASELINE.md` | .md | Tracked | ARQUITETURA/TÉCNICO | Nenhuma | PARCIAL (cabeçalho e arquitetura ECS) | Contexto técnico | Nenhum | Preservar |
| `docs/project/AUDIT-FINDINGS.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | PARCIAL (AF-001 a AF-004) | Contexto técnico | Nenhum | Preservar |
| `docs/project/MEMORY-INVESTIGATION-MASTER.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | PARCIAL (H1, H2) | Nenhuma | Nenhum | Preservar |
| `docs/project/PROJECT-STATUS.md` | .md | Tracked | HISTÓRICO | Nenhuma | PARCIAL (stack, arquitetura, controle) | Contexto de projeto | Nenhum | Preservar |
| `docs/project/ROADMAP.md` | .md | Tracked | HISTÓRICO | Nenhuma | TOTAL | Contexto | Nenhum | Preservar como histórico |
| `docs/project/TECHNICAL-DEBT.md` | .md | Tracked | ARQUITETURA/TÉCNICO | Nenhuma | TOTAL | Referência para Doc 2 | Nenhum | Preservar |
| `docs/project/p15c2-bundle-test/` | dir | Untracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |

### 2.8. docs/project/ — Logs P6/P7/P9 (3 arquivos .md)

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/project/P6-12-CAUSAL-INVESTIGATION.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/project/P7-CAUSAL-INVESTIGATION.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/project/P9-CAUSAL-CONTROL.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |

### 2.9. docs/project/ — Logs P10-P14 (5 arquivos .md)

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/project/P10-RENDER-INSTRUMENTATION.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/project/P11-MAP-CANVAS-STRUCTURAL-AUDIT.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/project/P12-REACT-MEMO-EXPERIMENT.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/project/P13-MAPSCREEN-ISOLATION.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/project/P14-CONSUMER-TREE-AUDIT.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |
| `docs/project/P14-CONSUMER-TREE-ISOLATION.md` | .md | Tracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Preservar |

### 2.10. docs/project/ — Logs P15 (43 arquivos: 23 .md + 20 .txt)

Todos tracked. Todos classificados como EVIDÊNCIA/AUDITORIA. Nenhum possui autoridade de design. Conteúdo não revisado (logs de execução, memória e logcat de soak tests). Nenhum conflito com Doc 1. Ação: Preservar.

| Caminho | Ext | Conteúdo revisado? |
| :--- | :--- | :--- |
| `docs/project/P15-A.1-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-A.1-RESULTS.md` | .md | NÃO |
| `docs/project/P15-B-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-B-RESULTS.md` | .md | NÃO |
| `docs/project/P15-B.1-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-B.1-RAW-LOGCAT.txt` | .txt | NÃO |
| `docs/project/P15-B.1-RAW-MEMORY.txt` | .txt | NÃO |
| `docs/project/P15-B.1-RAW-P10.txt` | .txt | NÃO |
| `docs/project/P15-B.1-RESULTS.md` | .md | NÃO |
| `docs/project/P15-B.2-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-B.2-RAW-LOGCAT.txt` | .txt | NÃO |
| `docs/project/P15-B.2-RAW-MEMORY.txt` | .txt | NÃO |
| `docs/project/P15-B.2-RAW-P10.txt` | .txt | NÃO |
| `docs/project/P15-B.2-RESULTS.md` | .md | NÃO |
| `docs/project/P15-B.3-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-B.3-RAW-LOGCAT.txt` | .txt | NÃO |
| `docs/project/P15-B.3-RAW-MEMORY.txt` | .txt | NÃO |
| `docs/project/P15-B.3-RAW-P10.txt` | .txt | NÃO |
| `docs/project/P15-B.3-RESULTS.md` | .md | NÃO |
| `docs/project/P15-C-TOPHUD-FORENSIC-AUDIT.md` | .md | NÃO |
| `docs/project/P15-C-TOPHUD-FORENSIC-AUDIT-LOG.md` | .md | NÃO |
| `docs/project/P15-C.2-CORRECTED-AUDIT.md` | .md | NÃO |
| `docs/project/P15-C.2-CORRECTED-COMPARATIVE-AUDIT.md` | .md | NÃO |
| `docs/project/P15-C.2-CORRECTED-DATA-AUDIT.md` | .md | NÃO |
| `docs/project/P15-C.2-CORRECTED-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-C.2-CORRECTED-RAW-LOGCAT.txt` | .txt | NÃO |
| `docs/project/P15-C.2-CORRECTED-RAW-MEMORY.txt` | .txt | NÃO |
| `docs/project/P15-C.2-CORRECTED-RAW-P10.txt` | .txt | NÃO |
| `docs/project/P15-C.2-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-C.2-RERUN-AUDIT.md` | .md | NÃO |
| `docs/project/P15-C.2-RERUN-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-C.2-RERUN-RAW-LOGCAT.txt` | .txt | NÃO |
| `docs/project/P15-C.2-RERUN-RAW-MEMORY.txt` | .txt | NÃO |
| `docs/project/P15-C.2-RERUN-RAW-P10.txt` | .txt | NÃO |
| `docs/project/P15-C.2-RESULTS.md` | .md | NÃO |
| `docs/project/P15-C1-C2-EXECUTION-LOG.md` | .md | NÃO |
| `docs/project/P15-C1-C2-TOPHUD-MODAL-ISOLATION.md` | .md | NÃO |
| `docs/project/P15-CONSUMER-TREE-ISOLATION.md` | .md | NÃO |
| `docs/project/P15-D.1-RAW-P10.txt` | .txt | NÃO |
| `docs/project/P15-D.2-RAW-P10-TEST-1.txt` | .txt | NÃO |
| `docs/project/P15-D.2-RAW-P10-TEST-2.txt` | .txt | NÃO |
| `docs/project/P15-D.2R-CASCADE-AUDIT.md` | .md | NÃO |
| `docs/project/P15-D.2R-RAW-TEST-1.txt` | .txt | NÃO |
| `docs/project/P15-D.2R-RAW-TEST-2.txt` | .txt | NÃO |
| `docs/project/P15-D.3-FINAL-REPORT.md` | .md | NÃO |
| `docs/project/P15-D.3-GPT-ANALYSIS.md` | .md | NÃO |
| `docs/project/P15-D.3-MEMINFO.txt` | .txt | NÃO |
| `docs/project/P15-D.3-RAW-TEST.txt` | .txt | NÃO |
| `docs/project/P15-D.3C-Cond-A-MemBase.txt` | .txt | NÃO |
| `docs/project/P15-D.3C-Cond-A-MemPost.txt` | .txt | NÃO |
| `docs/project/P15-D.3C-Cond-A-RAW.txt` | .txt | NÃO |
| `docs/project/P15-D.3C-Cond-B-MemBase.txt` | .txt | NÃO |
| `docs/project/P15-D.3C-Cond-B-MemPost.txt` | .txt | NÃO |
| `docs/project/P15-D.3C-Cond-B-RAW.txt` | .txt | NÃO |
| `docs/project/P15-D.3C-Report.md` | .md | NÃO |
| `docs/project/P15-D.3R-RAW.txt` | .txt | NÃO |
| `docs/project/P15-D.3R-Report.md` | .md | NÃO |
| `docs/project/P15-E1-E2-Report.md` | .md | NÃO |
| `docs/project/P15-E1-postGC.txt` | .txt | NÃO |
| `docs/project/P15-E1-t0.txt` | .txt | NÃO |
| `docs/project/P15-E1-t10.txt` | .txt | NÃO |
| `docs/project/P15-E1-t20.txt` | .txt | NÃO |
| `docs/project/P15-E1-t30.txt` | .txt | NÃO |
| `docs/project/P15-E1-t40.txt` | .txt | NÃO |
| `docs/project/P15-E3-Report.md` | .md | NÃO |

### 2.11. Raiz do repositório — Documentos estruturais (10 arquivos)

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AGENTS.md` | .md | Tracked (modified) | CANÔNICO — PROCESSO/ENGENHARIA | Autoridade de processo e engenharia | TOTAL (via AGENTS.md rules) | Processo | Nenhum | Preservar |
| `CHANGELOG.md` | .md | Tracked | HISTÓRICO | Nenhuma | TOTAL | Contexto | Nenhum | Preservar |
| `CLAUDE.md` | .md | Tracked | PROCESSO | Nenhuma | TOTAL (contém apenas `@AGENTS.md`) | Nenhuma | Nenhum | Preservar |
| `LICENSE` | (sem ext) | Tracked | LEGAL | N/A | NÃO | Nenhuma | N/A | Preservar |
| `PR_DESCRIPTION.md` | .md | Tracked | HISTÓRICO | Nenhuma | PARCIAL (cabeçalho: PR de closure P15) | Nenhuma | Nenhum | Preservar |
| `PROJECT.md` | .md | Tracked | OBSOLETO | Nenhuma (Sprint 3 milestones obsoletos) | TOTAL | Nenhuma | Nenhum | Preservar como histórico |
| `TEST_INFRA.md` | .md | Tracked | ARQUITETURA/TÉCNICO | Nenhuma | PARCIAL (filosofia de testes, features Sprint 3) | Nenhuma | Nenhum | Preservar |
| `TEST_READY.md` | .md | Tracked | ARQUITETURA/TÉCNICO | Nenhuma | TOTAL | Nenhuma | Nenhum | Preservar |
| `progression_design.md` | .md | Tracked | SUPERSEDIDO | Nenhuma | TOTAL | ALTA (contém regras temporais obsoletas) | SIM (ver Seção 3) | Preservar como histórico; não usar como referência |
| `roadmap.txt` | .txt | Untracked | HISTÓRICO | Nenhuma | PARCIAL (grafo P0-P5) | Contexto | Nenhum | Preservar |

### 2.12. Raiz do repositório — Dumps de terminal/auditoria (25 arquivos .txt)

Todos untracked. Classificados como IRRELEVANTE PARA DESIGN: logs voláteis de execução local, outputs de comandos de diagnóstico. Nenhum contém regras de produto ou design. Nenhum conflito com Doc 1. Conteúdo não revisado (exceto amostras de cabeçalho para confirmar natureza). Ação: Não fazem parte da baseline documental.

| Caminho | Ext | Conteúdo revisado? |
| :--- | :--- | :--- |
| `branch_info.txt` | .txt | NÃO |
| `check_soak_output.txt` | .txt | NÃO (0 bytes) |
| `ci_info.txt` | .txt | NÃO |
| `docs_tree.txt` | .txt | NÃO |
| `env_files.txt` | .txt | NÃO |
| `git_diff_audit.txt` | .txt | NÃO |
| `git_log_audit.txt` | .txt | NÃO |
| `issue_info.txt` | .txt | NÃO |
| `key_files.txt` | .txt | NÃO |
| `lint_output.txt` | .txt | NÃO |
| `log_info.txt` | .txt | NÃO |
| `p6.txt` | .txt | NÃO |
| `p7.txt` | .txt | NÃO |
| `p9.txt` | .txt | NÃO |
| `pr_info.txt` | .txt | NÃO |
| `proj_status.txt` | .txt | NÃO |
| `ps_processes.txt` | .txt | NÃO |
| `readme.txt` | .txt | TOTAL (0 bytes — vazio) |
| `soak_info.txt` | .txt | NÃO (0 bytes) |
| `src_tree.txt` | .txt | NÃO |
| `stash_info.txt` | .txt | NÃO |
| `status_info.txt` | .txt | NÃO |
| `tech_debt.txt` | .txt | PARCIAL (duplicata do TECHNICAL-DEBT.md) |
| `test_output.txt` | .txt | NÃO |
| `todos.txt` | .txt | PARCIAL (output de grep por TODO) |
| `tsc_output.txt` | .txt | NÃO |

### 2.13. Outros diretórios

| Caminho | Ext | Git State | Categoria | Autoridade | Conteúdo revisado? | Relevância para design | Conflito com Doc 1? | Ação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `.expo/README.md` | .md | Untracked | INFRAESTRUTURA | Nenhuma | NÃO | Nenhuma | N/A | Ignorar |
| `.verify-logs/current_logcat.txt` | .txt | Untracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO (0 bytes) | Nenhuma | N/A | Ignorar |
| `.verify-logs/freeze-forensics-20260825-141020.txt` | .txt | Untracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO (826 KB) | Nenhuma | N/A | Ignorar |
| `.verify-logs/freeze-forensics-20260825-141127.txt` | .txt | Untracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO (829 KB) | Nenhuma | N/A | Ignorar |
| `.verify-logs/p0-local/p0-current-20260824-082934.txt` | .txt | Untracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO | Nenhuma | N/A | Ignorar |
| `.verify-logs/smaps-3472.txt` | .txt | Untracked | EVIDÊNCIA/AUDITORIA | Nenhuma | NÃO (0 bytes) | Nenhuma | N/A | Ignorar |

---

## 3. RECONCILIAÇÃO FINAL DE REGRAS DE PRODUTO

| Fonte | Regra/Decisão | Documento 1 atual | Classificação | Justificativa | Decisão humana necessária? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DD-001` | 1 tick = 1 dia; 12 meses = 1 ano | Mantém 1 tick = 1 dia; 30 dias/mês; 360 dias/ano (§8.1) | `CONFIRMADA` | O Doc 1 consolida e detalha a semântica temporal de calendário. | Não |
| `DD-002` | Calendário visível no HUD (Ano, Mês) | Calendário compreensível (Ano, Mês, Dia) (§8.2) | `CONFIRMADA` | Regra mantida e levemente detalhada. | Não |
| `DD-003` | Cultura deve ser compatível com região inicial | Jogador não escolhe civilização ou cultura no início (§7.2, §7.3) | `SUPERSEDIDA` | O Doc 1 abole a escolha inicial de cultura, fazendo-a emergir do jogo. | Não |
| `DD-004` | Fidelidade semântica do spawn geográfico | Região inicial representa a localização geográfica (§7.1) | `CONFIRMADA` | O princípio de localização física real está mantido. | Não |
| `DD-005` | Legado cultural contínuo (características permanentes) | Cultura persiste e influencia, mas pode mudar, aprender e adaptar-se (§13.2, §13.6) | `INCORPORADA PARCIALMENTE` | O Doc 1 absorve a ideia de persistência, mas rejeita que sejam bônus fixos e inalteráveis. | Não |
| `DD-006` | Árvore tecnológica cultural | Possibilidade existe, mas estrutura final a decidir (§16.5, §38) | `AINDA ABERTA` | O Doc 1 deixa explicitamente aberta a forma como será implementada. | Sim |
| `DD-007` | Coexistência tecnológica geral e cultural | Mesma que DD-006 (§16.5, §38) | `AINDA ABERTA` | Explicitado como questão aberta no Doc 1. | Sim |
| `DD-008` | Gênese Religiosa (herdada/sugerida ou criada no início) | Religião não é escolhida nem criada no início, surge organicamente (§7.4, §15.2) | `SUPERSEDIDA` | O Doc 1 proíbe a criação de religião na tela de início, exigindo surgimento in-game. | Não |
| `DD-009` | Orçamento de criação religiosa | Pode possuir custos ou pontos de design, a definir (§15.5, §38) | `AINDA ABERTA` | O Doc 1 lista como questão aberta de design. | Sim |
| `DD-010` | Escopo de customização religiosa | Fundação de religião detalhada, mas custos a definir (§15.5, §38) | `AINDA ABERTA` | O Doc 1 prevê a fundação, mas os detalhes exatos (nome, objeto, doutrinas) e orçamento estão pendentes. | Sim |
| `DD-011` | Culto à personalidade dinástica (governante objeto de culto) | Não aborda culto direto à figura, mas sim liderança suprema religiosa (§15.10) | `AINDA ABERTA` | O Doc 1 foca em o jogador liderar a religião institucional, mas não detalha se pode ser a divindade em si. | Sim |
| `DD-012` | Fé como moeda ativa estratégica | Fé é moeda estratégica real consumível (§15.7) | `CONFIRMADA` | Mantido integralmente. | Não |
| `DD-013` | Escopo de milagres | Lista de milagres idêntica (cessar peste, colheita, etc.) (§15.15) | `CONFIRMADA` | Mantido integralmente. | Não |
| `DD-014` | Custo real de milagres | Milagres devem possuir custo real (§15.15) | `CONFIRMADA` | Mantido integralmente. | Não |
| `DD-015` | Dicotomia religiosa (Fé em banco vs Território convertido) | Geração de Fé separada do tamanho físico, depende do número de fiéis e liderança (§15.8, §15.9) | `CONFIRMADA` | O princípio foi mantido e mais detalhado. | Não |
| `DD-016` | Automação ministerial de fé (políticas) | Mesmas políticas: sobrevivência, prosperidade, guerra, expansão, reserva (§15.16) | `CONFIRMADA` | Mantido integralmente. | Não |
| `DD-017` | Multifatorialidade de resposta a desastres | Respostas: administração, tecnologia, economia, natureza, religião (§27) | `CONFIRMADA` | Mantido integralmente. | Não |
| `DD-018` | Coerência arquitetural de infraestrutura | Infraestrutura reflete tecnologia, geografia e estágio (§25) | `CONFIRMADA` | Mantido integralmente. | Não |
| `DD-019` | Horizonte naval na arquitetura base | Portos e infra naval citados como exemplos (§25), mas modelo em si é questão aberta (§38) | `INCORPORADA PARCIALMENTE` | O Doc 1 garante a existência futura, mas deixa o design aberto. | Sim |
| `DD-020` | Adaptação geográfica extrema | Cultura influencia (geografia/ambiente moldam cultura) (§7.3, §13) | `INCORPORADA PARCIALMENTE` | O Doc 1 absorve como influência geral, não como uma tabela restrita fixa. | Não |
| `DD-021` | Reinos dinâmicos (divisão, anexação, vassalagem, etc.) | Regras idênticas, reinos nascem e desaparecem, NPCs não são limites (§22) | `CONFIRMADA` | Mantido integralmente. | Não |
| `progression_design.md` | 1 tick = 1 mês; tickDurationMs = 3000ms | 1 tick = 1 dia; referência base: 1 tick = 10s em 1x (§8.1, §8.4) | `HISTÓRICA` | O documento antigo apenas descrevia o código da época. O Doc 1 redefine a regra. | Não |
| `ECONOMY.md` | O código calcula mensalmente (1 tick = 1 mês) | Economia deve processar no calendário real (1 tick = 1 dia) (§34) | `HISTÓRICA` | O documento apontava como erro no código. O Doc 1 estabelece a coerência temporal. | Não |
| `TECHNOLOGY.md` | "Budget tecnológico" todo mês | Única semântica temporal, pesquisa contínua (§16, §34) | `HISTÓRICA` | Descrição do código antigo. | Não |
| `DISASTERS.md` | Roda 1 vez a cada 10 Ticks (Meses) | Única semântica temporal (§34) | `HISTÓRICA` | Descrição do código antigo baseada em meses. | Não |
| `POPULATION.md` | Lista classes: Peasants, Nobles, Clergy, Soldiers, Merchants | Lista exemplos de classes: nobres, clero, camponeses, soldados, comerciantes (§12.4) | `CONFIRMADA` | Classes mantidas. | Não |

---

## REGRAS DO DOCUMENTO 1 QUE NÃO POSSUEM PRECEDENTE DOCUMENTAL

O Documento 1 introduziu as seguintes regras. Sem precedente identificado no corpus documental auditado:

1. **Ateísmo e Agnosticismo (§7.5, §15.6):** A inclusão de posições pessoais não-religiosas que geram bônus científico em vez de Fé.
2. **Separação entre Posição Pessoal e Adoção Oficial (§7.5, §7.6):** A diferença entre o personagem possuir uma visão e a sociedade/governo adotar uma religião oficial.
3. **Limites e Condições do Tempo Offline (§9):**
   - Execução offline baseada obrigatoriamente na velocidade `1x`.
   - Limite configurável de 1 a 100 anos in-game.
   - Congelamento exato do mundo após atingir o limite ou caso o jogo estivesse pausado voluntariamente antes do fechamento.
4. **Crise de Legitimidade Quantificada (§18):**
   - Limiar exato de **20%** para início de risco.
   - Contador estrito de **30 dias consecutivos** (1 mês de jogo) abaixo de 20% para instaurar a "crise de legitimidade".
   - Deposição imediata caso chegue a **0%**.
5. **Automação Baseada na Intenção e "Não Punição por Ausência" (§10.4, §10.6, §29):** O mundo não pune inatividade artificialmente; o jogo segue as políticas definidas sem exigir microgerenciamento constante para sobrevivência básica.
6. **Modo Lendário ON/OFF (§21.6):** Controle explícito sobre se a mesma identidade histórica de um personagem épico pode reencarnar/retornar.

---

## QUESTÕES QUE REALMENTE EXIGEM DECISÃO HUMANA

Abaixo estão listadas as questões de produto das fontes históricas que ainda permanecem em aberto e requerem decisão final no Documento 1:

1. **Tecnologia Cultural (DD-006, DD-007):** Será uma árvore separada, uma árvore complementar ou híbrida com a geral? (Mencionada no Doc 1 §38).
2. **Orçamento e Escopo de Criação Religiosa (DD-009, DD-010):** A fundação de religião terá custos em pontos de design e quais os limites exatos da customização (doutrinas, benefícios)? (Mencionada no Doc 1 §38).
3. **Culto à Personalidade (DD-011):** O jogador poderá instituir uma religião de culto à sua própria figura/dinastia (para além de ser apenas o líder institucional da religião)?
4. **Design do Horizonte Naval (DD-019):** Como funcionará exatamente o transporte, pesca e logística em mares e oceanos? (Mencionada no Doc 1 §38).

## 4. DOCUMENTOS COM AUTORIDADE INDETERMINADA

Nenhum documento ficou com autoridade completamente indeterminada. Todos os 157 arquivos fora de `.agents/` foram classificados. As únicas incertezas residuais referem-se aos itens listados na seção de questões abertas acima, que aguardam deliberação no Documento 1.

---

## 5. RESUMO QUANTITATIVO

| Métrica | Valor |
| :--- | :--- |
| Total de arquivos documentais no working tree | 411 |
| Em `.agents/` (infraestrutura de agentes) | 254 |
| Inventariados individualmente | 157 |
| Por extensão: .md | 79 (fora de .agents) |
| Por extensão: .txt | 77 (fora de .agents) |
| Por extensão: (sem extensão) | 1 (LICENSE) |
| Por categoria: CANÔNICO | 2 (Doc 1 candidato + AGENTS.md) |
| Por categoria: PRODUTO/DESIGN | 14 (docs/game-design/*) |
| Por categoria: ARQUITETURA/TÉCNICO | 5 |
| Por categoria: EVIDÊNCIA/AUDITORIA | 87 |
| Por categoria: HISTÓRICO | 7 |
| Por categoria: OBSOLETO | 1 (PROJECT.md) |
| Por categoria: SUPERSEDIDO | 1 (progression_design.md) |
| Por categoria: PROCESSO | 2 |
| Por categoria: LEGAL | 1 |
| Por categoria: IRRELEVANTE PARA DESIGN | 31 |
| Por categoria: INFRAESTRUTURA | 6 |
| Conteúdo revisado: TOTAL | 23 |
| Conteúdo revisado: PARCIAL | 15 |
| Conteúdo revisado: NÃO | 119 |

### 5.1. Classificação das Decisões de Design (DD-001 a DD-021)

| Classificação | Quantidade |
| :--- | ---: |
| CONFIRMADA | 11 |
| SUPERSEDIDA | 2 |
| AINDA ABERTA | 5 |
| INCORPORADA PARCIALMENTE | 3 |
| CONFLITO REAL | 0 |
| **TOTAL** | **21** |

*(Nota: Os 4 arquivos antigos como `progression_design.md` foram categorizados como Documentos Históricos e não entram nesta contagem de Decisões de Design).*

### 5.2. Novas Regras

| Métrica | Valor |
| :--- | :--- |
| Novas Regras exclusivas do Doc 1 | 6 |

Nenhum conflito real persistente foi identificado no conjunto de regras analisado.

---

**STATUS: RECONCILIAÇÃO DOCUMENTAL — AGUARDANDO APROVAÇÃO DO DOCUMENTO 1**
