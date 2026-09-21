const fs = require('fs');

const techDebt = fs.readFileSync('docs/project/TECHNICAL-DEBT.md', 'utf8');
const projStatus = fs.readFileSync('docs/project/PROJECT-STATUS.md', 'utf8');
const roadmap = fs.readFileSync('docs/project/ROADMAP.md', 'utf8');
const p9 = fs.readFileSync('docs/project/P9-CAUSAL-CONTROL.md', 'utf8');

const match = p9.match(/12\. CONCLUS[\s\S]*/i);
const conclusion = match ? match[0] : 'Conclusao nao encontrada.';

const content = '# Contexto Historico Pre-P15 (Revisado)\n\n' +
'Este documento consolida o estado do projeto, dividas tecnicas pendentes, o roadmap estrategico e o raciocinio forense das investigacoes anteriores de memoria (P6 a P9). Foi estruturado para oferecer uma visao holistica ao Tech Lead, garantindo que o conhecimento empirico do ciclo de desenvolvimento passado nao se perca, ao mesmo tempo em que o alinha com as descobertas recentes (P15).\n\n' +
'---\n\n' +
'## 1. Divida Tecnica (TECHNICAL-DEBT.md)\n\n' +
'`markdown\n' + techDebt + '\n`\n\n' +
'> **Nota Atualizada Pos-P15:** As falhas intencionais mencionadas na primeira linha (progression-build e economia) foram rigorosamente verificadas. Atualmente, existem 4 falhas na suite 
pm run test associadas a essas dividas. Todas estao rastreadas nas Issues do GitHub (#1, #2, #3, #5). Nenhuma regressao nao-documentada foi adicionada.\n\n' +
'---\n\n' +
'## 2. Status do Projeto (PROJECT-STATUS.md)\n\n' +
'`markdown\n' + projStatus + '\n`\n\n' +
'---\n\n' +
'## 3. Roadmap (ROADMAP.md)\n\n' +
'`markdown\n' + roadmap + '\n`\n\n' +
'---\n\n' +
'## 4. Investigacoes de Memoria Anteriores (P6, P7 e P9)\n\n' +
'As fases anteriores (P6 a P9) dedicaram-se a rastrear o rapido consumo de memoria (Native Heap) reportado em Android. As tres investigacoes convergiram para a mesma conclusao na epoca. Abaixo esta a transcricao final do Marco de Controle (P9), que resume a tese adotada por todas elas:\n\n' +
'`markdown\n' + conclusion + '\n`\n\n' +
'### ⚠️ AVISO HOLISTICO (Correcao Pos-P15)\n\n' +
'E fundamental que o novo Tech Lead leia a conclusao acima (P9) entendendo que ela foi **PARCIALMENTE REFUTADA** pela recente investigacao **P15**.\n\n' +
'*   **O Erro de Interpretacao Antigo:** P6, P7 e P9 assumiam que a rapida alocacao causada pelo React Navigation (o "Fabric ShadowTree Flood") constituia um *vazamento infinito* (Memory Leak) fatal que inevitavelmente derrubaria o app (OOM).\n' +
'*   **A Verdade Atual (P15):** Ao monitorarmos os internals da engine JavaScript (HermesInternal), provou-se que o crescimento na memoria anonima nativa (hades-segment) **nao e um leak**. Trata-se de uma estrategia intencional do Garbage Collector (GC) do Hermes.\n' +
'*   **Comportamento Real:** Para lidar com a massiva pressao de alocacao de objetos rasos a 3Hz da UI sem causar congelamentos de tela (Stop-The-World pauses), o Hermes expande o *heap* ate um plato de ~35MB a ~40MB e la se estabiliza.\n' +
'*   **Status Final:** Nao precisamos fazer intervencoes agressivas de renderizacao cega (como o unmountOnBlur global ou reescritas de ponte JSI) sugeridas nas hipoteses anteriores, a menos que o *Soak Test* longo ultrapasse o teto definido de seguranca (ver docs/investigations/P15-memory.md).\n';

fs.writeFileSync('docs/onboarding/pre-p15-context.md', content, 'utf8');
console.log('Feito!');
