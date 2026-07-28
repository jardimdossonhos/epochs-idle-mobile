import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SimulationCanvas } from '../components/map/simulation-canvas';
import { useGameEngine } from '../hooks/use-game-engine';
import TopHUD from '../components/TopHUD';
import { ImperialOverlay } from '../components/map/imperial-overlay';

export default function MapScreen() {
  const engine = useGameEngine();

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
        <TopHUD />
        <ImperialOverlay />
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
});

