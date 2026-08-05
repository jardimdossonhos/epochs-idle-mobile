import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameProvider';
import { useUIStore } from '../store/game-store';
import type { TaxPolicy, BudgetPriority } from '../../core/models/economy';

// ─── Tipos de Diretrizes ─────────────────────────────────────────────────────
type DirectiveKey =
  | 'territorial_expansion'
  | 'gold_focus'
  | 'war_mode'
  | 'aggressive_diplomacy'
  | 'accelerated_research'
  | 'religious_mission';

interface DirectiveDef {
  key: DirectiveKey;
  icon: string;
  label: string;
  description: string;
  incompatibleWith?: DirectiveKey[];
}

const DIRECTIVES: DirectiveDef[] = [
  {
    key: 'territorial_expansion',
    icon: '🗺️',
    label: 'Expansão Territorial',
    description: 'A IA coloniza automaticamente regiões adjacentes não ocupadas.',
    incompatibleWith: ['war_mode'],
  },
  {
    key: 'gold_focus',
    icon: '💰',
    label: 'Foco em Ouro',
    description: 'Prioriza taxas, mercados e rotas comerciais sobre gastos militares.',
    incompatibleWith: ['war_mode'],
  },
  {
    key: 'war_mode',
    icon: '⚔️',
    label: 'Modo Guerra',
    description: 'Recruta tropas e ataca vizinhos fracos automaticamente.',
    incompatibleWith: ['territorial_expansion', 'gold_focus', 'aggressive_diplomacy'],
  },
  {
    key: 'aggressive_diplomacy',
    icon: '🤝',
    label: 'Diplomacia Agressiva',
    description: 'Envia embaixadores e propõe alianças a cada oportunidade.',
    incompatibleWith: ['war_mode'],
  },
  {
    key: 'accelerated_research',
    icon: '🔬',
    label: 'Pesquisa Acelerada',
    description: 'Aplica 40% do orçamento em tecnologia automaticamente.',
    incompatibleWith: [],
  },
  {
    key: 'religious_mission',
    icon: '🙏',
    label: 'Missão Religiosa',
    description: 'Envia missionários a cada oportunidade disponível.',
    incompatibleWith: [],
  },
];

