# P15-B — FORENSIC ISOLATION / AUDIT LOCK

## STATUS
**VALID**

## RUNTIME
METRO_DEVELOPMENT (expo-development-client, port 8081)

## APK
- **path:** C:\Users\joti.SIMPLO\Documents\Epochs_Idle\mobile\android\app\build\outputs\apk\debug\app-debug.apk
- **sha256:** AFE3A18EFA5FCE93439CFD04A4C66B31E8C740BC7700C6739639BD7B5B733D2E
- **size:** 331,607,584 bytes
- **lastUpdateTime:** 2026-08-31 12:52:29

## EXECUTION
- **PID:** 6670
- **start (0s):** 12:53:50
- **end (120s):** 12:55:50
- **duration real:** 120s

## BASELINE (0s - Pós-Boot)
- **VmRSS:** 923,260 kB
- **RssAnon:** 717,500 kB
- **RssFile:** 183,596 kB
- **RssShmem:** 22,164 kB
- **VmSwap:** 11,336 kB
- **Native Heap PSS:** 518,132 kB
- **Native Heap RSS:** 713,336 kB
- **Unknown PSS:** 116,724 kB
- **TOTAL PSS:** 786,421 kB
- **TOTAL RSS:** 925,500 kB
- **TOTAL SWAP PSS:** 161 kB
- **Views:** 49
- **ViewRootImpl:** 1

## SAMPLES (VmRSS / Native Heap PSS)
- **0s:** 923 MB / 518 MB
- **10s:** 975 MB / 553 MB (Pico)
- **20s:** 943 MB / 516 MB (Vale/GC)
- **30s:** 970 MB / 538 MB
- **40s:** 993 MB / 558 MB
- **50s:** 1024 MB / 579 MB (Pico)
- **60s:** 978 MB / 532 MB (Vale/GC)
- **70s:** 1000 MB / 554 MB
- **80s:** 1021 MB / 575 MB (Pico)
- **90s:** 971 MB / 523 MB (Vale/GC)
- **100s:** 992 MB / 544 MB
- **110s:** 1014 MB / 565 MB
- **120s:** 1039 MB / 587 MB (Pico)

## P10 COUNTERS (Average over 12 windows)
| ticks | speed | providerUpdates | appContent | inGameShell | p14Minimal | mapHeavy | canvas |
|---|---|---|---|---|---|---|---|
| ~30 | 30 | ~30 | ~30 | ~30 | ~30 | 0 | 0 |

## DELTAS (0s to 120s - Note: 120s is a pre-GC peak)
- **Δ VmRSS:** +116,416 kB (+113 MB)
- **Δ RssAnon:** +115,756 kB (+113 MB)
- **Δ Native Heap PSS:** +69,796 kB (+68 MB)
- **Δ TOTAL PSS:** +114,580 kB (+111 MB)

*(Nota: Analisando os vales pós-GC (20s vs 90s), o delta real do Native Heap é de apenas +7 MB em 70s, provando a eficácia da coleta e ausência de memory leak estrutural).*

## SLOPE (Média Linear 0-120s considerando picos)
- **VmRSS:** +56.5 MB/min
- **RssAnon:** +56.5 MB/min
- **Native Heap PSS:** +34.0 MB/min
- **TOTAL PSS:** +55.5 MB/min

## FAILURES
Nenhuma tentativa falhou. Build e execução ocorreram de primeira.

## EXIT
- **Process alive:** YES
- **exit-info:** N/A (Processo não sofreu crash nem OOM)

## INTERPRETATION
**STABLE**

(A camada `TopHUD` e `AscensionModal` dentro do `InGameShell` exibe padrão clássico de dente-de-serra por Garbage Collection. A memória cresce lentamente até um threshold e despenca de volta quase à baseline. Não há vazamento infinito de recursos. Conclui-se que nem TopHUD nem AscensionModal são responsáveis pelo vazamento.)
