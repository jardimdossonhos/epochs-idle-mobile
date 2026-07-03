import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing, ImageBackground } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function SplashScreen() {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.1)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Elegant fade in for text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Slow cinematic zoom out for background
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 10000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Pulse animation for loading text
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={require('../../../assets/splash_bg.png')}
        style={[styles.backgroundImage, { transform: [{ scale: scaleAnim }] }]}
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <Animated.View style={[styles.contentBox, { opacity: fadeAnim }]}>
          <Text style={styles.title}>EPOCHS</Text>
          <Text style={styles.subtitle}>IDLE</Text>
          <Animated.Text style={[styles.loadingText, { opacity: pulseAnim }]}>
            {t('splash.forgingDawn')}
          </Animated.Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0A0A',
    zIndex: 9999,
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', // Dark cinematic overlay
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBox: {
    alignItems: 'center',
  },
  title: {
    fontSize: 56,
    color: '#D4AF37', // Majestic Gold instead of error red
    fontWeight: '900',
    letterSpacing: 8,
    textShadowColor: 'rgba(212, 175, 55, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 28,
    color: '#FFFFFF', // Clean white
    fontWeight: '300',
    letterSpacing: 12,
    marginTop: -10,
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loadingText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
