import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameShell from '../src/game/GameShell';
import RoomsScreen from '../src/chat/screens/RoomsScreen';
import ChatScreen from '../src/chat/screens/ChatScreen';
import { ThemeProvider } from '../src/chat/hooks/useTheme';

// Import Firebase to initialize on startup
import '../src/firebase.config';

type Screen = 'rooms' | 'chat';

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 min backgrounded → re-lock

export default function RootLayout() {
  const [unlocked, setUnlocked] = useState(false);
  const [screen, setScreen] = useState<Screen>('rooms');
  const [activePasskey, setActivePasskey] = useState<string | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  // ── Auto-lock after 5 min in background ───────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAtRef.current = Date.now();
      } else if (state === 'active') {
        const bg = backgroundedAtRef.current;
        if (bg !== null && Date.now() - bg > LOCK_TIMEOUT_MS) {
          setUnlocked(false);
          setScreen('rooms');
          setActivePasskey(null);
        }
        backgroundedAtRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
  }, []);

  const handleNavigateToChat = useCallback((passkey: string) => {
    setActivePasskey(passkey);
    setScreen('chat');
  }, []);

  const handleBackToRooms = useCallback(() => {
    setScreen('rooms');
    setActivePasskey(null);
  }, []);

  const handleBackToGame = useCallback(() => {
    // Return immediately to the game shell (locks the chat layer)
    setUnlocked(false);
    setScreen('rooms');
    setActivePasskey(null);
  }, []);

  // ── Render Game Shell (Locked) ────────────────────────────────────────────
  if (!unlocked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GameShell onUnlock={handleUnlock} isUnlocked={unlocked} />
      </GestureHandlerRootView>
    );
  }

  // ── Render Chat Layer (Unlocked - Theme-aware Studio) ──────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <View style={styles.webWrapper}>
          <View style={styles.phoneFrame}>
            <SafeAreaProvider>
              {screen === 'rooms' && (
                <RoomsScreen
                  onNavigateToChat={handleNavigateToChat}
                  onBackToGame={handleBackToGame}
                />
              )}
              {screen === 'chat' && activePasskey && (
                <ChatScreen
                  passkey={activePasskey}
                  onBack={handleBackToRooms}
                  onBackToGame={handleBackToGame}
                />
              )}
            </SafeAreaProvider>
          </View>
        </View>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: '#08090C',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    maxHeight: 880,
    backgroundColor: '#0E0F12',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          borderRadius: 20,
          boxShadow: '0 28px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }
      : {}),
  },
});
