import { useCallback, useRef } from 'react';

// ─── Constants (Gentle & Gradual Progression) ──────────────────────────────────
export const SCREEN_WIDTH = 390;
export const SCREEN_HEIGHT = 844;

export const GRAVITY = 0.28;          // Very gentle falling acceleration
export const FLAP_IMPULSE = -6.4;     // Soft, controllable upward float
export const BASE_PIPE_SPEED = 1.25;  // Starts very slow and friendly
export const PIPE_WIDTH = 58;
export const PIPE_GAP = 235;          // Extra wide gap so scoring 1, 2, 3 is effortless
export const PIPE_SPAWN_INTERVAL = 150; // Plenty of room between pipes
export const FIRST_PIPE_DELAY = 140;   // Generous runway before first pipe appears
export const BIRD_X = 90;
export const BIRD_RADIUS = 18;

export const GROUND_Y = SCREEN_HEIGHT - 90; // top of the ground strip

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PipePair {
  id: number;
  x: number;
  topHeight: number;
  passed: boolean;
}

export interface GameState {
  phase: 'idle' | 'playing' | 'dead';
  birdY: number;
  birdVY: number;
  pipes: PipePair[];
  score: number;
  frameCount: number;
  nextPipeId: number;
}

export function makeInitialState(): GameState {
  return {
    phase: 'idle',
    birdY: SCREEN_HEIGHT / 2 - 50,
    birdVY: 0,
    pipes: [],
    score: 0,
    frameCount: 0,
    nextPipeId: 0,
  };
}

// ─── Pipe top height: centered in friendly reachable zone ──────────────────────
function randomTopHeight(): number {
  const minTop = 130;
  const maxTop = GROUND_Y - PIPE_GAP - 130;
  return minTop + Math.floor(Math.random() * (maxTop - minTop));
}

// ─── Forgiving collision check (allows minor clipping without sudden death) ───
function collides(birdY: number, pipe: PipePair): boolean {
  const buffer = 7; // forgiving margin
  const birdLeft = BIRD_X - BIRD_RADIUS + buffer;
  const birdRight = BIRD_X + BIRD_RADIUS - buffer;
  const birdTop = birdY - BIRD_RADIUS + buffer;
  const birdBottom = birdY + BIRD_RADIUS - buffer;

  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + PIPE_WIDTH;

  if (birdRight < pipeLeft || birdLeft > pipeRight) return false;

  // Top pipe
  if (birdTop < pipe.topHeight) return true;
  // Bottom pipe
  if (birdBottom > pipe.topHeight + PIPE_GAP) return true;

  return false;
}

// ─── Dynamic speed: starts slow, increases slightly with score ───────────────
export function getPipeSpeed(score: number): number {
  // Score 0: 1.25 px/frame -> Score 5: 1.65 -> Score 10: 2.05 -> Max 2.6
  return Math.min(2.6, BASE_PIPE_SPEED + score * 0.08);
}

// ─── Main game tick ───────────────────────────────────────────────────────────
export function tickGame(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  const frameCount = state.frameCount + 1;
  const currentSpeed = getPipeSpeed(state.score);

  // Bird physics
  let birdVY = state.birdVY + GRAVITY;
  let birdY = state.birdY + birdVY;

  // Ground/ceiling clamp
  if (birdY + BIRD_RADIUS >= GROUND_Y || birdY - BIRD_RADIUS <= 10) {
    return { ...state, birdY, birdVY, frameCount, phase: 'dead' };
  }

  // Spawn pipes with initial delay buffer
  let pipes = [...state.pipes];
  let nextPipeId = state.nextPipeId;
  const isSpawnTime = frameCount >= FIRST_PIPE_DELAY && (frameCount - FIRST_PIPE_DELAY) % PIPE_SPAWN_INTERVAL === 0;

  if (isSpawnTime) {
    pipes.push({
      id: nextPipeId++,
      x: SCREEN_WIDTH + 20,
      topHeight: randomTopHeight(),
      passed: false,
    });
  }

  // Scroll pipes, update score
  let score = state.score;
  let isDead = false;
  pipes = pipes
    .map((p) => {
      const newX = p.x - currentSpeed;
      let passed = p.passed;
      if (!passed && newX + PIPE_WIDTH < BIRD_X) {
        passed = true;
        score += 1;
      }
      return { ...p, x: newX, passed };
    })
    .filter((p) => p.x + PIPE_WIDTH > -40);

  // Collision check
  for (const pipe of pipes) {
    if (collides(birdY, pipe)) {
      isDead = true;
      break;
    }
  }

  if (isDead) {
    return { ...state, birdY, birdVY, pipes, score, frameCount, phase: 'dead' };
  }

  return { ...state, birdY, birdVY, pipes, score, frameCount, nextPipeId, phase: 'playing' };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGameActions(
  stateRef: React.MutableRefObject<GameState>,
  onScoreChange: (score: number) => void,
) {
  const lastScore = useRef(0);

  const tick = useCallback(() => {
    const next = tickGame(stateRef.current);
    stateRef.current = next;
    if (next.score !== lastScore.current) {
      lastScore.current = next.score;
      onScoreChange(next.score);
    }
  }, [stateRef, onScoreChange]);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'idle') {
      stateRef.current = { ...s, phase: 'playing', birdVY: FLAP_IMPULSE };
    } else if (s.phase === 'playing') {
      stateRef.current = { ...s, birdVY: FLAP_IMPULSE };
    }
  }, [stateRef]);

  const reset = useCallback(() => {
    stateRef.current = makeInitialState();
    lastScore.current = 0;
    onScoreChange(0);
  }, [stateRef, onScoreChange]);

  return { tick, flap, reset };
}
