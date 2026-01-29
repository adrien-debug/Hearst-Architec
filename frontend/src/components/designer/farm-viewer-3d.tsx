'use client';

import { useRef, useState, memo, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

// Shared geometries - created once
const sharedGeometries = {
  machineBox: new THREE.BoxGeometry(1, 0.5, 0.8),
  led: new THREE.SphereGeometry(0.03, 16, 16),
  fanLarge: new THREE.CircleGeometry(0.15, 32),
  fanSmall: new THREE.CircleGeometry(0.1, 32),
  rackFrame: new THREE.BoxGeometry(2, 2.5, 0.8),
  rackPost: new THREE.BoxGeometry(0.1, 2.5, 0.1),
};

// Shared materials - created once
const sharedMaterials = {
  machineGreen: new THREE.MeshStandardMaterial({ color: '#8AFD81', metalness: 0.3, roughness: 0.4 }),
  machineHover: new THREE.MeshStandardMaterial({ color: '#6BD563', metalness: 0.3, roughness: 0.4 }),
  led: new THREE.MeshStandardMaterial({ color: '#00ff00', emissive: '#00ff00', emissiveIntensity: 2 }),
  fanGrill: new THREE.MeshStandardMaterial({ color: '#333' }),
  rackFrame: new THREE.MeshStandardMaterial({ color: '#374151', metalness: 0.6, roughness: 0.3 }),
  rackPost: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.7, roughness: 0.2 }),
  floor: new THREE.MeshStandardMaterial({ color: '#f1f5f9' }),
  wall: new THREE.MeshStandardMaterial({ color: '#e2e8f0' }),
};

interface PlacedMachine {
  id: string;
  machineId: string;
  name: string;
  position: { x: number; y: number; z: number };
  hashrateTH: number;
  powerWatts: number;
}

interface FarmViewer3DProps {
  machines: PlacedMachine[];
  onAddMachine: (position: { x: number; y: number; z: number }) => void;
  onRemoveMachine: (id: string) => void;
}

const ASICMachine = memo(function ASICMachine({ machine, onClick }: { machine: PlacedMachine; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Only animate when hovered
  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const handlePointerOver = useCallback(() => setHovered(true), []);
  const handlePointerOut = useCallback(() => setHovered(false), []);

  return (
    <group position={[machine.position.x * 1.5, 0.4, machine.position.y * 1.5]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <primitive object={sharedGeometries.machineBox} attach="geometry" />
        <primitive object={hovered ? sharedMaterials.machineHover : sharedMaterials.machineGreen} attach="material" />
      </mesh>
      
      {/* LED indicator */}
      <mesh position={[0.4, 0.1, 0.41]}>
        <primitive object={sharedGeometries.led} attach="geometry" />
        <primitive object={sharedMaterials.led} attach="material" />
      </mesh>
      
      {/* Fan grilles */}
      <mesh position={[0, 0, 0.41]}>
        <primitive object={sharedGeometries.fanLarge} attach="geometry" />
        <primitive object={sharedMaterials.fanGrill} attach="material" />
      </mesh>
      <mesh position={[-0.25, 0, 0.41]}>
        <primitive object={sharedGeometries.fanSmall} attach="geometry" />
        <primitive object={sharedMaterials.fanGrill} attach="material" />
      </mesh>

      {/* Hover label */}
      {hovered && (
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {machine.name}
        </Text>
      )}
    </group>
  );
});

const Floor = memo(function Floor({ onFloorClick }: { onFloorClick: (position: { x: number; y: number; z: number }) => void }) {
  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    const point = e.point as THREE.Vector3;
    const gridX = Math.round(point.x / 1.5);
    const gridY = Math.round(point.z / 1.5);
    onFloorClick({ x: gridX, y: gridY, z: 0 });
  }, [onFloorClick]);

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[10, 0, 10]}
      receiveShadow
      onClick={handleClick}
    >
      <planeGeometry args={[30, 30]} />
      <primitive object={sharedMaterials.floor} attach="material" />
    </mesh>
  );
});

// Pre-calculated rack post positions
const rackPostPositions: [number, number, number][] = [
  [-0.9, 0, 0.3], [0.9, 0, 0.3], [-0.9, 0, -0.3], [0.9, 0, -0.3]
];

const Rack = memo(function Rack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Rack frame */}
      <mesh castShadow>
        <primitive object={sharedGeometries.rackFrame} attach="geometry" />
        <primitive object={sharedMaterials.rackFrame} attach="material" />
      </mesh>
      
      {/* Vertical posts */}
      {rackPostPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <primitive object={sharedGeometries.rackPost} attach="geometry" />
          <primitive object={sharedMaterials.rackPost} attach="material" />
        </mesh>
      ))}
    </group>
  );
});

// Static rack positions
const rackPositions: [number, number, number][] = [
  [-2, 1.25, 5],
  [-2, 1.25, 10],
  [-2, 1.25, 15],
];

const Scene = memo(function Scene({ machines, onAddMachine, onRemoveMachine }: FarmViewer3DProps) {
  // Memoize onClick handlers for machines
  const machineClickHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {};
    machines.forEach(machine => {
      handlers[machine.id] = () => onRemoveMachine(machine.id);
    });
    return handlers;
  }, [machines, onRemoveMachine]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Environment */}
      <Environment preset="warehouse" />

      {/* Floor with grid */}
      <Floor onFloorClick={onAddMachine} />
      <Grid
        position={[10, 0.01, 10]}
        args={[30, 30]}
        cellSize={1.5}
        cellThickness={0.5}
        cellColor="#cbd5e1"
        sectionSize={7.5}
        sectionThickness={1}
        sectionColor="#94a3b8"
        fadeDistance={50}
        fadeStrength={1}
      />

      {/* Sample racks */}
      {rackPositions.map((pos, i) => (
        <Rack key={i} position={pos} />
      ))}

      {/* ASIC Machines */}
      {machines.map((machine) => (
        <ASICMachine 
          key={machine.id} 
          machine={machine}
          onClick={machineClickHandlers[machine.id]}
        />
      ))}

      {/* Walls (optional, for context) */}
      <mesh position={[-3, 3, 10]} receiveShadow>
        <boxGeometry args={[0.2, 6, 30]} />
        <primitive object={sharedMaterials.wall} attach="material" />
      </mesh>
    </>
  );
});

const FarmViewer3D = memo(function FarmViewer3D({ machines, onAddMachine, onRemoveMachine }: FarmViewer3DProps) {
  return (
    <div className="w-full h-[600px] bg-white rounded-b-2xl border border-slate-200 shadow-lg">
      <Canvas shadows>
        <Scene 
          machines={machines} 
          onAddMachine={onAddMachine}
          onRemoveMachine={onRemoveMachine}
        />
      </Canvas>
    </div>
  );
});

export default FarmViewer3D;
