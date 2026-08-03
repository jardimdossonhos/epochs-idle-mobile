import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import { useGameState } from '../GameProvider';
import { useUIStore } from '../store/game-store';

export default function AscensionModal() {
  const { session } = useGameState();
  const isEligible = useUIStore(s => s.playerAscensionEligible);
  const isPostponed = useUIStore(s => s.playerAscensionPostponed);
  const hasAscended = useUIStore(s => s.playerHasAscended);

  const visible = isEligible && !isPostponed && !hasAscended;

  useEffect(() => {
    if (visible && session) {
      // Pausa automaticamente para o soberano vivenciar o momento histórico fora do ciclo de renderização síncrono
      const timer = setTimeout(() => {
        try {
          session.setPaused(true);
        } catch (_) {}
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, session]);

  if (!visible) return null;

  const handleAscend = () => {
    if (session) {
      try {
        session.ascendPlayerKingdom();
        // Despausa fora do ciclo síncrono de fechamento do Modal para não
        // colidir com o _updateCellsToRender da FlatList no React Native Fabric.
        setTimeout(() => { try { session.setPaused(false); } catch (_) {} }, 0);
      } catch (_) {}
    }
  };

  const handlePostpone = () => {
    if (session) {
      try {
        session.postponePlayerAscension();
        // Mesma proteção assíncrona aplicada ao Adiar.
        setTimeout(() => { try { session.setPaused(false); } catch (_) {} }, 0);
      } catch (_) {}
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>👑 CERIMÔNIA DA ASCENSÃO</Text>
          </View>

          <Text style={styles.title}>A Grande Inflexão da Nossa História</Text>
          
          <Text style={styles.description}>
            Nosso povo multiplicou-se e os conselhos da fogueira já não bastam para governar uma nação de mais de 1.000 almas a partir do segundo ano de nossa era. Nossos anciãos propõem codificar leis, instituir tributos regulados e fundar uma chancelaria central.
          </Text>

          <Text style={styles.questionText}>
            Devemos formalizar nosso Estado ou preservar o modo de vida tribal?
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.ascendButton} onPress={handleAscend}>
              <Text style={styles.ascendButtonText}>👑 Fundar o Estado (Era Estatal)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.postponeButton} onPress={handlePostpone}>
              <Text style={styles.postponeButtonText}>⛺ Permanecer uma Tribo Livre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#121212',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 16,
  },
  headerBadgeText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    color: '#E0E0E0',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  questionText: {
    color: '#D4AF37',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  ascendButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  ascendButtonText: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '900',
  },
  postponeButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  postponeButtonText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
});