export default function GovScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, session, playerKingdomId } = useGameState();
  const [activeTab, setActiveTab] = useState<'economy' | 'laws' | 'automation' | 'events'>('economy');

  const bootstrapDone = React.useRef(false);

  useEffect(() => {
    if (session && playerKingdomId && !bootstrapDone.current) {
      bootstrapDone.current = true;
      const state = session.getState();
      const kingdom = state.kingdoms[playerKingdomId];
      if (kingdom?.economy?.taxPolicy) {
        useUIStore.setState({
          playerTaxBaseRate: kingdom.economy.taxPolicy.baseRate,
          playerTaxNobleRelief: kingdom.economy.taxPolicy.nobleRelief,
          playerTaxClergyExemption: kingdom.economy.taxPolicy.clergyExemption,
          playerTaxTariffRate: kingdom.economy.taxPolicy.tariffRate,
        });
      }
    }
  }, [session, playerKingdomId]);

  const playerGold = useUIStore(s => s.playerGold);
  const playerFood = useUIStore(s => s.playerFood);
  const playerWood = useUIStore(s => s.playerWood);
  const playerIron = useUIStore(s => s.playerIron);
  const playerLegitimacy = useUIStore(s => s.playerLegitimacy);
  const playerStability = useUIStore(s => s.playerStability);

  const playerGoldIncome = useUIStore(s => s.playerGoldIncome);
  const playerFoodIncome = useUIStore(s => s.playerFoodIncome);
  const playerWoodIncome = useUIStore(s => s.playerWoodIncome);
  const playerIronIncome = useUIStore(s => s.playerIronIncome);
  const playerLegitimacyIncome = useUIStore(s => s.playerLegitimacyIncome);

  const taxBaseRate = useUIStore(s => s.playerTaxBaseRate);
  const taxNobleRelief = useUIStore(s => s.playerTaxNobleRelief);
  const taxClergyExemption = useUIStore(s => s.playerTaxClergyExemption);
  const taxTariffRate = useUIStore(s => s.playerTaxTariffRate);

  const playerCorruption = useUIStore(s => s.playerCorruption);
  const playerInflation = useUIStore(s => s.playerInflation);
  const playerEfficiency = useUIStore(s => s.playerEfficiency);

  const budgetEconomy = useUIStore(s => s.playerBudgetEconomy);
  const budgetMilitary = useUIStore(s => s.playerBudgetMilitary);
  const budgetReligion = useUIStore(s => s.playerBudgetReligion);
  const budgetAdministration = useUIStore(s => s.playerBudgetAdministration);
  const budgetTechnology = useUIStore(s => s.playerBudgetTechnology);

  const playerEventCount = useUIStore(s => s.playerEventCount);
  const worldFeed = useUIStore(s => s.worldFeed);
  const isEvolved = useUIStore(s => s.playerHasAscended);
  const isEligibleForAscension = useUIStore(s => s.playerAscensionEligible || s.playerAscensionPostponed);
  
  const [draftBudget, setDraftBudget] = useState<BudgetPriority | null>(null);
  const [budgetSaved, setBudgetSaved] = useState(false);

  const activeBudget = draftBudget ?? {
    economy: budgetEconomy,
    military: budgetMilitary,
    religion: budgetReligion,
    administration: budgetAdministration,
    technology: budgetTechnology
  };

  const [draftTaxPolicy, setDraftTaxPolicy] = useState<TaxPolicy | null>(null);
  const [taxSaved, setTaxSaved] = useState(false);

  const activeTaxPolicy = draftTaxPolicy ?? {
    baseRate: taxBaseRate,
    nobleRelief: taxNobleRelief,
    clergyExemption: taxClergyExemption,
    tariffRate: taxTariffRate,
  };

  // ── Estado das Diretrizes ──────────────────────────────────────────────────
  const [directives, setDirectives] = useState<Record<DirectiveKey, boolean>>({
    territorial_expansion: false,
    gold_focus: false,
    war_mode: false,
    aggressive_diplomacy: false,
    accelerated_research: false,
    religious_mission: false,
  });

  const handleApplyLaws = () => {
    if (!session || !activeTaxPolicy) return;
    session.updateTaxPolicy(activeTaxPolicy);
    setTaxSaved(true);
    setDraftTaxPolicy(null);
    setTimeout(() => setTaxSaved(false), 2000);
  };

  const directivesBootstrapped = React.useRef(false);
  useEffect(() => {
    if (!session || directivesBootstrapped.current) return;
    const kingdom = (session as any).state?.kingdoms[(session as any).state?.playerKingdomId || 'k_player'];
    if (!kingdom?.administration) return;
    const savedDirectives = (kingdom.administration as any).directives;
    if (savedDirectives && typeof savedDirectives === 'object') {
      directivesBootstrapped.current = true;
      setDirectives((prev) => ({ ...prev, ...savedDirectives }));
    }
  }, [session]);

  const handleToggleDirective = (key: DirectiveKey) => {
    if (!session) return;
    const newEnabled = !directives[key];

    // Se ativando, desativa incompatíveis
    const updates: Partial<Record<DirectiveKey, boolean>> = { [key]: newEnabled };
    if (newEnabled) {
      const def = DIRECTIVES.find((d) => d.key === key);
      def?.incompatibleWith?.forEach((incompKey) => {
        if (directives[incompKey]) {
          updates[incompKey] = false;
          (session as any).updateAutomationDirective(incompKey, false);
        }
      });
    }

    setDirectives((prev) => ({ ...prev, ...updates }));
    (session as any).updateAutomationDirective(key, newEnabled);
  };

  const isIncompatible = (key: DirectiveKey): DirectiveKey | null => {
    const def = DIRECTIVES.find((d) => d.key === key);
    if (!def?.incompatibleWith) return null;
    const found = def.incompatibleWith.find((k) => directives[k]);
    return found || null;
  };

  const adjustTaxPolicy = (field: keyof TaxPolicy, delta: number) => {
    let min = 0;
    let max = 0.4;
    if (field === 'baseRate') {
      min = 0.05;
      max = 0.6;
    } else if (field === 'tariffRate') {
      min = 0;
      max = 0.5;
    }
    setDraftTaxPolicy(prev => {
      const base = prev ?? { baseRate: taxBaseRate, nobleRelief: taxNobleRelief, clergyExemption: taxClergyExemption, tariffRate: taxTariffRate };
      const current = base[field];
      const newVal = Math.max(min, Math.min(max, parseFloat((current + delta).toFixed(2))));
      return { ...base, [field]: newVal };
    });
  };

  const adjustBudget = (field: keyof BudgetPriority, delta: number) => {
    setDraftBudget(prev => {
      const base = prev ?? { economy: budgetEconomy, military: budgetMilitary, religion: budgetReligion, administration: budgetAdministration, technology: budgetTechnology };
      const current = base[field];
      let newVal = current + delta;
      if (newVal < 0) newVal = 0;
      
      const otherTotal = Object.keys(base).reduce((sum, k) => k !== field ? sum + (base as any)[k] : sum, 0);
      
      if (otherTotal + newVal > 100) {
        newVal = 100 - otherTotal;
      }
      
      return { ...base, [field]: newVal };
    });
  };

  const draftTotal = Object.values(activeBudget).reduce((a,b)=>a+b,0);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'economy' && styles.activeTab]}
          onPress={() => setActiveTab('economy')}
        >
          <Text style={[styles.tabText, activeTab === 'economy' && styles.activeTabText]}>{isEvolved ? 'Economia' : 'Coleta & Espólio'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'laws' && styles.activeTab]}
          onPress={() => setActiveTab('laws')}
        >
          <Text style={[styles.tabText, activeTab === 'laws' && styles.activeTabText]}>{isEvolved ? 'Estado' : 'Tradição'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'automation' && styles.activeTab]}
          onPress={() => setActiveTab('automation')}
        >
          <Text style={[styles.tabText, activeTab === 'automation' && styles.activeTabText]}>{isEvolved ? 'Idle / Auto' : 'Foco do Bando'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Feed Mundo</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'events' ? (
        <EventFeedTab worldFeed={worldFeed} gameState={gameState} session={session} playerKingdomId={playerKingdomId} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {activeTab === 'economy' && (
          <View>
            <Text style={styles.sectionTitle}>{isEvolved ? 'Tesouro & Estoques' : 'Provimentos da Tribo'}</Text>
            <View style={styles.resourceGrid}>
              <ResourceCard icon="💰" name="Ouro" amount={playerGold} income={playerGoldIncome} />
              <ResourceCard icon="🍞" name="Comida" amount={playerFood} income={playerFoodIncome} />
              <ResourceCard icon="🪵" name="Madeira" amount={playerWood} income={playerWoodIncome} />
              <ResourceCard icon="⛏️" name="Ferro" amount={playerIron} income={playerIronIncome} />
              <ResourceCard icon="🙏" name="Fé" amount={playerLegitimacy} income={playerLegitimacyIncome} />
              <ResourceCard icon="👑" name="Legitima." amount={playerLegitimacy} income={playerLegitimacyIncome} />
            </View>

            <Text style={styles.sectionTitle}>{isEvolved ? 'Política Fiscal' : 'Divisão de Caça/Coleta'}</Text>
            <View style={styles.taxControlBox}>
              <TaxStepper 
                label="Taxa Base (BasePop)" 
                value={draftTaxPolicy?.baseRate ?? taxBaseRate} 
                onDecrease={() => adjustTaxPolicy('baseRate', -0.05)}
                onIncrease={() => adjustTaxPolicy('baseRate', 0.05)}
              />
              <TaxStepper 
                label="Alívio dos Nobres" 
                value={draftTaxPolicy?.nobleRelief ?? taxNobleRelief} 
                onDecrease={() => adjustTaxPolicy('nobleRelief', -0.05)}
                onIncrease={() => adjustTaxPolicy('nobleRelief', 0.05)}
              />
              <TaxStepper 
                label="Isenção do Clero" 
                value={draftTaxPolicy?.clergyExemption ?? taxClergyExemption} 
                onDecrease={() => adjustTaxPolicy('clergyExemption', -0.05)}
                onIncrease={() => adjustTaxPolicy('clergyExemption', 0.05)}
              />
              <TaxStepper 
                label="Tarifas Alfandegárias" 
                value={draftTaxPolicy?.tariffRate ?? taxTariffRate} 
                onDecrease={() => adjustTaxPolicy('tariffRate', -0.05)}
                onIncrease={() => adjustTaxPolicy('tariffRate', 0.05)}
              />
              
              <TouchableOpacity 
                style={{ backgroundColor: taxSaved ? '#50E3C2' : '#D4AF37', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 }}
                onPress={handleApplyLaws}
              >
                <Text style={{ color: taxSaved ? '#0D2B1D' : '#1A1A1A', fontWeight: 'bold', fontSize: 16 }}>
                  {taxSaved ? 'Salvo!' : (isEvolved ? 'Aplicar Leis Fiscais' : 'Aplicar Divisão do Espólio')}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.taxHelperText}>
                {isEvolved 
                  ? 'Impostos altos geram mais Ouro, mas reduzem a estabilidade. Alívios e isenções acalmam as classes dominantes.'
                  : 'Uma divisão rígida favorece o tesouro comum do bando, mas pode gerar descontentamento entre os caçadores e anciãos.'}
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'laws' && (
          <View>
            <Text style={styles.sectionTitle}>{isEvolved ? 'Indicadores do Estado' : 'Coesão do Bando'}</Text>
            <View style={styles.card}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Estabilidade</Text>
                <Text style={styles.statValue}>{(playerStability || 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Eficiência Estatal</Text>
                <Text style={styles.statValue}>{(playerEfficiency * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Corrupção</Text>
                <Text style={styles.statValue}>{(playerCorruption * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Inflação</Text>
                <Text style={styles.statValue}>{(playerInflation * 100).toFixed(1)}%</Text>
              </View>
            </View>
            <Text style={styles.taxHelperText}>
              {isEvolved
                ? 'A eficiência estatal multiplica toda a sua produção. Mantenha a estabilidade alta!'
                : 'A coesão da tribo determina a motivação para coletar e caçar em harmonia.'}
            </Text>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{isEvolved ? 'Prioridades de Orçamento' : 'Foco da Tribo'}</Text>
            <View style={styles.budgetCard}>
              <BudgetStepper 
                label="Economia" 
                value={draftBudget?.economy ?? budgetEconomy} 
                onDecrease={() => adjustBudget('economy', -5)}
                onIncrease={() => adjustBudget('economy', 5)}
              />
              <BudgetStepper 
                label="Militar" 
                value={draftBudget?.military ?? budgetMilitary} 
                onDecrease={() => adjustBudget('military', -5)}
                onIncrease={() => adjustBudget('military', 5)}
              />
              <BudgetStepper 
                label="Religião" 
                value={draftBudget?.religion ?? budgetReligion} 
                onDecrease={() => adjustBudget('religion', -5)}
                onIncrease={() => adjustBudget('religion', 5)}
              />
              <BudgetStepper 
                label="Administração" 
                value={draftBudget?.administration ?? budgetAdministration} 
                onDecrease={() => adjustBudget('administration', -5)}
                onIncrease={() => adjustBudget('administration', 5)}
              />
              <BudgetStepper 
                label="Tecnologia" 
                value={draftBudget?.technology ?? budgetTechnology} 
                onDecrease={() => adjustBudget('technology', -5)}
                onIncrease={() => adjustBudget('technology', 5)}
              />
              <Text style={styles.budgetHelperText}>
                {isEvolved
                  ? 'O orçamento é auto-normalizado para totalizar 100%. Ajustar um sector afeta proporcionalmente os outros.'
                  : 'A dedicação do bando é auto-normalizada em 100%. Mudar um foco ajusta os demais esforços da tribo.'}
              </Text>

              <Text style={{ color: draftTotal !== 100 ? '#E6A817' : '#D4AF37', textAlign: 'center', marginVertical: 8, fontWeight: 'bold' }}>
                Pontos Restantes: {100 - draftTotal}%
              </Text>
              
              <TouchableOpacity 
                style={{ backgroundColor: draftTotal !== 100 ? '#555' : budgetSaved ? '#50E3C2' : '#D4AF37', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 }}
                disabled={draftTotal !== 100}
                onPress={() => {
                  if (activeBudget && session) {
                    session.updateBudgetPriority(activeBudget);
                    setBudgetSaved(true);
                    setDraftBudget(null);
                    setTimeout(() => setBudgetSaved(false), 2000);
                  }
                }}
              >
                <Text style={{ color: draftTotal !== 100 ? '#AAA' : '#1A1A1A', fontWeight: 'bold', fontSize: 16 }}>
                  {budgetSaved ? 'Salvo!' : (isEvolved ? 'Aplicar Distribuição' : 'Aplicar Foco Tribal')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'automation' && (
          <View>
            <Text style={styles.sectionTitle}>{isEvolved ? 'Diretrizes Estratégicas (Idle)' : 'Instintos e Hábitos da Tribo (Idle)'}</Text>
            <Text style={styles.taxHelperText}>
              {isEvolved
                ? 'Ative as políticas que seus ministros devem seguir automaticamente enquanto você não governa. Diretrizes conflitantes são mutuamente exclusivas.'
                : 'Defina os instintos e hábitos que os anciãos devem conduzir enquanto você observa. Escolhas conflitantes são exclusivas.'}
            </Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              {DIRECTIVES.map((def) => {
                const isEnabled = directives[def.key];
                const conflictKey = isIncompatible(def.key);
                const hasConflict = !isEnabled && conflictKey !== null;
                const conflictLabel = hasConflict
                  ? DIRECTIVES.find((d) => d.key === conflictKey)?.label
                  : null;

                return (
                  <TouchableOpacity
                    key={def.key}
                    style={[
                      styles.directiveCard,
                      isEnabled && styles.directiveCardActive,
                      hasConflict && styles.directiveCardConflict,
                    ]}
                    onPress={() => handleToggleDirective(def.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.directiveLeft}>
                      <Text style={styles.directiveIcon}>{def.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.directiveTitleRow}>
                          <Text style={[
                            styles.directiveLabel,
                            isEnabled && styles.directiveLabelActive,
                          ]}>
                            {def.label}
                          </Text>
                          {isEnabled && (
                            <View style={styles.directiveBadgeOn}>
                              <Text style={styles.directiveBadgeText}>ATIVO</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.directiveDesc}>{def.description}</Text>
                        {hasConflict && conflictLabel && (
                          <Text style={styles.directiveConflictText}>
                            ⚠️ Incompatível com "{conflictLabel}"
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={[
                      styles.directiveToggle,
                      isEnabled ? styles.directiveToggleOn : styles.directiveToggleOff,
                    ]}>
                      <Text style={styles.directiveToggleText}>
                        {isEnabled ? '●' : '○'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.taxHelperText, { marginTop: 16 }]}>
              As diretrizes são executadas a cada ciclo de automação. Combine-as com as prioridades de orçamento para máxima eficiência.
            </Text>
          </View>
        )}

        </ScrollView>
      )}
    </View>
  );
}

function getEventCategory(evt: any): 'all' | 'economy' | 'war' | 'diplomacy' {
  if (evt.category && ['economy', 'war', 'diplomacy'].includes(evt.category)) {
    return evt.category;
  }
  // Fallback para saves antigos que ainda usam text scraping:
  const text = `${evt.groupKey || ''} ${evt.title || ''} ${evt.details || ''} ${evt.type || ''}`.toLowerCase();
  if (
    text.includes('war') ||
    text.includes('guerra') ||
    text.includes('batalha') ||
    text.includes('combat') ||
    text.includes('conquest') ||
    text.includes('revolta') ||
    text.includes('rebel') ||
    text.includes('recruta') ||
    text.includes('exército') ||
    text.includes('invad')
  ) {
    return 'war';
  }
  if (
    text.includes('diplom') ||
    text.includes('pacto') ||
    text.includes('aliança') ||
    text.includes('embaixad') ||
    text.includes('tratado') ||
    text.includes('acordo') ||
    text.includes('ally') ||
    text.includes('truce') ||
    text.includes('paz')
  ) {
    return 'diplomacy';
  }
  if (
    text.includes('economy') ||
    text.includes('ouro') ||
    text.includes('food') ||
    text.includes('fome') ||
    text.includes('shortage') ||
    text.includes('escassez') ||
    text.includes('imposto') ||
    text.includes('tribut') ||
    text.includes('constru') ||
    text.includes('edifí') ||
    text.includes('budget') ||
    text.includes('taxa') ||
    text.includes('tesouro') ||
    text.includes('comércio') ||
    text.includes('mercad') ||
    text.includes('celei') ||
    text.includes('economic')
  ) {
    return 'economy';
  }
  return 'all';
}

function EventFeedTab({ worldFeed, gameState, session, playerKingdomId }: { worldFeed: any[], gameState: any, session: any, playerKingdomId: string }) {
  const [filter, setFilter] = useState<'all' | 'economy' | 'war' | 'diplomacy'>('all');

  const filteredEvents = React.useMemo(() => {
    if (!worldFeed || worldFeed.length === 0) return [];
    const list = [...worldFeed].sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0));
    if (filter === 'all') return list;
    return list.filter(evt => {
      const cat = getEventCategory(evt);
      return cat === filter;
    });
  }, [worldFeed, filter]);

  const renderItem = ({ item }: { item: any }) => {
    const severityColor =
      item.severity === 'critical'
        ? '#E24A4A'
        : item.severity === 'danger'
        ? '#FF3333'
        : item.severity === 'warning'
        ? '#F8E71C'
        : '#50E3C2';

    const kingdom = gameState?.kingdoms?.[playerKingdomId];
    const activeProposal = item.requiresAction && item.actionPayload?.proposalId
      ? kingdom?.diplomacy?.proposals?.find((p: any) => p.id === item.actionPayload?.proposalId)
      : null;

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventSeverity, { color: severityColor }]}>
            ● {item.severity?.toUpperCase() || 'INFO'}
          </Text>
          <Text style={styles.eventTitle}>{item.title}</Text>
        </View>
        <Text style={styles.eventDetails}>{item.details}</Text>

        {item.requiresAction && activeProposal && (
           <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
              <TouchableOpacity 
                style={{ backgroundColor: '#50E3C2', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flex: 1, alignItems: 'center' }}
                onPress={() => session.acceptProposal(activeProposal.id)}
              >
                <Text style={{ color: '#000', fontWeight: 'bold' }}>Aceitar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: '#E24A4A', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, flex: 1, alignItems: 'center' }}
                onPress={() => session.rejectProposal(activeProposal.id)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Recusar</Text>
              </TouchableOpacity>
           </View>
        )}
        {item.requiresAction && !activeProposal && (
           <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 8 }}>[ Proposta Expirada ou Resolvida ]</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.feedContainer}>
      <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 12 }]}>
        Eventos em Tempo Real (Mundo Vivo)
      </Text>
      <View style={styles.filterBar}>
        {(['all', 'economy', 'war', 'diplomacy'] as const).map((cat) => {
          const label =
            cat === 'all'
              ? 'Tudo'
              : cat === 'economy'
              ? 'Economia'
              : cat === 'war'
              ? 'Guerra'
              : 'Diplomacia';
          const active = filter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(cat)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Nenhum evento desta categoria registrado no império.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

function ResourceCard({ icon, name, amount, income }: { icon: string, name: string, amount: number, income: number }) {
  const incomeColor = income > 0 ? '#50E3C2' : income < 0 ? '#E24A4A' : '#888';
  return (
    <View style={styles.resourceCard}>
      <View style={styles.resourceHeader}>
        <Text style={styles.resourceIcon}>{icon}</Text>
        <Text style={styles.resourceName}>{name}</Text>
      </View>
      <Text style={styles.resourceAmount}>{Math.floor(amount).toLocaleString()}</Text>
      <Text style={[styles.resourceIncome, { color: incomeColor }]}>
        {income > 0 ? '+' : ''}{income.toFixed(1)}/t
      </Text>
    </View>
  );
}

function TaxStepper({ 
  label, 
  value, 
  onDecrease, 
  onIncrease 
}: { 
  label: string; 
  value: number; 
  onDecrease: () => void; 
  onIncrease: () => void; 
}) {
  return (
    <View style={styles.taxControlBoxRow}>
      <Text style={styles.taxRowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepperBtn} onPress={onDecrease}>
          <Text style={styles.stepperBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.taxValueText}>{(value * 100).toFixed(0)}%</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={onIncrease}>
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BudgetStepper({ 
  label, 
  value, 
  onDecrease, 
  onIncrease 
}: { 
  label: string; 
  value: number; 
  onDecrease: () => void; 
  onIncrease: () => void; 
}) {
  return (
    <View style={styles.budgetRow}>
      <Text style={styles.budgetLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepperBtn} onPress={onDecrease}>
          <Text style={styles.stepperBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.budgetValueText}>{value.toFixed(0)}%</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={onIncrease}>
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#D4AF37' },
  tabText: { color: '#888', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  activeTabText: { color: '#D4AF37' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    color: '#D4AF37',
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  resourceCard: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  resourceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  resourceIcon: { fontSize: 16, marginRight: 6 },
  resourceName: { color: '#888', fontSize: 14, fontWeight: '600' },
  resourceAmount: { color: '#E0E0E0', fontSize: 20, fontWeight: 'bold' },
  resourceIncome: { fontSize: 12, marginTop: 4, fontWeight: 'bold' },
  taxControlBox: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  taxControlBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  taxRowLabel: {
    color: '#E0E0E0',
    fontSize: 14,
    flex: 1,
  },
  taxLabel: { color: '#E0E0E0', fontSize: 16, marginBottom: 12, textAlign: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtn: {
    backgroundColor: '#D4AF37',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: '#121212', fontSize: 20, fontWeight: 'bold' },
  taxValueText: { color: '#E0E0E0', fontSize: 20, fontWeight: 'bold', width: 60, textAlign: 'center' },
  taxHelperText: { color: '#888', fontSize: 12, textAlign: 'center', fontStyle: 'italic', marginTop: 10 },
  card: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  statLabel: { color: '#A0A0A0', fontSize: 16 },
  statValue: { color: '#D4AF37', fontSize: 16, fontWeight: 'bold' },
  budgetCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  budgetLabel: {
    color: '#E0E0E0',
    fontSize: 14,
    flex: 1,
  },
  budgetValueText: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: 'bold',
    width: 60,
    textAlign: 'center',
  },
  budgetHelperText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  autoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  autoLabel: { color: '#E0E0E0', fontSize: 15, fontWeight: 'bold' },
  autoDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  autoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  autoBtnActive: { backgroundColor: '#50E3C2', borderColor: '#50E3C2' },
  autoBtnManual: { backgroundColor: '#2A2A2A', borderColor: '#444' },
  autoBtnText: { color: '#E0E0E0', fontSize: 12, fontWeight: 'bold' },
  // ── Directive Styles ──────────────────────────────────────────────────────
  directiveCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  directiveCardActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#1E1B0F',
  },
  directiveCardConflict: {
    borderColor: '#444444',
    opacity: 0.65,
  },
  directiveLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 10,
  },
  directiveIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  directiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 3,
  },
  directiveLabel: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  directiveLabelActive: {
    color: '#D4AF37',
  },
  directiveBadgeOn: {
    backgroundColor: '#D4AF37',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  directiveBadgeText: {
    color: '#121212',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  directiveDesc: {
    color: '#666666',
    fontSize: 12,
    lineHeight: 17,
  },
  directiveConflictText: {
    color: '#E2784A',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  directiveToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  directiveToggleOn: {
    borderColor: '#D4AF37',
    backgroundColor: '#D4AF37',
  },
  directiveToggleOff: {
    borderColor: '#444444',
    backgroundColor: 'transparent',
  },
  directiveToggleText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventCard: {
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  eventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eventSeverity: { fontSize: 11, fontWeight: 'bold', marginRight: 8 },
  eventTitle: { color: '#D4AF37', fontSize: 15, fontWeight: 'bold', flex: 1 },
  eventDetails: { color: '#CCCCCC', fontSize: 13, lineHeight: 18 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#666', fontStyle: 'italic' },
  feedContainer: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#1E242C',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  filterChipActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  filterChipText: {
    color: '#A0A6AD',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#0D1117',
    fontSize: 12,
    fontWeight: '700',
  },
});
