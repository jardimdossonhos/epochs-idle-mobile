# Documento de Progressão do Jogo (Epochs Idle)

Este documento descreve as fórmulas matemáticas, mecânicas e regras de progressão de Epochs Idle baseadas na exploração atual da base de código do jogo.

---

## 1. Economia e Produção de Recursos (`economy-system.ts`)

A economia em Epochs Idle opera através do acúmulo de recursos gerados por províncias/regiões e populações de cada reino, afetada por políticas tributárias, orçamento, autonomia local, devastação e agitação social.

### Produtividade Regional
A produtividade de cada região limita a eficiência da infraestrutura econômica local:
$$\text{Productivity} = \text{clamp}(1.0 - \text{unrest} \times 0.48 - \text{devastation} \times 0.62 - \text{autonomy} \times 0.2 + \text{assimilation} \times 0.16, 0.28, 1.35)$$

### Produção Regional Bruta
Cada região contribui para a economia do reino baseando-se em seus valores estáticos de definição (`economyValue` e `militaryValue`) multiplicados pela produtividade local:
- **Pontos Econômicos**: $\text{contribution} = \text{definition.economyValue} \times \text{Productivity}$
- **Pontos Militares**: $\text{contribution} = \text{definition.militaryValue} \times \text{Productivity}$
- **Pontos de Alimento**: $\text{contribution} = \text{definition.economyValue} \times (1.12 - \text{devastation} \times 0.5)$

### Carga Tributária e Fator de Renda
A eficiência de impostos depende da política fiscal:
- **Carga Tributária (`taxLoad`)**:
  $$\text{taxLoad} = \text{clamp}(\text{baseRate} + \text{tariffRate} \times 0.45 - \text{nobleRelief} \times 0.22 - \text{clergyExemption} \times 0.18, 0.06, 0.58)$$
- **Fator de Imposto (`taxIncomeFactor`)**:
  $$\text{taxIncomeFactor} = 0.72 + \text{taxLoad} \times 1.05$$

### Fórmulas de Renda por Tick
A renda gerada a cada tick de simulação para cada recurso é calculada da seguinte forma:
- **Ouro (Gold)**:
  $$\text{goldIncome} = \left(\text{TotalRegionEconomy} \times (0.78 + \text{merchantShare} \times 0.62) + \frac{\text{totalPopulation}}{100,000} \times 0.24\right) \times \text{taxIncomeFactor}$$
- **Alimento (Food)**:
  $$\text{foodIncome} = \text{TotalRegionFood} \times (0.92 + \text{economyBudgetFactor} \times 0.24) + \text{peasantsCount} \times 3.2$$
- **Madeira (Wood)**:
  $$\text{woodIncome} = \text{TotalRegionEconomy} \times (0.4 + \text{economyBudgetFactor} \times 0.15)$$
- **Ferro (Iron)**:
  $$\text{ironIncome} = \text{TotalRegionMilitary} \times (0.26 + \text{militaryBudgetFactor} \times 0.22)$$
- **Fé (Faith)**:
  $$\text{faithIncome} = \text{ownedRegionsCount} \times 0.12 \times (1.0 + \text{religionAuthority})$
- **Legitimidade (Legitimacy)**:
  $$\text{legitimacyIncome} = 0.06 + \frac{\text{stability}}{560} + \frac{\text{legitimacy}}{1,200}$$

### Fórmulas de Custo de Manutenção (Upkeep) por Tick
A manutenção é calculada dinamicamente com base nas despesas militares, administrativas e corrupção:
- **Penalidade Administrativa (`adminPenalty`)**:
  $$\text{adminPenalty} = \text{clamp}\left(\frac{\text{usedCapacity}}{\text{adminCapacity}}, 0.4, 1.9\right)$$
- **Ouro (Gold Upkeep)**:
  $$\text{goldUpkeep} = \frac{\text{armyManpower}}{8,300} + \text{usedCapacity} \times 0.042 + \text{corruption} \times 1.8 + \text{adminPenalty} \times (0.12 - \text{adminBudgetFactor} \times 0.04) + \text{councilSalaryTotal}$$
