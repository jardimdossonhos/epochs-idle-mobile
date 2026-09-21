# Religião

## Existente no Código
- `DEFAULT_RELIGION_BY_ZONE`: O Bioma original dita as fés base das regiões no mapa do mundo.
- Controle ECS: As parcelas da região dominadas pela religião (share, dominant, minority, unrest) são rigidamente traçadas nas TypedArrays do ECS.
- A insatisfação/tensão religiosa (`regionFaithUnrest`) influi ativamente no mal-estar populacional e estabilidade política.

## Future Design (Projeto Futuro - Não Implementar Agora)
- Religião completamente Customizável e Modular.
- Sistema de Pontos (`points-budget`): Doutrinas, Vantagens vs Desvantagens. (DD-009).
- Definição do Objeto de Culto, Nome, e Dogmas. (DD-010).
- Mecânica ativa de Milagres consumindo a moeda real de `Faith`. (DD-013, DD-014).
- Automação ministerial para gerenciamento de gasto de Fé em milagres. (DD-016).

## Dependência Arquitetural: Reinos Dinâmicos (DD-021)
A dinâmica emergente de reinos (DD-021) implica que o panorama religioso se adaptará a novas entidades políticas nascendo ou antigas sumindo. O sistema de crenças não deve assumir um limite máximo de reinos ou se atrelar a um array fixo de civilizações.
