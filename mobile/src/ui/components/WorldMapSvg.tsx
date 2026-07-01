import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
} from 'react-native';
import Svg, { G, Polygon, Circle } from 'react-native-svg';
import { useGameState } from '../GameProvider';
import { DiplomaticRelation } from '../../core/models/enums';

// ─── Constantes do Grid Hexagonal ─────────────────────────────────────────────
const HEX_SIZE = 18;
const HEX_WIDTH = HEX_SIZE * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface HexCell {
  regionId: string;
  col: number;
  row: number;
  x: number;
  y: number;
  fillColor: string;
  strokeColor: string;
  isPlayer: boolean;
  isWater: boolean;
  ownerId: string;
  name: string;
}

interface WorldMapSvgProps {
  onRegionPress: (regionId: string) => void;
  selectedRegionId: string | null;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
function hexToPixel(col: number, row: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * col;
  const y = HEX_SIZE * ((Math.sqrt(3) / 2) * col + Math.sqrt(3) * row);
  return { x, y };
}

function getHexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return points.join(' ');
}

function parseRegionIndex(regionId: string): { col: number; row: number } {
  const numStr = regionId.replace('r_hex_', '').replace('r_', '');
  const idx = parseInt(numStr, 10);
  if (isNaN(idx)) {
    const hash = regionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return { col: hash % 80, row: Math.floor(hash / 80) % 60 };
  }
  const col = idx % 100;
  const row = Math.floor(idx / 100);
  return { col, row };
}

function getRelationColor(relation: string | undefined): string {
  switch (relation) {
    case DiplomaticRelation.Allied: return '#1A6B3A';
    case DiplomaticRelation.Friendly: return '#155E2F';
    case DiplomaticRelation.Neutral: return '#3D4450';
    case DiplomaticRelation.Hostile: return '#6B1A1A';
    case DiplomaticRelation.Truce: return '#6B4A1A';
    default: return '#252840';
  }
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function WorldMapSvg({ onRegionPress, selectedRegionId }: WorldMapSvgProps) {
  const { gameState, playerKingdomId, staticWorldData } = useGameState();

  const { cells, svgWidth, svgHeight, offsetX, offsetY } = useMemo<{
    cells: HexCell[];
    svgWidth: number;
    svgHeight: number;
    offsetX: number;
    offsetY: number;
  }>(() => {
    if (!gameState || !staticWorldData) {
      return { cells: [], svgWidth: 400, svgHeight: 300, offsetX: 0, offsetY: 0 };
    }

    const playerKingdom = gameState.kingdoms[playerKingdomId];
    const playerRelations = playerKingdom?.diplomacy?.relations ?? {};

    const regionIds = Object.keys(gameState.world.regions);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const builtCells: HexCell[] = regionIds.map((regionId) => {
      const regionState = gameState.world.regions[regionId];
      const regionDef = staticWorldData.definitions[regionId];
      const { col, row } = parseRegionIndex(regionId);
      const { x, y } = hexToPixel(col, row);

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      const isPlayer = regionState?.ownerId === playerKingdomId;
      const isWater = regionDef?.isWater ?? false;
      const ownerId = regionState?.ownerId ?? '';

      let fillColor = '#1A1E2E';
      let strokeColor = '#2A2E3E';

      if (isWater) {
        fillColor = '#080E1A';
        strokeColor = '#0D1A30';
      } else if (isPlayer) {
        fillColor = '#2E2000';
        strokeColor = '#D4AF37';
      } else if (ownerId && ownerId !== 'unclaimed' && ownerId !== '') {
        const relation = playerRelations[ownerId]?.status;
        fillColor = getRelationColor(relation);
        strokeColor = '#444466';
      } else {
        fillColor = '#151828';
        strokeColor = '#20243A';
      }

      return {
        regionId,
        col,
        row,
        x,
        y,
        fillColor,
        strokeColor,
        isPlayer,
        isWater,
        ownerId,
        name: regionDef?.name ?? regionId,
      };
    });

    const padding = HEX_SIZE * 3;
    const ox = -minX + padding;
    const oy = -minY + padding;
    const w = Math.max(400, maxX - minX + padding * 2 + HEX_WIDTH);
    const h = Math.max(300, maxY - minY + padding * 2 + HEX_HEIGHT);

    return {
      cells: builtCells,
      svgWidth: Math.round(w),
      svgHeight: Math.round(h),
      offsetX: ox,
      offsetY: oy,
    };
  }, [gameState, playerKingdomId, staticWorldData]);

  const handleHexPress = useCallback((regionId: string) => {
    onRegionPress(regionId);
  }, [onRegionPress]);

  if (!gameState || cells.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🗺️ Gerando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        style={styles.scrollOuter}
        contentContainerStyle={{ width: svgWidth }}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          style={{ width: svgWidth }}
          contentContainerStyle={{ height: svgHeight }}
          showsVerticalScrollIndicator={true}
        >
          <Svg width={svgWidth} height={svgHeight}>
            <G>
              {cells.map((cell) => {
                const cx = cell.x + offsetX;
                const cy = cell.y + offsetY;
                const isSelected = selectedRegionId === cell.regionId;
                const hexSize = HEX_SIZE - 1.5;
                const points = getHexPoints(cx, cy, hexSize);

                return (
                  <G key={cell.regionId} onPress={() => handleHexPress(cell.regionId)}>
                    {/* Glow para territórios do jogador */}
                    {cell.isPlayer && (
                      <Polygon
                        points={getHexPoints(cx, cy, HEX_SIZE + 1)}
                        fill="#D4AF37"
                        fillOpacity={0.12}
                        stroke="none"
                      />
                    )}
                    {/* Highlight para seleção */}
                    {isSelected && (
                      <Polygon
                        points={getHexPoints(cx, cy, HEX_SIZE + 2)}
                        fill="none"
                        stroke="#FFD700"
                        strokeWidth={2.5}
                        strokeOpacity={0.8}
                      />
                    )}
                    {/* Hexágono principal */}
                    <Polygon
                      points={points}
                      fill={isSelected ? '#3D2A00' : cell.fillColor}
                      stroke={isSelected ? '#FFD700' : cell.strokeColor}
                      strokeWidth={isSelected ? 1.5 : 0.7}
                      fillOpacity={cell.isWater ? 0.8 : 1}
                    />
                    {/* Marcador central para territórios do jogador */}
                    {cell.isPlayer && !cell.isWater && (
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={2.5}
                        fill="#D4AF37"
                        fillOpacity={0.95}
                      />
                    )}
                  </G>
                );
              })}
            </G>
          </Svg>
        </ScrollView>
      </ScrollView>

      {/* Legenda de cores */}
      <MapLegend />
    </View>
  );
}

// ─── Legenda ──────────────────────────────────────────────────────────────────
function MapLegend() {
  const items = [
    { color: '#D4AF37', stroke: '#D4AF37', label: 'Seus territórios' },
    { color: '#1A6B3A', stroke: '#444466', label: 'Aliados' },
    { color: '#6B1A1A', stroke: '#444466', label: 'Hostis' },
    { color: '#3D4450', stroke: '#444466', label: 'Neutros' },
    { color: '#151828', stroke: '#20243A', label: 'Terras livres' },
    { color: '#080E1A', stroke: '#0D1A30', label: 'Oceano' },
  ];

  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color, borderColor: item.stroke }]} />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  scrollOuter: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  loadingText: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0A0E15',
    borderTopWidth: 1,
    borderTopColor: '#1E2235',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 4,
    borderWidth: 1,
  },
  legendText: {
    color: '#808090',
    fontSize: 10,
  },
});
