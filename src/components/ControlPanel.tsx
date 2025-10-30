/**
 * Control Panel component for Ball and Plate system
 * Provides UI controls for gains, modes, and simulation parameters
 */

import React, { useState } from 'react';
import { useStore } from '../state/store';
import { rad2deg } from '../utils/math';
import { PHYSICS_CONSTANTS } from '../sim/physics';

const ControlPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'control' | 'physics' | 'display'>('control');

  // State
  const simState = useStore((state) => state.simState);
  const currentReference = useStore((state) => state.currentReference);
  const thetaCmd = useStore((state) => state.thetaCmd);
  const phiCmd = useStore((state) => state.phiCmd);
  const isRunning = useStore((state) => state.isRunning);
  const timeScale = useStore((state) => state.timeScale);
  const controllerConfig = useStore((state) => state.controllerConfig);
  const physicsParams = useStore((state) => state.physicsParams);
  const maxTrailLength = useStore((state) => state.maxTrailLength);
  const showAngleChart = useStore((state) => state.showAngleChart);
  const maxAngleHistorySeconds = useStore((state) => state.maxAngleHistorySeconds);
  const controlMode = useStore((state) => state.referenceManager.getMode());
  const referenceManager = useStore((state) => state.referenceManager);

  // Actions
  const togglePlayPause = useStore((state) => state.togglePlayPause);
  const reset = useStore((state) => state.reset);
  const startInitPositionMode = useStore((state) => state.startInitPositionMode);
  const setTimeScale = useStore((state) => state.setTimeScale);
  const setControlMode = useStore((state) => state.setControlMode);
  const setGains = useStore((state) => state.setGains);
  const applyGainPreset = useStore((state) => state.applyGainPreset);
  const setUseFeedforward = useStore((state) => state.setUseFeedforward);
  const setUseSmallAngleApprox = useStore((state) => state.setUseSmallAngleApprox);
  const setMaxRateDegPerSec = useStore((state) => state.setMaxRateDegPerSec);
  const setThetaMaxDeg = useStore((state) => state.setThetaMaxDeg);
  const setEnableDrag = useStore((state) => state.setEnableDrag);
  const setDragCoefficient = useStore((state) => state.setDragCoefficient);
  const setMaxTrailLength = useStore((state) => state.setMaxTrailLength);
  const setShowAngleChart = useStore((state) => state.setShowAngleChart);
  const setMaxAngleHistorySeconds = useStore((state) => state.setMaxAngleHistorySeconds);
  const startDrawing = useStore((state) => state.startDrawing);
  const finishDrawing = useStore((state) => state.finishDrawing);
  const cancelDrawing = useStore((state) => state.cancelDrawing);
  const playDrawing = useStore((state) => state.playDrawing);
  const pauseDrawing = useStore((state) => state.pauseDrawing);
  const resetDrawing = useStore((state) => state.resetDrawing);
  const setDrawingLoop = useStore((state) => state.setDrawingLoop);
  const isDrawing = useStore((state) => state.isDrawing);

  // Computed values
  const errorMagnitude = Math.sqrt(
    Math.pow(simState.x - currentReference.x, 2) + Math.pow(simState.y - currentReference.y, 2)
  );

  const thetaMaxDeg = rad2deg(physicsParams.thetaMax);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold mb-2">Ball & Plate System</h1>
        <p className="text-sm text-gray-400">Control and Monitor</p>
      </div>

      {/* Status Display */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-sm font-semibold mb-2 text-gray-300">Status</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Position:</span>{' '}
            <span className="font-mono">
              ({simState.x.toFixed(3)}, {simState.y.toFixed(3)}) m
            </span>
          </div>
          <div>
            <span className="text-gray-400">Velocity:</span>{' '}
            <span className="font-mono">
              ({simState.vx.toFixed(3)}, {simState.vy.toFixed(3)}) m/s
            </span>
          </div>
          <div>
            <span className="text-gray-400">Angles:</span>{' '}
            <span className="font-mono">
              θ={rad2deg(thetaCmd).toFixed(1)}°, φ={rad2deg(phiCmd).toFixed(1)}°
            </span>
          </div>
          <div>
            <span className="text-gray-400">Error:</span>{' '}
            <span className="font-mono">{(errorMagnitude * 1000).toFixed(1)} mm</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">Time:</span>{' '}
            <span className="font-mono">{simState.time.toFixed(2)} s</span>
          </div>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-sm font-semibold mb-3 text-gray-300">Simulation</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={togglePlayPause}
            className={`px-4 py-2 rounded font-medium ${
              isRunning
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isRunning ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 rounded font-medium bg-red-600 hover:bg-red-700"
          >
            Reset
          </button>
          <button
            onClick={startInitPositionMode}
            className="px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700"
          >
            Set Initial Position
          </button>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-400 mb-1">Time Scale</label>
          <div className="flex gap-2">
            {[0.25, 0.5, 1, 2].map((scale) => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={`px-3 py-1 rounded text-sm ${
                  timeScale === scale
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {scale}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['control', 'physics', 'display'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'control' && (
          <div className="p-4 space-y-4">
            {/* Control Mode */}
            <div>
              <label className="block text-sm font-semibold mb-2">Control Mode</label>
              <select
                value={controlMode}
                onChange={(e) =>
                  setControlMode(e.target.value as 'stabilization' | 'mouse' | 'drawing' | 'manual')
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                <option value="stabilization">Stabilization (Origin)</option>
                <option value="mouse">Mouse Tracking</option>
                <option value="drawing">Drawing Path</option>
                <option value="manual">Manual Control</option>
              </select>
            </div>

            {/* Drawing controls */}
            {controlMode === 'drawing' && (
              <div className="bg-gray-800 p-3 rounded space-y-2">
                <h3 className="text-sm font-semibold">Drawing Mode</h3>
                {!isDrawing && !referenceManager.hasDrawingPath() && (
                  <button
                    onClick={startDrawing}
                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded"
                  >
                    Start Drawing
                  </button>
                )}
                {isDrawing && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">
                      Draw on the canvas, then finish or cancel
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => finishDrawing(10)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        Finish
                      </button>
                      <button
                        onClick={cancelDrawing}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {!isDrawing && referenceManager.hasDrawingPath() && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {!referenceManager.isDrawingActive() ? (
                        <button
                          onClick={playDrawing}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                        >
                          Play
                        </button>
                      ) : (
                        <button
                          onClick={pauseDrawing}
                          className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                        >
                          Pause
                        </button>
                      )}
                      <button
                        onClick={resetDrawing}
                        className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                      >
                        Reset
                      </button>
                    </div>
                    <button
                      onClick={startDrawing}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      Draw New Path
                    </button>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        defaultChecked
                        onChange={(e) => setDrawingLoop(e.target.checked)}
                        className="mr-2"
                      />
                      Loop
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Gain Presets */}
            <div>
              <label className="block text-sm font-semibold mb-2">Gain Presets</label>
              <div className="flex gap-2">
                {(['conservative', 'medium', 'aggressive'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => applyGainPreset(preset)}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm capitalize"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* PD Gains */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">PD Gains</h3>

              {/* Kp_x */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kp_x (Position)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.1"
                    value={controllerConfig.gains.kp_x}
                    onChange={(e) => setGains({ kp_x: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={controllerConfig.gains.kp_x.toFixed(1)}
                    onChange={(e) => setGains({ kp_x: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
                  />
                </div>
              </div>

              {/* Kd_x */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kd_x (Velocity)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={controllerConfig.gains.kd_x}
                    onChange={(e) => setGains({ kd_x: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={controllerConfig.gains.kd_x.toFixed(1)}
                    onChange={(e) => setGains({ kd_x: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
                  />
                </div>
              </div>

              {/* Kp_y */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kp_y (Position)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.1"
                    value={controllerConfig.gains.kp_y}
                    onChange={(e) => setGains({ kp_y: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={controllerConfig.gains.kp_y.toFixed(1)}
                    onChange={(e) => setGains({ kp_y: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
                  />
                </div>
              </div>

              {/* Kd_y */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kd_y (Velocity)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={controllerConfig.gains.kd_y}
                    onChange={(e) => setGains({ kd_y: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={controllerConfig.gains.kd_y.toFixed(1)}
                    onChange={(e) => setGains({ kd_y: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Controller Options */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Controller Options</h3>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={controllerConfig.useFeedforward}
                  onChange={(e) => setUseFeedforward(e.target.checked)}
                  className="mr-2"
                />
                Use Feedforward
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={controllerConfig.useSmallAngleApprox}
                  onChange={(e) => setUseSmallAngleApprox(e.target.checked)}
                  className="mr-2"
                />
                Small Angle Approximation
              </label>
            </div>

            {/* Rate Limiting */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Max Rate (deg/s): {controllerConfig.maxRateDegPerSec}
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={controllerConfig.maxRateDegPerSec}
                onChange={(e) => setMaxRateDegPerSec(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {activeTab === 'physics' && (
          <div className="p-4 space-y-4">
            {/* Physical Constants */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Physical Constants</h3>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-gray-400">Gravity (g):</span>{' '}
                  <span className="font-mono">{PHYSICS_CONSTANTS.g.toFixed(2)} m/s²</span>
                </div>
                <div>
                  <span className="text-gray-400">Ball accel coeff (k):</span>{' '}
                  <span className="font-mono">{PHYSICS_CONSTANTS.k.toFixed(3)} m/s²</span>
                </div>
                <div>
                  <span className="text-gray-400">Plate size (L):</span>{' '}
                  <span className="font-mono">{PHYSICS_CONSTANTS.plateSize.toFixed(2)} m</span>
                </div>
              </div>
            </div>

            {/* Angle Saturation */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Angle Saturation (deg): {thetaMaxDeg.toFixed(1)}
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="0.5"
                value={thetaMaxDeg}
                onChange={(e) => setThetaMaxDeg(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Drag */}
            <div className="space-y-2">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={physicsParams.enableDrag}
                  onChange={(e) => setEnableDrag(e.target.checked)}
                  className="mr-2"
                />
                Enable Air Resistance
              </label>
              {physicsParams.enableDrag && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Drag Coefficient: {physicsParams.dragCoefficient.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={physicsParams.dragCoefficient}
                    onChange={(e) => setDragCoefficient(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="p-4 space-y-4">
            {/* Trail Length */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Trail Length: {maxTrailLength}
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={maxTrailLength}
                onChange={(e) => setMaxTrailLength(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Angle Chart Settings */}
            <div className="space-y-3 pt-2 border-t border-gray-700">
              <h3 className="text-sm font-semibold">Angle Chart</h3>

              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showAngleChart}
                  onChange={(e) => setShowAngleChart(e.target.checked)}
                  className="mr-2"
                />
                Show Angle Chart
              </label>

              {showAngleChart && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Chart History (seconds): {maxAngleHistorySeconds}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={maxAngleHistorySeconds}
                    onChange={(e) => setMaxAngleHistorySeconds(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-xs text-gray-400 space-y-1">
              <p>Angle chart shows θ (red), φ (blue), and error (green) over time</p>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <p className="font-semibold mb-1">Keyboard Shortcuts</p>
        <div className="space-y-0.5">
          <p>
            <kbd className="px-1 bg-gray-700 rounded">Space</kbd> - Play/Pause
          </p>
          <p>
            <kbd className="px-1 bg-gray-700 rounded">R</kbd> - Reset
          </p>
          <p>
            <kbd className="px-1 bg-gray-700 rounded">I</kbd> - Set Initial Position
          </p>
          <p>
            <kbd className="px-1 bg-gray-700 rounded">M</kbd> - Cycle Mode
          </p>
          <p>
            <kbd className="px-1 bg-gray-700 rounded">↑↓←→</kbd> - Manual Control
          </p>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
