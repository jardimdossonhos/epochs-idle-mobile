/**
 * App.tsx â€” Epochs Idle
 *
 * NavegaÃ§Ã£o principal: 5 Bottom Tabs (Regra do Polegar) + TopHUD global.
 *
 * Tab Structure:
 *   ðŸ—ºï¸  Mundo     â†’ MapScreen     (mapa hexagonal SVG + overlays)
 *   ðŸ›ï¸  Estado    â†’ EstadoScreen  (Corte | Economia | Idle | Leis) â€” Top Pills
 *   ðŸ§ª  CiÃªncia   â†’ TechScreen    (Ã¡rvore de tecnologias)
 *   ðŸŒ  Diplomacia â†’ DiplomacyScreen
 *   âš™ï¸  Sistema   â†’ SistemaScreen (CrÃ´nicas | Jogo | Config) â€” Top Pills
 *
 * Global Always-on:
 *   TopHUD â€” Data, Play/Pause, Ouro (+ income), Estabilidade, Sino de alertas
 */

import React, { useState, useEffect } from 'react';
import { Text, View, DeviceEventEmitter } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { startMemoryWatch } from './src/telemetry/memoryWatch';

// Start light memory watch (60s for soak test, disabled by default in memoryWatch.ts)
startMemoryWatch(60000);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GameProvider, useGameState } from './src/ui/GameProvider';
import { useUIStore } from './src/ui/store/game-store';
import { AuthProvider, useAuth } from './src/ui/context/AuthContext';
import { LanguageProvider } from './src/ui/context/LanguageContext';

// â”€â”€ Global overlays (render on top of everything) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import SplashScreen       from './src/ui/components/SplashScreen';
import AscensionModal     from './src/ui/components/AscensionModal';
import TopHUD             from './src/ui/components/TopHUD';

// â”€â”€ Pre-game flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import AuthScreen            from './src/ui/screens/AuthScreen';
import MainMenuScreen        from './src/ui/screens/MainMenuScreen';
import CharacterCreationScreen from './src/ui/screens/character-creation/CharacterCreationScreen';

// â”€â”€ 5 Main Game Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import MapScreen        from './src/ui/screens/MapScreen';
import EstadoScreen     from './src/ui/screens/EstadoScreen';
import TechScreen       from './src/ui/screens/TechScreen';
import DiplomacyScreen  from './src/ui/screens/DiplomacyScreen';
import SistemaScreen    from './src/ui/screens/SistemaScreen';

// â”€â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Tab = createBottomTabNavigator();

const EmpireTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D4AF37',
    background: '#121212',
    card: 'rgba(13, 13, 18, 0.95)',
    text: '#E0E0E0',
    border: 'rgba(212,175,55,0.3)',
    notification: '#E24A4A',
  },
};

// â”€â”€â”€ Tab Icon Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Using a small component pattern so hooks (useUIStore) can be used safely inside.
const MapTabIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size * 0.9, color }}>ðŸ—ºï¸</Text>
);
const EstadoTabIcon = ({ color, size }: { color: string; size: number }) => {
  const isEvolved = useUIStore((s) => s.playerHasAscended);
  return <Text style={{ fontSize: size * 0.9, color }}>{isEvolved ? 'ðŸ›ï¸' : 'â›º'}</Text>;
};
const TechTabIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size * 0.9, color }}>ðŸ§ª</Text>
);
const DiplomacyTabIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size * 0.9, color }}>ðŸŒ</Text>
);
const SistemaTabIcon = ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size * 0.9, color }}>âš™ï¸</Text>
);

// Renderers (required by React Navigation API)
const renderMapIcon        = (p: { color: string; size: number }) => <MapTabIcon {...p} />;
const renderEstadoIcon     = (p: { color: string; size: number }) => <EstadoTabIcon {...p} />;
const renderTechIcon       = (p: { color: string; size: number }) => <TechTabIcon {...p} />;
const renderDiplomacyIcon  = (p: { color: string; size: number }) => <DiplomacyTabIcon {...p} />;
const renderSistemaIcon    = (p: { color: string; size: number }) => <SistemaTabIcon {...p} />;

// Evolution-aware labels
const EstadoTabLabel = ({ focused, color }: { focused: boolean; color: string }) => {
  const isEvolved = useUIStore((s) => s.playerHasAscended);
  return (
    <Text style={{ color, fontSize: 10, fontWeight: focused ? 'bold' : 'normal' }}>
      {isEvolved ? 'Estado' : 'Tribo'}
    </Text>
  );
};

// â”€â”€â”€ Main Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Map"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(13, 13, 18, 0.95)',
          borderTopColor: 'rgba(212, 175, 55, 0.35)',
          borderTopWidth: 1,
          paddingBottom: 6,
          height: 62,
          elevation: 0,
        },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Mundo',
          tabBarIcon: renderMapIcon,
        }}
      />
      <Tab.Screen
        name="Estado"
        component={EstadoScreen}
        options={{
          tabBarLabel: ({ focused, color }) => <EstadoTabLabel focused={focused} color={color} />,
          tabBarIcon: renderEstadoIcon,
        }}
      />
      <Tab.Screen
        name="Tech"
        component={TechScreen}
        options={{
          tabBarLabel: 'CiÃªncia',
          tabBarIcon: renderTechIcon,
        }}
      />
      <Tab.Screen
        name="Diplomacy"
        component={DiplomacyScreen}
        options={{
          tabBarLabel: 'Diplomacia',
          tabBarIcon: renderDiplomacyIcon,
        }}
      />
      <Tab.Screen
        name="Sistema"
        component={SistemaScreen}
        options={{
          tabBarLabel: 'Sistema',
          tabBarIcon: renderSistemaIcon,
        }}
      />
    </Tab.Navigator>
  );
}

// â”€â”€â”€ In-Game Shell (TopHUD + Tabs + Global Modals) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function InGameShell() {
  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Tabs fill the screen */}
      <MainTabs />
      {/* TopHUD floats above everything (position:absolute internally) */}
      <TopHUD />
      {/* Global popup overlays */}
      <AscensionModal />
    </View>
  );
}

// â”€â”€â”€ App State Machine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type RootAppState = 'splash' | 'auth' | 'main_menu' | 'character_creation' | 'in_game';

function AppContent() {
  const { authStatus, isLoading: isAuthLoading } = useAuth();
  const { gameState } = useGameState();
  const [appState, setAppState] = useState<RootAppState>('splash');

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('navigateTo', (screen: RootAppState) => {
      setAppState(screen);
    });
    return () => sub.remove();
  }, []);

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
  }, [authStatus, isAuthLoading]);

  if (appState === 'splash') return <SplashScreen />;

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

  if (!gameState) return <SplashScreen />;

  return <InGameShell />;
}

// â”€â”€â”€ Root â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

