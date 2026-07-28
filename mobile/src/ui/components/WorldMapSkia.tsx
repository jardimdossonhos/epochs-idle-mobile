import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Skia } from '@shopify/react-native-skia';
import { useSharedValue, runOnUI, useFrameCallback } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useGameState } from '../GameProvider';
import { MapBridge } from '../store/MapBridge';

const MAX_REGIONS = 2000;
const ATTRIBUTES_PER_REGION = 2; // ColorDecimal, Alpha
const CHUNK_SIZE = 500; // Pixels per chunk

// 1. Instanciação do Hexágono Mestre
const HEX_RADIUS = 20;
const masterHexagon = Skia.Path.Make();
for (let i = 0; i < 6; i++) {
  const angle_deg = 60 * i - 30;
  const angle_rad = Math.PI / 180 * angle_deg;
  const hx = HEX_RADIUS * Math.cos(angle_rad);
  const hy = HEX_RADIUS * Math.sin(angle_rad);
  if (i === 0) masterHexagon.moveTo(hx, hy);
  else masterHexagon.lineTo(hx, hy);
}
masterHexagon.close();

// 2. Lógica de Chunking Pura e Limites (Spatial Hash Grid)
function buildSpatialHashGrid(definitions: Record<string, any>) {
  const chunks = new Map<string, number[]>();
  const orderedIds = Object.keys(definitions).sort();
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  orderedIds.forEach((regionId, index) => {
    const center = definitions[regionId].center;
    if (!center) return;
    
    if (center.x < minX) minX = center.x;
    if (center.x > maxX) maxX = center.x;
    if (center.y < minY) minY = center.y;
    if (center.y > maxY) maxY = center.y;

    const chunkCol = Math.floor(center.x / CHUNK_SIZE);
    const chunkRow = Math.floor(center.y / CHUNK_SIZE);
    const chunkKey = `${chunkCol},${chunkRow}`;
    
    if (!chunks.has(chunkKey)) {
      chunks.set(chunkKey, []);
    }
    chunks.get(chunkKey)!.push(index);
  });
  
  // Margem adicional de 100px
  const mapWidth = (maxX - minX) + 100;
  const mapHeight = (maxY - minY) + 100;
  
  return { chunks, orderedIds, mapWidth, mapHeight };
}

// Utilitário Bitwise O(1) para cores
function hexStringToDecimal(hex: string): number {
  if (hex.startsWith('#')) hex = hex.substring(1);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return parseInt(hex, 16);
}

