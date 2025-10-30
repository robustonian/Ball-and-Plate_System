/**
 * Reference trajectory generators for different control modes
 */

import { LowPassFilter, DerivativeEstimator, CubicSpline2D } from '../utils/math';
import { Reference } from './controller';

/**
 * Control mode types
 */
export type ControlMode = 'stabilization' | 'mouse' | 'drawing' | 'manual';

/**
 * Stabilization mode: reference is always at origin
 */
export function createStabilizationReference(): Reference {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
  };
}

/**
 * Mouse tracking reference generator
 * Tracks mouse position with low-pass filtering and velocity/acceleration estimation
 */
export class MouseReferenceGenerator {
  private xFilter: LowPassFilter;
  private yFilter: LowPassFilter;
  private vxEstimator: DerivativeEstimator;
  private vyEstimator: DerivativeEstimator;
  private axEstimator: DerivativeEstimator;
  private ayEstimator: DerivativeEstimator;

  private currentRef: Reference;
  private rawX: number;
  private rawY: number;

  constructor(filterCutoff: number = 4.0) {
    this.xFilter = new LowPassFilter(filterCutoff);
    this.yFilter = new LowPassFilter(filterCutoff);
    this.vxEstimator = new DerivativeEstimator(8);
    this.vyEstimator = new DerivativeEstimator(8);
    this.axEstimator = new DerivativeEstimator(8);
    this.ayEstimator = new DerivativeEstimator(8);

    this.currentRef = createStabilizationReference();
    this.rawX = 0;
    this.rawY = 0;
  }

  /**
   * Update with new mouse position
   */
  setMousePosition(x: number, y: number): void {
    this.rawX = x;
    this.rawY = y;
  }

  /**
   * Update reference with time step
   */
  update(time: number, dt: number): Reference {
    // Apply low-pass filter to position
    const filteredX = this.xFilter.update(this.rawX, dt);
    const filteredY = this.yFilter.update(this.rawY, dt);

    // Estimate velocity
    const vx = this.vxEstimator.update(filteredX, time);
    const vy = this.vyEstimator.update(filteredY, time);

    // Estimate acceleration
    const ax = this.axEstimator.update(vx, time);
    const ay = this.ayEstimator.update(vy, time);

    this.currentRef = {
      x: filteredX,
      y: filteredY,
      vx,
      vy,
      ax,
      ay,
    };

    return this.currentRef;
  }

  getReference(): Reference {
    return this.currentRef;
  }

  reset(): void {
    this.xFilter.reset(0);
    this.yFilter.reset(0);
    this.vxEstimator.reset();
    this.vyEstimator.reset();
    this.axEstimator.reset();
    this.ayEstimator.reset();
    this.currentRef = createStabilizationReference();
    this.rawX = 0;
    this.rawY = 0;
  }
}

/**
 * Drawing mode reference generator
 * Follows a pre-drawn path using spline interpolation
 */
export class DrawingReferenceGenerator {
  private spline: CubicSpline2D | null;
  private duration: number; // seconds
  private startTime: number;
  private isPlaying: boolean;
  private loop: boolean;
  private currentT: number;

  constructor() {
    this.spline = null;
    this.duration = 10; // default 10 seconds
    this.startTime = 0;
    this.isPlaying = false;
    this.loop = true;
    this.currentT = 0;
  }

  /**
   * Set path from points
   */
  setPath(points: Array<{ x: number; y: number }>, duration: number = 10): void {
    if (points.length < 2) {
      this.spline = null;
      return;
    }

    this.spline = new CubicSpline2D(points);
    this.duration = duration;
    this.currentT = 0;
  }

  /**
   * Start playback
   */
  play(currentTime: number): void {
    this.isPlaying = true;
    this.startTime = currentTime - this.currentT * this.duration;
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Reset to start
   */
  reset(): void {
    this.currentT = 0;
    this.isPlaying = false;
  }

  /**
   * Set loop mode
   */
  setLoop(loop: boolean): void {
    this.loop = loop;
  }

  /**
   * Update reference
   */
  update(time: number): Reference {
    if (!this.spline || !this.isPlaying) {
      return createStabilizationReference();
    }

    // Calculate normalized time parameter
    const elapsed = time - this.startTime;
    let t = elapsed / this.duration;

    if (this.loop) {
      t = t - Math.floor(t); // wrap to [0, 1)
    } else {
      t = Math.min(t, 1);
      if (t >= 1) {
        this.isPlaying = false;
      }
    }

    this.currentT = t;

    // Evaluate spline
    const pos = this.spline.evaluate(t);
    const vel = this.spline.evaluateVelocity(t);
    const acc = this.spline.evaluateAcceleration(t);

    // Scale velocity and acceleration by duration (chain rule)
    const timeScale = 1 / this.duration;
    const vel2Scale = timeScale * timeScale;

    return {
      x: pos.x,
      y: pos.y,
      vx: vel.x * timeScale,
      vy: vel.y * timeScale,
      ax: acc.x * vel2Scale,
      ay: acc.y * vel2Scale,
    };
  }

  isActive(): boolean {
    return this.isPlaying && this.spline !== null;
  }

  hasPath(): boolean {
    return this.spline !== null;
  }
}

/**
 * Reference manager - coordinates all reference generators
 */
export class ReferenceManager {
  private mode: ControlMode;
  private mouseGenerator: MouseReferenceGenerator;
  private drawingGenerator: DrawingReferenceGenerator;

  constructor() {
    this.mode = 'stabilization';
    this.mouseGenerator = new MouseReferenceGenerator();
    this.drawingGenerator = new DrawingReferenceGenerator();
  }

  setMode(mode: ControlMode): void {
    this.mode = mode;
  }

  getMode(): ControlMode {
    return this.mode;
  }

  /**
   * Update mouse position for mouse tracking mode
   */
  updateMousePosition(x: number, y: number): void {
    this.mouseGenerator.setMousePosition(x, y);
  }

  /**
   * Set drawing path
   */
  setDrawingPath(points: Array<{ x: number; y: number }>, duration?: number): void {
    this.drawingGenerator.setPath(points, duration);
  }

  /**
   * Control drawing playback
   */
  playDrawing(currentTime: number): void {
    this.drawingGenerator.play(currentTime);
  }

  pauseDrawing(): void {
    this.drawingGenerator.pause();
  }

  resetDrawing(): void {
    this.drawingGenerator.reset();
  }

  setDrawingLoop(loop: boolean): void {
    this.drawingGenerator.setLoop(loop);
  }

  isDrawingActive(): boolean {
    return this.drawingGenerator.isActive();
  }

  hasDrawingPath(): boolean {
    return this.drawingGenerator.hasPath();
  }

  /**
   * Get current reference based on mode
   */
  getReference(time: number, dt: number): Reference {
    switch (this.mode) {
      case 'stabilization':
        return createStabilizationReference();

      case 'mouse':
        return this.mouseGenerator.update(time, dt);

      case 'drawing':
        return this.drawingGenerator.update(time);

      case 'manual':
        // Manual mode: no automatic reference, use stabilization as base
        return createStabilizationReference();

      default:
        return createStabilizationReference();
    }
  }

  /**
   * Reset all generators
   */
  reset(): void {
    this.mouseGenerator.reset();
    this.drawingGenerator.reset();
  }
}
