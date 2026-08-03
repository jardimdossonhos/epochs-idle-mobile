import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Alert, Image, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useGameState } from '../GameProvider';
import type { Character } from '../../core/models/character';
import type { Minister } from '../../core/models/administration';
import { MinisterRole } from '../../core/models/enums';
import { getGovernmentDefinition } from '../../core/data/government-types';
import GovernmentPolicyModal from '../components/GovernmentPolicyModal';

// ---------------------------------------------------------------------------
// Contexto de imersão por tipo de governo
// Adicionar novos governos aqui quando forem criados no GOVERNMENT_REGISTRY.
// ---------------------------------------------------------------------------
function getGovContext(govId: string, era: string) {
  if (era === 'tribal') {
    switch (govId) {
      case 'tribal_council':
        return {
          bannerIcon: '🏛️',
          eraLabel: 'ERA TRIBAL • CONSELHO',
          leaderTitle: 'ORADOR DO CONSELHO',
          councilTitle: 'CONSELHO DE ANCIONÃOS',
          policyLabel: 'Clique para deliberações tribais',
          courtTabLabel: 'Conselho',
          candidatesTabLabel: 'Membros',
          emptyText: 'Nenhum ancioão encontrado no conselho.',
          recruitLabel: '+ Alistar Membro',
        };
      case 'chiefdom':
        return {
          bannerIcon: '⚔️',
          eraLabel: 'ERA TRIBAL • CACICADO',
          leaderTitle: 'CHEFE GUERREIRO',
          councilTitle: 'CONSELHO DE CHEFES',
          policyLabel: 'Clique para ritos e decisões de guerra',
          courtTabLabel: 'Chefes',
          candidatesTabLabel: 'Guerreiros',
          emptyText: 'Nenhum chefe guerreiro neste cã de batalha.',
          recruitLabel: '+ Recrutar Guerreiro',
        };
      default: // band
        return {
          bannerIcon: '🔥',
          eraLabel: 'ERA TRIBAL • BANDO',
          leaderTitle: 'LÍDER DA TRIBO',
          councilTitle: 'ANCIONÃOS DO BANDO',
          policyLabel: 'Clique para costumes e ritos',
          courtTabLabel: 'Bandó',
          candidatesTabLabel: 'Membros',
          emptyText: 'Nenhum ancioão ao redor da fogueira.',
          recruitLabel: '+ Chamar Membro',
        };
    }
  }
  // Era Estatal — extensível para republic, empire, etc.
  switch (govId) {
    case 'republic':
      return {
        bannerIcon: '🏹',
        eraLabel: 'ERA ESTATAL • REPÚBLICA',
        leaderTitle: 'CÓNSUL DA REPÚBLICA',
        councilTitle: 'SENADO',
        policyLabel: 'Clique para políticas republicanas',
        courtTabLabel: 'Senado',
        candidatesTabLabel: 'Candidatos',
        emptyText: 'Nenhum senador encontrado.',
        recruitLabel: '+ Nomear Senador',
      };
    case 'empire':
      return {
        bannerIcon: '👑',
        eraLabel: 'ERA IMPERIAL',
        leaderTitle: 'IMPERADOR',
        councilTitle: 'CONSÍLIO IMPERIAL',
        policyLabel: 'Clique para edictos imperiais',
        courtTabLabel: 'Consílio',
        candidatesTabLabel: 'Candidatos',
        emptyText: 'Nenhum conselheiro nos salões imperiais.',
        recruitLabel: '+ Recrutar Conselheiro',
      };
    case 'theocracy':
      return {
        bannerIcon: '✝️',
        eraLabel: 'ERA ESTATAL • TEOCRACIA',
        leaderTitle: 'SUMO SACERDOTE',
        councilTitle: 'SÒNODO SAGRADO',
        policyLabel: 'Clique para decretos divinos',
        courtTabLabel: 'Sônodo',
        candidatesTabLabel: 'Candidatos',
        emptyText: 'Nenhum prelado encontrado no sônodo.',
        recruitLabel: '+ Ordenar Prelado',
      };
    default: // monarchy e qualquer governo estatal ainda sem entrada específica
      return {
        bannerIcon: '🏰',
        eraLabel: 'ERA ESTATAL',
        leaderTitle: 'CHEFE DE ESTADO',
        councilTitle: 'CONSELHO DE MINISTROS',
        policyLabel: 'Clique para alterar políticas',
        courtTabLabel: 'Corte',
        candidatesTabLabel: 'Candidatos',
        emptyText: 'Ninguém encontrado nestes salões.',
        recruitLabel: '+ Recrutar',
      };
  }
}

