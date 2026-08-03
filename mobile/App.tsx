import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GameProvider, useGameState } from './src/ui/GameProvider';
import { useUIStore } from './src/ui/store/game-store';
import { AuthProvider, useAuth } from './src/ui/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/ui/context/LanguageContext';

import SplashScreen from './src/ui/components/SplashScreen';
import EventPopup from './src/ui/components/EventPopup';
import AscensionModal from './src/ui/components/AscensionModal';

// Import Screens
import MapScreen from './src/ui/screens/MapScreen';
import GovScreen from './src/ui/screens/GovScreen';
import CharacterScreen from './src/ui/screens/CharacterScreen';
import MenuScreen from './src/ui/screens/MenuScreen';
import TechScreen from './src/ui/screens/TechScreen';
import DiplomacyScreen from './src/ui/screens/DiplomacyScreen';
import SettingsScreen from './src/ui/screens/SettingsScreen';

// M1 Screens
import AuthScreen from './src/ui/screens/AuthScreen';
import MainMenuScreen from './src/ui/screens/MainMenuScreen';
import CharacterCreationScreen from './src/ui/screens/character-creation/CharacterCreationScreen';

const Tab = createBottomTabNavigator();

const EmpireTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D4AF37', // Gold for active tabs
    background: '#121212',
    card: '#1A1A1A', // Bottom nav bar color
    text: '#E0E0E0',
    border: '#2C2C2C',
    notification: '#8B0000', // Crimson red for alerts
  },
};

const renderTechIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size, color }}>💡</Text>
);
const renderMapIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size, color }}>🌍</Text>
);
const EvolutionGovTabIcon = ({ color, size }: { color: string; size: number }) => {
  const isEvolved = useUIStore(s => s.playerHasAscended);
  const icon = isEvolved ? '🏛️' : '⛺';
  return <Text style={{ fontSize: size, color }}>{icon}</Text>;
};
const renderGovIcon = ({ color, size }: { color: string; size: number }) => (
  <EvolutionGovTabIcon color={color} size={size} />
);
const EvolutionGovTabLabel = ({ focused, color }: { focused: boolean; color: string }) => {
  const isEvolved = useUIStore(s => s.playerHasAscended);
  const label = isEvolved ? 'Governo' : 'Tribo';
  return <Text style={{ color, fontSize: 10, fontWeight: focused ? 'bold' : 'normal' }}>{label}</Text>;
};
const renderDiplomacyIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size, color }}>📜</Text>
);
// Ícone e label da aba de Personagens/Corte muda conforme a era do jogo
// (mesmo padrão da aba Governo/Tribo)
const EvolutionCharactersTabIcon = ({ color, size }: { color: string; size: number }) => {
  const isEvolved = useUIStore(s => s.playerHasAscended);
  const icon = isEvolved ? '👑' : '🔥';
  return <Text style={{ fontSize: size, color }}>{icon}</Text>;
};
const renderCharactersIcon = ({ color, size }: { color: string; size: number }) => (
  <EvolutionCharactersTabIcon color={color} size={size} />
);
const EvolutionCharactersTabLabel = ({ focused, color }: { focused: boolean; color: string }) => {
  const isEvolved = useUIStore(s => s.playerHasAscended);
  const label = isEvolved ? 'Corte' : 'Clã';
  return <Text style={{ color, fontSize: 10, fontWeight: focused ? 'bold' : 'normal' }}>{label}</Text>;
};
const renderMenuIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size, color }}>⚙️</Text>
);
const renderSettingsIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size, color }}>🔧</Text>
);

function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(20, 20, 25, 0.85)',
          borderTopColor: 'rgba(212, 175, 55, 0.4)',
          borderTopWidth: 1,
          paddingBottom: 5,
          height: 60,
          elevation: 0,
        },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen 
        name="Tech" 
        component={TechScreen}
        options={{
          tabBarIcon: renderTechIcon,
          tabBarLabel: t('tabs.knowledge')
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ 
          tabBarLabel: t('tabs.world'),
          tabBarIcon: renderMapIcon
        }}
      />
      <Tab.Screen 
        name="Government" 
        component={GovScreen} 
        options={{ 
          tabBarLabel: ({ focused, color }) => <EvolutionGovTabLabel focused={focused} color={color} />,
          tabBarIcon: renderGovIcon
        }}
      />
      <Tab.Screen 
        name="Diplomacy" 
        component={DiplomacyScreen} 
        options={{ 
          tabBarLabel: t('tabs.diplomacy'),
          tabBarIcon: renderDiplomacyIcon
        }}
      />
      <Tab.Screen 
        name="Characters" 
        component={CharacterScreen} 
        options={{ 
          tabBarLabel: ({ focused, color }) => <EvolutionCharactersTabLabel focused={focused} color={color} />,
          tabBarIcon: renderCharactersIcon
        }}
      />
      <Tab.Screen 
        name="Menu" 
        component={MenuScreen} 
        options={{ 
          tabBarLabel: t('tabs.menu'),
          tabBarIcon: renderMenuIcon
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: t('tabs.config'),
          tabBarIcon: renderSettingsIcon
        }}
      />
    </Tab.Navigator>
  );
}

export type RootAppState = 'splash' | 'auth' | 'main_menu' | 'character_creation' | 'in_game';

function AppContent() {
  const { authStatus, isLoading: isAuthLoading } = useAuth();
  const { gameState } = useGameState();
  const [appState, setAppState] = useState<RootAppState>('splash');

  useEffect(() => {
    if (isAuthLoading) {
      setAppState('splash');
      return;
    }

    if (authStatus === 'unauthenticated') {
      setAppState('auth');
    } else {
      setAppState((prev) => (prev === 'splash' || prev === 'auth' ? 'main_menu' : prev));
    }
  }, [authStatus, isAuthLoading, appState]);

  if (appState === 'splash') {
    return <SplashScreen />;
  }

  if (appState === 'auth') {
    return <AuthScreen onAuthenticated={() => setAppState('main_menu')} />;
  }

  if (appState === 'main_menu') {
    return (
      <MainMenuScreen
        onNewGame={() => setAppState('character_creation')}
        onGameLoaded={() => setAppState('in_game')}
      />
    );
  }

  if (appState === 'character_creation') {
    return (
      <CharacterCreationScreen
        onComplete={() => setAppState('in_game')}
        onCancel={() => setAppState('main_menu')}
      />
    );
  }

  if (!gameState) {
    return <SplashScreen />;
  }

  return (
    <>
      <MainTabs />
      <EventPopup />
      <AscensionModal />
    </>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#121212' }}>
        <StatusBar hidden={true} />
        <LanguageProvider>
          <AuthProvider>
            <GameProvider>
              <NavigationContainer theme={EmpireTheme}>
                <AppContent />
              </NavigationContainer>
            </GameProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
