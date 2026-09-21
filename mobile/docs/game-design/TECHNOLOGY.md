# Árvores e Eras Tecnológicas

## Existente no Código
O `technology-tree.ts` e os Models implementam:
- Um custo global que é descontado com a injeção passiva de um "budget tecnológico" todo mês.
- As tecnologias afetam a `TechnologyEra` (`stone_age`, `bronze_age`, `iron_age`).
- Desbloqueiam novas capacidades governamentais. (Ex: `sedentism` desbloqueia monarquia).
- O modificador de Pesquisa pode ser alterado pelos governos.

## Fluxo
Bando Nômade ➔ Acúmulo de tech via tempo ➔ `hunting_parties` ➔ `sedentism` ➔ Evento de Assentamento/Estado (Ascensão) ➔ Eras Posteriores.

## Proposto
- Implementar as *Tecnologias Culturais* em harmonia com a Árvore Geral.

## Dependência Arquitetural: Reinos Dinâmicos (DD-021)
A evolução tecnológica deve respeitar a premissa de reinos dinâmicos (DD-021). Novas entidades emancipadas podem herdar as tecnologias da matriz ou sofrer atrasos, suportando um ecossistema com número variável de participantes tecnológicos ao invés de atrelar a pesquisa aos 6 estados originais.
