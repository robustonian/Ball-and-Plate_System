/**
 * Three.js 3D View component for Ball and Plate system
 * Provides a 3D visualization with plate tilt, ball position, trajectory, and shadows
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import { useStore } from '../state/store';
import { PHYSICS_CONSTANTS } from '../sim/physics';
import * as THREE from 'three';

/**
 * Plate component - tilts based on theta and phi angles
 */
const Plate: React.FC<{ theta: number; phi: number }> = ({ theta, phi }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Apply rotations to match physics:
      // phi > 0: ball rolls +Y → plate tilts down in +Y → rotation.x < 0
      // theta > 0: ball rolls +X → plate tilts down in +X → rotation.y > 0
      meshRef.current.rotation.x = -phi;
      meshRef.current.rotation.y = theta;
    }
  });

  const plateSize = PHYSICS_CONSTANTS.plateSize;

  return (
    <mesh ref={meshRef} receiveShadow position={[0, 0, 0]}>
      <boxGeometry args={[plateSize, plateSize, 0.02]} />
      <meshStandardMaterial
        color="#4a5568"
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
      {/* Grid lines on plate */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(plateSize, plateSize, 0.02)]} />
        <lineBasicMaterial color="#718096" />
      </lineSegments>
    </mesh>
  );
};

/**
 * Ball component - positioned at current simulation state
 */
const Ball: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const ballRadius = PHYSICS_CONSTANTS.ballRadius;

  return (
    <mesh castShadow position={[x, y, ballRadius]}>
      <sphereGeometry args={[ballRadius, 32, 32]} />
      <meshStandardMaterial
        color="#ef4444"
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
};

/**
 * Trajectory component - 3D line showing ball path
 */
const Trajectory: React.FC<{ points: Array<{ x: number; y: number }> }> = ({ points }) => {
  const linePoints = useMemo(() => {
    const ballRadius = PHYSICS_CONSTANTS.ballRadius;
    return points.map(p => new THREE.Vector3(p.x, p.y, ballRadius));
  }, [points]);

  if (linePoints.length < 2) return null;

  return (
    <Line
      points={linePoints}
      color="#3b82f6"
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
};

/**
 * Scene setup with lighting and helpers
 */
const Scene: React.FC = () => {
  const simState = useStore((state) => state.simState);
  const thetaCmd = useStore((state) => state.thetaCmd);
  const phiCmd = useStore((state) => state.phiCmd);
  const trajectory = useStore((state) => state.trajectory);

  // Convert trajectory to simple x,y points
  const trajectoryPoints = useMemo(() => {
    return trajectory.map(p => ({ x: p.x, y: p.y }));
  }, [trajectory]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-1}
        shadow-camera-right={1}
        shadow-camera-top={1}
        shadow-camera-bottom={-1}
      />
      <pointLight position={[-5, -5, 5]} intensity={0.3} />

      {/* Grid helper at z=0 */}
      <Grid
        args={[1, 1]}
        cellSize={0.1}
        cellThickness={0.5}
        cellColor="#4a5568"
        sectionSize={0.5}
        sectionThickness={1}
        sectionColor="#718096"
        fadeDistance={3}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0, -0.01]}
      />

      {/* Coordinate axes */}
      <axesHelper args={[0.3]} />

      {/* Plate */}
      <Plate theta={thetaCmd} phi={phiCmd} />

      {/* Ball */}
      <Ball x={simState.x} y={simState.y} />

      {/* Trajectory */}
      <Trajectory points={trajectoryPoints} />

      {/* OrbitControls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={0.5}
        maxDistance={3}
      />
    </>
  );
};

/**
 * Main ThreeView component
 */
const ThreeView: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <Canvas
        camera={{
          position: [0., -0.6, 0.3],
          fov: 65,
        }}
        shadows
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default ThreeView;
