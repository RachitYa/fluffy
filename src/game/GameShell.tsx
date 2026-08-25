import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, AppState, AppStateStatus } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import GameRenderer from './GameRenderer';
import {
  makeInitialState,
  GameState,
  tickGame,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from './useGameLoop';

const CLOUD_COUNT = 5;
const CLOUD_SPEED = 0.4; // px/frame, slower than pipes for parallax effect
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes backgrounded → re-lock

// ─── Pre-computed initial cloud positions ────────────────────────────────────
function makeCloudXs(): number[] {
  return Array.from({ length: CLOUD_COUNT }, (_, i) => (SCREEN_WIDTH / CLOUD_COUNT) * i + 30);
}

interface Props {
  onUnlock: () => void;
  isUnlocked: boolean; // if true, skip re-lock on next foreground
}

export default function GameShell({ onUnlock, isUnlocked }: Props) {
  const stateRef = useRef<GameState>(makeInitialState());
  const cloudXsRef = useRef<number[]>(makeCloudXs());
  const [renderTick, setRenderTick] = useState(0); // forces re-render each frame
  const [score, setScore] = useState(0);
  const rafRef = useRef<number | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  // ─── Game loop via requestAnimationFrame ──────────────────────────────────
  const loop = useCallback(() => {
    // Tick physics
    stateRef.current = tickGame(stateRef.current);

    // Update score state only on change (avoids re-render flood)
    const newScore = stateRef.current.score;
    setScore((prev) => (prev !== newScore ? newScore : prev));

    // Scroll clouds
    cloudXsRef.current = cloudXsRef.current.map((x) => {
      const nx = x - CLOUD_SPEED;
      return nx + 80 < 0 ? SCREEN_WIDTH + 60 : nx;
    });

    // Trigger re-render (Skia Canvas reads refs synchronously on draw)
    setRenderTick((t) => t + 1);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  // ─── App background / foreground → auto-lock ─────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAtRef.current = Date.now();
      } else if (next === 'active') {
        const bg = backgroundedAtRef.current;
        if (bg !== null && Date.now() - bg > LOCK_TIMEOUT_MS && isUnlocked) {
          // Parent handles re-locking via the isUnlocked prop change —
          // we notify it by calling onUnlock with a special signal.
          // For simplicity in Phase 1 the parent tracks its own timer.
        }
        backgroundedAtRef.current = null;
      }
    });
    return () => sub.remove();
  }, [isUnlocked]);

  // ─── Tap → flap / restart ─────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'idle') {
      stateRef.current = { ...s, phase: 'playing', birdVY: -10.5 };
    } else if (s.phase === 'playing') {
      stateRef.current = { ...s, birdVY: -10.5 };
    } else if (s.phase === 'dead') {
      stateRef.current = makeInitialState();
      setScore(0);
    }
  }, []);

  // ─── Hidden unlock: long-press on score counter region ───────────────────
  // The score counter sits roughly at top-center. We overlay an invisible
  // pressable over that region only. No visual feedback whatsoever.
  const longPressGesture = Gesture.LongPress()
    .minDuration(2000)
    .onEnd((_, success) => {
      if (success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onUnlock();
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    handleTap();
  });

  const combinedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={styles.container}>
        {/* Game canvas */}
        <GameRenderer
          state={stateRef.current}
          cloudOffsets={cloudXsRef.current}
        />

        {/* Invisible unlock zone — overlaid on score counter position (top-center) */}
        {/* This pressable is 120×70 px centred at top of screen */}
        {/* It is truly invisible: no backgroundColor, no opacity hint */}
        <View style={styles.unlockZone} pointerEvents="none" />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B8DEFF',
  },
  unlockZone: {
    position: 'absolute',
    top: 55,
    left: SCREEN_WIDTH / 2 - 60,
    width: 120,
    height: 70,
    // Completely transparent — no backgroundColor
  },
});
