/**
 * Math utilities for the Ball and Plate system
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert degrees to radians
 */
export function deg2rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function rad2deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * First-order low-pass filter (IIR)
 * y[n] = alpha * x[n] + (1 - alpha) * y[n-1]
 * where alpha = dt / (dt + tau), tau = 1 / (2 * pi * fc)
 */
export class LowPassFilter {
  private y: number;
  private tau: number;

  constructor(cutoffFrequency: number, initialValue: number = 0) {
    this.tau = 1 / (2 * Math.PI * cutoffFrequency);
    this.y = initialValue;
  }

  update(x: number, dt: number): number {
    const alpha = dt / (dt + this.tau);
    this.y = alpha * x + (1 - alpha) * this.y;
    return this.y;
  }

  reset(value: number = 0): void {
    this.y = value;
  }

  getValue(): number {
    return this.y;
  }
}

/**
 * Simple derivative estimator with smoothing
 */
export class DerivativeEstimator {
  private prevValue: number;
  private prevTime: number;
  private derivative: number;
  private filter: LowPassFilter;
  private initialized: boolean;

  constructor(filterCutoff: number = 10) {
    this.prevValue = 0;
    this.prevTime = 0;
    this.derivative = 0;
    this.filter = new LowPassFilter(filterCutoff);
    this.initialized = false;
  }

  update(value: number, time: number): number {
    if (!this.initialized) {
      this.prevValue = value;
      this.prevTime = time;
      this.initialized = true;
      return 0;
    }

    const dt = time - this.prevTime;
    if (dt > 0) {
      const rawDerivative = (value - this.prevValue) / dt;
      this.derivative = this.filter.update(rawDerivative, dt);
      this.prevValue = value;
      this.prevTime = time;
    }

    return this.derivative;
  }

  reset(): void {
    this.initialized = false;
    this.derivative = 0;
    this.filter.reset(0);
  }

  getValue(): number {
    return this.derivative;
  }
}

/**
 * Rate limiter for angle commands
 * Limits the rate of change of a signal
 */
export class RateLimiter {
  private prevValue: number;
  private maxRate: number; // rad/s

  constructor(maxRateDegPerSec: number, initialValue: number = 0) {
    this.maxRate = deg2rad(maxRateDegPerSec);
    this.prevValue = initialValue;
  }

  update(target: number, dt: number): number {
    const maxChange = this.maxRate * dt;
    const delta = target - this.prevValue;
    const limitedDelta = clamp(delta, -maxChange, maxChange);
    this.prevValue = this.prevValue + limitedDelta;
    return this.prevValue;
  }

  reset(value: number = 0): void {
    this.prevValue = value;
  }

  setMaxRate(maxRateDegPerSec: number): void {
    this.maxRate = deg2rad(maxRateDegPerSec);
  }
}

/**
 * Cubic spline interpolation for smooth path following
 * Simplified implementation for 2D paths
 */
export class CubicSpline2D {
  private points: Array<{ x: number; y: number }>;
  private totalLength: number;
  private distances: number[];

  constructor(points: Array<{ x: number; y: number }>) {
    this.points = points;
    this.distances = [0];
    this.totalLength = 0;

    // Calculate cumulative distances
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.totalLength += dist;
      this.distances.push(this.totalLength);
    }
  }

  /**
   * Evaluate position at normalized parameter t ∈ [0, 1]
   */
  evaluate(t: number): { x: number; y: number } {
    if (this.points.length === 0) return { x: 0, y: 0 };
    if (this.points.length === 1) return this.points[0];

    t = clamp(t, 0, 1);
    const targetDist = t * this.totalLength;

    // Find segment
    let segmentIndex = 0;
    for (let i = 0; i < this.distances.length - 1; i++) {
      if (targetDist <= this.distances[i + 1]) {
        segmentIndex = i;
        break;
      }
    }

    if (segmentIndex >= this.points.length - 1) {
      return this.points[this.points.length - 1];
    }

    // Linear interpolation within segment (simplified - true cubic would be more complex)
    const segmentStart = this.distances[segmentIndex];
    const segmentEnd = this.distances[segmentIndex + 1];
    const segmentLength = segmentEnd - segmentStart;
    const localT = segmentLength > 0 ? (targetDist - segmentStart) / segmentLength : 0;

    const p0 = this.points[segmentIndex];
    const p1 = this.points[segmentIndex + 1];

    return {
      x: p0.x + (p1.x - p0.x) * localT,
      y: p0.y + (p1.y - p0.y) * localT,
    };
  }

  /**
   * Estimate velocity at parameter t (numerical derivative)
   */
  evaluateVelocity(t: number, dt: number = 0.001): { x: number; y: number } {
    const p1 = this.evaluate(t);
    const p2 = this.evaluate(t + dt);
    return {
      x: (p2.x - p1.x) / dt,
      y: (p2.y - p1.y) / dt,
    };
  }

  /**
   * Estimate acceleration at parameter t (numerical second derivative)
   */
  evaluateAcceleration(t: number, dt: number = 0.001): { x: number; y: number } {
    const v1 = this.evaluateVelocity(t, dt);
    const v2 = this.evaluateVelocity(t + dt, dt);
    return {
      x: (v2.x - v1.x) / dt,
      y: (v2.y - v1.y) / dt,
    };
  }

  getLength(): number {
    return this.totalLength;
  }
}
