import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SimulationCanvas } from '../components/map/simulation-canvas';
import { useGameEngine } from '../hooks/use-game-engine';
import { ImperialOverlay } from '../components/map/imperial-overlay';
import { useUiStore } from '../stores/use-ui-store';
import RegionDetailPanel from '../components/RegionDetailPanel';

export default function MapScreen() {
  const engine = useGameEngine();
  const selectedHex = useUiStore((s) => s.selectedHex);
  const clearSelection = useUiStore((s) => s.clearSelection);

  return (
    <View style={styles.container}>
      <View style={styles.mapLayer}>
        <SimulationCanvas 
          regionOwner={engine.regionOwner}
          currentArmyData={engine.currentArmyData}
          lastArmyData={engine.lastArmyData}
          mapUpdateTrigger={engine.mapUpdateTrigger}
          tickProgress={engine.tickProgress}
          hexStructures={engine.hexStructures}
          structureUpdateTrigger={engine.structureUpdateTrigger}
          combatEventHead={engine.combatEventHead}
          combatEventX={engine.combatEventX}
          combatEventY={engine.combatEventY}
          combatEventTs={engine.combatEventTs}
          visibilityMask={engine.visibilityMask}
          visionUpdateTrigger={engine.visionUpdateTrigger}
          dispatchCommand={engine.dispatchCommand}
        />
      </View>

      <View style={styles.uiLayer} pointerEvents="box-none">
        <ImperialOverlay />
        
        {/* Render RegionDetailPanel at the bottom if a hex is selected */}
        {selectedHex && (
          <View style={styles.panelContainer} pointerEvents="box-none">
            <RegionDetailPanel 
              regionId={`r_hex_${selectedHex.id}`}
              onClose={clearSelection}
              isMergedView={false}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  mapLayer: {
    ...StyleSheet.absoluteFill,
    flex: 1,
  },
  uiLayer: {
    ...StyleSheet.absoluteFill,
  },
  panelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});

