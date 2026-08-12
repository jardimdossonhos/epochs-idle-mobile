import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useGameState } from '../GameProvider';
import { BuildingType } from '../../core/models/enums';
import type { RegionActionType } from '../../application/game-session';

interface RegionDetailPanelProps {
  regionId: string;
  onClose: () => void;
  isMergedView?: boolean;
}

// ─── Mapeamento de Edificios ──────────────────────────────────────────────
const BUILDING_META: Record<BuildingType, { icon: string; label: string; desc: string }> = {
  [BuildingType.Market]: {
    icon: '💰',
    label: 'Mercado',
    desc: '+25% Renda da província',
  },
  [BuildingType.Barracks]: {
    icon: '⚔️',
    label: 'Quartel',
    desc: '+25% Manpower base',
  },
  [BuildingType.Monastery]: {
    icon: '⛪',
    label: 'Mosteiro',
    desc: '+Fé passiva, -Tensão Religiosa',
  },
  [BuildingType.University]: {
    icon: '📚',
    label: 'Universidade',
    desc: '+Pesquisa passiva',
  },
  [BuildingType.Fortress]: {
    icon: '🏰',
    label: 'Fortaleza',
    desc: '-Instabilidade, +Resistência',
  },
};

// ─── Barra de progresso ───────────────────────────────────────────────────
function StatBar({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <View style={statBarStyles.row}>
      <Text style={statBarStyles.label}>{label}</Text>
      <View style={statBarStyles.track}>
        <View style={[statBarStyles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={statBarStyles.value}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

const statBarStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#A0A0B0',
    fontSize: 12,
    width: 70,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: '#1E2235',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    color: '#C0C0D0',
    fontSize: 11,
    width: 32,
    textAlign: 'right',
  },
});

// ─── Componente Principal ─────────────────────────────────────────────────
export default function RegionDetailPanel({ regionId, onClose, isMergedView = false }: RegionDetailPanelProps) {
  const { gameState, session, playerKingdomId, staticWorldData } = useGameState();

  if (!gameState || !gameState.kingdoms || !session || !staticWorldData) return null;

  const regionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    const sortedIds = Object.keys(staticWorldData.definitions).sort();
    sortedIds.forEach((id, idx) => {
      map.set(id, idx);
    });
    return map;
  }, [staticWorldData]);

  const getContiguousRegions = useCallback((startRegionId: string): string[] => {
    const startRegionState = gameState.world.regions[startRegionId];
    if (!startRegionState) return [startRegionId];
    const ownerId = startRegionState.ownerId;
    if (!ownerId || ownerId === 'unclaimed' || ownerId === 'k_nature' || ownerId === 'nature') {
      return [startRegionId];
    }
    
    const visited = new Set<string>([startRegionId]);
    const queue = [startRegionId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentDef = staticWorldData.definitions[currentId];
      if (!currentDef) continue;
      
      const neighbors = currentDef.neighbors || [];
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          const neighborState = gameState.world.regions[neighborId];
          if (neighborState && neighborState.ownerId === ownerId) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }
    }
    
    return Array.from(visited);
  }, [gameState, staticWorldData]);

  const getRegionDefense = useCallback((rId: string) => {
    let defense = 0;
    const numericRId = parseInt(rId.replace('r_hex_', ''), 10);
    Object.values(gameState.kingdoms || {}).forEach(kingdom => {
      if (kingdom.military?.armies) {
        kingdom.military.armies.forEach(army => {
          if (army.stationedIndex !== -1 && army.stationedIndex === numericRId) {
            defense += army.manpower ?? 0;
          }
        });
      }
    });
    return defense;
  }, [gameState]);

  const { totalGold, totalPopulation, totalDefense } = useMemo(() => {
    const targets = isMergedView ? getContiguousRegions(regionId) : [regionId];
    
    let goldSum = 0;
    let popSum = 0;
    let defenseSum = 0;
    
    targets.forEach(rId => {
      const idx = regionIndexMap.get(rId);
      if (idx !== undefined && gameState.ecs) {
        goldSum += gameState.ecs.gold[idx] || 0;
        popSum += gameState.ecs.populationTotal[idx] || 0;
      }
      defenseSum += getRegionDefense(rId);
    });
    
    return {
      totalGold: goldSum,
      totalPopulation: Math.floor(popSum),
      totalDefense: defenseSum
    };
  }, [regionId, isMergedView, getContiguousRegions, regionIndexMap, gameState, getRegionDefense]);

  const regionState = gameState.world.regions[regionId];
  const regionDef = staticWorldData.definitions[regionId];
  const owner = regionState?.ownerId ? gameState.kingdoms[regionState.ownerId] : null;
  const isPlayerRegion = regionState?.ownerId === playerKingdomId;

  const handleBuild = useCallback(
    (buildingType: BuildingType) => {
      let targetRegionId = regionId;
      if (isMergedView) {
        const targets = getContiguousRegions(regionId);
        const candidates = targets.filter(rId => {
          const rState = gameState.world.regions[rId];
          if (!rState) return false;
          const bList = rState.buildings || [];
          const hasConst = !!rState.construction;
          return !hasConst && bList.length < 2 && !bList.includes(buildingType);
        });

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            const aState = gameState.world.regions[a];
            const bState = gameState.world.regions[b];
            const aCount = (aState?.buildings?.length || 0) + (aState?.construction ? 1 : 0);
            const bCount = (bState?.buildings?.length || 0) + (bState?.construction ? 1 : 0);
            
            if (aCount !== bCount) {
              return aCount - bCount;
            }
            
            const aDef = staticWorldData.definitions[a];
            const bDef = staticWorldData.definitions[b];
            
            if (buildingType === BuildingType.Market) {
              const aVal = aDef?.economyValue ?? 0;
              const bVal = bDef?.economyValue ?? 0;
              return bVal - aVal;
            } else if (buildingType === BuildingType.Fortress || buildingType === BuildingType.Barracks) {
              const aVal = aDef?.militaryValue ?? 0;
              const bVal = bDef?.militaryValue ?? 0;
              return bVal - aVal;
            } else {
              const aVal = aDef?.strategicValue ?? 0;
              const bVal = bDef?.strategicValue ?? 0;
              return bVal - aVal;
            }
          });
          targetRegionId = candidates[0];
        }
      }

      const result = session.executeBuildStructure(targetRegionId, buildingType);
      if (!result.ok) {
        Alert.alert('Construção', result.message);
      }
    },
    [session, regionId, isMergedView, getContiguousRegions, gameState, staticWorldData],
  );

  const handleRegionAction = useCallback(
    (actionType: RegionActionType) => {
      const result = session.executeRegionAction(regionId, actionType);
      if (!result.ok) {
        Alert.alert('Ação', result.message);
      }
    },
    [session, regionId],
  );

  const buildings: BuildingType[] = regionState?.buildings ?? [];

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>
            {regionDef?.isCoastal ? '🌊' : regionDef?.isWater ? '🌊' : '⛰️'}
          </Text>
          <View>
            <Text style={styles.regionName} numberOfLines={1}>
              {regionDef?.name ?? regionId}
            </Text>
            <Text style={styles.ownerLabel}>
              {isPlayerRegion
                ? '👑 Seu domínio'
                : owner
                ? `🏴 ${owner.name}`
                : '🌿 Território neutro'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.closeBtnText}>X</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* ── Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estatísticas</Text>
          <StatBar
            value={regionState?.autonomy ?? 0}
            color="#5B9BD5"
            label="Autonomia"
          />
          <StatBar
            value={regionState?.unrest ?? 0}
            color="#E74C3C"
            label="Revolta"
          />
          <StatBar
            value={regionState?.assimilation ?? 0}
            color="#2ECC71"
            label="Assimilação"
          />
          <StatBar
            value={regionState?.devastation ?? 0}
            color="#E67E22"
            label="Devastação"
          />
          {regionState?.construction && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#2C3E50', paddingTop: 8 }}>
              <Text style={{ color: '#F1C40F', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
                🔨 Em Construção: {BUILDING_META[regionState.construction.buildingType]?.label ?? regionState.construction.buildingType}
              </Text>
              <StatBar
                value={regionState.construction.progress / regionState.construction.targetTicks}
                color="#F1C40F"
                label="Progresso"
              />
            </View>
          )}
        </View>

        {/* ── Atributos Consolidados ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💎 Atributos Consolidados</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Ouro:</Text>
            <Text style={styles.infoVal}>{totalGold.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>População:</Text>
            <Text style={styles.infoVal}>{Math.floor(totalPopulation).toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Defesa:</Text>
            <Text style={styles.infoVal}>{totalDefense.toLocaleString()}</Text>
          </View>
        </View>

        {/* ── Edificios existentes ── */}
        {buildings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏗️ Construído</Text>
            <View style={styles.buildingChips}>
              {buildings.map((b) => {
                const meta = BUILDING_META[b];
                return (
                  <View key={b} style={styles.buildingChip}>
                    <Text style={styles.buildingChipText}>
                      {meta?.icon ?? '🔨'} {meta?.label ?? b}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Ações de Construção (só territórios do jogador) ── */}
        {isPlayerRegion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔨 Construir</Text>
            <View style={styles.actionsGrid}>
              {Object.entries(BUILDING_META).map(([bType, meta]) => {
                const bt = bType as BuildingType;
                const alreadyBuilt = buildings.includes(bt);
                const isUnderConstruction = !!regionState?.construction;
                const isThisBuildingUnderConstruction = regionState?.construction?.buildingType === bt;
                const isDisabled = alreadyBuilt || isUnderConstruction;
                return (
                  <TouchableOpacity
                    key={bt}
                    style={[styles.actionBtn, isDisabled && styles.actionBtnDisabled]}
                    onPress={() => handleBuild(bt)}
                    disabled={isDisabled}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.actionBtnIcon}>{meta.icon}</Text>
                    <Text style={[styles.actionBtnLabel, isDisabled && styles.actionBtnLabelDisabled]}>
                      {meta.label}
                    </Text>
                    <Text style={styles.actionBtnDesc}>
                      {alreadyBuilt
                        ? '✅ Construído'
                        : isThisBuildingUnderConstruction
                        ? '🔨 Construindo...'
                        : isUnderConstruction
                        ? 'Em andamento'
                        : meta.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Ações de Região ── */}
        {isPlayerRegion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Ações</Text>
            <View style={styles.rowActions}>
              <TouchableOpacity
                style={styles.rowActionBtn}
                onPress={() => handleRegionAction('pacify')}
                activeOpacity={0.75}
              >
                <Text style={styles.rowActionIcon}>🕊️</Text>
                <Text style={styles.rowActionLabel}>Pacificar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rowActionBtn}
                onPress={() => handleRegionAction('garrison')}
                activeOpacity={0.75}
              >
                <Text style={styles.rowActionIcon}>⚔️</Text>
                <Text style={styles.rowActionLabel}>Guarnecer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rowActionBtn}
                onPress={() => handleRegionAction('invest_agriculture')}
                activeOpacity={0.75}
              >
                <Text style={styles.rowActionIcon}>🌾</Text>
                <Text style={styles.rowActionLabel}>Agricultura</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Ação de Colonizar (territórios não controlados) ── */}
        {!isPlayerRegion && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.colonizeBtn]}
              onPress={() => handleRegionAction('colonize')}
              activeOpacity={0.75}
            >
              <Text style={styles.actionBtnIcon}>🚩</Text>
              <Text style={[styles.actionBtnLabel, { color: '#D4AF37' }]}>Colonizar</Text>
              <Text style={styles.actionBtnDesc}>Expandir domínio para esta região</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Info Bioma ── */}
        {regionDef && (
          <View style={[styles.section, { marginBottom: 20 }]}>
            <Text style={styles.sectionTitle}>🌍 Informações</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Zona:</Text>
              <Text style={styles.infoVal}>{regionDef.zone ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Bioma:</Text>
              <Text style={styles.infoVal}>{regionDef.biome ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Costeiro:</Text>
              <Text style={styles.infoVal}>{regionDef.isCoastal ? 'Sim' : 'Não'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Val. Estratégico:</Text>
              <Text style={styles.infoVal}>{regionDef.strategicValue ?? '—'}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1420',
    borderTopWidth: 1.5,
    borderTopColor: '#D4AF37',
    maxHeight: '55%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#141928',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2640',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  regionName: {
    color: '#D4AF37',
    fontSize: 17,
    fontWeight: 'bold',
    maxWidth: 220,
  },
  ownerLabel: {
    color: '#808090',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E2640',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#A0A0B0',
    fontSize: 16,
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  buildingChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  buildingChip: {
    backgroundColor: '#1E2640',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#303660',
  },
  buildingChipText: {
    color: '#B0B8D0',
    fontSize: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#1A1E35',
    borderRadius: 8,
    padding: 10,
    width: '47%',
    borderWidth: 1,
    borderColor: '#303660',
    alignItems: 'center',
  },
  actionBtnDisabled: {
    backgroundColor: '#0F1220',
    borderColor: '#1E2235',
    opacity: 0.6,
  },
  actionBtnIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionBtnLabel: {
    color: '#C0C8E0',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actionBtnLabelDisabled: {
    color: '#505870',
  },
  actionBtnDesc: {
    color: '#606880',
    fontSize: 10,
    textAlign: 'center',
  },
  colonizeBtn: {
    width: '100%',
    borderColor: '#8B6914',
    backgroundColor: '#1C1400',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rowActionBtn: {
    flex: 1,
    backgroundColor: '#1A1E35',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#303660',
  },
  rowActionIcon: {
    fontSize: 18,
    marginBottom: 3,
  },
  rowActionLabel: {
    color: '#A0A8C0',
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoKey: {
    color: '#606880',
    fontSize: 12,
    width: 120,
  },
  infoVal: {
    color: '#A0A8C0',
    fontSize: 12,
    flex: 1,
  },
});