- **Alimento (Food Upkeep)**:
  $$\text{foodUpkeep} = \frac{\text{totalPopulation}}{95,000} + \frac{\text{armyManpower}}{5,500}$$
- **Madeira (Wood Upkeep)**:
  $$\text{woodUpkeep} = \frac{\text{armyManpower}}{30,000}$$
- **Ferro (Iron Upkeep)**:
  $$\text{ironUpkeep} = \frac{\text{armyManpower}}{22,000} \times (0.8 + \text{soldierShare})$$
- **Fé (Faith Upkeep)**:
  $$\text{faithUpkeep} = 0.04 + (1.0 - \text{tolerance}) \times 0.2$$
- **Legitimidade (Legitimacy Upkeep)**:
  $$\text{legitimacyUpkeep} = \frac{100 - \text{stability}}{900} + \text{max}(0.0, \text{taxLoad} - 0.34) \times 0.07$$

### Estabilidade e Escassez
A estabilidade sofre impactos devido à carga tributária e à corrupção:
$$\text{Stability} = \text{clamp}(\text{stability} - \text{max}(0.0, \text{taxLoad} - 0.32) \times 0.26 + \text{economyBudgetFactor} \times 0.08 - \text{corruption} \times 0.05, 0, 100)$$

---

## 2. Crescimento Populacional e Agitação (`population-system.ts`)

A população cresce organicamente baseando-se na disponibilidade de alimentos e sofre penalidades por guerras ou fome.

### Pressão de Alimentos e Risco de Fome
A escassez de alimentos cria pressões demográficas e sociais críticas:
- **Demanda de Alimento**: $\text{requiredFood} = \text{totalPopulation} / 7,000$
- **Fator de Pressão de Alimento (`foodPressure`)**:
  $$\text{foodPressure} = \text{clamp}\left(\frac{\text{requiredFood} - \text{foodStock}}{\text{requiredFood}}, 0, 1\right) \quad (\text{se } \text{requiredFood} > 0)$$

### Fórmulas de Crescimento Populacional
O crescimento da população no nível de reino é determinado por:
- **Crescimento Bruto**: $\text{naturalGrowth} = \text{totalPopulation} \times \text{growthRatePerTick}$
- **Penalidade de Crescimento**: $\text{growthPenalty} = 1.0 - \text{foodPressure} \times 1.6 - \text{warWeariness} \times 0.2$
- **Variação Populacional**: $\text{populationDelta} = \text{round}(\text{naturalGrowth} \times \text{growthPenalty})$
- **População Final**: $\text{totalPopulation} = \text{max}(120,000, \text{totalPopulation} + \text{populationDelta})$

### Agitação Social (Unrest)
A insatisfação popular cresce em cenários de fome e alta tributação, mas é amortecida pela coesão religiosa:
$$\text{Unrest} = \text{clamp}(\text{unrest} + \text{foodPressure} \times 0.05 + \text{taxation} \times 0.01 - \text{cohesion} \times 0.01, 0, 1)$$

### Variação de Estabilidade por Agitação
$$\text{stabilityShift} = (0.5 - \text{unrest}) \times 1.2$$
$$\text{stability} = \text{clamp}(\text{stability} + \text{stabilityShift}, 0, 100)$$

---

## 3. Crescimento de População Regional no ECS (`PopulationSystem.ts`)

O sistema ECS simula o crescimento local com base no modelo ecológico de curva em S (Crescimento Logístico de Verhulst):

### Capacidade de Suporte Biológico
A capacidade padrão de suporte por bioma (sem modificadores tecnológicos) é:
- **Oceano**: 0
- **Deserto**: 50
- **Tundra**: 20
- **Temperado**: 250
- **Tropical**: 150

A capacidade de suporte final é calculada por:
$$\text{CarryingCapacity} = \text{baseCap} \times (1 + \text{techCapMult})$$

