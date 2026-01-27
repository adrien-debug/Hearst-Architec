'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface Object3DPreviewProps {
  dimensions: { width: number; height: number; depth: number };
  color: string;
  name: string;
  autoRotate?: boolean;
}

// Rotating Box Component
function PreviewBox({ 
  dimensions, 
  color, 
  autoRotate 
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  color: string;
  autoRotate: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convert mm to meters for 3D display
  const scale: [number, number, number] = [
    dimensions.width / 1000,
    dimensions.height / 1000,
    dimensions.depth / 1000
  ];
  
  // Auto rotation
  useFrame((_, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.3} 
        roughness={0.4}
      />
    </mesh>
  );
}

// Main Preview Component
export default function Object3DPreview({ 
  dimensions, 
  color, 
  name,
  autoRotate = true 
}: Object3DPreviewProps) {
  // Calculate camera distance based on object size
  const maxDim = Math.max(
    dimensions.width, 
    dimensions.height, 
    dimensions.depth
  ) / 1000;
  const cameraDistance = maxDim * 2.5;

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 relative">
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={[cameraDistance, cameraDistance * 0.8, cameraDistance]} 
          fov={45} 
        />
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minDistance={maxDim * 1.5}
          maxDistance={maxDim * 5}
          autoRotate={false}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.3} />
        
        <Environment preset="studio" />
        
        {/* Ground plane */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -dimensions.height / 2000, 0]}
          receiveShadow
        >
          <planeGeometry args={[maxDim * 4, maxDim * 4]} />
          <meshStandardMaterial color="#f1f5f9" />
        </mesh>
        
        {/* The object */}
        <PreviewBox 
          dimensions={dimensions} 
          color={color} 
          autoRotate={autoRotate}
        />
      </Canvas>
      
      {/* Info overlay */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <p className="font-semibold text-slate-900 text-sm truncate">{name}</p>
          <p className="text-xs text-slate-500">
            {(dimensions.width / 1000).toFixed(2)}m × 
            {(dimensions.height / 1000).toFixed(2)}m × 
            {(dimensions.depth / 1000).toFixed(2)}m
          </p>
        </div>
      </div>
      
      {/* Drag hint */}
      <div className="absolute top-3 right-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-[10px] text-slate-500">
          Drag to rotate
        </div>
      </div>
    </div>
  );
}
