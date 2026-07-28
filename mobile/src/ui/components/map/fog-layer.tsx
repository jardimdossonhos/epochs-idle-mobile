import React from 'react';
import { useDerivedValue } from 'react-native-reanimated';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

// Precisamos do world_map_data para desenhar os hexágonos
const mapData = require('../../core/data/world_map_data.json');

export interface FogLayerProps {
  visibilityMask: SharedValue<Uint8Array>;
  visionUpdateTrigger: SharedValue<number>;
}

export function FogLayer({ visibilityMask, visionUpdateTrigger }: FogLayerProps) {
  const regions = mapData.regions ?? mapData.hexagons ?? [];
  
  const blackPath = useDerivedValue(() => {
    // Gatilho memoizado
    const trigger = visionUpdateTrigger.value;
    const mask = visibilityMask.value;
    
    const path = Skia.Path.Make();
    
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 0) {
        const region = regions[i];
        if (region && region.vertices) {
          const mPath = Skia.Path.MakeFromSVGString(region.vertices);
          if (mPath) {
             path.addPath(mPath);
          }
        }
      }
    }
    return path;
  });

  const fogPath = useDerivedValue(() => {
    const trigger = visionUpdateTrigger.value;
    const mask = visibilityMask.value;
    
    const path = Skia.Path.Make();
    
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) {
        const region = regions[i];
        if (region && region.vertices) {
          const mPath = Skia.Path.MakeFromSVGString(region.vertices);
          if (mPath) {
             path.addPath(mPath);
          }
        }
      }
    }
    return path;
  });

  return (
    <>
      <Path path={fogPath} color="rgba(0, 0, 0, 0.6)" />
      <Path path={blackPath} color="rgb(0, 0, 0)" />
    </>
  );
}
