const fs = require('fs');

const addition = `
## 12.1 ECS PERSISTENCE & OOM BASELINE (FASE C1)

A arquitetura de persistência e simulação impõe regras estritas para evitar corrupção e OOM (Out of Memory):

- **Distinção N x K**:
  - \`N\` = capacidade total do mundo / tamanho do ECS (ex: ~320.000 hexágonos).
  - \`K\` = quantidade de hexágonos que precisam ser persistidos por possuírem alterações canônicas.
  - Nunca usar N e K como conceitos equivalentes.
- **Runtime (Hot Path)**: 
  - O(1) por interação de entidade.
  - Nenhum scan O(N) permitido durante cada tick. 
  - É expressamente proibido o uso de \`JSON.stringify\`, \`structuredClone\` ou serialização pesada do ECS no realtime hot path.
  - O método \`persistCurrent()\` atua apenas como flag (\`pendingAutosave = true\`) e NUNCA executa I/O direto.
- **Autosave**: 
  - Opera em tempo real (wall-clock) a cada 60 segundos. 
  - Completamente independente do \`speedMultiplier\`. O modo 30x NÃO aumenta a frequência de salvamento no disco.
- **Save**: 
  - Extração Sparse (O(K)) baseada no formato \`EcsSnapshot\`.
- **Load/Restore**: 
  - Reconstrução O(K) usando \`restoreEcsFromSnapshot\`.
  - Operações O(N) e rebuilds de estado derivado são explicitamente permitidos **apenas** nas etapas de boot, load, save manual completo, e rebuild.
- **Estado Canônico**: O ECS é a fonte canônica do mundo no runtime.
`;

let content = fs.readFileSync('AGENTS.md', 'utf8');
content = content.replace('Never change persistence only to make a test pass.', 'Never change persistence only to make a test pass.\n' + addition);
fs.writeFileSync('AGENTS.md', content, 'utf8');