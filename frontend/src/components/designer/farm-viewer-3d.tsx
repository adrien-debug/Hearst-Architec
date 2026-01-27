'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

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

function ASICMachine({ machine, onClick }: { machine: PlacedMachine; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={[machine.position.x * 1.5, 0.4, machine.position.y * 1.5]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 0.5, 0.8]} />
        <meshStandardMaterial 
          color={hovered ? '#6BD563' : '#8AFD81'} 
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* LED indicator */}
      <mesh position={[0.4, 0.1, 0.41]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial 
          color="#00ff00" 
          emissive="#00ff00"
          emissiveIntensity={2}
        />
      </mesh>
      
      {/* Fan grilles */}
      <mesh position={[0, 0, 0.41]}>
        <circleGeometry args={[0.15, 32]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.25, 0, 0.41]}>
        <circleGeometry args={[0.1, 32]} />
        <meshStandardMaterial color="#333" />
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
}

function Floor({ onFloorClick }: { onFloorClick: (position: { x: number; y: number; z: number }) => void }) {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[10, 0, 10]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        const point = e.point;
        const gridX = Math.round(point.x / 1.5);
        const gridY = Math.round(point.z / 1.5);
        onFloorClick({ x: gridX, y: gridY, z: 0 });
      }}
    >
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#f1f5f9" />
    </mesh>
  );
}

function Rack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Rack frame */}
      <mesh castShadow>
        <boxGeometry args={[2, 2.5, 0.8]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.3} />
      </mesh>
      
      {/* Vertical posts */}
      {[[-0.9, 0, 0.3], [0.9, 0, 0.3], [-0.9, 0, -0.3], [0.9, 0, -0.3]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.1, 2.5, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ machines, onAddMachine, onRemoveMachine }: FarmViewer3DProps) {
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
      <Rack position={[-2, 1.25, 5]} />
      <Rack position={[-2, 1.25, 10]} />
      <Rack position={[-2, 1.25, 15]} />

      {/* ASIC Machines */}
      {machines.map((machine) => (
        <ASICMachine 
          key={machine.id} 
          machine={machine}
          onClick={() => onRemoveMachine(machine.id)}
        />
      ))}

      {/* Walls (optional, for context) */}
      <mesh position={[-3, 3, 10]} receiveShadow>
        <boxGeometry args={[0.2, 6, 30]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
    </>
  );
}

export default function FarmViewer3D({ machines, onAddMachine, onRemoveMachine }: FarmViewer3DProps) {
  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-slate-200 to-slate-300 rounded-b-2xl">
      <Canvas shadows>
        <Scene 
          machines={machines} 
          onAddMachine={onAddMachine}
          onRemoveMachine={onRemoveMachine}
        />
      </Canvas>
    </div>
  );
}
