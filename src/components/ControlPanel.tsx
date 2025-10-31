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
  const [gcodeDuration, setGcodeDurationLocal] = useState(15);
  const [imageOptions, setImageOptions] = useState({
    edgeThreshold: 128,
    pointReduction: 0.01,
    targetSize: 0.4,
  });

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
  const showThreeView = useStore((state) => state.showThreeView);
  const threeViewSize = useStore((state) => state.threeViewSize);
  const controlMode = useStore((state) => state.referenceManager.getMode());
  const referenceManager = useStore((state) => state.referenceManager);
  const theme = useStore((state) => state.theme);

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
  const setShowThreeView = useStore((state) => state.setShowThreeView);
  const setThreeViewSize = useStore((state) => state.setThreeViewSize);
  const startDrawing = useStore((state) => state.startDrawing);
  const finishDrawing = useStore((state) => state.finishDrawing);
  const cancelDrawing = useStore((state) => state.cancelDrawing);
  const playDrawing = useStore((state) => state.playDrawing);
  const pauseDrawing = useStore((state) => state.pauseDrawing);
  const resetDrawing = useStore((state) => state.resetDrawing);
  const setDrawingLoop = useStore((state) => state.setDrawingLoop);
  const isDrawing = useStore((state) => state.isDrawing);
  const gcodeMetadata = useStore((state) => state.gcodeMetadata);
  const gcodeProcessing = useStore((state) => state.gcodeProcessing);
  const loadGCodeFromFile = useStore((state) => state.loadGCodeFromFile);
  const generateGCodeFromImage = useStore((state) => state.generateGCodeFromImage);
  const playGCode = useStore((state) => state.playGCode);
  const pauseGCode = useStore((state) => state.pauseGCode);
  const resetGCode = useStore((state) => state.resetGCode);
  const setGCodeLoop = useStore((state) => state.setGCodeLoop);
  const setGCodeDuration = useStore((state) => state.setGCodeDuration);
  const clearGCode = useStore((state) => state.clearGCode);
  const toggleTheme = useStore((state) => state.toggleTheme);

  // Computed values
  const errorMagnitude = Math.sqrt(
    Math.pow(simState.x - currentReference.x, 2) + Math.pow(simState.y - currentReference.y, 2)
  );

  const thetaMaxDeg = rad2deg(physicsParams.thetaMax);

  // File upload handlers
  const handleGCodeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await loadGCodeFromFile(file);
    } catch (error) {
      alert(`Failed to load G-code file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    e.target.value = ''; // Reset input
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await generateGCodeFromImage(file, imageOptions);
    } catch (error) {
      alert(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    e.target.value = ''; // Reset input
  };

  const handleGCodeDurationChange = (newDuration: number) => {
    setGcodeDurationLocal(newDuration);
    setGCodeDuration(newDuration);
  };

  const isHalloween = theme === 'halloween';

  // Theme-aware colors
  const bgColor = isHalloween ? 'bg-spooky-700' : 'bg-gray-900';
  const bgAlt = isHalloween ? 'bg-spooky-600' : 'bg-gray-800';
  const borderColor = isHalloween ? 'border-pumpkin-600' : 'border-gray-700';
  const textMuted = isHalloween ? 'text-pumpkin-200' : 'text-gray-400';
  const btnPrimary = isHalloween ? 'bg-pumpkin-600 hover:bg-pumpkin-700' : 'bg-green-600 hover:bg-green-700';
  const btnSecondary = isHalloween ? 'bg-spooky-500 hover:bg-spooky-400' : 'bg-red-600 hover:bg-red-700';
  const btnInfo = isHalloween ? 'bg-spooky-400 hover:bg-spooky-500 border border-pumpkin-500' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className={`flex flex-col h-full ${bgColor} text-white overflow-y-auto`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          {isHalloween && <span>🎃</span>}
          Ball & Plate System
          {isHalloween && <span>🎃</span>}
        </h1>
        <p className={`text-sm ${textMuted}`}>
          {isHalloween ? '🦇 Spooky Control & Monitor 👻' : 'Control and Monitor'}
        </p>
      </div>

      {/* Status Display */}
      <div className={`p-4 ${bgAlt} border-b ${borderColor}`}>
        <h2 className={`text-sm font-semibold mb-2 ${textMuted}`}>
          {isHalloween && '👁️ '}Status{isHalloween && ' 👁️'}
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className={textMuted}>Position:</span>{' '}
            <span className={`font-mono ${isHalloween ? 'text-eerie-400' : ''}`}>
              ({simState.x.toFixed(3)}, {simState.y.toFixed(3)}) m
            </span>
          </div>
          <div>
            <span className={textMuted}>Velocity:</span>{' '}
            <span className={`font-mono ${isHalloween ? 'text-eerie-400' : ''}`}>
              ({simState.vx.toFixed(3)}, {simState.vy.toFixed(3)}) m/s
            </span>
          </div>
          <div>
            <span className={textMuted}>Angles:</span>{' '}
            <span className={`font-mono ${isHalloween ? 'text-pumpkin-400' : ''}`}>
              θ={rad2deg(thetaCmd).toFixed(1)}°, φ={rad2deg(phiCmd).toFixed(1)}°
            </span>
          </div>
          <div>
            <span className={textMuted}>Error:</span>{' '}
            <span className={`font-mono ${isHalloween ? 'text-spooky-300' : ''}`}>
              {(errorMagnitude * 1000).toFixed(1)} mm
            </span>
          </div>
          <div className="col-span-2">
            <span className={textMuted}>Time:</span>{' '}
            <span className="font-mono">{simState.time.toFixed(2)} s</span>
          </div>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h2 className={`text-sm font-semibold mb-3 ${textMuted}`}>
          {isHalloween && '⚡ '}Simulation{isHalloween && ' ⚡'}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={togglePlayPause}
            className={`px-4 py-2 rounded font-medium ${
              isRunning
                ? (isHalloween ? 'bg-pumpkin-500 hover:bg-pumpkin-600' : 'bg-yellow-600 hover:bg-yellow-700')
                : btnPrimary
            }`}
          >
            {isRunning ? (isHalloween ? '⏸️ Pause' : 'Pause') : (isHalloween ? '▶️ Play' : 'Play')}
          </button>
          <button
            onClick={reset}
            className={`px-4 py-2 rounded font-medium ${btnSecondary}`}
          >
            {isHalloween ? '🔄 Reset' : 'Reset'}
          </button>
          <button
            onClick={startInitPositionMode}
            className={`px-4 py-2 rounded font-medium ${btnInfo}`}
          >
            {isHalloween ? '📍 Set Position' : 'Set Initial Position'}
          </button>
        </div>
        <div className="mt-3">
          <label className={`block text-xs ${textMuted} mb-1`}>Time Scale</label>
          <div className="flex gap-2">
            {[0.25, 0.5, 1, 2].map((scale) => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={`px-3 py-1 rounded text-sm ${
                  timeScale === scale
                    ? (isHalloween ? 'bg-pumpkin-600 text-white' : 'bg-blue-600 text-white')
                    : (isHalloween ? 'bg-spooky-500 text-pumpkin-200 hover:bg-spooky-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')
                }`}
              >
                {scale}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${borderColor}`}>
        {(['control', 'physics', 'display'] as const).map((tab) => {
          const tabIcons = {
            control: isHalloween ? '🎮' : '',
            physics: isHalloween ? '🔮' : '',
            display: isHalloween ? '👀' : '',
          };

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? (isHalloween ? `${bgAlt} text-pumpkin-400 border-b-2 border-pumpkin-500` : 'bg-gray-800 text-white border-b-2 border-blue-500')
                  : (isHalloween ? 'text-spooky-300 hover:text-pumpkin-300 hover:bg-spooky-600' : 'text-gray-400 hover:text-white hover:bg-gray-800')
              }`}
            >
              {tabIcons[tab]} {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
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
                  setControlMode(e.target.value as 'stabilization' | 'mouse' | 'drawing' | 'manual' | 'gcode')
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                <option value="stabilization">Stabilization (Origin)</option>
                <option value="mouse">Mouse Tracking</option>
                <option value="drawing">Drawing Path</option>
                <option value="gcode">G-code Path</option>
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

            {/* G-code controls */}
            {controlMode === 'gcode' && (
              <div className="bg-gray-800 p-3 rounded space-y-3">
                <h3 className="text-sm font-semibold">G-code Mode</h3>

                {gcodeProcessing && (
                  <div className="text-sm text-blue-400">Processing file...</div>
                )}

                {!gcodeMetadata && !gcodeProcessing && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-semibold mb-2">Upload Image</label>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        onChange={handleImageUpload}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      />
                    </div>

                    <div className="border-t border-gray-700 pt-2">
                      <label className="block text-xs font-semibold mb-2">Upload G-code File</label>
                      <input
                        type="file"
                        accept=".nc,.gcode,.txt"
                        onChange={handleGCodeFileUpload}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                      />
                    </div>

                    <div className="border-t border-gray-700 pt-2">
                      <label className="block text-xs text-gray-400 mb-1">
                        Image Edge Threshold: {imageOptions.edgeThreshold}
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        step="10"
                        value={imageOptions.edgeThreshold}
                        onChange={(e) =>
                          setImageOptions({ ...imageOptions, edgeThreshold: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />

                      <label className="block text-xs text-gray-400 mb-1 mt-2">
                        Point Reduction: {(imageOptions.pointReduction * 100).toFixed(1)}%
                      </label>
                      <input
                        type="range"
                        min="0.001"
                        max="0.05"
                        step="0.001"
                        value={imageOptions.pointReduction}
                        onChange={(e) =>
                          setImageOptions({ ...imageOptions, pointReduction: parseFloat(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {gcodeMetadata && !gcodeProcessing && (
                  <div className="space-y-2">
                    <div className="bg-gray-700 p-2 rounded text-xs space-y-1">
                      <div>
                        <span className="text-gray-400">Source:</span>{' '}
                        <span className="font-mono">{gcodeMetadata.source}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">File:</span>{' '}
                        <span className="font-mono">{gcodeMetadata.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Points:</span>{' '}
                        <span className="font-mono">{gcodeMetadata.pointCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Path Length:</span>{' '}
                        <span className="font-mono">{(gcodeMetadata.pathLength * 1000).toFixed(1)} mm</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Duration: {gcodeDuration}s
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={gcodeDuration}
                        onChange={(e) => handleGCodeDurationChange(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      {!referenceManager.isGCodeActive() ? (
                        <button
                          onClick={playGCode}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                        >
                          Play
                        </button>
                      ) : (
                        <button
                          onClick={pauseGCode}
                          className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                        >
                          Pause
                        </button>
                      )}
                      <button
                        onClick={resetGCode}
                        className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={clearGCode}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Clear Path
                      </button>
                    </div>

                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        defaultChecked
                        onChange={(e) => setGCodeLoop(e.target.checked)}
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
            {/* Theme Toggle */}
            <div className={`space-y-3 p-3 rounded ${isHalloween ? 'bg-spooky-600 border-2 border-pumpkin-500' : 'bg-gray-800'}`}>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {isHalloween ? '🎃' : '🎨'} Theme
              </h3>
              <button
                onClick={toggleTheme}
                className={`w-full px-4 py-3 rounded font-medium text-sm transition-all ${
                  isHalloween
                    ? 'bg-pumpkin-600 hover:bg-pumpkin-700 text-white shadow-glow-pumpkin'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {isHalloween ? '🎃 Halloween Mode ON 🦇' : 'Switch to Halloween Theme 🎃'}
              </button>
              {isHalloween && (
                <p className="text-xs text-pumpkin-200 text-center">
                  👻 Spooky mode activated! 🕸️
                </p>
              )}
            </div>

            {/* Trail Length */}
            <div>
              <label className={`block text-xs ${textMuted} mb-1`}>
                Trail Length: {maxTrailLength}
              </label>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={maxTrailLength}
                onChange={(e) => setMaxTrailLength(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Angle Chart Settings */}
            <div className={`space-y-3 pt-2 border-t ${borderColor}`}>
              <h3 className="text-sm font-semibold">
                {isHalloween && '📊 '}Angle Chart
              </h3>

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
                  <label className={`block text-xs ${textMuted} mb-1`}>
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

            {/* 3D View Settings */}
            <div className={`space-y-3 pt-2 border-t ${borderColor}`}>
              <h3 className="text-sm font-semibold">
                {isHalloween && '🎭 '}3D View
              </h3>

              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={showThreeView}
                  onChange={(e) => setShowThreeView(e.target.checked)}
                  className="mr-2"
                />
                Show 3D View
              </label>

              {showThreeView && (
                <div>
                  <label className={`block text-xs ${textMuted} mb-1`}>
                    Window Size (pixels): {threeViewSize}
                  </label>
                  <input
                    type="range"
                    min="150"
                    max="400"
                    step="10"
                    value={threeViewSize}
                    onChange={(e) => setThreeViewSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className={`text-xs ${textMuted} mt-1`}>
                    Drag to rotate • Scroll to zoom
                  </p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className={`text-xs ${textMuted} space-y-1`}>
              <p>Angle chart shows θ (red), φ (blue), and error (green) over time</p>
              <p>3D view displays plate tilt, ball position, and trajectory in 3D space</p>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className={`p-4 ${bgAlt} border-t ${borderColor} text-xs ${textMuted}`}>
        <p className="font-semibold mb-1">
          {isHalloween && '⌨️ '}Keyboard Shortcuts
        </p>
        <div className="space-y-0.5">
          <p>
            <kbd className={`px-1 rounded ${isHalloween ? 'bg-spooky-500' : 'bg-gray-700'}`}>Space</kbd> - Play/Pause
          </p>
          <p>
            <kbd className={`px-1 rounded ${isHalloween ? 'bg-spooky-500' : 'bg-gray-700'}`}>R</kbd> - Reset
          </p>
          <p>
            <kbd className={`px-1 rounded ${isHalloween ? 'bg-spooky-500' : 'bg-gray-700'}`}>I</kbd> - Set Initial Position
          </p>
          <p>
            <kbd className={`px-1 rounded ${isHalloween ? 'bg-spooky-500' : 'bg-gray-700'}`}>M</kbd> - Cycle Mode
          </p>
          <p>
            <kbd className={`px-1 rounded ${isHalloween ? 'bg-spooky-500' : 'bg-gray-700'}`}>↑↓←→</kbd> - Manual Control
          </p>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
