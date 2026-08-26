import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { GameState, BIRD_X, BIRD_RADIUS, PIPE_WIDTH, PIPE_GAP, GROUND_Y, SCREEN_WIDTH, SCREEN_HEIGHT } from './useGameLoop';

// Pastel palette matching native
const SKY_TOP    = '#B8DEFF';
const SKY_BOT    = '#D9F0FF';
const CLOUD_CLR  = 'rgba(255, 255, 255, 0.9)';
const HILL_CLR   = '#C8E6C0';
const GROUND_CLR = '#A8D5A2';
const GROUND_STR = '#82C09A';
const PIPE_CLR   = '#B5EAD7';
const PIPE_STR   = '#7CC9AC';
const BIRD_BODY  = '#FFE066';
const BIRD_WING  = '#FFC845';
const BIRD_EYE   = '#333333';
const BEAK_CLR   = '#FF9F43';

interface Props {
  state: GameState;
  cloudOffsets: number[];
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const r = 22 * scale;
  ctx.fillStyle = CLOUD_CLR;
  
  const circles = [
    { cx: x, cy: y, cr: r },
    { cx: x + r * 0.9, cy: y + r * 0.2, cr: r * 0.8 },
    { cx: x - r * 0.8, cy: y + r * 0.25, cr: r * 0.7 },
    { cx: x + r * 0.2, cy: y - r * 0.3, cr: r * 0.65 },
  ];

  for (const c of circles) {
    ctx.beginPath();
    ctx.arc(c.cx, c.cy, c.cr, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function GameRendererWeb({ state, cloudOffsets }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { birdY, birdVY, pipes, score, phase } = state;

    // Clear & background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    grad.addColorStop(0, SKY_TOP);
    grad.addColorStop(1, SKY_BOT);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Parallax clouds
    const cloudYs = [120, 180, 90, 200, 150];
    const cloudScales = [1, 0.7, 1.2, 0.85, 0.9];
    cloudOffsets.forEach((cx, i) => {
      drawCloud(ctx, cx, cloudYs[i % cloudYs.length], cloudScales[i % cloudScales.length]);
    });

    // Distant hills
    ctx.fillStyle = HILL_CLR;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y - 60);
    ctx.quadraticCurveTo(100, GROUND_Y - 130, 200, GROUND_Y - 60);
    ctx.quadraticCurveTo(300, GROUND_Y - 100, 390, GROUND_Y - 60);
    ctx.lineTo(390, SCREEN_HEIGHT);
    ctx.lineTo(0, SCREEN_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Pipes
    pipes.forEach((p) => {
      const capH = 18;
      const capW = PIPE_WIDTH + 10;
      const capX = p.x - 5;
      const bottomY = p.topHeight + PIPE_GAP;
      const bottomH = GROUND_Y - bottomY;

      // Top pipe body
      ctx.fillStyle = PIPE_CLR;
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      // Top pipe cap
      ctx.fillStyle = PIPE_STR;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(capX, p.topHeight - capH, capW, capH, 6) : ctx.fillRect(capX, p.topHeight - capH, capW, capH);
      ctx.fill();

      // Bottom pipe cap
      ctx.fillStyle = PIPE_STR;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(capX, bottomY, capW, capH, 6) : ctx.fillRect(capX, bottomY, capW, capH);
      ctx.fill();
      // Bottom pipe body
      ctx.fillStyle = PIPE_CLR;
      ctx.fillRect(p.x, bottomY + capH, PIPE_WIDTH, bottomH - capH);
    });

    // Ground
    ctx.fillStyle = GROUND_CLR;
    ctx.fillRect(0, GROUND_Y, SCREEN_WIDTH, SCREEN_HEIGHT - GROUND_Y);
    ctx.fillStyle = GROUND_STR;
    ctx.fillRect(0, GROUND_Y, SCREEN_WIDTH, 6);

    // Bird
    ctx.save();
    const angle = Math.min(60, Math.max(-30, birdVY * 4));
    const rad = (angle * Math.PI) / 180;
    ctx.translate(BIRD_X, birdY);
    ctx.rotate(rad);

    // Body
    ctx.fillStyle = BIRD_BODY;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Wing
    const wingDrop = birdVY > 0 ? 5 : -5;
    ctx.fillStyle = BIRD_WING;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-18, wingDrop - 5, 16, 10, 5) : ctx.fillRect(-18, wingDrop - 5, 16, 10);
    ctx.fill();

    // Eye
    ctx.fillStyle = BIRD_EYE;
    ctx.beginPath();
    ctx.arc(8, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(9, -6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = BEAK_CLR;
    ctx.beginPath();
    ctx.moveTo(16, -1);
    ctx.lineTo(23, 3);
    ctx.lineTo(16, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Score text
    if (phase !== 'idle') {
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillText(score.toString(), SCREEN_WIDTH / 2, 82);
      // White text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(score.toString(), SCREEN_WIDTH / 2 - 1, 80);
    }

    // Idle text
    if (phase === 'idle') {
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4A6B82';
      ctx.fillText('Tap or press Space to start', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 70);
    }

    // Dead overlay
    if (phase === 'dead') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      ctx.textAlign = 'center';
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Game Over', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 10);

      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('Tap or press Space to try again', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 28);
    }
  }, [state, cloudOffsets]);

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          userSelect: 'none',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
