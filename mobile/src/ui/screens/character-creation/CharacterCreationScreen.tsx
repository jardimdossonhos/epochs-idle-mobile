import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useGameState } from '../../GameProvider';
import CultureSelectStep from './steps/CultureSelectStep';
import StatPointBuyStep, { RulerStats } from './steps/StatPointBuyStep';
import TerritorySelectStep from './steps/TerritorySelectStep';
import AvatarAppearanceStep from './steps/AvatarAppearanceStep';
import { CultureId, Gender, generateCulturalName, generatePortraitSeed } from '../../../core/simulation/systems/culture-generator';
import { createInitialState } from '../../../application/boot/create-initial-state';
import { WORLD_DEFINITIONS_V1 } from '../../../application/boot/generated/world-definitions-v1';

interface CharacterCreationScreenProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export default function CharacterCreationScreen({ onComplete, onCancel }: CharacterCreationScreenProps) {
  const { session, staticWorldData } = useGameState();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Wizard state parameters
  const [cultureId, setCultureId] = useState<CultureId>('latin');
  const [gender, setGender] = useState<Gender>('male');
  const [rulerName, setRulerName] = useState<string>(() => generateCulturalName('latin', 'male'));
  const [kingdomName, setKingdomName] = useState<string>('First Kingdom');
  const [portraitSeed, setPortraitSeed] = useState<string>(() => generatePortraitSeed());
  const [selectedRegionId, setSelectedRegionId] = useState<string>('r_hex_10286');
  const [stats, setStats] = useState<RulerStats>({
    ADM: 3,
    MAR: 3,
    DIP: 3,
    INT: 3,
    LRN: 3,
  });

  const handleCultureChange = (newCulture: CultureId) => {
    setCultureId(newCulture);
    setRulerName(generateCulturalName(newCulture, gender));
  };

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as any);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as any);
    } else if (onCancel) {
      onCancel();
    }
  };

const CULTURE_STAT_BONUSES: Record<CultureId, Partial<RulerStats>> = {
  nordic: { MAR: 2, INT: 1 },
  latin: { ADM: 2, DIP: 1 },
  eastern: { LRN: 2, ADM: 1 },
  desert: { DIP: 2, LRN: 1 },
  celtic: { MAR: 2, LRN: 1 },
  slavic: { ADM: 2, MAR: 1 },
  savanna: { DIP: 2, ADM: 1 },
  indigenous: { INT: 2, MAR: 1 },
  vedic: { LRN: 2, DIP: 1 },
};

  const handleFinish = async () => {
    if (!session || !staticWorldData) return;

    try {
      // 1. Generate initial game state for chosen starting region
      const initialState = createInitialState(staticWorldData, selectedRegionId, WORLD_DEFINITIONS_V1);

      // Clamp point buy stats within [3, 10] range
      const clampStat = (val: number) => Math.max(3, Math.min(10, typeof val === 'number' ? val : 3));
      const baseStats = {
        ADM: clampStat(stats.ADM),
        MAR: clampStat(stats.MAR),
        DIP: clampStat(stats.DIP),
        INT: clampStat(stats.INT),
        LRN: clampStat(stats.LRN),
      };

      const bonuses = CULTURE_STAT_BONUSES[cultureId] || {};

      // 2. Inject ruler character and custom kingdom details into state
      const rulerId = `char_ruler_${Date.now()}`;
      const rulerCharacter = {
        id: rulerId,
        name: rulerName || 'Sovereign',
        cultureId: cultureId,
        portraitSeed: portraitSeed,
        gender: gender,
        isLegendary: false,
        status: 'ruler' as const,
        employerKingdomId: 'k_player',
        stats: {
          administration: baseStats.ADM + (bonuses.ADM || 0),
          martial: baseStats.MAR + (bonuses.MAR || 0),
          diplomacy: baseStats.DIP + (bonuses.DIP || 0),
          intrigue: baseStats.INT + (bonuses.INT || 0),
          learning: baseStats.LRN + (bonuses.LRN || 0),
        },
        traits: ['Ambitious', 'Visionary'],
        affinity: 'standard',
        age: 25,
        loyalty: 100,
      };

      initialState.world.characters = initialState.world.characters || {};
      initialState.world.characters[rulerId] = rulerCharacter as any;

      if (initialState.kingdoms['k_player']) {
        initialState.kingdoms['k_player'].name = kingdomName || 'Sovereign Realm';
        initialState.kingdoms['k_player'].rulerId = rulerId;
      }

      // 3. Bootstrap game session with custom state
      await session.bootstrap(initialState);
      session.start();

      onComplete();
    } catch (e) {
      console.error('[CharacterCreation] Error finishing character creation', e);
      Alert.alert('Creation Error', 'Failed to initialize campaign. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Wizard Navigation Steps Header */}
      <View style={styles.wizardHeader}>
        <Text style={styles.wizardHeaderTitle}>FOUND DYNASTY</Text>
        <View style={styles.stepperRow}>
          {[1, 2, 3, 4].map((s) => (
            <View key={s} style={styles.stepIndicatorContainer}>
              <View style={[styles.stepDot, step >= s && styles.stepDotActive, step === s && styles.stepDotCurrent]}>
                <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{s}</Text>
              </View>
              {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
            </View>
          ))}
        </View>
      </View>

      {/* Step Body */}
      <View style={styles.body}>
        {step === 1 && (
          <CultureSelectStep
            selectedCulture={cultureId}
            onSelectCulture={handleCultureChange}
          />
        )}
        {step === 2 && (
          <StatPointBuyStep
            stats={stats}
            onUpdateStats={setStats}
          />
        )}
        {step === 3 && (
          <TerritorySelectStep
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
          />
        )}
        {step === 4 && (
          <AvatarAppearanceStep
            cultureId={cultureId}
            gender={gender}
            rulerName={rulerName}
            kingdomName={kingdomName}
            portraitSeed={portraitSeed}
            onUpdateDetails={({ gender: g, rulerName: rn, kingdomName: kn, portraitSeed: ps }) => {
              if (g !== undefined) setGender(g);
              if (rn !== undefined) setRulerName(rn);
              if (kn !== undefined) setKingdomName(kn);
              if (ps !== undefined) setPortraitSeed(ps);
            }}
          />
        )}
      </View>

      {/* Bottom Action Bar */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{step === 4 ? 'Begin Campaign ⚔️' : 'Next Step ➔'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  wizardHeader: {
    backgroundColor: '#1A1A1A',
    borderBottomColor: '#2C2C2C',
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  wizardHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
    letterSpacing: 2,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#242014',
  },
  stepDotCurrent: {
    backgroundColor: '#D4AF37',
  },
  stepDotText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepDotTextActive: {
    color: '#FFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#D4AF37',
  },
  body: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderTopColor: '#2C2C2C',
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#AAA',
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 2,
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
