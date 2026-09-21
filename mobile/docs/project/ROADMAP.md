# Roadmap de Evolução (Fases)

### Princípio de Classificação
P0 — Runtime / estabilidade
P1 — Fundação temporal
P2 — Economia / progressão inicial
P3 — Campanha / cultura / geografia / tecnologia
P4 — Sistemas estratégicos avançados
P5 — UX / polish

### O Grafo de Dependências

```
Persistência / Runtime
        ↓
Fundação Temporal
        ↓
Demografia / População
        ↓
Economia
        ↓
Progressão / Construções
        ↓
Cultura / Tecnologia / Religião
        ↓
Sistemas estratégicos avançados
```

### Lista Priorizada

1. `[CONCLUÍDO]` **Persistência ECS** (O(1) & Sparse) -> Runtime Estável.
2. `[ATUAL]` **Auditoria e Checkpoint 0**.
3. `[P1]` **Fundação Temporal** - 
   - Unificar 1 tick = 1 dia.
   - Corrigir ano/mês.
   - Validar speedMultiplier 1x–30x.
   - Validar offline progression.
   - Validar consequências em crescimento populacional, mortalidade, produção e demais sistemas dependentes do tick.
4. `[P2]` **O Motor Econômico (C2)** - Somente após a estabilização temporal. Alinhar Ticks, Consumo, Cooldowns e Produção, resolvendo as *Baseline Failures*. Resolução de `economy-consolidation.test.ts`.
5. `[P2]` **Progressão Inicial** - Construções, custos iniciais.
6. `[P3]` **Campanha / Cultura / Geografia / Tecnologia** - Integração completa de bônus, herança, restrições e expansão do mapa.
7. `[P4]` **Sistemas Estratégicos Avançados** - Diplomacia profunda, Guerras massivas, Religião Customizável, Automação de Milagres.
8. `[P5]` **UX / Polish** - Acabamentos finos, melhorias visuais e navais.
