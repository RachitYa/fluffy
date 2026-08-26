import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Rect,
  RoundedRect,
  Circle,
  Path,
  LinearGradient,
  vec,
  Group,
  Shadow,
} from '@shopify/react-native-skia';
import { GameState, BIRD_X, BIRD_RADIUS, PIPE_WIDTH, PIPE_GAP, GROUND_Y, SCREEN_WIDTH, SCREEN_HEIGHT } from './useGameLoop';

// ─── Pastel colour palette ────────────────────────────────────────────────────
const SKY_TOP    = '#B8DEFF';
const SKY_BOT    = '#D9F0FF';
const CLOUD_CLR  = '#FFFFFF';
const HILL_CLR   = '#C8E6C0';
const GROUND_CLR = '#A8D5A2';
const GROUND_STR = '#82C09A';
const PIPE_CLR   = '#B5EAD7';
const PIPE_STR   = '#7CC9AC';
const BIRD_BODY  = '#FFE066';
const BIRD_WING  = '#FFC845';
const BIRD_EYE   = '#333333';

interface Props {
  state: GameState;
  cloudOffsets: number[];
}

// ─── Static cloud shapes ──────────────────────────────────────────────────────
function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const r = 22 * scale;
  return (
    <Group>
      <Circle cx={x} cy={y} r={r} color={CLOUD_CLR} opacity={0.9} />
      <Circle cx={x + r * 0.9} cy={y + r * 0.2} r={r * 0.8} color={CLOUD_CLR} opacity={0.9} />
      <Circle cx={x - r * 0.8} cy={y + r * 0.25} r={r * 0.7} color={CLOUD_CLR} opacity={0.9} />
      <Circle cx={x + r * 0.2} cy={y - r * 0.3} r={r * 0.65} color={CLOUD_CLR} opacity={0.9} />
    </Group>
  );
}

// ─── Pipe pair ────────────────────────────────────────────────────────────────
function PipePair({ x, topHeight }: { x: number; topHeight: number }) {
  const capH = 18;
  const capW = PIPE_WIDTH + 10;
  const capX = x - 5;
  const bottomY = topHeight + PIPE_GAP;
  const bottomH = GROUND_Y - bottomY;

  return (
    <Group>
      {/* Top pipe body */}
      <Rect x={x} y={0} width={PIPE_WIDTH} height={topHeight} color={PIPE_CLR} />
      {/* Top pipe cap */}
      <RoundedRect x={capX} y={topHeight - capH} width={capW} height={capH} r={6} color={PIPE_STR} />
      {/* Bottom pipe cap */}
      <RoundedRect x={capX} y={bottomY} width={capW} height={capH} r={6} color={PIPE_STR} />
      {/* Bottom pipe body */}
      <Rect x={x} y={bottomY + capH} width={PIPE_WIDTH} height={bottomH - capH} color={PIPE_CLR} />
    </Group>
  );
}

// ─── Bird ─────────────────────────────────────────────────────────────────────
function Bird({ y, vy }: { y: number; vy: number }) {
  const angle = Math.min(60, Math.max(-30, vy * 4));
  const rad = (angle * Math.PI) / 180;
  const wingDrop = vy > 0 ? 5 : -5;

  return (
    <Group transform={[{ translateX: BIRD_X }, { translateY: y }, { rotate: rad }, { translateX: -BIRD_X }, { translateY: -y }]}>
      {/* Body */}
      <Circle cx={BIRD_X} cy={y} r={BIRD_RADIUS} color={BIRD_BODY}>
        <Shadow dx={1} dy={2} blur={4} color="rgba(0,0,0,0.15)" />
      </Circle>
      {/* Wing */}
      <RoundedRect
        x={BIRD_X - 18}
        y={y + wingDrop}
        width={16}
        height={10}
        r={5}
        color={BIRD_WING}
      />
      {/* Eye */}
      <Circle cx={BIRD_X + 8} cy={y - 5} r={4} color={BIRD_EYE} />
      <Circle cx={BIRD_X + 9} cy={y - 6} r={1.5} color={'#fff'} />
      {/* Beak */}
      <Path
        path={`M ${BIRD_X + 16} ${y - 1} L ${BIRD_X + 23} ${y + 3} L ${BIRD_X + 16} ${y + 5} Z`}
        color="#FF9F43"
      />
    </Group>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────
export default function GameRenderer({ state, cloudOffsets }: Props) {
  const { birdY, birdVY, pipes, score, phase } = state;

  return (
    <View style={styles.container}>
      <Canvas style={{ flex: 1 }}>
        {/* Sky gradient */}
        <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, SCREEN_HEIGHT)}
            colors={[SKY_TOP, SKY_BOT]}
          />
        </Rect>

        {/* Clouds parallax layer */}
        {cloudOffsets.map((cx, i) => (
          <Cloud key={i} x={cx} y={[120, 180, 90, 200][i % 4]} scale={[1, 0.7, 1.2, 0.85][i % 4]} />
        ))}

        {/* Distant hills */}
        <Path
          path={`M 0 ${GROUND_Y - 60} Q 100 ${GROUND_Y - 130} 200 ${GROUND_Y - 60} Q 300 ${GROUND_Y - 100} 390 ${GROUND_Y - 60} L 390 ${SCREEN_HEIGHT} L 0 ${SCREEN_HEIGHT} Z`}
          color={HILL_CLR}
          opacity={0.6}
        />

        {/* Pipes */}
        {pipes.map((p) => (
          <PipePair key={p.id} x={p.x} topHeight={p.topHeight} />
        ))}

        {/* Ground */}
        <Rect x={0} y={GROUND_Y} width={SCREEN_WIDTH} height={SCREEN_HEIGHT - GROUND_Y} color={GROUND_CLR} />
        <Rect x={0} y={GROUND_Y} width={SCREEN_WIDTH} height={6} color={GROUND_STR} />

        {/* Bird */}
        <Bird y={birdY} vy={birdVY} />
      </Canvas>

      {/* ── Native Safe Text Overlay (Crash-proof on Android & iOS) ─────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Score */}
        {phase !== 'idle' && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreShadowText}>{score}</Text>
            <Text style={styles.scoreMainText}>{score}</Text>
          </View>
        )}

        {/* Idle hint */}
        {phase === 'idle' && (
          <View style={styles.idleHintContainer}>
            <Text style={styles.idleHintText}>Tap to start</Text>
          </View>
        )}

        {/* Game Over overlay */}
        {phase === 'dead' && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverSubtitle}>Tap to try again</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scoreContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scoreShadowText: {
    position: 'absolute',
    top: 2,
    fontSize: 48,
    fontWeight: '900',
    color: 'rgba(0, 0, 0, 0.15)',
  },
  scoreMainText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  idleHintContainer: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  idleHintText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(60, 80, 110, 0.75)',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  gameOverSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
