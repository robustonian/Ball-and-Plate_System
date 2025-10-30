/**
 * Chart component for rendering angle history
 * Displays θ, φ, and error over time
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../state/store';
import { rad2deg } from '../utils/math';

const ChartView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to relevant state
  const angleHistory = useStore((state) => state.angleHistory);
  const maxAngleHistorySeconds = useStore((state) => state.maxAngleHistorySeconds);
  const physicsParams = useStore((state) => state.physicsParams);
  const currentTime = useStore((state) => state.simState.time);

  /**
   * Render the chart
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Define chart area (with margins for labels)
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Draw chart background
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(margin.left, margin.top, chartWidth, chartHeight);

    // No data to display
    if (angleHistory.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No data - Start simulation to see angles', width / 2, height / 2);
      return;
    }

    // Determine time range
    const timeEnd = currentTime;
    const timeStart = timeEnd - maxAngleHistorySeconds;

    // Determine angle range (in degrees)
    const thetaMaxDeg = rad2deg(physicsParams.thetaMax);
    const angleMin = -thetaMaxDeg * 1.2; // 20% margin
    const angleMax = thetaMaxDeg * 1.2;

    // Helper functions for coordinate conversion
    const timeToX = (time: number): number => {
      const t = (time - timeStart) / maxAngleHistorySeconds;
      return margin.left + t * chartWidth;
    };

    const angleToY = (angleDeg: number): number => {
      const t = (angleDeg - angleMin) / (angleMax - angleMin);
      return margin.top + chartHeight - t * chartHeight; // flip y-axis
    };

    const errorToY = (errorMeters: number): number => {
      // Map error to the same range as angles for visibility
      // Assume max error of 0.5m maps to full range
      const maxError = 0.5;
      const normalizedError = (errorMeters / maxError) * (angleMax - angleMin);
      return angleToY(normalizedError + angleMin);
    };

    // Draw grid lines
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Horizontal grid lines (every 5 degrees)
    const gridStep = 5;
    for (let angleDeg = Math.ceil(angleMin / gridStep) * gridStep; angleDeg <= angleMax; angleDeg += gridStep) {
      const y = angleToY(angleDeg);

      // Emphasize zero line
      if (Math.abs(angleDeg) < 0.1) {
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${angleDeg.toFixed(0)}°`, margin.left - 5, y);
    }

    // Draw saturation lines
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const saturationPosY = angleToY(thetaMaxDeg);
    const saturationNegY = angleToY(-thetaMaxDeg);

    ctx.beginPath();
    ctx.moveTo(margin.left, saturationPosY);
    ctx.lineTo(margin.left + chartWidth, saturationPosY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin.left, saturationNegY);
    ctx.lineTo(margin.left + chartWidth, saturationNegY);
    ctx.stroke();

    ctx.setLineDash([]);

    // Vertical grid lines (time)
    const timeGridStep = maxAngleHistorySeconds <= 10 ? 1 : 2;
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;

    for (let t = Math.ceil(timeStart); t <= timeEnd; t += timeGridStep) {
      const x = timeToX(t);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${t.toFixed(0)}s`, x, margin.top + chartHeight + 5);
    }

    // Draw chart border
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin.left, margin.top, chartWidth, chartHeight);

    // Plot data lines
    const plotLine = (
      getData: (point: { time: number; theta: number; phi: number; error: number }) => number,
      color: string,
      lineWidth: number = 2
    ) => {
      if (angleHistory.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      let started = false;
      for (let i = 0; i < angleHistory.length; i++) {
        const point = angleHistory[i];
        if (point.time < timeStart) continue;

        const x = timeToX(point.time);
        const value = getData(point);
        const y = value;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }

      if (started) {
        ctx.stroke();
      }
    };

    // Plot θ (theta) - red
    plotLine((point) => angleToY(rad2deg(point.theta)), '#ef4444', 2.5);

    // Plot φ (phi) - blue
    plotLine((point) => angleToY(rad2deg(point.phi)), '#3b82f6', 2.5);

    // Plot error - green (scaled)
    plotLine((point) => errorToY(point.error), '#10b981', 2);

    // Draw legend
    const legendX = margin.left + 10;
    const legendY = margin.top + 10;
    const legendSpacing = 80;

    const drawLegendItem = (label: string, color: string, x: number, y: number) => {
      // Line sample
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 25, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 30, y);
    };

    drawLegendItem('θ (theta)', '#ef4444', legendX, legendY);
    drawLegendItem('φ (phi)', '#3b82f6', legendX + legendSpacing, legendY);
    drawLegendItem('error', '#10b981', legendX + legendSpacing * 2, legendY);

    // Draw axis labels
    ctx.fillStyle = '#d1d5db';
    ctx.font = 'bold 13px sans-serif';

    // Y-axis label
    ctx.save();
    ctx.translate(15, margin.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Angle (degrees)', 0, 0);
    ctx.restore();

    // X-axis label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Time (seconds)', margin.left + chartWidth / 2, height - 5);

    // Draw current values in top-right corner
    if (angleHistory.length > 0) {
      const latest = angleHistory[angleHistory.length - 1];
      const valuesX = width - margin.right - 10;
      const valuesY = margin.top + 10;

      ctx.textAlign = 'right';
      ctx.font = '11px monospace';

      ctx.fillStyle = '#ef4444';
      ctx.fillText(`θ: ${rad2deg(latest.theta).toFixed(2)}°`, valuesX, valuesY);

      ctx.fillStyle = '#3b82f6';
      ctx.fillText(`φ: ${rad2deg(latest.phi).toFixed(2)}°`, valuesX, valuesY + 15);

      ctx.fillStyle = '#10b981';
      ctx.fillText(`err: ${(latest.error * 1000).toFixed(1)}mm`, valuesX, valuesY + 30);
    }
  }, [angleHistory, maxAngleHistorySeconds, physicsParams, currentTime]);

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
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

export default ChartView;
