/**
 * Zustand store for Ball and Plate system state management
 */

import { create } from 'zustand';
import {
  SimulationState,
  PhysicsParams,
  createInitialState,
  createDefaultPhysicsParams,
  rk4Step,
  handleBoundaryCollision,
  PHYSICS_CONSTANTS,
} from '../sim/physics';
import {
  ControllerConfig,
  ControllerState,
  ControllerGains,
  Reference,
  createDefaultControllerConfig,
  createControllerState,
  computeControl,
  resetControllerState,
  updateRateLimiters,
  GAIN_PRESETS,
} from '../sim/controller';
import { ReferenceManager, ControlMode } from '../sim/reference';
import { deg2rad, rad2deg } from '../utils/math';

/**
 * Trajectory point for trail rendering
 */
interface TrajectoryPoint {
  x: number;
  y: number;
  time: number;
}

/**
 * Application state
 */
interface AppState {
  // Simulation state
  simState: SimulationState;
  physicsParams: PhysicsParams;
  controllerConfig: ControllerConfig;
  controllerState: ControllerState;
  referenceManager: ReferenceManager;

  // Current reference
  currentReference: Reference;

  // Control outputs
  thetaCmd: number; // rad
  phiCmd: number; // rad

  // Manual input
  manualTheta: number; // rad
  manualPhi: number; // rad
  manualRateDegPerSec: number;

  // Simulation control
  isRunning: boolean;
  timeScale: number;
  lastUpdateTime: number;

  // Trajectory trail
  trajectory: TrajectoryPoint[];
  maxTrailLength: number;

  // UI state
  waitingForInitClick: boolean;
  mousePhysicalPos: { x: number; y: number } | null;

  // Drawing mode
  drawingPath: Array<{ x: number; y: number }>;
  isDrawing: boolean;

  // Actions
  reset: () => void;
  setInitialPosition: (x: number, y: number) => void;
  startInitPositionMode: () => void;
  togglePlayPause: () => void;
  setTimeScale: (scale: number) => void;
  step: (deltaTime: number) => void;
  updateMousePosition: (x: number, y: number) => void;
  setControlMode: (mode: ControlMode) => void;
  setGains: (gains: Partial<ControllerGains>) => void;
  applyGainPreset: (preset: 'conservative' | 'medium' | 'aggressive') => void;
  setUseFeedforward: (use: boolean) => void;
  setUseSmallAngleApprox: (use: boolean) => void;
  setMaxRateDegPerSec: (rate: number) => void;
  setThetaMaxDeg: (deg: number) => void;
  setEnableDrag: (enable: boolean) => void;
  setDragCoefficient: (coeff: number) => void;
  setMaxTrailLength: (length: number) => void;
  setManualInput: (theta: number, phi: number) => void;
  addManualInput: (dTheta: number, dPhi: number) => void;
  startDrawing: () => void;
  addDrawingPoint: (x: number, y: number) => void;
  finishDrawing: (duration?: number) => void;
  cancelDrawing: () => void;
  playDrawing: () => void;
  pauseDrawing: () => void;
  resetDrawing: () => void;
  setDrawingLoop: (loop: boolean) => void;
}

/**
 * Physics timestep (400 Hz)
 */
const PHYSICS_DT = 0.0025;

/**
 * Maximum substeps per frame to prevent spiral of death
 */
const MAX_SUBSTEPS = 20;

/**
 * Create the store
 */