### Fator de Limite e Modelo Logístico
O fator limitador descreve a proximidade ao teto demográfico local:
$$\text{limitFactor} = 1.0 - \frac{\text{currentPop}}{\text{CarryingCapacity}}$$

As taxas de crescimento reais do ECS são calculadas da seguinte forma:
- **Oceanos**: $\text{growth} = - \text{currentPop} \times 0.05 \times \text{deltaTimeSeconds}$
- **População Excedente ($\text{limitFactor} < 0$, Fome)**:
  $$\text{growth} = \text{currentPop} \times (\text{finalGrowthRate} \times 2.5) \times \text{limitFactor} \times \text{deltaTimeSeconds}$$
- **População dentro da Capacidade ($\text{limitFactor} \ge 0$, Saudável)**:
  $$\text{growth} = \text{currentPop} \times \text{finalGrowthRate} \times \text{limitFactor} \times \text{deltaTimeSeconds}$$
- **Resultado final**: $\text{newPop} = \text{max}(1, \text{currentPop} + \text{growth})$

---

## 4. Orçamento e Tecnologias (`technology-system.ts` & `automation-system.ts`)

A taxa de pesquisa de novas tecnologias é impulsionada pelos investimentos do reino e o foco intelectual.

### Fator de Pesquisa Tecnológica
A pesquisa acumulada a cada tick é acrescida de:
$$\text{researchDelta} = \text{baseResearchRate} \times (0.5 + \text{budgetTechFactor} + \text{focusBoost})$$
- $\text{baseResearchRate} = 1.0$
- $\text{budgetTechFactor} = \frac{\text{budgetPriority.technology}}{20}$
- $\text{focusBoost} = 0.08$ (se o foco for Militar), ou $0.04$ (para outros domínios)

---

## 5. Administração Regional (`administration-system.ts`)

Controla a autonomia local, integração imperial, revoltas e corrupção sistêmica.

### Autonomia e Integração
A autonomia converge em direção a uma autonomia desejada influenciada por políticas e pressões de crises:
- **Autonomia Desejada**:
  $$\text{desiredAutonomy} = \text{clamp}(\text{policy.regionalAutonomyTarget} + (1.0 - \text{assimilation}) \times 0.12 + \text{crisisPressure} \times 0.1, 0.08, 0.85)$$
- **Evolução da Autonomia Regional**:
  $$\text{localAutonomy} = \text{clamp}(\text{localAutonomy} + (\text{desiredAutonomy} - \text{localAutonomy}) \times 0.06, 0, 1)$$
  $$\text{region.autonomy} = \text{clamp}(\text{region.autonomy} + (\text{control.localAutonomy} - \text{region.autonomy}) \times 0.12, 0, 1)$$

- **Ganho de Integração/Assimilação**:
  $$\text{integrationGain} = \text{policy.assimilationInvestment} \times (1.0 - \text{localAutonomy}) \times \left(1.0 - \frac{\text{usedCapacity}}{\text{adminCapacity}} \times 0.4\right) \times 0.04$$
  $$\text{control.integration} = \text{clamp}(\text{control.integration} + \text{integrationGain}, 0, 1)$$
  $$\text{region.assimilation} = \text{clamp}(\text{region.assimilation} + \text{integrationGain} \times 0.6, 0, 1)$$

### Eficiência Tributária e Risco de Revolta Regional
A eficiência administrativa regional e a probabilidade de levantes separatistas são ditadas por:
- **Eficiência Tributária**:
  $$\text{taxationEfficiency} = \text{clamp}(0.42 + (1.0 - \text{localAutonomy}) \times 0.38 + \text{integration} \times 0.2 - \text{corruption} \times 0.25, 0, 1)$$
- **Risco de Revolta (Revolt Risk)**:
  $$\text{revoltRisk} = \text{clamp}(\text{unrest} \times 0.38 + \text{faithUnrest} \times 0.18 + \text{localAutonomy} \times 0.22 + (1.0 - \text{integration}) \times 0.3 + \text{crisisPressure} \times 0.25, 0, 1)$$

