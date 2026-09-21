# Construções e Infraestrutura

## Existente no Código
Construções hoje na tabela `buildings.ts`:
- **Mercado** (Era: Estado | Requisito: Ascensão Obrigatória)
- **Quartel** (Era: Qualquer | Requisito: `requiresAscension: false`)
- **Mosteiro** (Era: Qualquer | Requisito: `requiresAscension: false`)
- **Universidade** (Era: Qualquer | Requisito: `requiresAscension: false`)
- **Fortaleza** (Era: Qualquer | Requisito: `requiresAscension: false`)

Requisitos geográficos, populacionais ou políticos: NÃO EXISTEM NO CÓDIGO. (São apenas limitados por custo de recursos Ouro/Madeira/etc).

**Contradição (DD-018 quebrado na base)**: Universidades e Fortalezas não devem ser acessíveis para grupos nômades da pedra bruta. Precisará de correção futura.

## Proposto (Future Design)
- Porto
- Infraestrutura Naval
- Docas de Pesca
- Celeiros (Agrícola)
- Templos Avançados
