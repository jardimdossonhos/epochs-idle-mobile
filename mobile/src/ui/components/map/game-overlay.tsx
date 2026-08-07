import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useUiStore } from '../../stores/use-ui-store';
import { useGameState } from '../../GameProvider';
import { getRegionName } from '../../../core/simulation/systems/name-generator';
import { CommandType } from '../../../core/types/commands';
import { GameConfig } from '../../../core/config/game-config';

export interface GameOverlayProps {
  dispatchCommand: (cmd: [number, number, number, number]) => void;
}

export function GameOverlay({ dispatchCommand }: GameOverlayProps) {
  const store = useUiStore();
  const { staticWorldData } = useGameState();

  const handleMove = () => {
    store.setUiMode('COMMAND_MOVE');
  };

  const handleCancel = () => {
    store.setUiMode('DEFAULT');
    store.clearSelection();
  };

  const handleBuildFarm = () => {
    if (store.selectedHex && store.purchaseStructure()) {
      dispatchCommand([CommandType.BUILD_STRUCTURE, store.playerFactionId, store.selectedHex.id, 0]);
      store.clearSelection();
    }
  };

  const handleRecruitArmy = () => {
    if (store.selectedHex && store.purchaseArmy()) {
      dispatchCommand([CommandType.RECRUIT_ARMY, store.playerFactionId, store.selectedHex.id, 0]);
      store.clearSelection();
    }
  };

  const TopBar = () => (
    <View style={styles.topBar}>
      <Text style={styles.topBarText}>🪙 {Math.floor(store.gold)}</Text>
      <Text style={styles.topBarText}>🌾 {Math.floor(store.food)}</Text>
      <Text style={styles.topBarText}>⚒️ {Math.floor(store.production)}</Text>
    </View>
  );

  if (!store.selectedHex) {
    return (
      <View style={styles.container} pointerEvents="box-none">
        <TopBar />
      </View>
    );
  }

  const isPlayerOwned = store.selectedHex.ownerFaction === store.playerFactionId;
  const isPlayerArmy = store.selectedArmy?.faction === store.playerFactionId;
  const canAffordFarm = store.gold >= GameConfig.economy.COST_FARM_GOLD;
  const canAffordArmy = store.food >= GameConfig.economy.COST_ARMY_FOOD;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TopBar />
      
      <View style={styles.panel}>
        <Text style={styles.title}>
          Província: {staticWorldData && store.selectedHex ? getRegionName(staticWorldData.definitions[String(store.selectedHex.id)]) : store.selectedHex?.name} ({store.selectedHex?.biome})
        </Text>
        <Text style={styles.subtitle}>
          Domínio: Facção {store.selectedHex.ownerFaction}
        </Text>

        {store.selectedArmy ? (
          <Text style={styles.armyInfo}>
            Tropa Estacionada: Facção {store.selectedArmy.faction} | População: {Math.floor(store.selectedArmy.manpower)}
          </Text>
        ) : (
          <Text style={styles.armyInfo}>Nenhuma tropa estacionada.</Text>
        )}

        {store.uiMode === 'DEFAULT' ? (
          <View style={styles.actions}>
            {!store.selectedArmy && isPlayerOwned && (
              <>
                <TouchableOpacity 
                  style={[styles.buttonAction, !canAffordFarm && styles.buttonDisabled]} 
                  onPress={handleBuildFarm}
                  disabled={!canAffordFarm}
                >
                  <Text style={styles.buttonText}>Construir Fazenda (🪙{GameConfig.economy.COST_FARM_GOLD})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.buttonAction, !canAffordArmy && styles.buttonDisabled]} 
                  onPress={handleRecruitArmy}
                  disabled={!canAffordArmy}
                >
                  <Text style={styles.buttonText}>Recrutar Tropa (🌾{GameConfig.economy.COST_ARMY_FOOD})</Text>
                </TouchableOpacity>
              </>
            )}

            {store.selectedArmy && isPlayerArmy && (
              <TouchableOpacity style={styles.button} onPress={handleMove}>
                <Text style={styles.buttonText}>Mover Tropa</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.buttonCancel} onPress={handleCancel}>
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <Text style={styles.instruction}>Selecione o destino no mapa...</Text>
            <TouchableOpacity style={styles.buttonCancel} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    zIndex: 100,
  },
  topBar: {
    marginTop: 40,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topBarText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  panel: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    width: '90%',
    maxWidth: 400,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  armyInfo: {
    color: '#E2E8F0',
    fontSize: 14,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonAction: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  buttonCancel: {
    backgroundColor: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  instruction: {
    color: '#FBBF24',
    flex: 1,
    alignSelf: 'center',
  }
});


