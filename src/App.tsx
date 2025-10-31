/**
 * Main App component for Ball and Plate system
 * Handles animation loop and keyboard controls
 */

import React, { useEffect, useRef, useCallback } from 'react';
import CanvasView from './components/CanvasView';
import ChartView from './components/ChartView';
import ThreeView from './components/ThreeView';
import ControlPanel from './components/ControlPanel';
import { useStore } from './state/store';
import { deg2rad } from './utils/math';

const App: React.FC = () => {
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // State and actions
  const step = useStore((state) => state.step);
  const togglePlayPause = useStore((state) => state.togglePlayPause);
  const reset = useStore((state) => state.reset);
  const startInitPositionMode = useStore((state) => state.startInitPositionMode);
  const setControlMode = useStore((state) => state.setControlMode);
  const controlMode = useStore((state) => state.referenceManager.getMode());
  const addManualInput = useStore((state) => state.addManualInput);
  const manualRateDegPerSec = useStore((state) => state.manualRateDegPerSec);
  const showAngleChart = useStore((state) => state.showAngleChart);
  const showThreeView = useStore((state) => state.showThreeView);
  const threeViewSize = useStore((state) => state.threeViewSize);
  const theme = useStore((state) => state.theme);

  /**
   * Animation loop
   */
  const animate = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = (timestamp - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = timestamp;

      // Limit maximum delta to prevent instability
      const clampedDelta = Math.min(deltaTime, 0.1);

      // Step simulation
      step(clampedDelta);

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [step]
  );

  /**
   * Start animation loop
   */
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  /**
   * Keyboard event handler
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Prevent default for control keys
      if (['Space', 'KeyR', 'KeyI', 'KeyM', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'Space':
          togglePlayPause();
          break;

        case 'KeyR':
          reset();
          break;

        case 'KeyI':
          startInitPositionMode();
          break;

        case 'KeyM': {
          // Cycle through modes
          const modes = ['stabilization', 'mouse', 'drawing', 'gcode', 'manual'] as const;
          const currentIndex = modes.indexOf(controlMode);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setControlMode(nextMode);
          break;
        }

        case 'ArrowUp':
          // Move ball up (positive phi)
          if (!event.repeat) {
            const deltaPhi = deg2rad(manualRateDegPerSec * 0.05); // 50ms step
            addManualInput(0, deltaPhi);
          }
          break;

        case 'ArrowDown':
          // Move ball down (negative phi)
          if (!event.repeat) {
            const deltaPhi = -deg2rad(manualRateDegPerSec * 0.05);
            addManualInput(0, deltaPhi);
          }
          break;

        case 'ArrowLeft':
          // Move ball left (negative theta)
          if (!event.repeat) {
            const deltaTheta = -deg2rad(manualRateDegPerSec * 0.05);
            addManualInput(deltaTheta, 0);
          }
          break;

        case 'ArrowRight':
          // Move ball right (positive theta)
          if (!event.repeat) {
            const deltaTheta = deg2rad(manualRateDegPerSec * 0.05);
            addManualInput(deltaTheta, 0);
          }
          break;
      }
    },
    [
      togglePlayPause,
      reset,
      startInitPositionMode,
      setControlMode,
      controlMode,
      addManualInput,
      manualRateDegPerSec,
    ]
  );

  /**
   * Handle continuous arrow key press
   */
  useEffect(() => {
    let intervalId: number | null = null;
    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        pressedKeys.add(event.code);

        // Start continuous update if not already running
        if (!intervalId) {
          intervalId = window.setInterval(() => {
            const deltaTime = 0.05; // 50ms
            let deltaTheta = 0;
            let deltaPhi = 0;

            if (pressedKeys.has('ArrowUp')) {
              deltaPhi += deg2rad(manualRateDegPerSec * deltaTime);
            }
            if (pressedKeys.has('ArrowDown')) {
              deltaPhi -= deg2rad(manualRateDegPerSec * deltaTime);
            }
            if (pressedKeys.has('ArrowLeft')) {
              deltaTheta -= deg2rad(manualRateDegPerSec * deltaTime);
            }
            if (pressedKeys.has('ArrowRight')) {
              deltaTheta += deg2rad(manualRateDegPerSec * deltaTime);
            }

            if (deltaTheta !== 0 || deltaPhi !== 0) {
              addManualInput(deltaTheta, deltaPhi);
            }
          }, 50);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        pressedKeys.delete(event.code);

        // Stop interval if no keys pressed
        if (pressedKeys.size === 0 && intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [addManualInput, manualRateDegPerSec]);

  /**
   * Setup keyboard event listener
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const isHalloween = theme === 'halloween';

  // Theme-aware colors
  const bgMain = isHalloween ? 'bg-gradient-to-br from-spooky-700 via-midnight-600 to-spooky-800' : 'bg-gray-900';
  const bgCanvas = isHalloween ? 'bg-spooky-600' : 'bg-gray-800';
  const borderColor = isHalloween ? 'border-pumpkin-600' : 'border-gray-700';
  const shadowClass = isHalloween ? 'shadow-glow-pumpkin' : 'shadow-2xl';

  return (
    <div className={`flex h-screen w-screen ${bgMain} text-white relative`}>
      {/* Main content area */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Canvas View */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`w-full h-full max-w-4xl max-h-[600px] ${bgCanvas} rounded-lg overflow-hidden ${shadowClass} ${isHalloween ? 'border-2 border-pumpkin-500' : ''}`}>
            <CanvasView />
          </div>
        </div>

        {/* Angle Chart */}
        {showAngleChart && (
          <div className={`w-full ${bgCanvas} rounded-lg overflow-hidden ${shadowClass} ${isHalloween ? 'border-2 border-pumpkin-500' : ''}`} style={{ height: '180px' }}>
            <ChartView />
          </div>
        )}
      </div>

      {/* 3D View - Floating Window */}
      {showThreeView && (
        <div
          className={`absolute top-4 right-[25rem] ${bgCanvas} border-2 ${borderColor} rounded-lg ${shadowClass} overflow-hidden ${isHalloween ? 'border-eerie-500' : ''}`}
          style={{
            width: `${threeViewSize}px`,
            height: `${threeViewSize}px`,
          }}
        >
          <div className="relative w-full h-full">
            <ThreeView />
            {/* Label */}
            <div className={`absolute top-2 left-2 ${isHalloween ? 'bg-spooky-700' : 'bg-gray-900'} bg-opacity-80 px-2 py-1 rounded text-xs font-semibold ${isHalloween ? 'text-pumpkin-400' : 'text-gray-300'} pointer-events-none`}>
              {isHalloween && '🎃 '}3D View
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className={`w-96 flex-shrink-0 border-l ${borderColor} ${shadowClass}`}>
        <ControlPanel />
      </div>
    </div>
  );
};

export default App;
