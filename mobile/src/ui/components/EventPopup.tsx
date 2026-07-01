import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated } from 'react-native';
import { useGameState } from '../GameProvider';

export default function EventPopup() {
  const { gameState } = useGameState();
  const [queue, setQueue] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  // Efeito para detectar novos eventos
  useEffect(() => {
    if (!gameState) return;
    
    // Os eventos mais recentes costumam estar no fim do array
    const recentEvents = gameState.events.slice(-5); 
    
    const newEvents = recentEvents.filter(e => !dismissedIds.has(e.id) && !queue.find(q => q.id === e.id));
    
    if (newEvents.length > 0) {
      setQueue(prev => [...prev, ...newEvents]);
    }
  }, [gameState?.events]);

  if (queue.length === 0) return null;

  const currentEvent = queue[0];

  const handleDismiss = () => {
    setDismissedIds(prev => new Set(prev).add(currentEvent.id));
    setQueue(prev => prev.slice(1));
  };

  const getBorderColor = () => {
    switch (currentEvent.severity) {
      case 'critical': return '#8B0000'; // Red
      case 'warning': return '#E6A817'; // Orange-gold
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
            <Text style={styles.queueText}>+ {queue.length - 1} aviso(s) pendente(s)</Text>
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
  }
});
