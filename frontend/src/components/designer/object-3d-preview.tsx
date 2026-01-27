'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface Attachment {
  name: string;
  mountPoint: string;
  dimensions?: { width: number; height: number; depth: number };
  color?: string;
}

interface Object3DPreviewProps {
  dimensions: { width: number; height: number; depth: number };
  color: string;
  name: string;
  autoRotate?: boolean;
  // For assembled modules
  isModule?: boolean;
  baseObjectDimensions?: { width: number; height: number; depth: number };
  attachments?: Attachment[];
}

// Single Box Component (non-rotating)
function Box({ 
  dimensions, 
  color, 
  position = [0, 0, 0]
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  color: string;
  position?: [number, number, number];
}) {
  // Convert mm to meters for 3D display
  const scale: [number, number, number] = [
    dimensions.width / 1000,
    dimensions.height / 1000,
    dimensions.depth / 1000
  ];

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.3} 
        roughness={0.4}
      />
    </mesh>
  );
}

// Rotating Group Component for assembled modules
function AssembledModule({ 
  baseDimensions, 
  baseColor,
  attachments,
  autoRotate 
}: { 
  baseDimensions: { width: number; height: number; depth: number }; 
  baseColor: string;
  attachments: Attachment[];
  autoRotate: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Auto rotation
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  // Base container position (centered)
  const baseY = baseDimensions.height / 2000;
  
  return (
    <group ref={groupRef}>
      {/* Base container */}
      <Box 
        dimensions={baseDimensions} 
        color={baseColor} 
        position={[0, baseY, 0]}
      />
      
      {/* Attachments (cooling units) */}
      {attachments.map((att, idx) => {
        const attDims = att.dimensions || { width: 12192, height: 2896, depth: 2438 };
        const attColor = att.color || '#3b82f6'; // Blue for cooling
        
        let position: [number, number, number] = [0, 0, 0];
        
        if (att.mountPoint === 'side' || att.mountPoint === 'side-right') {
          // Position to the right of the base container with a gap
          const xOffset = (baseDimensions.width / 2000) + (attDims.width / 2000) + 0.5; // 0.5m gap
          position = [xOffset, attDims.height / 2000, 0];
        } else if (att.mountPoint === 'side-left') {
          // Position to the left
          const xOffset = -((baseDimensions.width / 2000) + (attDims.width / 2000) + 0.5);
          position = [xOffset, attDims.height / 2000, 0];
        } else if (att.mountPoint === 'top') {
          // Position on top
          const yOffset = (baseDimensions.height / 1000) + (attDims.height / 2000);
          position = [0, yOffset, 0];
        }
        
        return (
          <Box 
            key={idx}
            dimensions={attDims} 
            color={attColor} 
            position={position}
          />
        );
      })}
    </group>
  );
}

// Rotating Box Component (for single objects)
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
  autoRotate = true,
  isModule = false,
  baseObjectDimensions,
  attachments = []
}: Object3DPreviewProps) {
  // For modules, calculate total width including attachments
  let totalWidth = dimensions.width;
  if (isModule && attachments.length > 0) {
    attachments.forEach(att => {
      if (att.mountPoint === 'side' || att.mountPoint === 'side-right' || att.mountPoint === 'side-left') {
        totalWidth += (att.dimensions?.width || 12192) + 500; // Add gap
      }
    });
  }
  
  // Calculate camera distance based on total size
  const maxDim = Math.max(
    totalWidth, 
    dimensions.height, 
    dimensions.depth
  ) / 1000;
  const cameraDistance = maxDim * 2;

  // Base dimensions for module (use baseObjectDimensions if provided)
  const baseDims = baseObjectDimensions || {
    width: 12196,
    height: 2896,
    depth: 2438
  };

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 relative">
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={[cameraDistance, cameraDistance * 0.6, cameraDistance * 0.8]} 
          fov={45} 
        />
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minDistance={maxDim * 1.2}
          maxDistance={maxDim * 5}
          autoRotate={false}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, 5, -10]} intensity={0.3} />
        
        <Environment preset="studio" />
        
        {/* Ground plane */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[maxDim * 4, maxDim * 4]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        
        {/* Render based on type */}
        {isModule && attachments.length > 0 ? (
          <AssembledModule 
            baseDimensions={baseDims}
            baseColor={color}
            attachments={attachments}
            autoRotate={autoRotate}
          />
        ) : (
          <PreviewBox 
            dimensions={dimensions} 
            color={color} 
            autoRotate={autoRotate}
          />
        )}
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
          {isModule && attachments.length > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              Container + {attachments.length} cooling unit{attachments.length > 1 ? 's' : ''}
            </p>
          )}
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
