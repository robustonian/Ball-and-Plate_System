/**
 * Main App component for Ball and Plate system
 * Handles animation loop and keyboard controls
 */

import React, { useEffect, useRef, useCallback } from 'react';
import CanvasView from './components/CanvasView';
import ChartView from './components/ChartView';
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
          const modes = ['stabilization', 'mouse', 'drawing', 'manual'] as const;
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

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white">
      {/* Main content area */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Canvas View */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full max-w-4xl max-h-[600px] bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
            <CanvasView />
          </div>
        </div>

        {/* Angle Chart */}
        {showAngleChart && (
          <div className="w-full bg-gray-800 rounded-lg overflow-hidden shadow-2xl" style={{ height: '180px' }}>
            <ChartView />
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="w-96 flex-shrink-0 border-l border-gray-700 shadow-xl">
        <ControlPanel />
      </div>
    </div>
  );
};

export default App;
