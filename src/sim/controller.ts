/**
 * PD Controller with feedforward for Ball and Plate system
 * Computes angle commands based on position/velocity error
 */

import { clamp, RateLimiter } from '../utils/math';
import { PHYSICS_CONSTANTS } from './physics';

/**
 * Reference trajectory
 */
export interface Reference {
  x: number; // m
  y: number; // m
  vx: number; // m/s
  vy: number; // m/s
  ax: number; // m/s^2
  ay: number; // m/s^2
}

/**
 * Controller gains
 */
export interface ControllerGains {
  kp_x: number;
  kd_x: number;
  kp_y: number;
  kd_y: number;
}

/**
 * Controller configuration
 */
export interface ControllerConfig {
  gains: ControllerGains;
  useFeedforward: boolean;
  useSmallAngleApprox: boolean;
  maxRateDegPerSec: number; // deg/s
}

/**
 * Controller state (for rate limiting)
 */
export interface ControllerState {
  theta: number; // rad
  phi: number; // rad
  thetaRateLimiter: RateLimiter;
  phiRateLimiter: RateLimiter;
}

/**
 * Create default controller gains
 */
export function createDefaultGains(): ControllerGains {
  return {
    kp_x: 8.0,
    kd_x: 4.0,
    kp_y: 8.0,
    kd_y: 4.0,
  };
}

/**
 * Gain presets
 */
export const GAIN_PRESETS = {
  conservative: {
    kp_x: 5.0,
    kd_x: 3.0,
    kp_y: 5.0,
    kd_y: 3.0,
  },
  medium: {
    kp_x: 8.0,
    kd_x: 4.0,
    kp_y: 8.0,
    kd_y: 4.0,
  },
  aggressive: {
    kp_x: 12.0,
    kd_x: 6.0,
    kp_y: 12.0,
    kd_y: 6.0,
  },
};

/**
 * Create default controller config
 */
export function createDefaultControllerConfig(): ControllerConfig {
  return {
    gains: createDefaultGains(),
    useFeedforward: true,
    useSmallAngleApprox: false,
    maxRateDegPerSec: 200,
  };
}

/**
 * Create initial controller state
 */
export function createControllerState(maxRateDegPerSec: number): ControllerState {
  return {
    theta: 0,
    phi: 0,
    thetaRateLimiter: new RateLimiter(maxRateDegPerSec, 0),
    phiRateLimiter: new RateLimiter(maxRateDegPerSec, 0),
  };
}

/**
 * Compute PD control with feedforward
 * Returns desired angles (theta, phi) in radians
 */
export function computeControl(
  position: { x: number; y: number },
  velocity: { vx: number; vy: number },
  reference: Reference,
  config: ControllerConfig,
  controllerState: ControllerState,
  dt: number,
  manualInput: { theta: number; phi: number } = { theta: 0, phi: 0 }
): { theta: number; phi: number } {
  const { gains, useFeedforward, useSmallAngleApprox } = config;

  // Position error
  const ex = position.x - reference.x;
  const ey = position.y - reference.y;

  // Velocity error
  const evx = velocity.vx - reference.vx;
  const evy = velocity.vy - reference.vy;

  // Desired acceleration (PD + feedforward)
  let acmdX = -gains.kd_x * evx - gains.kp_x * ex;
  let acmdY = -gains.kd_y * evy - gains.kp_y * ey;

  if (useFeedforward) {
    acmdX += reference.ax;
    acmdY += reference.ay;
  }

  // Convert acceleration command to angle command
  let thetaCmd: number;
  let phiCmd: number;

  if (useSmallAngleApprox) {
    // Small angle approximation: sin(θ) ≈ θ
    // θ = a_cmd / k
    thetaCmd = acmdX / PHYSICS_CONSTANTS.k;
    phiCmd = acmdY / PHYSICS_CONSTANTS.k;
  } else {
    // Exact: θ = arcsin(a_cmd / k)
    // Clamp argument to [-1, 1] to avoid NaN
    const argX = clamp(acmdX / PHYSICS_CONSTANTS.k, -1, 1);
    const argY = clamp(acmdY / PHYSICS_CONSTANTS.k, -1, 1);
    thetaCmd = Math.asin(argX);
    phiCmd = Math.asin(argY);
  }

  // Add manual input
  thetaCmd += manualInput.theta;
  phiCmd += manualInput.phi;

  // Apply rate limiting
  const thetaLimited = controllerState.thetaRateLimiter.update(thetaCmd, dt);
  const phiLimited = controllerState.phiRateLimiter.update(phiCmd, dt);

  // Update controller state
  controllerState.theta = thetaLimited;
  controllerState.phi = phiLimited;

  return {
    theta: thetaLimited,
    phi: phiLimited,
  };
}

/**
 * Reset controller state
 */
export function resetControllerState(state: ControllerState): void {
  state.theta = 0;
  state.phi = 0;
  state.thetaRateLimiter.reset(0);
  state.phiRateLimiter.reset(0);
}

/**
 * Update rate limiter settings
 */
export function updateRateLimiters(
  state: ControllerState,
  maxRateDegPerSec: number
): void {
  state.thetaRateLimiter.setMaxRate(maxRateDegPerSec);
  state.phiRateLimiter.setMaxRate(maxRateDegPerSec);
}