export default function CharacterScreen() {
  const { gameState, session, playerKingdomId } = useGameState();
  const [activeTab, setActiveTab] = useState<'court' | 'candidates'>('court');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  if (!gameState || !session) return null;

  const kingdom = gameState.kingdoms[playerKingdomId];
  if (!kingdom) return null;

  const govDef = getGovernmentDefinition(kingdom.governmentSystemId);
  const govCtx = getGovContext(govDef.id, govDef.era);

  const ruler = kingdom.rulerId && gameState.world.characters?.[kingdom.rulerId]
    ? gameState.world.characters[kingdom.rulerId]
    : Object.values(gameState.world.characters || {}).find(
        c => c.status === 'ruler' && c.employerKingdomId === playerKingdomId
      );

  // Filter based on tab
  const getTabCharacters = () => {
    switch (activeTab) {
      case 'court': {
        const council = Object.values(kingdom.administration?.council || {}).filter((m): m is Minister => !!m);
        return council;
      }
      case 'candidates':
        return kingdom.administration?.candidatePool || [];
      default:
        return [];
    }
  };

  const characters = getTabCharacters();

  const handleFire = (role: MinisterRole) => {
    const res = session.fireMinister(role);
    if (!res.ok) {
      Alert.alert("Erro ao Demitir", res.message);
    } else {
      Alert.alert("Conselho Atualizado", res.message);
    }
  };

  const handleReassign = (currentRole: MinisterRole, targetRole: MinisterRole) => {
    const res = session.reassignMinister(currentRole, targetRole);
    if (!res.ok) {
      Alert.alert("Erro ao Remanejar", res.message);
    } else {
      Alert.alert("Conselho Atualizado", res.message);
    }
  };

  const handleInteract = (role: MinisterRole, interaction: "praise" | "threaten" | "consult" | "raise_salary" | "cut_salary") => {
    const res = session.interactMinister(role, interaction);
    if (!res.ok) {
      Alert.alert("Ação Falhou", res.message);
    } else {
      Alert.alert("Interação", res.message);
    }
  };

  const handleHire = (candidateId: string, targetRole: MinisterRole) => {
    const res = session.hireMinister(candidateId, targetRole);
    if (!res.ok) {
      Alert.alert("Erro ao Contratar", res.message);
    } else {
      Alert.alert("Conselho Atualizado", res.message);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'court') {
      if (item.status === 'ruler') {
        return <CharacterCard character={item} />;
      } else {
        const roleEntry = Object.entries(kingdom.administration?.council || {}).find(([_, m]) => m && m.id === item.id);
        const role = roleEntry ? (roleEntry[0] as MinisterRole) : MinisterRole.Wildcard;
        return (
          <CouncilCard 
            minister={item} 
            role={role} 
            onFire={handleFire} 
            onReassign={handleReassign} 
            onInteract={handleInteract} 
          />
        );
      }
    } else {
      const occupiedRoles = Object.keys(kingdom.administration?.council || {}) as MinisterRole[];
      return (
        <CandidateCard 
          candidate={item} 
          onHire={handleHire} 
          occupiedRoles={occupiedRoles}
        />
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'court' && styles.activeTab]}
          onPress={() => setActiveTab('court')}
        >
          <Text style={[styles.tabText, activeTab === 'court' && styles.activeTabText]}>{govCtx.courtTabLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'candidates' && styles.activeTab]}
          onPress={() => setActiveTab('candidates')}
        >
          <Text style={[styles.tabText, activeTab === 'candidates' && styles.activeTabText]}>{govCtx.candidatesTabLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={characters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          activeTab === 'court' ? (
            <View style={styles.powerCenterContainer}>
              <TouchableOpacity
                style={styles.governmentBanner}
                onPress={() => setShowPolicyModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.governmentBannerLeft}>
                  <Text style={styles.governmentBannerTitle}>
                    {govCtx.bannerIcon} {govDef.name.toUpperCase()}
                  </Text>
                  <Text style={styles.governmentBannerSubtitle}>
                    {govCtx.eraLabel} • {govCtx.policyLabel}
                  </Text>
                </View>
                <Text style={styles.governmentBannerArrow}>▼</Text>
              </TouchableOpacity>

              {ruler && (
                <View style={styles.rulerSection}>
                  <Text style={styles.sectionHeader}>{govCtx.leaderTitle}</Text>
                  <CharacterCard character={ruler} />
                </View>
              )}

              <Text style={styles.sectionHeader}>{govCtx.councilTitle}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{govCtx.emptyText}</Text>
          </View>
        }
        renderItem={renderItem}
      />

      {activeTab === 'court' && (
        <View style={styles.bottomRecruitBar}>
          <TouchableOpacity
            style={styles.bottomRecruitBtn}
            onPress={() => setActiveTab('candidates')}
            activeOpacity={0.85}
          >
            <Text style={styles.bottomRecruitBtnText}>{govCtx.recruitLabel}</Text>
          </TouchableOpacity>
        </View>
      )}

      <GovernmentPolicyModal
        visible={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        currentGovernmentId={govDef.id}
      />
    </SafeAreaView>
  );
}

function getAvatarUrl(cultureId?: string, seed?: string, gender?: 'male'|'female') {
  const safeSeed = seed || 'default';
  const style = gender === 'female' ? 'lorelei' : 'adventurer';
  return `https://api.dicebear.com/9.x/${style}/png?seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;
}

function DynamicAvatar({ uri, fallbackIcon, borderColor }: { uri: string, fallbackIcon: string, borderColor?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.avatarPlaceholder, { borderColor: borderColor || '#D4AF37', overflow: 'hidden' }]}>
      {!failed ? (
        <Image 
          source={{ uri }} 
          style={styles.avatarImage} 
          onError={() => setFailed(true)} 
        />
      ) : (
        <Text style={styles.avatarIcon}>{fallbackIcon}</Text>
      )}
    </View>
  );
}

function CharacterCard({ character }: { character: Character }) {
  const cultureId = (character as any).cultureId;
  const cultureColor = cultureId === 'nordic' ? '#49657a' : cultureId === 'latin' ? '#e6b322' : '#8A2BE2';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <DynamicAvatar 
          uri={getAvatarUrl((character as any).cultureId, (character as any).portraitSeed, (character as any).gender)} 
          fallbackIcon="👑" 
          borderColor={cultureColor} 
        />
        <View style={styles.cardTitleArea}>
          <Text style={styles.charName}>{character.name}</Text>
          <Text style={styles.charStatus}>
            {character.status.toUpperCase()} | Nível {(character as any).level || 1} | Cultura: {cultureId?.toUpperCase() || 'LOCAL'} {character.isLegendary ? '⭐ LENDÁRIO' : ''}
          </Text>
          <Text style={styles.charEra}>Traje da Era: Tradicional / Manto Real</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatBox label="ADM" value={character.stats.administration} color="#4A90E2" />
        <StatBox label="MAR" value={character.stats.martial} color="#E24A4A" />
        <StatBox label="DIP" value={character.stats.diplomacy} color="#50E3C2" />
        <StatBox label="INT" value={character.stats.intrigue} color="#9013FE" />
        <StatBox label="LRN" value={character.stats.learning} color="#F8E71C" />
      </View>

      {/* Traits */}
      {character.traits && character.traits.length > 0 && (
        <View style={styles.traitsRow}>
          {character.traits.map(t => (
            <View key={t} style={styles.traitBadge}>
              <Text style={styles.traitText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CouncilCard({ 
  minister, 
  role, 
  onFire, 
  onReassign, 
  onInteract 
}: { 
  minister: Minister; 
  role: MinisterRole; 
  onFire: (role: MinisterRole) => void; 
  onReassign: (role: MinisterRole, target: MinisterRole) => void; 
  onInteract: (role: MinisterRole, type: "praise" | "threaten" | "consult" | "raise_salary" | "cut_salary") => void; 
}) {
  const [showInteract, setShowInteract] = useState(false);
  const [showReassign, setShowReassign] = useState(false);

  const roleLabels: Record<MinisterRole, string> = {
    [MinisterRole.Steward]: "Administrador",
    [MinisterRole.Marshal]: "Marechal",
    [MinisterRole.Chancellor]: "Chanceler",
    [MinisterRole.Chaplain]: "Capelão",
    [MinisterRole.Scholar]: "Erudito",
    [MinisterRole.PrimeMinister]: "Primeiro Ministro",
    [MinisterRole.Wildcard]: "Curinga"
  };

  const roleIcons: Record<MinisterRole, string> = {
    [MinisterRole.Steward]: "📜",
    [MinisterRole.Marshal]: "⚔️",
    [MinisterRole.Chancellor]: "🕊️",
    [MinisterRole.Chaplain]: "✝️",
    [MinisterRole.Scholar]: "📚",
    [MinisterRole.PrimeMinister]: "🏛️",
    [MinisterRole.Wildcard]: "👤"
  };

  const rolesList = Object.values(MinisterRole).filter(r => r !== role && r !== MinisterRole.Wildcard);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <DynamicAvatar 
            uri={getAvatarUrl(minister.cultureId, minister.portraitSeed, minister.gender)} 
            fallbackIcon="👤" 
          />
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeIcon}>{roleIcons[role] || "👤"}</Text>
          </View>
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={styles.charName}>{minister.name}</Text>
          <Text style={styles.charStatus}>
            {roleLabels[role]?.toUpperCase() || "CONSELHEIRO"} | Personalidade: {minister.personality?.toUpperCase() || 'EQUILIBRADO'}
          </Text>
        </View>
      </View>

      {/* Info Row */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Lealdade: <Text style={{ color: minister.loyalty > 50 ? '#50E3C2' : '#E24A4A', fontWeight: 'bold' }}>{minister.loyalty}/100</Text></Text>
        <Text style={styles.infoText}>Salário: <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>💰 {minister.salary}</Text></Text>
        <Text style={styles.infoText}>Nível: <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{minister.skillLevel} ({minister.experience}/{minister.experienceToNext} XP)</Text></Text>
      </View>

      <Text style={styles.originText}>Origem: {minister.origin}</Text>

      {/* Stats Row */}
      {minister.stats && (
        <View style={styles.statsRow}>
          <StatBox label="ADM" value={minister.stats.administration} color="#4A90E2" />
          <StatBox label="MAR" value={minister.stats.martial} color="#E24A4A" />
          <StatBox label="DIP" value={minister.stats.diplomacy} color="#50E3C2" />
          <StatBox label="INT" value={minister.stats.intrigue} color="#9013FE" />
          <StatBox label="LRN" value={minister.stats.learning} color="#F8E71C" />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.btnSmall} onPress={() => { setShowInteract(!showInteract); setShowReassign(false); }}>
          <Text style={styles.btnText}>Interagir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSmall} onPress={() => { setShowReassign(!showReassign); setShowInteract(false); }}>
          <Text style={styles.btnText}>Remanejar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnSmall, { backgroundColor: '#5A1A1A' }]} onPress={() => onFire(role)}>
          <Text style={[styles.btnText, { color: '#FFF' }]}>Demitir</Text>
        </TouchableOpacity>
      </View>

      {/* Interaction Panel */}
      {showInteract && (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Ações de Interação:</Text>
          <View style={styles.panelGrid}>
            <TouchableOpacity style={styles.panelBtn} onPress={() => { onInteract(role, 'praise'); setShowInteract(false); }}>
              <Text style={styles.panelBtnText}>Elogiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.panelBtn} onPress={() => { onInteract(role, 'threaten'); setShowInteract(false); }}>
              <Text style={styles.panelBtnText}>Ameaçar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.panelBtn} onPress={() => { onInteract(role, 'consult'); setShowInteract(false); }}>
              <Text style={styles.panelBtnText}>Consultar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.panelBtn} onPress={() => { onInteract(role, 'raise_salary'); setShowInteract(false); }}>
              <Text style={styles.panelBtnText}>+ Salário</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.panelBtn} onPress={() => { onInteract(role, 'cut_salary'); setShowInteract(false); }}>
              <Text style={styles.panelBtnText}>- Salário</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reassign Panel */}
      {showReassign && (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Escolher Novo Cargo:</Text>
          <View style={styles.panelGrid}>
            {rolesList.map(r => (
              <TouchableOpacity key={r} style={styles.panelBtn} onPress={() => { onReassign(role, r); setShowReassign(false); }}>
                <Text style={styles.panelBtnText}>{roleLabels[r]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function CandidateCard({ 
  candidate, 
  onHire,
  occupiedRoles
}: { 
  candidate: Minister; 
  onHire: (candidateId: string, role: MinisterRole) => void; 
  occupiedRoles: MinisterRole[];
}) {
  const [showRoles, setShowRoles] = useState(false);

  const roleLabels: Record<MinisterRole, string> = {
    [MinisterRole.Steward]: "Administrador",
    [MinisterRole.Marshal]: "Marechal",
    [MinisterRole.Chancellor]: "Chanceler",
    [MinisterRole.Chaplain]: "Capelão",
    [MinisterRole.Scholar]: "Erudito",
    [MinisterRole.PrimeMinister]: "Primeiro Ministro",
    [MinisterRole.Wildcard]: "Curinga"
  };

  const rolesList = Object.values(MinisterRole).filter(r => r !== MinisterRole.Wildcard && !occupiedRoles.includes(r));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <DynamicAvatar 
          uri={getAvatarUrl(candidate.cultureId, candidate.portraitSeed, candidate.gender)} 
          fallbackIcon="👤" 
        />
        <View style={styles.cardTitleArea}>
          <Text style={styles.charName}>{candidate.name}</Text>
          <Text style={styles.charStatus}>
            Candidato a {roleLabels[candidate.role] || "Curinga"} | Personalidade: {candidate.personality.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Info Row */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Salário Pretendido: <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>💰 {candidate.salary}</Text></Text>
        <Text style={styles.infoText}>Nível: <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{candidate.skillLevel}</Text></Text>
      </View>

      <Text style={styles.originText}>Origem: {candidate.origin}</Text>

      {/* Stats Row */}
      {candidate.stats && (
        <View style={styles.statsRow}>
          <StatBox label="ADM" value={candidate.stats.administration} color="#4A90E2" />
          <StatBox label="MAR" value={candidate.stats.martial} color="#E24A4A" />
          <StatBox label="DIP" value={candidate.stats.diplomacy} color="#50E3C2" />
          <StatBox label="INT" value={candidate.stats.intrigue} color="#9013FE" />
          <StatBox label="LRN" value={candidate.stats.learning} color="#F8E71C" />
        </View>
      )}

      {/* Hire Button */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.btnSmall, { backgroundColor: '#D4AF37' }]} onPress={() => {
          if (rolesList.length === 0) {
            Alert.alert("Conselho Cheio", "Não há vagas disponíveis no Conselho. Demita alguém primeiro.");
          } else {
            setShowRoles(!showRoles);
          }
        }}>
          <Text style={[styles.btnText, { color: '#121212' }]}>Nomear para Conselho</Text>
        </TouchableOpacity>
      </View>

      {/* Roles Selector */}
      {showRoles && (
        <View style={styles.actionPanel}>
          <Text style={styles.panelTitle}>Nomear para qual Cargo?</Text>
          <View style={styles.panelGrid}>
            {rolesList.map(r => (
              <TouchableOpacity key={r} style={styles.panelBtn} onPress={() => { onHire(candidate.id, r); setShowRoles(false); }}>
                <Text style={styles.panelBtnText}>{roleLabels[r]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function StatBox({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  powerCenterContainer: {
    marginBottom: 12,
  },
  governmentBanner: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  governmentBannerLeft: {
    flex: 1,
  },
  governmentBannerTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  governmentBannerSubtitle: {
    color: '#AAA',
    fontSize: 12,
  },
  governmentBannerArrow: {
    color: '#D4AF37',
    fontSize: 14,
    marginLeft: 8,
  },
  rulerSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bottomRecruitBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
  },
  bottomRecruitBtn: {
    backgroundColor: '#D4AF37',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bottomRecruitBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
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
  activeTab: {
    borderBottomColor: '#D4AF37',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  activeTabText: {
    color: '#D4AF37',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  // Card Styles
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  avatarText: {
    color: '#D4AF37',
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatarIcon: {
    fontSize: 24,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarContainer: {
    position: 'relative',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  roleBadgeIcon: {
    fontSize: 10,
  },
  cardTitleArea: {
    marginLeft: 12,
    flex: 1,
  },
  charName: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  charStatus: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  charEra: {
    color: '#50E3C2',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traitBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  traitText: {
    color: '#AAA',
    fontSize: 11,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#121212',
    padding: 8,
    borderRadius: 4,
  },
  infoText: {
    color: '#AAA',
    fontSize: 12,
  },
  originText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  btnSmall: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  btnText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionPanel: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#121212',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  panelTitle: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  panelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  panelBtn: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  panelBtnText: {
    color: '#FFF',
    fontSize: 12,
  },
});
