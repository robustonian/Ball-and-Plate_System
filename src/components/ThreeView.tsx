/**
 * Three.js 3D View component for Ball and Plate system
 * Provides a 3D visualization with plate tilt, ball position, trajectory, and shadows
 */

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useStore } from '../state/store';
import { PHYSICS_CONSTANTS } from '../sim/physics';
import * as THREE from 'three';

/**
 * Plate component - tilts based on theta and phi angles
 */
const Plate: React.FC<{ theta: number; phi: number; isHalloween: boolean }> = ({ theta, phi, isHalloween }) => {
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
  const plateColor = isHalloween ? '#2d1b4e' : '#4a5568';
  const edgeColor = isHalloween ? '#ff6b35' : '#718096';

  return (
    <mesh ref={meshRef} receiveShadow position={[0, 0, 0]}>
      <boxGeometry args={[plateSize, plateSize, 0.02]} />
      <meshStandardMaterial
        color={plateColor}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
        emissive={isHalloween ? '#4a1f75' : '#000000'}
        emissiveIntensity={isHalloween ? 0.3 : 0}
      />
      {/* Grid lines on plate */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(plateSize, plateSize, 0.02)]} />
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
    </mesh>
  );
};

/**
 * Ball component - positioned at current simulation state
 * Ball sits on the tilted plate surface
 */
const Ball: React.FC<{ x: number; y: number; theta: number; phi: number; isHalloween: boolean }> = ({ x, y, theta, phi, isHalloween }) => {
  const ballRadius = PHYSICS_CONSTANTS.ballRadius;

  // Calculate ball height on tilted plate
  // z = ballRadius (base height) - height variation due to plate tilt
  // Negative signs because: rotation.x = -phi and rotation.y = theta
  // create downward slopes in positive x and y directions
  const z = ballRadius - x * Math.sin(theta) - y * Math.sin(phi);

  const ballColor = isHalloween ? '#f7931e' : '#ef4444';

  return (
    <mesh castShadow position={[x, y, z]}>
      <sphereGeometry args={[ballRadius, 32, 32]} />
      <meshStandardMaterial
        color={ballColor}
        metalness={isHalloween ? 0.5 : 0.3}
        roughness={isHalloween ? 0.3 : 0.4}
        emissive={isHalloween ? '#ff6b35' : '#000000'}
        emissiveIntensity={isHalloween ? 0.4 : 0}
      />
    </mesh>
  );
};

/**
 * Trajectory component - 3D line showing ball path
 * Currently disabled as it doesn't follow plate surface
 */
// const Trajectory: React.FC<{ points: Array<{ x: number; y: number }> }> = ({ points }) => {
//   const linePoints = useMemo(() => {
//     const ballRadius = PHYSICS_CONSTANTS.ballRadius;
//     return points.map(p => new THREE.Vector3(p.x, p.y, ballRadius));
//   }, [points]);

//   if (linePoints.length < 2) return null;

//   return (
//     <Line
//       points={linePoints}
//       color="#3b82f6"
//       lineWidth={2}
//       transparent
//       opacity={0.6}
//     />
//   );
// };

/**
 * Scene setup with lighting and helpers
 */
const Scene: React.FC = () => {
  const simState = useStore((state) => state.simState);
  const thetaCmd = useStore((state) => state.thetaCmd);
  const phiCmd = useStore((state) => state.phiCmd);
  const theme = useStore((state) => state.theme);
  // const trajectory = useStore((state) => state.trajectory);

  // Convert trajectory to simple x,y points
  // const trajectoryPoints = useMemo(() => {
  //   return trajectory.map(p => ({ x: p.x, y: p.y }));
  // }, [trajectory]);

  const isHalloween = theme === 'halloween';

  return (
    <>
      {/* Lighting - theme-aware */}
      <ambientLight intensity={isHalloween ? 0.3 : 0.4} color={isHalloween ? '#9d4edd' : '#ffffff'} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        color={isHalloween ? '#ff6b35' : '#ffffff'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-1}
        shadow-camera-right={1}
        shadow-camera-top={1}
        shadow-camera-bottom={-1}
      />
      <pointLight
        position={[-5, -5, 5]}
        intensity={isHalloween ? 0.5 : 0.3}
        color={isHalloween ? '#7209b7' : '#ffffff'}
      />

      {/* Grid helper at z=0 - theme-aware */}
      <Grid
        args={[1, 1]}
        cellSize={0.1}
        cellThickness={0.5}
        cellColor={isHalloween ? '#4a1f75' : '#4a5568'}
        sectionSize={0.5}
        sectionThickness={1}
        sectionColor={isHalloween ? '#9d4edd' : '#718096'}
        fadeDistance={3}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0, -0.01]}
      />

      {/* Coordinate axes */}
      <axesHelper args={[0.3]} />

      {/* Plate */}
      <Plate theta={thetaCmd} phi={phiCmd} isHalloween={isHalloween} />

      {/* Ball */}
      <Ball x={simState.x} y={simState.y} theta={thetaCmd} phi={phiCmd} isHalloween={isHalloween} />

      {/* Trajectory - Hidden for now as it doesn't follow plate surface */}
      {/* <Trajectory points={trajectoryPoints} /> */}

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
  const theme = useStore((state) => state.theme);
  const bgClass = theme === 'halloween' ? 'bg-spooky-700' : 'bg-gray-900';

  return (
    <div className={`w-full h-full ${bgClass} rounded-lg overflow-hidden`}>
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