### Capacidade Administrativa e Corrupção
O tamanho territorial e a falta de integração aumentam os custos administrativos:
- **Capacidade Usada**:
  $$\text{usedCapacity} = \sum_{\text{regions}} (7 + \text{strategicValue} \times 1.5 + (1.0 - \text{region.assimilation}) \times 8)$$
- **Ajuste de Corrupção Administrativa**:
  $$\text{overCapacity} = \text{max}(0, \text{usedCapacity} - \text{adminCapacity})$$
  $$\text{corruption} = \text{clamp}(\text{corruption} + \text{overCapacity} \times 0.0012 - \text{antiCorruptionImpact} + \text{crisisPressure} \times 0.01, 0, 1)$$
  - Onde $\text{antiCorruptionImpact} = \text{policy.antiCorruptionBudget} \times 0.024$

---

## 6. Milícias e Poder de Combate (`military-system.ts` & `local-war-resolver.ts`)

A simulação militar governa o recrutamento (drafting), deserções e o poder real dos exércitos em guerras.

### Poder de Exército Individual
O poder militar de um único regimento/exército é ponderado por sua quantidade de tropas, moral e suprimento:
- **Fator de Qualidade**: $\text{qualityFactor} = 0.6 + \text{quality} \times 0.4$
- **Fator de Sustentação**: $\text{sustainFactor} = 0.55 + \text{morale} \times 0.25 + \text{supply} \times 0.2$
- **Poder Militar do Exército**:
  $$\text{armyPower} = \text{manpower} \times \text{qualityFactor} \times \text{sustainFactor}$$

### Poder de Combate Global (Reino)
O poder de combate final de um reino (incluindo avanços tecnológicos de nível militar) é a soma dos seus exércitos:
$$\text{KingdomPower} = \sum_{\text{armies}} \text{armyPower} \times (1.0 + \text{militaryTechLevel} \times 0.1)$$

### Recrutamento Dinâmico (Drafting) e Deserção
A cada 4 ticks (logística militar), o tamanho dos exércitos é reconciliado com o limite físico de manpower das regiões:
- **Recrutamento (Drafting)** (quando $\text{armyManpower} < \text{maxManpower}$):
  $$\text{reinforcement} = \text{max}(1, \text{round}((\text{maxManpower} - \text{armyManpower}) \times 0.05))$$
- **Deserção por Fome/Excesso** (quando $\text{armyManpower} > \text{maxManpower}$):
  $$\text{desertion} = \text{max}(1, \text{round}((\text{armyManpower} - \text{maxManpower}) \times 0.15))$$

---

## 7. Resolução de Guerras (`local-war-resolver.ts`)

A progressão do conflito e os ganhos territoriais baseiam-se na diferença de forças militares.

### Evolução do War Score
A variação do War Score a cada tick é regida pelo delta de poder militar proporcional de ambos os lados:
- **Diferencial de Poder Proporcional (`pressureDelta`)**:
  $$\text{pressureDelta} = \frac{\text{attackerPower} - \text{defenderPower}}{\text{max}(1, \text{attackerPower} + \text{defenderPower})}$$
- **Variação do Score de Guerra**:
  $$\text{warScore} = \text{clamp}(\text{warScore} + \text{pressureDelta} \times 19.0, -100.0, 100.0)$$

### Conquistas Territoriais
- Se $\text{warScore} \ge 34$: Os atacantes tomam o controle de uma região de fronteira. O $\text{warScore}$ reduz em 24 pontos ($\text{warScore} = \text{warScore} - 24$) para modelar a consolidação defensiva.
- Se $\text{warScore} \le -34$: Os defensores contra-atacam e recuperam uma região. O $\text{warScore}$ aumenta em 24 pontos ($\text{warScore} = \text{warScore} + 24$).
