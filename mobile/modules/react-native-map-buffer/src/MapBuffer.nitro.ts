import { type HybridObject } from 'react-native-nitro-modules';

export interface MapBuffer extends HybridObject<{ ios: 'c++', android: 'c++' }> {
  initialize(regionCount: number): void;
  getBufferA(): ArrayBuffer;
  getBufferB(): ArrayBuffer;
  getFrontIndex(): number;
  attemptSwap(): boolean;
  commitBackBuffer(): void;
}
