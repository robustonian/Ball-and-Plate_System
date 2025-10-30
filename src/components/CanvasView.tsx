/**
 * Canvas component for rendering the Ball and Plate system
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../state/store';
import { PHYSICS_CONSTANTS } from '../sim/physics';

const CanvasView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to relevant state
  const simState = useStore((state) => state.simState);
  const trajectory = useStore((state) => state.trajectory);
  const currentReference = useStore((state) => state.currentReference);
  const waitingForInitClick = useStore((state) => state.waitingForInitClick);
  const mousePhysicalPos = useStore((state) => state.mousePhysicalPos);
  const controlMode = useStore((state) => state.referenceManager.getMode());
  const drawingPath = useStore((state) => state.drawingPath);
  const isDrawing = useStore((state) => state.isDrawing);

  // Actions
  const updateMousePosition = useStore((state) => state.updateMousePosition);
  const setInitialPosition = useStore((state) => state.setInitialPosition);
  const addDrawingPoint = useStore((state) => state.addDrawingPoint);

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

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw plate boundary
    const plateHalf = PHYSICS_CONSTANTS.plateSize / 2;
    const topLeft = physicalToCanvas(-plateHalf, plateHalf, canvas);
    const bottomRight = physicalToCanvas(plateHalf, -plateHalf, canvas);
    const plateWidth = bottomRight.cx - topLeft.cx;
    const plateHeight = bottomRight.cy - topLeft.cy;

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(topLeft.cx, topLeft.cy, plateWidth, plateHeight);

    // Draw grid
    ctx.strokeStyle = '#2d3748';
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

    // Draw trajectory trail
    if (trajectory.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      const firstPoint = physicalToCanvas(trajectory[0].x, trajectory[0].y, canvas);
      ctx.moveTo(firstPoint.cx, firstPoint.cy);
      for (let i = 1; i < trajectory.length; i++) {
        const point = physicalToCanvas(trajectory[i].x, trajectory[i].y, canvas);
        ctx.lineTo(point.cx, point.cy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
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

    // Draw ball
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
    gradient.addColorStop(0, '#ef4444');
    gradient.addColorStop(1, '#991b1b');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ballPos.cx, ballPos.cy, ballRadiusPixels, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1;
    ctx.stroke();

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
    physicalToCanvas,
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

    render();
  }, [render]);

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
