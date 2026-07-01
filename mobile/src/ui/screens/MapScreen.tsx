import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useGameState } from '../GameProvider';
import { BuildingType } from '../../core/models/enums';
import WorldMapSvg from '../components/WorldMapSvg';
import RegionDetailPanel from '../components/RegionDetailPanel';

// ─── Tipo de aba ──────────────────────────────────────────────────────────────
type ActiveTab = 'map' | 'regions';

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function MapScreen() {
  const { gameState, session, playerKingdomId, staticWorldData } = useGameState();
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  if (!gameState || !session || !staticWorldData) return null;

  const kingdom = gameState.kingdoms[playerKingdomId];
  if (!kingdom) return null;

  const controlledRegions = session.getKingdomControlledRegions(playerKingdomId);
  const staticDefinitions = staticWorldData.definitions;

  const handleBuild = (regionId: string, buildingType: BuildingType) => {
    const result = session.executeBuildStructure(regionId, buildingType);
    if (!result.ok) {
      Alert.alert('Erro', result.message);
    }
  };

  const handleRegionPress = useCallback((regionId: string) => {
    setSelectedRegionId((prev) => (prev === regionId ? null : regionId));
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedRegionId(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Domínios da Coroa</Text>
        <Text style={styles.subtitle}>
          {controlledRegions.length} territórios controlados
        </Text>
      </View>

      {/* ── Seletor de Abas ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'map' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('map'); setSelectedRegionId(null); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabLabel, activeTab === 'map' && styles.tabLabelActive]}>
            🗺️ Mapa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'regions' && styles.tabBtnActive]}
          onPress={() => { setActiveTab('regions'); setSelectedRegionId(null); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabLabel, activeTab === 'regions' && styles.tabLabelActive]}>
            📋 Regiões
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Conteúdo ── */}
      <View style={styles.content}>
        {activeTab === 'map' ? (
          <View style={styles.mapContainer}>
            {/* Mapa SVG hexagonal */}
            <WorldMapSvg
              onRegionPress={handleRegionPress}
              selectedRegionId={selectedRegionId}
            />

            {/* Painel de detalhes ao selecionar região */}
            {selectedRegionId && (
              <View style={styles.detailPanelWrapper}>
                <RegionDetailPanel
                  regionId={selectedRegionId}
                  onClose={handleClosePanel}
                />
              </View>
            )}
          </View>
        ) : (
          /* ── Lista de Regiões (original preservada) ── */
          <ScrollView contentContainerStyle={styles.list}>
            {controlledRegions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏔️</Text>
                <Text style={styles.emptyText}>Nenhum território controlado ainda.</Text>
              </View>
            )}
            {controlledRegions.map((regionId) => {
              const regionDef = staticDefinitions[regionId];
              const regionState = gameState.world.regions[regionId];
              return (
                <View key={regionId} style={styles.regionCard}>
                  <View style={styles.regionHeader}>
                    <Text style={styles.regionIcon}>
                      {regionDef?.isCoastal ? '🌊' : '⛰️'}
                    </Text>
                    <Text style={styles.regionName}>{regionDef?.name || regionId}</Text>
                  </View>
                  <View style={styles.regionStats}>
                    <Text style={styles.statText}>
                      Autonomia: {((regionState?.autonomy || 0) * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.statText}>
                      Revolta: {((regionState?.unrest || 0) * 100).toFixed(0)}%
                    </Text>
                  </View>

                  <View style={styles.buildActions}>
                    <Text style={styles.buildTitle}>Construir:</Text>
                    <View style={styles.buildButtonsRow}>
                      <TouchableOpacity
                        style={[
                          styles.buildBtn,
                          regionState?.buildings?.includes(BuildingType.Market) &&
                            styles.buildBtnDisabled,
                        ]}
                        onPress={() => handleBuild(regionId, BuildingType.Market)}
                        disabled={regionState?.buildings?.includes(BuildingType.Market)}
                      >
                        <Text style={styles.buildBtnText}>💰 Mercado</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.buildBtn,
                          regionState?.buildings?.includes(BuildingType.Fortress) &&
                            styles.buildBtnDisabled,
                        ]}
                        onPress={() => handleBuild(regionId, BuildingType.Fortress)}
                        disabled={regionState?.buildings?.includes(BuildingType.Fortress)}
                      >
                        <Text style={styles.buildBtnText}>🏰 Fortaleza</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 14,
    paddingBottom: 10,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  title: {
    fontSize: 22,
    color: '#D4AF37',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#A0A0A0',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#D4AF37',
    backgroundColor: '#1C1800',
  },
  tabLabel: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#D4AF37',
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  detailPanelWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  // Lista (aba Regiões)
  list: {
    padding: 14,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 15,
  },
  regionCard: {
    backgroundColor: '#1A1A1A',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  regionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  regionName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#D4AF37',
    flex: 1,
  },
  regionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  statText: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  buildActions: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  buildTitle: {
    color: '#D4AF37',
    fontSize: 13,
    marginBottom: 8,
  },
  buildButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buildBtn: {
    backgroundColor: '#2C1A5C',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 0.48,
    alignItems: 'center',
    borderColor: '#8A2BE2',
    borderWidth: 1,
  },
  buildBtnDisabled: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
  },
  buildBtnText: {
    color: '#E0E0E0',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
