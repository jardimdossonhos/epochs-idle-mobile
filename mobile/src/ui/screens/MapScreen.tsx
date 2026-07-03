import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameState } from '../GameProvider';
import { BuildingType } from '../../core/models/enums';
import WorldMapSkia from '../components/WorldMapSkia';
import RegionDetailPanel from '../components/RegionDetailPanel';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, session, playerKingdomId, staticWorldData } = useGameState();
  const [showRegionList, setShowRegionList] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'owner' | 'religion' | 'economy' | 'military'>('owner');

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
      {/* ── MAPA (Background absoluto) ── */}
      <View style={styles.mapLayer}>
        <WorldMapSkia
          onRegionPress={handleRegionPress}
          selectedRegionId={selectedRegionId}
          viewMode={viewMode}
        />
      </View>

      {/* ── FABS DE VIEW MODE ── */}
      {!showRegionList && !selectedRegionId && (
        <View style={[styles.fabColumn, { top: insets.top + 140 }]}>
          <TouchableOpacity
            style={[styles.fabButton, viewMode === 'owner' && styles.fabActive]}
            onPress={() => setViewMode('owner')}
            activeOpacity={0.7}
          >
            <Text style={[styles.fabText, viewMode === 'owner' && styles.fabActiveText]}>👑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabButton, viewMode === 'religion' && styles.fabActive]}
            onPress={() => setViewMode('religion')}
            activeOpacity={0.7}
          >
            <Text style={[styles.fabText, viewMode === 'religion' && styles.fabActiveText]}>⛪</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabButton, viewMode === 'economy' && styles.fabActive]}
            onPress={() => setViewMode('economy')}
            activeOpacity={0.7}
          >
            <Text style={[styles.fabText, viewMode === 'economy' && styles.fabActiveText]}>💰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabButton, viewMode === 'military' && styles.fabActive]}
            onPress={() => setViewMode('military')}
            activeOpacity={0.7}
          >
            <Text style={[styles.fabText, viewMode === 'military' && styles.fabActiveText]}>⚔️</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── HEADER FLUTUANTE ── */}
      <View style={[styles.floatingHeader, { top: insets.top + 80 }]}>
        <View style={styles.headerGlass}>
          <Text style={styles.title}>{kingdom.name}</Text>
          <Text style={styles.subtitle}>
            {controlledRegions.length} territórios soberanos
          </Text>
        </View>
        <TouchableOpacity
          style={styles.btnListToggle}
          onPress={() => setShowRegionList(!showRegionList)}
        >
          <Text style={styles.btnListText}>{showRegionList ? '🌍 Ver Mapa' : '📋 Ver Regiões'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── LISTA DE REGIÕES FLUTUANTE ── */}
      {showRegionList && (
        <View style={[styles.floatingListContainer, { top: insets.top + 140 }]}>
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
                    <Text style={styles.buildTitle}>Expandir Província:</Text>
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
        </View>
      )}

      {/* ── PAINEL DE DETALHES DE REGIÃO ── */}
      {selectedRegionId && !showRegionList && (
        <View style={styles.detailPanelWrapper}>
          <RegionDetailPanel
            regionId={selectedRegionId}
            onClose={handleClosePanel}
          />
        </View>
      )}
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  mapLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingHeader: {
    position: 'absolute',
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  headerGlass: {
    backgroundColor: 'rgba(20, 25, 35, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  title: {
    fontSize: 20,
    color: '#D4AF37',
    fontWeight: '800',
    textShadowColor: 'rgba(212, 175, 55, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 12,
    color: '#8c9ab3',
    fontWeight: '500',
    marginTop: 2,
  },
  btnListToggle: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  btnListText: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 12,
  },
  floatingListContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 15,
    backgroundColor: 'rgba(15, 20, 30, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a3245',
    zIndex: 90,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  list: {
    padding: 16,
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
    color: '#8c9ab3',
    fontSize: 15,
  },
  regionCard: {
    backgroundColor: 'rgba(30, 38, 55, 0.7)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  regionIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  regionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAEAEA',
    flex: 1,
  },
  regionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginBottom: 12,
  },
  statText: {
    color: '#8c9ab3',
    fontSize: 13,
    fontWeight: '500',
  },
  buildActions: {
    marginTop: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  buildTitle: {
    color: '#D4AF37',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  buildButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buildBtn: {
    backgroundColor: 'rgba(44, 26, 92, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
    borderColor: '#8A2BE2',
    borderWidth: 1,
  },
  buildBtnDisabled: {
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buildBtnText: {
    color: '#F0F0F0',
    fontWeight: '600',
    fontSize: 13,
  },
  detailPanelWrapper: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    zIndex: 100,
  },
  fabColumn: {
    position: 'absolute',
    right: 15,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 100,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 25, 35, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  fabActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.4)',
    borderColor: '#D4AF37',
  },
  fabText: {
    fontSize: 20,
    textAlign: 'center',
  },
  fabActiveText: {
    textShadowColor: 'rgba(212, 175, 55, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
