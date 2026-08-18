import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { PanGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { getRegionIndex } from '../../core/simulation/systems/utils';
import Svg, { G, Polygon, Circle, Path } from 'react-native-svg';
import { useGameState } from '../GameProvider';
import { DiplomaticRelation } from '../../core/models/enums';
import { RegionState } from '../../core/models/world';

// ─── Constantes do Grid Hexagonal ─────────────────────────────────────────────
const HEX_SIZE = 18;
const HEX_WIDTH = HEX_SIZE * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
const LOCAL_VIEW_RADIUS = 12 * HEX_SIZE; // Raio em pixels para a visão local (aprox 12 hexes)

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
  const idx = getRegionIndex(regionId);
  if (idx === -1) {
    const hash = regionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return { col: hash % 800, row: Math.floor(hash / 800) % 400 };
  }
  const col = idx % 800;
  const row = Math.floor(idx / 800);
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
  const { gameState: liveGameState, playerKingdomId, staticWorldData } = useGameState();
  const [viewMode, setViewMode] = useState<'local' | 'global'>('local');

  // Throttled Game State to prevent 15 FPS React Native SVG reconciliation (which causes ANRs)
  const [gameState, setGameState] = useState(liveGameState);
  const liveGameStateRef = React.useRef(liveGameState);
  liveGameStateRef.current = liveGameState;

  React.useEffect(() => {
    const interval = setInterval(() => {
      setGameState(liveGameStateRef.current);
    }, 1000); // 1 update per second is enough for the visual map
    return () => clearInterval(interval);
  }, []);

  // Static Grid Cache: Compute x,y,col,row only once
  const staticGrid = useMemo(() => {
    if (!staticWorldData) return [];
    return Object.keys(staticWorldData.definitions).map((regionId) => {
      const regionDef = staticWorldData.definitions[regionId];
      const { col, row } = parseRegionIndex(regionId);
      const { x, y } = hexToPixel(col, row);
      return { regionId, col, row, x, y, isWater: regionDef?.isWater ?? false, name: regionDef?.name ?? regionId };
    });
  }, [staticWorldData]);

  const { cellsToRender, svgWidth, svgHeight, offsetX, offsetY, globalScale } = useMemo(() => {
    if (!gameState || !staticWorldData || staticGrid.length === 0) {
      return { cellsToRender: [], svgWidth: 400, svgHeight: 300, offsetX: 0, offsetY: 0, globalScale: 1 };
    }

    const playerKingdom = gameState.kingdoms[playerKingdomId];
    const playerRelations = playerKingdom?.diplomacy?.relations ?? {};

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let playerXs: number[] = [];
    let playerYs: number[] = [];

    const allCells: HexCell[] = [];

    for (let i = 0; i < staticGrid.length; i++) {
      const base = staticGrid[i];
      const regionState: RegionState | undefined = gameState.world.regions[base.regionId];
      const ownerId = regionState?.ownerId ?? '';
      
      const isPlayer = ownerId === playerKingdomId;
      if (isPlayer) {
        playerXs.push(base.x);
        playerYs.push(base.y);
      }

      if (base.x < minX) minX = base.x;
      if (base.y < minY) minY = base.y;
      if (base.x > maxX) maxX = base.x;
      if (base.y > maxY) maxY = base.y;

      let fillColor = '#1A1E2E';
      let strokeColor = '#2A2E3E';

      // Estética Premium
      if (base.isWater) {
        fillColor = '#060B14'; // Oceano Profundo Abissal
        strokeColor = '#0A1322'; 
      } else if (isPlayer) {
        fillColor = '#1F1700'; // Dourado escuro de Fundo Imperial
        strokeColor = '#E5C05C'; // Bordas Reluzentes (Ouro Vivo)
      } else if (ownerId && ownerId !== 'unclaimed') {
        const relation = playerRelations[ownerId]?.status;
        switch (relation) {
          case DiplomaticRelation.Allied: 
            fillColor = '#0A2518'; strokeColor = '#2ECC71'; break;
          case DiplomaticRelation.Friendly: 
            fillColor = '#091E13'; strokeColor = '#27AE60'; break;
          case DiplomaticRelation.Hostile: 
            fillColor = '#2D0A0A'; strokeColor = '#E74C3C'; break;
          case DiplomaticRelation.Truce: 
            fillColor = '#2A1B0B'; strokeColor = '#E67E22'; break;
          default: 
            fillColor = '#171B26'; strokeColor = '#5D6D7E'; break; // Neutro Elegante (Aço)
        }
      } else {
        fillColor = '#10141D'; // Terras não descobertas / Vazias
        strokeColor = '#1F2636'; 
      }

      allCells.push({
        ...base,
        fillColor,
        strokeColor,
        isPlayer,
        ownerId
      });
    }

    const centerX = playerXs.length > 0 ? playerXs.reduce((a, b) => a + b, 0) / playerXs.length : (minX + maxX) / 2;
    const centerY = playerYs.length > 0 ? playerYs.reduce((a, b) => a + b, 0) / playerYs.length : (minY + maxY) / 2;

    if (viewMode === 'local') {
      const localCells = allCells.filter(cell => {
        const dx = cell.x - centerX;
        const dy = cell.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= LOCAL_VIEW_RADIUS;
      });
      // Um box menor (500x500) garante que fique perfeitamente visível na tela sem precisar de scroll maluco
      const w = 500;
      const h = 500;
      const ox = (w / 2) - centerX;
      const oy = (h / 2) - centerY;
      return { cellsToRender: localCells, svgWidth: w, svgHeight: h, offsetX: ox, offsetY: oy, globalScale: 1 };
    } else {
      // Global View
      // Renderiza todas as terras (mesmo unclaimed) para não ficar vazio, mas agrupará em Paths para não travar
      const globalCells = allCells.filter(cell => !cell.isWater);
      const rawWidth = Math.max(1, maxX - minX + HEX_WIDTH * 2);
      const rawHeight = Math.max(1, maxY - minY + HEX_HEIGHT * 2);
      
      const scale = Math.min(1000 / rawWidth, 1000 / rawHeight, 1);
      const w = Math.round(rawWidth * scale);
      const h = Math.round(rawHeight * scale);
      
      const ox = -minX + HEX_WIDTH;
      const oy = -minY + HEX_HEIGHT;
      
      return { cellsToRender: globalCells, svgWidth: w, svgHeight: h, offsetX: ox, offsetY: oy, globalScale: scale };
    }
  }, [gameState, playerKingdomId, staticWorldData, viewMode, staticGrid]);

  const handleHexPress = useCallback((regionId: string) => {
    onRegionPress(regionId);
  }, [onRegionPress]);

  if (!gameState || cellsToRender.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🗺️ Gerando mapa...</Text>
      </View>
    );
  }

  // Agrupa celulas do modo global por cor para renderizar como um único Path super leve
  const globalPaths = useMemo(() => {
    if (viewMode !== 'global') return [];
    const groups: Record<string, string> = {}; // fillColor -> path d
    const r = (HEX_SIZE - 1) * globalScale;
    
    for (let i = 0; i < cellsToRender.length; i++) {
      const cell = cellsToRender[i];
      const cx = (cell.x + offsetX) * globalScale;
      const cy = (cell.y + offsetY) * globalScale;
      // Desenha um losango/quadrado simples para performance máxima
      const rect = `M ${cx-r} ${cy} L ${cx} ${cy-r} L ${cx+r} ${cy} L ${cx} ${cy+r} Z `;
      
      if (!groups[cell.fillColor]) {
        groups[cell.fillColor] = rect;
      } else {
        groups[cell.fillColor] += rect;
      }
    }
    
    return Object.keys(groups).map(color => ({ color, path: groups[color] }));
  }, [cellsToRender, viewMode, offsetX, offsetY, globalScale]);

  return (
    <View style={styles.container}>
      {/* ── Toggle de Visão ── */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === 'local' && styles.toggleBtnActive]}
          onPress={() => setViewMode('local')}
        >
          <Text style={[styles.toggleText, viewMode === 'local' && styles.toggleTextActive]}>Reino & Arredores</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === 'global' && styles.toggleBtnActive]}
          onPress={() => setViewMode('global')}
        >
          <Text style={[styles.toggleText, viewMode === 'global' && styles.toggleTextActive]}>Mundo Global</Text>
        </TouchableOpacity>
      </View>

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
              {viewMode === 'local' ? (
                cellsToRender.map((cell) => {
                  const cx = (cell.x + offsetX) * globalScale;
                  const cy = (cell.y + offsetY) * globalScale;
                  const isSelected = selectedRegionId === cell.regionId;
                  const hexSize = HEX_SIZE - 1.5;
                  const points = getHexPoints(cx, cy, hexSize);

                  return (
                    <G key={cell.regionId} onPress={() => handleHexPress(cell.regionId)}>
                      {/* Glow Exterior para regiões do jogador */}
                      {cell.isPlayer && (
                        <Polygon points={getHexPoints(cx, cy, HEX_SIZE + 2)} fill="none" stroke="#E5C05C" strokeWidth={3} strokeOpacity={0.15} />
                      )}
                      
                      {/* Borda da seleção pulsante/dourada */}
                      {isSelected && (
                        <Polygon points={getHexPoints(cx, cy, HEX_SIZE + 3)} fill="none" stroke="#FFF7D6" strokeWidth={3} strokeOpacity={0.9} />
                      )}
                      
                      {/* Preenchimento Principal */}
                      <Polygon
                        points={points}
                        fill={isSelected ? '#4A3B10' : cell.fillColor}
                        stroke={isSelected ? '#FFF7D6' : cell.strokeColor}
                        strokeWidth={cell.isPlayer || isSelected ? 1.5 : 0.8}
                        fillOpacity={cell.isWater ? 0.7 : 1}
                      />
                      
                      {/* Centro / Ponto vital */}
                      {cell.isPlayer && !cell.isWater && (
                        <Circle cx={cx} cy={cy} r={3} fill="#F9E076" fillOpacity={0.9} />
                      )}
                    </G>
                  );
                })
              ) : (
                // GLOBAL MODE: Renderiza os Paths super rápidos agrupados por cor, SEM interatividade no global
                globalPaths.map((group) => (
                  <Path key={group.color} d={group.path} fill={group.color} stroke="none" />
                ))
              )}
            </G>
          </Svg>
        </ScrollView>
      </ScrollView>

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
    backgroundColor: '#05070A', // Fundo bem escuro para o modo global (oceano abstrato)
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    padding: 8,
    justifyContent: 'center',
    gap: 10,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1A1A1A',
  },
  toggleBtnActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#2E2000',
  },
  toggleText: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#D4AF37',
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
