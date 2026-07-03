import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useGameState } from '../GameProvider';
import { SaveSlotId, SaveSummary } from '../../core/contracts/game-ports';
import { MobileSaveRepository } from '../../infrastructure/persistence/MobileGameStateRepository';
import { useLanguage } from '../context/LanguageContext';

interface LoadGameModalProps {
  visible: boolean;
  onClose: () => void;
  onLoadSuccess: () => void;
}

interface EnrichedSlot {
  slotId: SaveSlotId;
  summary: SaveSummary | null;
  culture: string;
}

export default function LoadGameModal({ visible, onClose, onLoadSuccess }: LoadGameModalProps) {
  const { session } = useGameState();
  const { t } = useLanguage();
  const [slots, setSlots] = useState<EnrichedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSlotsData = async () => {
    setLoading(true);
    try {
      const repo = new MobileSaveRepository();
      const enriched: EnrichedSlot[] = [];
      const knownSlots: SaveSlotId[] = ["auto-1", "manual-1", "manual-2", "manual-3"];
      
      for (const slotId of knownSlots) {
        let summary: SaveSummary | null = null;
        let culture = 'latin';
        try {
          const snapshot = await repo.loadFromSlot(slotId);
          if (snapshot) {
            summary = snapshot.summary;
            const gameState = snapshot.state;
            const playerKingdom = gameState?.kingdoms?.['k_player'];
            const rulerId = playerKingdom?.rulerId;
            const stateWorld = gameState?.world;
            if (rulerId && stateWorld?.characters?.[rulerId]) {
              culture = stateWorld.characters[rulerId].cultureId || 'latin';
            }
          }
        } catch (e) {
          console.error(`[LoadGameModal] Error loading slot ${slotId}`, e);
        }
        enriched.push({ slotId, summary, culture });
      }
      setSlots(enriched);
    } catch (e) {
      console.error('[LoadGameModal] Failed to list slots', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadSlotsData();
    }
  }, [visible]);

  const handleSelectSlot = async (slotId: SaveSlotId) => {
    if (!session) return;
    try {
      await session.loadSlot(slotId);
      session.start();
      onLoadSuccess();
    } catch (e) {
      console.error(`[LoadGameModal] Error loading slot ${slotId}`, e);
      Alert.alert(t('loadGame.errorTitle'), t('loadGame.errorMessage'));
    }
  };

  const renderSlotItem = ({ item }: { item: EnrichedSlot }) => {
    const { slotId, summary, culture } = item;

    if (!summary) {
      return (
        <View style={[styles.slotCard, styles.emptyCard]}>
          <View style={styles.slotHeader}>
            <Text style={styles.kingdomName}>
              {slotId === 'auto-1' ? t('loadGame.autoSave') : `${t('loadGame.emptySlot')} (${slotId.toUpperCase()})`}
            </Text>
            <Text style={styles.slotBadge}>{slotId.toUpperCase()}</Text>
          </View>
          <View style={styles.slotDetails}>
            <Text style={styles.detailText}>{t('loadGame.noCampaigns')}</Text>
          </View>
        </View>
      );
    }

    const dateStr = new Date(summary.savedAt).toLocaleDateString();
    const year = Math.floor(summary.tick / 12) + 1;
    const displayName = slotId === 'auto-1' ? t('loadGame.autoSave') : (summary.playerKingdomName || t('loadGame.kingdomOfOld'));

    return (
      <TouchableOpacity style={styles.slotCard} onPress={() => handleSelectSlot(slotId)}>
        <View style={styles.slotHeader}>
          <Text style={styles.kingdomName}>{displayName}</Text>
          <Text style={styles.slotBadge}>{slotId.toUpperCase()}</Text>
        </View>
        
        <View style={styles.slotDetails}>
          <Text style={styles.detailText}>👑 {t('loadGame.culture')}: <Text style={styles.highlight}>{culture.toUpperCase()}</Text></Text>
          <Text style={styles.detailText}>⏳ {t('loadGame.year')}: <Text style={styles.highlight}>{year}</Text> ({t('loadGame.tick')} {summary.tick})</Text>
          <Text style={styles.detailText}>📅 {t('loadGame.savedAt')}: {dateStr}</Text>
        </View>

        <View style={styles.loadButtonContainer}>
          <Text style={styles.loadButtonText}>{t('loadGame.resumeCampaign')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('loadGame.savedChronicles')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={styles.loadingText}>{t('loadGame.readingArchives')}</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>{t('loadGame.noCampaigns')}</Text>
            </View>
          ) : (
            <FlatList
              data={slots}
              keyExtractor={(item) => item.slotId}
              renderItem={renderSlotItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#1A1A1A',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#AAA',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
  listContent: {
    padding: 16,
  },
  slotCard: {
    backgroundColor: '#121212',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  emptyCard: {
    opacity: 0.65,
    borderStyle: 'dashed',
    borderColor: '#555',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kingdomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  slotBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D4AF37',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotDetails: {
    marginVertical: 4,
  },
  detailText: {
    color: '#AAA',
    fontSize: 13,
    marginBottom: 2,
  },
  highlight: {
    color: '#FFF',
    fontWeight: '600',
  },
  loadButtonContainer: {
    marginTop: 12,
    backgroundColor: '#2A2A2A',
    borderColor: '#D4AF37',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  loadButtonText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
