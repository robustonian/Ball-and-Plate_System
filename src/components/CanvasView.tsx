/**
 * Canvas component for rendering the Ball and Plate system
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../state/store';
import { PHYSICS_CONSTANTS } from '../sim/physics';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'bat' | 'ghost';
  size: number;
  angle: number;
}

const CanvasView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastParticleUpdate = useRef<number>(0);

  // Subscribe to relevant state
  const simState = useStore((state) => state.simState);
  const trajectory = useStore((state) => state.trajectory);
  const currentReference = useStore((state) => state.currentReference);
  const waitingForInitClick = useStore((state) => state.waitingForInitClick);
  const controlMode = useStore((state) => state.referenceManager.getMode());
  const drawingPath = useStore((state) => state.drawingPath);
  const isDrawing = useStore((state) => state.isDrawing);
  const theme = useStore((state) => state.theme);

  // Actions
  const updateMousePosition = useStore((state) => state.updateMousePosition);
  const setInitialPosition = useStore((state) => state.setInitialPosition);
  const addDrawingPoint = useStore((state) => state.addDrawingPoint);

  /**
   * Initialize particles for Halloween theme
   */
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const numParticles = 15;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        type: Math.random() > 0.5 ? 'bat' : 'ghost',
        size: 15 + Math.random() * 15,
        angle: Math.random() * Math.PI * 2,
      });
    }

    particlesRef.current = particles;
  }, []);

  /**
   * Update particles animation
   */
  const updateParticles = useCallback((deltaTime: number, width: number, height: number) => {
    particlesRef.current.forEach(p => {
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.angle += deltaTime * 0.5;

      // Wrap around screen
      if (p.x < -50) p.x = width + 50;
      if (p.x > width + 50) p.x = -50;
      if (p.y < -50) p.y = height + 50;
      if (p.y > height + 50) p.y = -50;
    });
  }, []);

  /**
   * Draw spider web pattern
   */
  const drawSpiderWeb = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.15)';
    ctx.lineWidth = 1;

    // Radial web from corners
    const corners = [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ];

    corners.forEach(([cx, cy]) => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const length = 150;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
        ctx.stroke();
      }

      // Concentric circles
      for (let r = 30; r < 150; r += 30) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI / 2);
        ctx.stroke();
      }
    });
  }, []);

  /**
   * Draw bat particle
   */
  const drawBat = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#2d1b4e';

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 0);
    ctx.quadraticCurveTo(-size * 0.8, -size * 0.5, -size, 0);
    ctx.quadraticCurveTo(-size * 0.8, size * 0.3, -size * 0.3, size * 0.2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size * 0.3, 0);
    ctx.quadraticCurveTo(size * 0.8, -size * 0.5, size, 0);
    ctx.quadraticCurveTo(size * 0.8, size * 0.3, size * 0.3, size * 0.2);
    ctx.fill();

    ctx.restore();
  }, []);

  /**
   * Draw ghost particle
   */
  const drawGhost = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

    // Body
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.4, Math.PI, 0);
    ctx.lineTo(size * 0.4, size * 0.3);
    for (let i = 0; i < 4; i++) {
      const xPos = size * 0.4 - (i * size * 0.2);
      ctx.quadraticCurveTo(xPos - size * 0.05, size * 0.5, xPos - size * 0.1, size * 0.3);
    }
    ctx.lineTo(-size * 0.4, -size * 0.3);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.2, size * 0.08, 0, Math.PI * 2);
    ctx.arc(size * 0.15, -size * 0.2, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  /**
   * Draw pumpkin face on ball
   */
  const drawPumpkinFace = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number
  ) => {
    ctx.fillStyle = '#1a0b2e';
    ctx.strokeStyle = '#1a0b2e';
    ctx.lineWidth = 2;

    // Eyes
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.4, cy - radius * 0.2);
    ctx.lineTo(cx - radius * 0.2, cy - radius * 0.4);
    ctx.lineTo(cx - radius * 0.1, cy - radius * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + radius * 0.4, cy - radius * 0.2);
    ctx.lineTo(cx + radius * 0.2, cy - radius * 0.4);
    ctx.lineTo(cx + radius * 0.1, cy - radius * 0.2);
    ctx.closePath();
    ctx.fill();

    // Nose
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - radius * 0.1, cy + radius * 0.1);
    ctx.lineTo(cx + radius * 0.1, cy + radius * 0.1);
    ctx.closePath();
    ctx.fill();

    // Mouth - spooky grin
    ctx.beginPath();
    ctx.arc(cx, cy + radius * 0.2, radius * 0.4, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Teeth
    for (let i = 0; i < 5; i++) {
      const angle = 0.2 + ((Math.PI - 0.4) / 4) * i;
      const x = cx + Math.cos(angle) * radius * 0.4;
      const y = cy + radius * 0.2 + Math.sin(angle) * radius * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - radius * 0.15);
      ctx.stroke();
    }
  }, []);

  /**
   * Convert physical coordinates to canvas pixels
   */
  const physicalToCanvas = useCallback(
    (
      px: number,
      py: number,
      canvas: HTMLCanvasElement
    ): { cx: number; cy: number } => {
      const width = canvas.width;
      const height = canvas.height;
      const size = Math.min(width, height);
      const scale = size / (PHYSICS_CONSTANTS.plateSize * 1.2); // 1.2x for margin

      // Physical origin is at center of canvas
      const cx = width / 2 + px * scale;
      const cy = height / 2 - py * scale; // flip y-axis

      return { cx, cy };
    },
    []
  );

  /**
   * Convert canvas pixels to physical coordinates
   */
  const canvasToPhysical = useCallback(
    (
      cx: number,
      cy: number,
      canvas: HTMLCanvasElement
    ): { px: number; py: number } => {
      const width = canvas.width;
      const height = canvas.height;
      const size = Math.min(width, height);
      const scale = size / (PHYSICS_CONSTANTS.plateSize * 1.2);

      const px = (cx - width / 2) / scale;
      const py = -(cy - height / 2) / scale; // flip y-axis

      return { px, py };
    },
    []
  );

  /**
   * Render the scene
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const size = Math.min(width, height);
    const scale = size / (PHYSICS_CONSTANTS.plateSize * 1.2);

    const isHalloween = theme === 'halloween';

    // Clear - theme-aware background
    if (isHalloween) {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
      gradient.addColorStop(0, '#1a0b2e');
      gradient.addColorStop(1, '#0a0513');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = '#1a1a2e';
    }
    ctx.fillRect(0, 0, width, height);

    // Halloween spider web background
    if (isHalloween) {
      drawSpiderWeb(ctx, width, height);
    }

    // Draw plate boundary - theme-aware
    const plateHalf = PHYSICS_CONSTANTS.plateSize / 2;
    const topLeft = physicalToCanvas(-plateHalf, plateHalf, canvas);
    const bottomRight = physicalToCanvas(plateHalf, -plateHalf, canvas);
    const plateWidth = bottomRight.cx - topLeft.cx;
    const plateHeight = bottomRight.cy - topLeft.cy;

    if (isHalloween) {
      // Orange glowing border
      ctx.shadowColor = '#f7931e';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 3;
      ctx.strokeRect(topLeft.cx, topLeft.cy, plateWidth, plateHeight);
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 2;
      ctx.strokeRect(topLeft.cx, topLeft.cy, plateWidth, plateHeight);
    }

    // Draw grid - theme-aware
    ctx.strokeStyle = isHalloween ? 'rgba(74, 31, 117, 0.3)' : '#2d3748';
    ctx.lineWidth = 1;
    const gridSpacing = 0.1; // 10 cm
    for (let x = -plateHalf; x <= plateHalf; x += gridSpacing) {
      const p1 = physicalToCanvas(x, -plateHalf, canvas);
      const p2 = physicalToCanvas(x, plateHalf, canvas);
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();
    }
    for (let y = -plateHalf; y <= plateHalf; y += gridSpacing) {
      const p1 = physicalToCanvas(-plateHalf, y, canvas);
      const p2 = physicalToCanvas(plateHalf, y, canvas);
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();
    }

    // Draw origin axes
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    const origin = physicalToCanvas(0, 0, canvas);
    const axisLength = 0.05;
    const xAxisEnd = physicalToCanvas(axisLength, 0, canvas);
    const yAxisEnd = physicalToCanvas(0, axisLength, canvas);

    ctx.beginPath();
    ctx.moveTo(origin.cx, origin.cy);
    ctx.lineTo(xAxisEnd.cx, xAxisEnd.cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(origin.cx, origin.cy);
    ctx.lineTo(yAxisEnd.cx, yAxisEnd.cy);
    ctx.stroke();

    // Draw trajectory trail - theme-aware with glow
    if (trajectory.length > 1) {
      if (isHalloween) {
        // Purple-green gradient trail with glow
        ctx.shadowColor = '#9d4edd';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;

        const gradient = ctx.createLinearGradient(
          topLeft.cx, topLeft.cy,
          bottomRight.cx, bottomRight.cy
        );
        gradient.addColorStop(0, '#9d4edd');
        gradient.addColorStop(0.5, '#7209b7');
        gradient.addColorStop(1, '#00ff88');
        ctx.strokeStyle = gradient;
      } else {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
      }

      ctx.beginPath();
      const firstPoint = physicalToCanvas(trajectory[0].x, trajectory[0].y, canvas);
      ctx.moveTo(firstPoint.cx, firstPoint.cy);
      for (let i = 1; i < trajectory.length; i++) {
        const point = physicalToCanvas(trajectory[i].x, trajectory[i].y, canvas);
        ctx.lineTo(point.cx, point.cy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    }

    // Draw drawing path (if in drawing mode)
    if (isDrawing && drawingPath.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      const firstPoint = physicalToCanvas(drawingPath[0].x, drawingPath[0].y, canvas);
      ctx.moveTo(firstPoint.cx, firstPoint.cy);
      for (let i = 1; i < drawingPath.length; i++) {
        const point = physicalToCanvas(drawingPath[i].x, drawingPath[i].y, canvas);
        ctx.lineTo(point.cx, point.cy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Draw reference position (target)
    if (controlMode !== 'manual' && controlMode !== 'stabilization') {
      const refPos = physicalToCanvas(currentReference.x, currentReference.y, canvas);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;

      // Draw crosshair
      const crossSize = 10;
      ctx.beginPath();
      ctx.moveTo(refPos.cx - crossSize, refPos.cy);
      ctx.lineTo(refPos.cx + crossSize, refPos.cy);
      ctx.moveTo(refPos.cx, refPos.cy - crossSize);
      ctx.lineTo(refPos.cx, refPos.cy + crossSize);
      ctx.stroke();

      // Draw small circle
      ctx.beginPath();
      ctx.arc(refPos.cx, refPos.cy, 5, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.globalAlpha = 1.0;
    }

    // Draw ball - theme-aware (pumpkin for Halloween)
    const ballPos = physicalToCanvas(simState.x, simState.y, canvas);
    const ballRadiusPixels = PHYSICS_CONSTANTS.ballRadius * scale;

    // Ball shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(ballPos.cx + 2, ballPos.cy + 2, ballRadiusPixels, 0, 2 * Math.PI);
    ctx.fill();

    // Ball
    const gradient = ctx.createRadialGradient(
      ballPos.cx - ballRadiusPixels * 0.3,
      ballPos.cy - ballRadiusPixels * 0.3,
      ballRadiusPixels * 0.1,
      ballPos.cx,
      ballPos.cy,
      ballRadiusPixels
    );

    if (isHalloween) {
      // Pumpkin gradient
      gradient.addColorStop(0, '#ff8c42');
      gradient.addColorStop(0.5, '#f7931e');
      gradient.addColorStop(1, '#c2410c');

      // Glowing effect
      ctx.shadowColor = '#f7931e';
      ctx.shadowBlur = 25;
    } else {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#991b1b');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ballPos.cx, ballPos.cy, ballRadiusPixels, 0, 2 * Math.PI);
    ctx.fill();

    if (isHalloween) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw pumpkin stem
      ctx.fillStyle = '#166534';
      ctx.fillRect(
        ballPos.cx - ballRadiusPixels * 0.15,
        ballPos.cy - ballRadiusPixels - 5,
        ballRadiusPixels * 0.3,
        6
      );

      // Draw vertical lines (pumpkin ridges)
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        const x = ballPos.cx + (i * ballRadiusPixels * 0.35);
        ctx.beginPath();
        ctx.arc(x, ballPos.cy, ballRadiusPixels * 0.9, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }

      // Draw jack-o-lantern face
      drawPumpkinFace(ctx, ballPos.cx, ballPos.cy, ballRadiusPixels);
    } else {
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Halloween particles
    if (isHalloween) {
      // Update particles
      const now = performance.now();
      const deltaTime = lastParticleUpdate.current ? (now - lastParticleUpdate.current) / 1000 : 0;
      lastParticleUpdate.current = now;

      if (deltaTime > 0 && deltaTime < 0.1) {
        updateParticles(deltaTime, width, height);
      }

      // Draw particles
      particlesRef.current.forEach(p => {
        if (p.type === 'bat') {
          drawBat(ctx, p.x, p.y, p.size, p.angle);
        } else {
          drawGhost(ctx, p.x, p.y, p.size);
        }
      });
    }

    // Draw "Click to set initial position" hint
    if (waitingForInitClick) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click to set initial position', width / 2, height / 2);
    }
  }, [
    simState,
    trajectory,
    currentReference,
    waitingForInitClick,
    controlMode,
    drawingPath,
    isDrawing,
    theme,
    physicalToCanvas,
    drawSpiderWeb,
    drawBat,
    drawGhost,
    drawPumpkinFace,
    updateParticles,
  ]);

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;

      // Scale for high DPI
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = cx * scaleX;
      const canvasY = cy * scaleY;

      const { px, py } = canvasToPhysical(canvasX, canvasY, canvas);

      // Clamp to plate boundaries
      const limit = PHYSICS_CONSTANTS.plateSize / 2 - PHYSICS_CONSTANTS.ballRadius;
      const clampedX = Math.max(-limit, Math.min(limit, px));
      const clampedY = Math.max(-limit, Math.min(limit, py));

      if (controlMode === 'mouse') {
        updateMousePosition(clampedX, clampedY);
      }

      if (isDrawing) {
        addDrawingPoint(clampedX, clampedY);
      }
    },
    [controlMode, isDrawing, canvasToPhysical, updateMousePosition, addDrawingPoint]
  );

  /**
   * Handle click
   */
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = cx * scaleX;
      const canvasY = cy * scaleY;

      const { px, py } = canvasToPhysical(canvasX, canvasY, canvas);

      if (waitingForInitClick) {
        const limit = PHYSICS_CONSTANTS.plateSize / 2 - PHYSICS_CONSTANTS.ballRadius;
        const clampedX = Math.max(-limit, Math.min(limit, px));
        const clampedY = Math.max(-limit, Math.min(limit, py));
        setInitialPosition(clampedX, clampedY);
      }
    },
    [waitingForInitClick, canvasToPhysical, setInitialPosition]
  );

  /**
   * Resize canvas to match display size (high DPI)
   */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Initialize particles on resize if Halloween theme
    if (theme === 'halloween' && particlesRef.current.length === 0) {
      initParticles(canvas.width, canvas.height);
    }

    render();
  }, [render, theme, initParticles]);

  // Setup and render loop
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
};

export default CanvasView;
