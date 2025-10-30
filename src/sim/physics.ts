/**
 * Physics simulation for the Ball and Plate system
 * Implements the dynamics and numerical integration
 */

import { clamp } from '../utils/math';

/**
 * Physical constants
 */
export const PHYSICS_CONSTANTS = {
  g: 9.81, // m/s^2
  k: (5 / 7) * 9.81, // solid sphere: k = (5/7)g ≈ 7.007 m/s^2
  plateSize: 0.5, // m (square plate, L = 0.5m)
  ballRadius: 0.02, // m (visual only, doesn't affect dynamics)
  boundaryRestitution: 0.4, // coefficient for velocity damping on collision
  dragCoefficient: 0.05, // air resistance coefficient (optional)
};

/**
 * Simulation state
 */
export interface SimulationState {
  x: number; // m
  y: number; // m
  vx: number; // m/s
  vy: number; // m/s
  time: number; // s
}

/**
 * Control inputs (plate angles in radians)
 */
export interface ControlInput {
  theta: number; // pitch angle (around x-axis), rad
  phi: number; // roll angle (around y-axis), rad
}

/**
 * Physics parameters
 */
export interface PhysicsParams {
  enableDrag: boolean;
  dragCoefficient: number;
  thetaMax: number; // rad
  phiMax: number; // rad
}

/**
 * Derivative function for the ball dynamics
 * dx/dt = vx
 * dy/dt = vy
 * dvx/dt = k * sin(theta) - c_d * vx (if drag enabled)
 * dvy/dt = k * sin(phi) - c_d * vy (if drag enabled)
 */
function derivative(
  state: SimulationState,
  input: ControlInput,
  params: PhysicsParams
): { dx: number; dy: number; dvx: number; dvy: number } {
  const { theta, phi } = input;
  const { vx, vy } = state;

  // Acceleration due to plate tilt
  let ax = PHYSICS_CONSTANTS.k * Math.sin(theta);
  let ay = PHYSICS_CONSTANTS.k * Math.sin(phi);

  // Optional air resistance
  if (params.enableDrag) {
    ax -= params.dragCoefficient * vx;
    ay -= params.dragCoefficient * vy;
  }

  return {
    dx: vx,
    dy: vy,
    dvx: ax,
    dvy: ay,
  };
}

/**
 * 4th-order Runge-Kutta integration step
 */
export function rk4Step(
  state: SimulationState,
  input: ControlInput,
  params: PhysicsParams,
  dt: number
): SimulationState {
  // Clamp input angles to saturation limits
  const clampedInput: ControlInput = {
    theta: clamp(input.theta, -params.thetaMax, params.thetaMax),
    phi: clamp(input.phi, -params.phiMax, params.phiMax),
  };

  // k1
  const k1 = derivative(state, clampedInput, params);

  // k2
  const state2: SimulationState = {
    x: state.x + 0.5 * dt * k1.dx,
    y: state.y + 0.5 * dt * k1.dy,
    vx: state.vx + 0.5 * dt * k1.dvx,
    vy: state.vy + 0.5 * dt * k1.dvy,
    time: state.time + 0.5 * dt,
  };
  const k2 = derivative(state2, clampedInput, params);

  // k3
  const state3: SimulationState = {
    x: state.x + 0.5 * dt * k2.dx,
    y: state.y + 0.5 * dt * k2.dy,
    vx: state.vx + 0.5 * dt * k2.dvx,
    vy: state.vy + 0.5 * dt * k2.dvy,
    time: state.time + 0.5 * dt,
  };
  const k3 = derivative(state3, clampedInput, params);

  // k4
  const state4: SimulationState = {
    x: state.x + dt * k3.dx,
    y: state.y + dt * k3.dy,
    vx: state.vx + dt * k3.dvx,
    vy: state.vy + dt * k3.dvy,
    time: state.time + dt,
  };
  const k4 = derivative(state4, clampedInput, params);

  // Combine
  const newState: SimulationState = {
    x: state.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: state.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    vx: state.vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
    vy: state.vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy),
    time: state.time + dt,
  };

  return newState;
}

/**
 * Handle boundary collisions
 * Clamps position to plate boundaries and reflects velocity with damping
 */
export function handleBoundaryCollision(state: SimulationState): SimulationState {
  const halfSize = PHYSICS_CONSTANTS.plateSize / 2;
  const margin = PHYSICS_CONSTANTS.ballRadius;
  const limit = halfSize - margin;

  let { x, y, vx, vy } = state;

  // X boundaries
  if (x < -limit) {
    x = -limit;
    vx = -vx * PHYSICS_CONSTANTS.boundaryRestitution;
  } else if (x > limit) {
    x = limit;
    vx = -vx * PHYSICS_CONSTANTS.boundaryRestitution;
  }

  // Y boundaries
  if (y < -limit) {
    y = -limit;
    vy = -vy * PHYSICS_CONSTANTS.boundaryRestitution;
  } else if (y > limit) {
    y = limit;
    vy = -vy * PHYSICS_CONSTANTS.boundaryRestitution;
  }

  return { ...state, x, y, vx, vy };
}

/**
 * Initialize simulation state
 */
export function createInitialState(): SimulationState {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    time: 0,
  };
}

/**
 * Create default physics parameters
 */
export function createDefaultPhysicsParams(thetaMaxDeg: number = 15): PhysicsParams {
  return {
    enableDrag: false,
    dragCoefficient: PHYSICS_CONSTANTS.dragCoefficient,
    thetaMax: (thetaMaxDeg * Math.PI) / 180,
    phiMax: (thetaMaxDeg * Math.PI) / 180,
  };
}
