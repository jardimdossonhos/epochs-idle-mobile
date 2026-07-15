import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameProvider, useGameState } from './src/ui/GameProvider';
import { AuthProvider, useAuth } from './src/ui/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/ui/context/LanguageContext';

import SplashScreen from './src/ui/components/SplashScreen';
import EventPopup from './src/ui/components/EventPopup';

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

function MainTabs() {
  const { gameState } = useGameState();
  const { t } = useLanguage();

  if (!gameState) return null;

  const isCivilizationUnocked = gameState.meta.tick > 10;

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
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>💡</Text>
          ),
          tabBarLabel: t('tabs.knowledge')
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ 
          tabBarLabel: isCivilizationUnocked ? t('tabs.world') : t('tabs.tribeAndRegion'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🌍</Text>
          )
        }}
      />
      
      {isCivilizationUnocked && (
        <Tab.Screen 
          name="Government" 
          component={GovScreen} 
          options={{ 
            tabBarLabel: t('tabs.government'),
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🏛️</Text>
            )
          }}
        />
      )}
      
      {isCivilizationUnocked && (
        <Tab.Screen 
          name="Diplomacy" 
          component={DiplomacyScreen} 
          options={{ 
            tabBarLabel: t('tabs.diplomacy'),
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>📜</Text>
            )
          }}
        />
      )}
      
      {isCivilizationUnocked && (
        <Tab.Screen 
          name="Characters" 
          component={CharacterScreen} 
          options={{ 
            tabBarLabel: t('tabs.court'),
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>👑</Text>
            )
          }}
        />
      )}

      <Tab.Screen 
        name="Menu" 
        component={MenuScreen} 
        options={{ 
          tabBarLabel: t('tabs.menu'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          )
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: t('tabs.config'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🔧</Text>
          )
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
    </>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#121212' }}>
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
