import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, AppState, AppStateStatus, Platform, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import GameRenderer from './GameRenderer';
import {
  makeInitialState,
  GameState,
  tickGame,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  FLAP_IMPULSE,
} from './useGameLoop';

const CLOUD_COUNT = 5;
const CLOUD_SPEED = 0.35; // smooth parallax
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes backgrounded → re-lock

function makeCloudXs(): number[] {
  return Array.from({ length: CLOUD_COUNT }, (_, i) => (SCREEN_WIDTH / CLOUD_COUNT) * i + 30);
}

interface Props {
  onUnlock: () => void;
  isUnlocked: boolean;
}

export default function GameShell({ onUnlock, isUnlocked }: Props) {
  const stateRef = useRef<GameState>(makeInitialState());
  const cloudXsRef = useRef<number[]>(makeCloudXs());
  const [renderTick, setRenderTick] = useState(0);
  const [score, setScore] = useState(0);
  const rafRef = useRef<number | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  // ─── Main Game Loop (RAF) ──────────────────────────────────────────────────
  const loop = useCallback(() => {
    stateRef.current = tickGame(stateRef.current);

    const newScore = stateRef.current.score;
    setScore((prev) => (prev !== newScore ? newScore : prev));

    cloudXsRef.current = cloudXsRef.current.map((x) => {
      const nx = x - CLOUD_SPEED;
      return nx + 80 < 0 ? SCREEN_WIDTH + 60 : nx;
    });

    setRenderTick((t) => t + 1);
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  // ─── Auto-lock on app background ──────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAtRef.current = Date.now();
      } else if (next === 'active') {
        backgroundedAtRef.current = null;
      }
    });
    return () => sub.remove();
  }, [isUnlocked]);

  // ─── Tap / Flap / Restart (Gentle Float) ──────────────────────────────────
  const handleTap = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'idle') {
      stateRef.current = { ...s, phase: 'playing', birdVY: FLAP_IMPULSE };
    } else if (s.phase === 'playing') {
      stateRef.current = { ...s, birdVY: FLAP_IMPULSE };
    } else if (s.phase === 'dead') {
      stateRef.current = makeInitialState();
      setScore(0);
    }
  }, []);

  // ─── Trigger Unlock ───────────────────────────────────────────────────────
  const triggerUnlock = useCallback(() => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch (_) {}
    }
    onUnlock();
  }, [onUnlock]);

  // ─── Keyboard Controls (Space to jump, U to unlock) ──────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleTap();
      } else if (e.code === 'KeyR' && stateRef.current.phase === 'dead') {
        stateRef.current = makeInitialState();
        setScore(0);
      } else if (e.code === 'KeyU') {
        triggerUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap, triggerUnlock]);

  return (
    <View style={styles.outerContainer}>
      <View style={styles.phoneFrame}>
        <Pressable style={styles.container} onPress={handleTap}>
          {/* Game Canvas */}
          <GameRenderer
            state={stateRef.current}
            cloudOffsets={cloudXsRef.current}
          />

          {/* Hidden Unlock Button 1: Secret top-right corner button */}
          <TouchableOpacity
            style={styles.hiddenUnlockCorner}
            onPress={triggerUnlock}
            activeOpacity={0.6}
            accessibilityLabel="Secret unlock"
          >
            {/* Invisible touch target — subtle tiny dot in dev mode */}
            <View style={styles.secretDot} />
          </TouchableOpacity>

          {/* Hidden Unlock Button 2: Secret tap on the score area */}
          <TouchableOpacity
            style={styles.hiddenScoreButton}
            onPress={triggerUnlock}
            activeOpacity={1}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#E6F4FE',
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
    backgroundColor: '#B8DEFF',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          borderRadius: 24,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        }
      : {}),
  },
  container: {
    flex: 1,
    backgroundColor: '#B8DEFF',
    position: 'relative',
  },
  // Hidden button at top right corner: 60x60 tap target
  hiddenUnlockCorner: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 60,
    height: 60,
    zIndex: 20,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 8,
  },
  secretDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  // Secret touch zone right on the score number
  hiddenScoreButton: {
    position: 'absolute',
    top: 35,
    left: '50%',
    marginLeft: -50,
    width: 100,
    height: 65,
    zIndex: 15,
  },
});
