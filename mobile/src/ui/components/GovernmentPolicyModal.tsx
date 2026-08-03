import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  GovernmentTypeDefinition,
  getUnlockedGovernments,
  GOVERNMENT_REGISTRY,
} from '../../core/data/government-types';
import { useGameState } from '../GameProvider';
import { useUIStore } from '../store/game-store';

interface GovernmentPolicyModalProps {
  visible: boolean;
  onClose: () => void;
  currentGovernmentId: string;
}

export default function GovernmentPolicyModal({
  visible,
  onClose,
  currentGovernmentId,
}: GovernmentPolicyModalProps) {
  const { gameState, session, playerKingdomId } = useGameState();

  if (!gameState || !session) return null;
  const kingdom = gameState.kingdoms[playerKingdomId];
  if (!kingdom) return null;

  const currentYear = Math.floor((gameState.meta?.tick ?? 0) / 12) + 1;
  const currentLegitimacy = useUIStore(s => s.playerLegitimacy);
  const currentGold = useUIStore(s => s.playerGold);

  // --- Secao 1: Arquivo Historico (governos que JA foram ativo) ---
  // Fallback Retroativo (Abordagem A): Garante que o regime tribal original ('band')
  // esteja na lista do histórico caso o reino já tenha ascendido ou seja de Era Estatal,
  // permitindo ver e readotar o regime anterior mesmo em saves que transicionaram antes da correção.
  const rawUnlocked: string[] = kingdom.unlockedGovernmentIds ?? [];
  const isStateEra = kingdom.hasAscended || currentGovernmentId === 'monarchy' || currentGovernmentId === 'republic' || currentGovernmentId === 'empire';
  const historicIds: string[] = Array.from(new Set([
    ...rawUnlocked,
    ...(isStateEra ? ['band'] : []),
  ]));
  const historicGovs: GovernmentTypeDefinition[] = historicIds
    .filter(id => id !== currentGovernmentId)
    .map(id => GOVERNMENT_REGISTRY[id])
    .filter(Boolean);

  // --- Secao 2: Disponiveis - desbloqueados mas NUNCA adotados ---
  const availableIds: string[] = kingdom.availableGovernmentIds ?? [];
  const availableGovs: GovernmentTypeDefinition[] = availableIds
    .filter(id => id !== currentGovernmentId && !historicIds.includes(id))
    .map(id => GOVERNMENT_REGISTRY[id])
    .filter(Boolean);

  // --- Secao 3: Novos Regimes (prerequisitos atendidos, nao estao nas outras listas) ---
  const allUnlocked = getUnlockedGovernments(kingdom, currentYear);
  const newGovs = allUnlocked.filter(
    def => def.id !== currentGovernmentId && !historicIds.includes(def.id) && !availableIds.includes(def.id)
  );

  const handleAdopt = (def: GovernmentTypeDefinition, isReadoption: boolean) => {
    const cost = def.legitimacyCost ?? 0;
    const costStr = isReadoption
      ? `Custo: ${cost} Legitimidade`
      : `Custo: ${def.transitionCost.gold} Ouro + ${cost} Legitimidade`;

    Alert.alert(
      isReadoption ? 'Restaurar Regime' : 'Reforma Civica',
      `Deseja adotar "${def.name}"?\n${costStr}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            const res = (session as any).setGovernmentSystem(def.id);
            if (!res.ok) {
              Alert.alert('Reforma Civica', res.message);
            } else {
              Alert.alert('Mesa de Politicas', res.message);
              onClose();
            }
          },
        },
      ]
    );
  };


  const renderModifiers = (def: GovernmentTypeDefinition) => {
    const mods = def.modifiers;
    const items: { label: string; value: string; isPositive: boolean }[] = [];

    if (mods.incomeMultiplier !== 1.0) {
      const pct = Math.round((mods.incomeMultiplier - 1) * 100);
      items.push({ label: 'Arrecadacao de Ouro', value: `${pct > 0 ? '+' : ''}${pct}%`, isPositive: pct > 0 });
    }
    if (mods.researchSpeedMultiplier !== 1.0) {
      const pct = Math.round((mods.researchSpeedMultiplier - 1) * 100);
      items.push({ label: 'Velocidade de Pesquisa', value: `${pct > 0 ? '+' : ''}${pct}%`, isPositive: pct > 0 });
    }
    if (mods.populationGrowthMultiplier !== 1.0) {
      const pct = Math.round((mods.populationGrowthMultiplier - 1) * 100);
      items.push({ label: 'Crescimento Populacional', value: `${pct > 0 ? '+' : ''}${pct}%`, isPositive: pct > 0 });
    }
    if (mods.stabilityBonus !== 0) {
      items.push({ label: 'Estabilidade Base', value: `${mods.stabilityBonus > 0 ? '+' : ''}${mods.stabilityBonus}`, isPositive: mods.stabilityBonus > 0 });
    }
    if (mods.legitimacyBonus !== 0) {
      items.push({ label: 'Legitimidade / Mes', value: `${mods.legitimacyBonus > 0 ? '+' : ''}${mods.legitimacyBonus}`, isPositive: mods.legitimacyBonus > 0 });
    }
    if (mods.adminCapacityBonus !== 0) {
      items.push({ label: 'Capacidade Administrativa', value: `${mods.adminCapacityBonus > 0 ? '+' : ''}${mods.adminCapacityBonus}`, isPositive: mods.adminCapacityBonus > 0 });
    }

    if (items.length === 0) return null;

    return (
      <View style={styles.modifiersBox}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.modifierRow}>
            <Text style={[styles.modifierIcon, { color: item.isPositive ? '#50E3C2' : '#E24A4A' }]}>
              {item.isPositive ? 'A' : 'V'}
            </Text>
            <Text style={styles.modifierLabel}>{item.label}: </Text>
            <Text style={[styles.modifierValue, { color: item.isPositive ? '#50E3C2' : '#E24A4A' }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCard = (def: GovernmentTypeDefinition, isReadoption: boolean) => {
    const isCurrent = def.id === currentGovernmentId;
    const eraLabel = def.era === 'state' ? 'ERA ESTATAL' : 'ERA TRIBAL';
    const legitimacyCost = def.legitimacyCost ?? 0;
    const canAffordLegitimacy = currentLegitimacy >= legitimacyCost;
    const canAffordGold = isReadoption || currentGold >= def.transitionCost.gold;
    const canAdopt = canAffordLegitimacy && canAffordGold;

    return (
      <View
        key={def.id}
        style={[styles.card, isCurrent && styles.cardActive, isReadoption && styles.cardHistoric]}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{def.name}</Text>
          <View style={[styles.eraBadge, def.era === 'state' && styles.eraBadgeState]}>
            <Text style={styles.eraText}>{eraLabel}</Text>
          </View>
        </View>

        <Text style={styles.cardDescription}>{def.description}</Text>

        {renderModifiers(def)}

        <View style={styles.costRow}>
          {isReadoption ? (
            <Text style={[styles.costText, !canAffordLegitimacy && styles.costInsufficient]}>
              Legitimidade: {legitimacyCost}
              {!canAffordLegitimacy ? ` (faltam ${Math.ceil(legitimacyCost - currentLegitimacy)})` : ''}
            </Text>
          ) : (
            <View style={styles.costRowInner}>
              {def.transitionCost.gold > 0 && (
                <Text style={[styles.costText, !canAffordGold && styles.costInsufficient]}>
                  {`Ouro: ${def.transitionCost.gold}  `}
                </Text>
              )}
              {legitimacyCost > 0 && (
                <Text style={[styles.costText, !canAffordLegitimacy && styles.costInsufficient]}>
                  {`Legitimidade: ${legitimacyCost}`}
                </Text>
              )}
              {def.transitionCost.gold === 0 && legitimacyCost === 0 && (
                <Text style={styles.costTextFree}>Sem custo</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.cardAction}>
          {isCurrent ? (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>REGIME ATIVO</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.adoptBtn,
                isReadoption && styles.adoptBtnRestore,
                !canAdopt && styles.adoptBtnDisabled,
              ]}
              onPress={() => handleAdopt(def, isReadoption)}
              disabled={!canAdopt}
            >
              <Text style={[styles.adoptBtnText, isReadoption && styles.adoptBtnTextRestore, !canAdopt && styles.adoptBtnTextDisabled]}>
                {isReadoption ? 'RESTAURAR REGIME' : 'ADOTAR REGIME'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>MESA DE POLITICAS</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legitimacyBar}>
            <Text style={styles.legitimacyLabel}>Legitimidade atual:</Text>
            <Text style={styles.legitimacyValue}>{Math.floor(currentLegitimacy)}</Text>
          </View>

          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>

            {GOVERNMENT_REGISTRY[currentGovernmentId] && (
              <>
                <Text style={styles.sectionTitle}>REGIME ATIVO</Text>
                {renderCard(GOVERNMENT_REGISTRY[currentGovernmentId], false)}
              </>
            )}

            {historicGovs.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>ARQUIVO HISTORICO</Text>
                <Text style={styles.sectionSubtitle}>Regimes ja adotados � restauracao por Legitimidade</Text>
                {historicGovs.map(def => renderCard(def, true))}
              </>
            )}

            {availableGovs.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>DISPONIVEL PARA ADOCAO</Text>
                <Text style={styles.sectionSubtitle}>Desbloqueado - primeira adocao com Ouro + Legitimidade</Text>
                {availableGovs.map(def => renderCard(def, false))}
              </>
            )}

            {newGovs.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>NOVOS REGIMES DISPONIVEIS</Text>
                <Text style={styles.sectionSubtitle}>Pre-requisitos atendidos � reforma com Ouro + Legitimidade</Text>
                {newGovs.map(def => renderCard(def, false))}
              </>
            )}

            {historicGovs.length === 0 && availableGovs.length === 0 && newGovs.length === 0 && (
              <Text style={styles.emptyText}>Nenhum outro regime disponivel no momento.</Text>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '88%',
    minHeight: 450,
    flexShrink: 1,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    backgroundColor: '#1A1A1A',
  },
  headerTitle: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeBtn: { padding: 6 },
  closeBtnText: { color: '#888', fontSize: 20, fontWeight: 'bold' },
  legitimacyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    gap: 8,
  },
  legitimacyLabel: { color: '#AAA', fontSize: 13 },
  legitimacyValue: { color: '#D4AF37', fontSize: 15, fontWeight: 'bold' },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#666',
    fontSize: 11,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  listContainer: {
    flexGrow: 1,
    flexShrink: 1,
  },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    padding: 16,
  },
  cardActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#221E14',
  },
  cardHistoric: {
    borderColor: '#4A3F6B',
    backgroundColor: '#1A1728',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  eraBadge: { backgroundColor: '#2D3748', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  eraBadgeState: { backgroundColor: '#744210' },
  eraText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  cardDescription: { color: '#AAA', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  modifiersBox: { backgroundColor: '#121212', borderRadius: 8, padding: 10, marginBottom: 10, gap: 4 },
  modifierRow: { flexDirection: 'row', alignItems: 'center' },
  modifierIcon: { fontSize: 12, marginRight: 6 },
  modifierLabel: { color: '#CCC', fontSize: 12, flex: 1 },
  modifierValue: { fontSize: 12, fontWeight: 'bold' },
  costRow: { marginBottom: 10 },
  costRowInner: { flexDirection: 'row', flexWrap: 'wrap' },
  costText: { color: '#BBB', fontSize: 12 },
  costInsufficient: { color: '#E24A4A' },
  costTextFree: { color: '#50E3C2', fontSize: 12, fontStyle: 'italic' },
  cardAction: { marginTop: 4 },
  currentBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentBadgeText: { color: '#D4AF37', fontWeight: 'bold', fontSize: 13 },
  adoptBtn: {
    backgroundColor: '#D4AF37',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  adoptBtnRestore: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7C5CBF',
  },
  adoptBtnDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
    opacity: 0.5,
  },
  adoptBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  adoptBtnTextRestore: { color: '#C0A8FF' },
  adoptBtnTextDisabled: { color: '#555' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 24, fontStyle: 'italic' },
});