export default function WorldMapSkia() {
  const { session, staticWorldData, gameState } = useGameState();
  
  const mapBuffer = useSharedValue(new Float32Array(MAX_REGIONS * ATTRIBUTES_PER_REGION));
  
  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const cameraScale = useSharedValue(0.5); // Zoom out inicial
  const renderTick = useSharedValue(0);
  
  // Offsets de gesto (salvam o último estado)
  const savedCameraX = useSharedValue(0);
  const savedCameraY = useSharedValue(0);
  const savedCameraScale = useSharedValue(0.5);

  const positionsBuffer = useSharedValue(new Float32Array(MAX_REGIONS * 2));
  const chunksBufferData = useSharedValue<Record<string, number[]>>({});

  const { chunks, orderedIds, mapWidth, mapHeight } = useMemo(() => {
    if (!staticWorldData?.definitions) return { chunks: new Map(), orderedIds: [], mapWidth: 2000, mapHeight: 2000 };
    return buildSpatialHashGrid(staticWorldData.definitions);
  }, [staticWorldData]);

  const mapW = useSharedValue(mapWidth);
  const mapH = useSharedValue(mapHeight);

  // Setup de Inicialização
  useEffect(() => {
    if (orderedIds.length === 0 || !gameState) return;
    
    const tempPos = new Float32Array(MAX_REGIONS * 2);
    const initBuffer = new Float32Array(MAX_REGIONS * ATTRIBUTES_PER_REGION);

    orderedIds.forEach((id, index) => {
      const center = staticWorldData.definitions[id].center;
      if (center) {
        tempPos[index * 2] = center.x;
        tempPos[index * 2 + 1] = center.y;
      }

      // Injeção do Buffer Inicial baseada no ECS (Cores dos reinos)
      const region = gameState.world.regions[id];
      if (region) {
        const ownerId = region.ownerId;
        const kingdom = gameState.kingdoms[ownerId];
        if (kingdom) {
          const colorDecimal = hexStringToDecimal(kingdom.color || '#555555');
          initBuffer[index * ATTRIBUTES_PER_REGION] = colorDecimal;
          initBuffer[index * ATTRIBUTES_PER_REGION + 1] = 1.0; // Alpha
        }
      }
    });
    positionsBuffer.value = tempPos;
    mapBuffer.value = initBuffer;
    
    const plainChunks: Record<string, number[]> = {};
    for (const [key, val] of chunks.entries()) {
      plainChunks[key] = val;
    }
    chunksBufferData.value = plainChunks;
  }, [chunks, orderedIds, staticWorldData, gameState]);

  // Clamping de Câmera (Evita scroll para o infinito)
  const clampCamera = () => {
    'worklet';
    // max/min X dependem do tamanho real da view, mas vamos usar um clamp absoluto seguro
    // assumindo uma tela aprox de 400x800
    const currentScale = cameraScale.value;
    const maxTx = 100;
    const minTx = -(mapW.value * currentScale) + 100;
    const maxTy = 100;
    const minTy = -(mapH.value * currentScale) + 100;

    if (cameraX.value > maxTx) cameraX.value = maxTx;
    if (cameraX.value < minTx) cameraX.value = minTx;
    if (cameraY.value > maxTy) cameraY.value = maxTy;
    if (cameraY.value < minTy) cameraY.value = minTy;
  };

  // Gestos (Pan)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      cameraX.value = savedCameraX.value + e.translationX;
      cameraY.value = savedCameraY.value + e.translationY;
      clampCamera();
    })
    .onEnd((e) => {
      'worklet';
      savedCameraX.value = cameraX.value;
      savedCameraY.value = cameraY.value;
    });

  // Gestos (Pinch / Zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      let newScale = savedCameraScale.value * e.scale;
      // Limites Matemáticos do Zoom
      if (newScale < 0.2) newScale = 0.2; // minScale
      if (newScale > 3.0) newScale = 3.0; // maxScale
      cameraScale.value = newScale;
      clampCamera();
    })
    .onEnd(() => {
      'worklet';
      savedCameraScale.value = cameraScale.value;
    });

  const composedGestures = Gesture.Simultaneous(panGesture, pinchGesture);

  const skiaRef = useRef<any>(null);

  useFrameCallback(() => {
    if (skiaRef.current) {
      skiaRef.current.redraw();
    }
  });

  const onDraw = (canvas: any, info: any) => {
    const _tick = renderTick.value; // Força a dependência
    'worklet';
    const { width, height } = info;
    const cx = cameraX.value;
    const cy = cameraY.value;
    const scale = cameraScale.value;
    
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('#0D1117'));
    canvas.drawRect({ x: 0, y: 0, width, height }, paint);

    canvas.save();
    canvas.translate(cx, cy);
    canvas.scale(scale);
    
    const invScale = 1 / scale;
    const viewLeft = -cx * invScale;
    const viewTop = -cy * invScale;
    const viewRight = viewLeft + width * invScale;
    const viewBottom = viewTop + height * invScale;

    const startCol = Math.floor(viewLeft / CHUNK_SIZE);
    const endCol = Math.floor(viewRight / CHUNK_SIZE);
    const startRow = Math.floor(viewTop / CHUNK_SIZE);
    const endRow = Math.floor(viewBottom / CHUNK_SIZE);

    const activeChunks = chunksBufferData.value;
    const posBuf = positionsBuffer.value;
    const colorBuf = mapBuffer.value;

    const hexPaint = Skia.Paint();
    hexPaint.setStyle(0);
    
    const strokePaint = Skia.Paint();
    strokePaint.setStyle(1);
    strokePaint.setColor(Skia.Color('#FFFFFF'));
    strokePaint.setAlphaf(0.15);
    strokePaint.setStrokeWidth(1);

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const chunkKey = col + ',' + row;
        const indices = activeChunks[chunkKey];
        if (!indices) continue;

        for (let i = 0; i < indices.length; i++) {
          const regionIndex = indices[i];
          const px = posBuf[regionIndex * 2];
          const py = posBuf[regionIndex * 2 + 1];
          
          const colorDecimal = colorBuf[regionIndex * ATTRIBUTES_PER_REGION];
          const alpha = colorBuf[regionIndex * ATTRIBUTES_PER_REGION + 1] || 1.0;
          
          canvas.save();
          canvas.translate(px, py);
          
          if (colorDecimal !== 0) {
            // O Skia.Color assume UInt32, no RN Skia podemos setar a cor opaca somando com o alpha channel bitwise se preciso, 
            // mas usando setAlphaf independe do canal alpha da cor base.
            // Como passamos 0xFFFFFF (24 bits) garantimos que o Alpha bit na cor original est limpo,
            // a menos que Color() exija opacidade implicita (0xFF000000).
            // No React Native Skia, numeros inteiros so tratados como AARRGGBB. Ento #RRGGBB = 0x00RRGGBB (Transparente!)
            // Precisamos adicionar o canal alpha opaco (0xFF000000) no inteiro.
            const alphaInt = Math.round(alpha * 255); hexPaint.setColor((((alphaInt << 24) | colorDecimal) >>> 0) as any);
            
            canvas.drawPath(masterHexagon, hexPaint);
          }
          
          canvas.drawPath(masterHexagon, strokePaint);
          canvas.restore();
        }
      }
    }
    canvas.restore();
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGestures}>
        <View style={StyleSheet.absoluteFill}>
          {/* @ts-ignore */}
          <Canvas ref={skiaRef} style={styles.canvas} onDraw={onDraw} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  canvas: { flex: 1 }
});

