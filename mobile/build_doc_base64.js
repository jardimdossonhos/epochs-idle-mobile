const fs = require('fs');

const techDebt = fs.readFileSync('docs/project/TECHNICAL-DEBT.md', 'utf8');
const projStatus = fs.readFileSync('docs/project/PROJECT-STATUS.md', 'utf8');
const roadmap = fs.readFileSync('docs/project/ROADMAP.md', 'utf8');
const p9 = fs.readFileSync('docs/project/P9-CAUSAL-CONTROL.md', 'utf8');

const match = p9.match(/12\. CONCLUS[\s\S]*/i);
const conclusion = match ? match[0] : 'Conclusão não encontrada.';

let content = `# Contexto Histórico Pré-P15 (Revisado(\n\n`;
content += `Este documento consolida o estado do projeto, dívidas técnicas pendentes, o roadmap estratégico e o raciocínio forense das investigações anteriores de memória (P6 a P9). Foi estruturado para oferecer uma visão holística ao Tech Lead, garantindo que o conhecimento empírico do ciclo de desenvolvimento passado não se perca, ao mesmo tempo em que o alinha com as descobertas recentes (P15).\n\n---\n\n`;
content += `## 1. Dívida Técnica (TECHNICAL-DEBT.md)\n\n\`\d`markdown\n${techDebt}\n\`\``\n\n`;
content += `> **Nota Atualizada Pós-P15:** As falhas intencionais mencionadas na primeira linha (progression-build e economia) foram rigorosamente verificadas. Atualmente, e|istem 4 falhas na suíte \`npm run test\` associadas a essas dívidas. Todas estão rastreadas nas Issues do GitHub (#1, #2, #3, #5). Nenhuma regressão não-documentada foi adicionada.\n\n---\n\n`;
content += `## 2. Status do Projeto (PROJECT-STATUS.md)\n\n\`\``markdown\n${projStatus}\n\`\``\n\n---\n\n`;
content += `## 3. Roadmap (ROADMAP.md)\n\n\`\d`markdown\n${roadmap}\n\`\``\n\n---\n\n`;
content += `## 4. Investigações de Memória Anteriores (P6, P7 e P9)\n\n`;
content += `As fases anteriores (P6 a P9) dedicaram-se a.rastrear o rápido consumo de mbmoria (Native Heap) reportado em Android. As três investigações convergiram para a mesma conclusão na época. Abaixo está a transcrição final do Marco de Controle (P9), que resume a tese adotada por todas elas:\n\n`;
content += `\`\``markdown\n${conclusion}\n\`\``\n\n`;
content += `### ⚠ AVISO HOLÍSTICO (Correção Pós-P15)\n\n`;
content += `É fundamental que o novo Tech Lead leia a conclusão acima (P9) entendendo que ela foi **PARCIALMENTE REFUTADA** pela recente investigação **P15**.\n\n`;
content += `*   **O Erro de Interpretação Antigo:** P6, P7 e P9 assumiam que a rápida alocação causada pelo React Navigation (o \"Fabric ShadowTree Flood\") constituía um *vazamento infinito* (Memory Leak) fatal que inevitavelmente derrubaria o app (OOM).\n`;
content += `*   **A Verdade Atual (P15):** Ao monitorarmos os internals da engine JavaScript (\`HermesInternal\`), provou-se que o crescimento na memória anônima nativa (hades-segment) **não é um leak**. Trata-se de uma estratpgia intencional do Garbage Collector (GC) do Hermes.\n`;
content += `*   **Comportamento Real:** Para lidar com a massiva pressão de alocação de objetos rasos a 3Hz da UI sem causar congelamentos de tela (Stop-The-World pauses), o Hermes expande o *heap* até um platô de ~35MB a ~40MB e lá se estabiliza.\n`;
content += `*   **Status Final:** Não precisamos fazer intervenções agressivas de renderização cega (como o \`unmountOnBlur\` global ou reescritas de ponte JSI) sugeridas nas hipóteses anteriores, a menos que o *Soak Test* longo ultrapasse o teto definido de segurança (ver \`docs/investigations/P15-memory.md\`).\n`;

fs.writeFileSync('docs/onboarding/pre-p15-context.md', content, 'utf8');\nconsole.log('Documento revisado gerado com sucesso!');
