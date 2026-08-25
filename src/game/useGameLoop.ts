import { useCallback, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
export const SCREEN_WIDTH = 390;
export const SCREEN_HEIGHT = 844;

const GRAVITY = 0.55;          // px/frame² downward acceleration
const FLAP_IMPULSE = -10.5;    // px/frame upward velocity on tap
const PIPE_SPEED = 2.8;        // px/frame pipes scroll left
const PIPE_WIDTH = 62;
const PIPE_GAP = 185;          // vertical space between top & bottom pipe
const PIPE_SPAWN_INTERVAL = 90; // frames between new pipe pairs
const BIRD_X = 90;
const BIRD_RADIUS = 20;

const GROUND_Y = SCREEN_HEIGHT - 90; // top of the ground strip

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PipePair {
  id: number;
  x: number;
  topHeight: number; // height of the top pipe (from top of screen)
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
    birdY: SCREEN_HEIGHT / 2 - 40,
    birdVY: 0,
    pipes: [],
    score: 0,
    frameCount: 0,
    nextPipeId: 0,
  };
}

// ─── Random pipe top-height within safe bounds ────────────────────────────────
function randomTopHeight(): number {
  const minTop = 120;
  const maxTop = GROUND_Y - PIPE_GAP - 120;
  return minTop + Math.floor(Math.random() * (maxTop - minTop));
}

// ─── AABB collision: bird (circle approximated as square) vs pipe rect ────────
function collides(birdY: number, pipe: PipePair): boolean {
  const birdLeft = BIRD_X - BIRD_RADIUS;
  const birdRight = BIRD_X + BIRD_RADIUS;
  const birdTop = birdY - BIRD_RADIUS;
  const birdBottom = birdY + BIRD_RADIUS;

  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + PIPE_WIDTH;

  if (birdRight < pipeLeft || birdLeft > pipeRight) return false;

  // Top pipe: from y=0 to y=pipe.topHeight
  if (birdTop < pipe.topHeight) return true;
  // Bottom pipe: from y=pipe.topHeight+PIPE_GAP to GROUND_Y
  if (birdBottom > pipe.topHeight + PIPE_GAP) return true;

  return false;
}

// ─── Main reducer (called every frame) ───────────────────────────────────────
export function tickGame(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  const frameCount = state.frameCount + 1;

  // Bird physics
  let birdVY = state.birdVY + GRAVITY;
  let birdY = state.birdY + birdVY;

  // Ground/ceiling clamp → death
  if (birdY + BIRD_RADIUS >= GROUND_Y || birdY - BIRD_RADIUS <= 0) {
    return { ...state, birdY, birdVY, frameCount, phase: 'dead' };
  }

  // Spawn new pipe pair
  let pipes = [...state.pipes];
  let nextPipeId = state.nextPipeId;
  if (frameCount % PIPE_SPAWN_INTERVAL === 0) {
    pipes.push({
      id: nextPipeId++,
      x: SCREEN_WIDTH + 10,
      topHeight: randomTopHeight(),
      passed: false,
    });
  }

  // Scroll pipes, check collision, update score
  let score = state.score;
  let isDead = false;
  pipes = pipes
    .map((p) => {
      const newX = p.x - PIPE_SPEED;
      let passed = p.passed;
      if (!passed && newX + PIPE_WIDTH < BIRD_X) {
        passed = true;
        score += 1;
      }
      return { ...p, x: newX, passed };
    })
    .filter((p) => p.x + PIPE_WIDTH > -20); // remove off-screen pipes

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
/**
 * Returns a mutable ref holding the game state and action dispatchers.
 * The game loop calls `tick()` every frame; UI subscribes to the ref via
 * a Skia shared value to avoid React re-renders in the hot path.
 */
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

export { BIRD_X, BIRD_RADIUS, PIPE_WIDTH, PIPE_GAP, GROUND_Y, SCREEN_WIDTH, SCREEN_HEIGHT };
