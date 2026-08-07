import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import { useGameState } from '../GameProvider';
import { useUIStore } from '../store/game-store';

// ---------------------------------------------------------------------------
// Tipos de evento que NUNCA devem aparecer como popup bloqueante,
// independente do reino (sempre apenas no feed).
// ---------------------------------------------------------------------------
const FEED_ONLY_TYPES = new Set([
  'technology.completed',        // pesquisa concluída — qualquer reino
  'npc.decision',                // movimentos de NPC
  'religion.mission_started',    // início de missão religiosa
  'religion.conversion_progress',// progresso de conversão
  'economy.food_shortage',       // escassez de alimentos rotineira
  'population.unrest_warning',   // aviso de agitação rotineiro
  'war.escalated',               // escalada de guerra (agrupada no feed)
  'war.region_captured',         // captura de região (agrupada no feed)
]);

export default function EventPopup() {
  const { gameState, playerKingdomId } = useGameState();
  const speedMultiplier = useUIStore(s => s.speedMultiplier);
  const [queue, setQueue] = useState<any[]>([]);
  const dismissedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!gameState) return;

    // Regra 1: Silenciador de velocidade.
    // Qualquer velocidade acima de 1x → sem popups. Tudo vai pro feed.
    if (speedMultiplier > 1) {
      if (queue.length > 0) setQueue([]);
      return;
    }

    // Regra 2: Apenas eventos CRÍTICOS ou WARNINGS do próprio reino do jogador
    // devem gerar popup. Eventos 'info' e eventos de outros reinos vão só pro feed.
    const MAX_BURST = 2;
    const recentEvents = gameState.events.slice(-15);

    const newEvents = recentEvents.filter(e => {
      if (dismissedIds.current.has(e.id)) return false;

      // Bloqueia tipos que são inerentemente "feed-only"
      if (FEED_ONLY_TYPES.has((e as any).type)) return false;

      // Bloqueia eventos de outros reinos (NPCs), a menos que o jogador seja o alvo
      const isPlayerActor = (e as any).actorKingdomId === playerKingdomId;
      const isPlayerTarget = (e as any).targetKingdomId === playerKingdomId || (e as any).payload?.previousOwnerId === playerKingdomId;
      if ((e as any).actorKingdomId && !isPlayerActor && !isPlayerTarget) return false;

      // Bloqueia severity 'info' — no  urgente o suficiente para interromper o jogador
      if ((e as any).severity === 'info') return false;

      // Passa: warning, critical ou success do prprio reino do jogador
      return (e as any).severity === 'warning' || (e as any).severity === 'critical' || (e as any).severity === 'success';
    }).slice(0, MAX_BURST);

    if (newEvents.length > 0) {
      setQueue(prev => {
        const existingIds = new Set(prev.map((q: any) => q.id));
        const truly_new = newEvents.filter(e => !existingIds.has(e.id));
        return truly_new.length > 0 ? [...prev, ...truly_new] : prev;
      });
    }
  }, [gameState?.events?.[0]?.id || '', speedMultiplier, playerKingdomId]);


  if (queue.length === 0) return null;

  const currentEvent = queue[0];


  const handleDismiss = () => {
    dismissedIds.current.add(currentEvent.id);
    setQueue(prev => prev.slice(1));
  };

  const handleDismissAll = () => {
    queue.forEach((q: any) => dismissedIds.current.add(q.id));
    setQueue([]);
  };

  const getBorderColor = () => {
    switch (currentEvent.severity) {
      case 'critical': return '#8B0000'; // Red
      case 'warning': return '#E6A817'; // Orange-gold
      case 'success': return '#2E8B57'; // Forest Green for Victory
      default: return '#D4AF37'; // Majestic Gold (default instead of cyan)
    }
  };

  return (
    <Modal transparent animationType="fade" visible={queue.length > 0}>
      <View style={styles.overlay}>
        <View style={[styles.popupBox, { borderColor: getBorderColor() }]}>
          <Text style={[styles.title, { color: getBorderColor() }]}>{currentEvent.title}</Text>
          <Text style={styles.details}>{currentEvent.details}</Text>
          
          <TouchableOpacity style={[styles.button, { backgroundColor: getBorderColor() }]} onPress={handleDismiss}>
            <Text style={styles.buttonText}>Compreendido</Text>
          </TouchableOpacity>

          {queue.length > 1 && (
            <>
              <Text style={styles.queueText}>+ {queue.length - 1} aviso(s) pendente(s)</Text>
              <TouchableOpacity style={styles.dismissAllButton} onPress={handleDismissAll}>
                <Text style={styles.dismissAllText}>Dispensar Todos (X)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  popupBox: {
    backgroundColor: '#1A1A1A',
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  details: {
    color: '#E0E0E0',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  queueText: {
    color: '#888',
    marginTop: 12,
    fontSize: 12,
    fontStyle: 'italic',
  },
  dismissAllButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  dismissAllText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});