export const useStore = create<AppState>((set, get) => ({
  // Initial state
  simState: createInitialState(),
  physicsParams: createDefaultPhysicsParams(15),
  controllerConfig: createDefaultControllerConfig(),
  controllerState: createControllerState(200),
  referenceManager: new ReferenceManager(),
  currentReference: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
  },
  thetaCmd: 0,
  phiCmd: 0,
  manualTheta: 0,
  manualPhi: 0,
  manualRateDegPerSec: 30,
  isRunning: false,
  timeScale: 1.0,
  lastUpdateTime: 0,
  trajectory: [],
  maxTrailLength: 500,
  waitingForInitClick: false,
  mousePhysicalPos: null,
  drawingPath: [],
  isDrawing: false,

  // Actions
  reset: () => {
    const state = get();
    const newSimState = createInitialState();
    resetControllerState(state.controllerState);
    state.referenceManager.reset();

    set({
      simState: newSimState,
      trajectory: [],
      thetaCmd: 0,
      phiCmd: 0,
      manualTheta: 0,
      manualPhi: 0,
      currentReference: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
      },
    });
  },

  setInitialPosition: (x: number, y: number) => {
    const state = get();
    const newSimState: SimulationState = {
      x,
      y,
      vx: 0,
      vy: 0,
      time: 0,
    };
    resetControllerState(state.controllerState);

    set({
      simState: newSimState,
      trajectory: [{ x, y, time: 0 }],
      waitingForInitClick: false,
      thetaCmd: 0,
      phiCmd: 0,
    });
  },

  startInitPositionMode: () => {
    set({ waitingForInitClick: true });
  },

  togglePlayPause: () => {
    set((state) => ({ isRunning: !state.isRunning }));
  },

  setTimeScale: (scale: number) => {
    set({ timeScale: scale });
  },

  step: (deltaTime: number) => {
    const state = get();

    if (!state.isRunning) return;

    const scaledDelta = deltaTime * state.timeScale;
    const numSubsteps = Math.min(Math.ceil(scaledDelta / PHYSICS_DT), MAX_SUBSTEPS);
    const dt = scaledDelta / numSubsteps;

    let currentState = state.simState;
    let currentControllerState = state.controllerState;

    // Get reference for this timestep
    const reference = state.referenceManager.getReference(currentState.time, dt);

    for (let i = 0; i < numSubsteps; i++) {
      // Compute control
      const manualInput =
        state.referenceManager.getMode() === 'manual'
          ? { theta: state.manualTheta, phi: state.manualPhi }
          : { theta: 0, phi: 0 };

      const control = computeControl(
        { x: currentState.x, y: currentState.y },
        { vx: currentState.vx, vy: currentState.vy },
        reference,
        state.controllerConfig,
        currentControllerState,
        dt,
        manualInput
      );

      // Physics step
      let newState = rk4Step(currentState, control, state.physicsParams, dt);

      // Handle boundary collisions
      newState = handleBoundaryCollision(newState);

      currentState = newState;
    }

    // Update trajectory
    const newTrajectory = [
      ...state.trajectory,
      {
        x: currentState.x,
        y: currentState.y,
        time: currentState.time,
      },
    ];

    // Trim trajectory to max length
    const trimmedTrajectory =
      newTrajectory.length > state.maxTrailLength
        ? newTrajectory.slice(-state.maxTrailLength)
        : newTrajectory;

    set({
      simState: currentState,
      trajectory: trimmedTrajectory,
      currentReference: reference,
      thetaCmd: currentControllerState.theta,
      phiCmd: currentControllerState.phi,
    });
  },

  updateMousePosition: (x: number, y: number) => {
    const state = get();
    state.referenceManager.updateMousePosition(x, y);
    set({ mousePhysicalPos: { x, y } });
  },

  setControlMode: (mode: ControlMode) => {
    const state = get();
    state.referenceManager.setMode(mode);
    set({});
  },

  setGains: (gains: Partial<ControllerGains>) => {
    set((state) => ({
      controllerConfig: {
        ...state.controllerConfig,
        gains: {
          ...state.controllerConfig.gains,
          ...gains,
        },
      },
    }));
  },

  applyGainPreset: (preset: 'conservative' | 'medium' | 'aggressive') => {
    set((state) => ({
      controllerConfig: {
        ...state.controllerConfig,
        gains: { ...GAIN_PRESETS[preset] },
      },
    }));
  },

  setUseFeedforward: (use: boolean) => {
    set((state) => ({
      controllerConfig: {
        ...state.controllerConfig,
        useFeedforward: use,
      },
    }));
  },

  setUseSmallAngleApprox: (use: boolean) => {
    set((state) => ({
      controllerConfig: {
        ...state.controllerConfig,
        useSmallAngleApprox: use,
      },
    }));
  },

  setMaxRateDegPerSec: (rate: number) => {
    const state = get();
    updateRateLimiters(state.controllerState, rate);
    set((state) => ({
      controllerConfig: {
        ...state.controllerConfig,
        maxRateDegPerSec: rate,
      },
    }));
  },

  setThetaMaxDeg: (deg: number) => {
    const rad = deg2rad(deg);
    set((state) => ({
      physicsParams: {
        ...state.physicsParams,
        thetaMax: rad,
        phiMax: rad,
      },
    }));
  },

  setEnableDrag: (enable: boolean) => {
    set((state) => ({
      physicsParams: {
        ...state.physicsParams,
        enableDrag: enable,
      },
    }));
  },

  setDragCoefficient: (coeff: number) => {
    set((state) => ({
      physicsParams: {
        ...state.physicsParams,
        dragCoefficient: coeff,
      },
    }));
  },

  setMaxTrailLength: (length: number) => {
    set({ maxTrailLength: length });
  },

  setManualInput: (theta: number, phi: number) => {
    set({ manualTheta: theta, manualPhi: phi });
  },

  addManualInput: (dTheta: number, dPhi: number) => {
    set((state) => ({
      manualTheta: state.manualTheta + dTheta,
      manualPhi: state.manualPhi + dPhi,
    }));
  },

  startDrawing: () => {
    set({ isDrawing: true, drawingPath: [] });
  },

  addDrawingPoint: (x: number, y: number) => {
    set((state) => ({
      drawingPath: [...state.drawingPath, { x, y }],
    }));
  },

  finishDrawing: (duration = 10) => {
    const state = get();
    if (state.drawingPath.length >= 2) {
      state.referenceManager.setDrawingPath(state.drawingPath, duration);
    }
    set({ isDrawing: false });
  },

  cancelDrawing: () => {
    set({ isDrawing: false, drawingPath: [] });
  },

  playDrawing: () => {
    const state = get();
    state.referenceManager.playDrawing(state.simState.time);
  },

  pauseDrawing: () => {
    const state = get();
    state.referenceManager.pauseDrawing();
  },

  resetDrawing: () => {
    const state = get();
    state.referenceManager.resetDrawing();
  },

  setDrawingLoop: (loop: boolean) => {
    const state = get();
    state.referenceManager.setDrawingLoop(loop);
  },
}));
