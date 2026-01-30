'use client';

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Plus, Edit3 } from 'lucide-react';

interface ObjectCardProps {
  object: {
    id: string;
    name: string;
    type: string;
    color?: string;
    dimensions?: { width: number; height: number; depth: number };
    subtype?: string;
    powerCapacityMW?: number;
    machineSlots?: number;
  };
  onAdd: () => void;
  onEdit?: () => void;
}

// Mini 3D Preview Component
function MiniPreview({ 
  dimensions, 
  color, 
  objectType 
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  color: string;
  objectType: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const w = dimensions.width / 1000;
  const h = dimensions.height / 1000;
  const d = dimensions.depth / 1000;
  const maxDim = Math.max(w, h, d);
  const scale = 2 / maxDim;

  const typeLC = objectType.toLowerCase();
  const isContainer = typeLC.includes('container');
  const isCooling = typeLC.includes('cooling');
  const isTransformer = typeLC.includes('transformer') && !typeLC.includes('rmu');
  const isPDU = typeLC.includes('pdu') || typeLC.includes('distribution') || typeLC.includes('skid') || typeLC.includes('switchboard');
  const isRMU = typeLC.includes('rmu');

  // Container simplified
  if (isContainer) {
    return (
      <group ref={groupRef} scale={scale}>
        {/* Main body */}
        <mesh position={[0, h/2, 0]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Corrugations hint */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, h/2, side * (d/2 + 0.02)]} castShadow>
            <boxGeometry args={[w * 0.95, h * 0.9, 0.04]} />
            <meshStandardMaterial color="#d4d4d4" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        {/* Corner posts */}
        {[[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]].map(([x, z], i) => (
          <mesh key={i} position={[x, h/2, z]} castShadow>
            <boxGeometry args={[0.1, h, 0.1]} />
            <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>
    );
  }

  // Cooling simplified
  if (isCooling) {
    return (
      <group ref={groupRef} scale={scale}>
        {/* Base */}
        <mesh position={[0, h * 0.35, 0]} castShadow>
          <boxGeometry args={[w, h * 0.7, d]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Top white section */}
        <mesh position={[0, h * 0.75, 0]} castShadow>
          <boxGeometry args={[w, h * 0.15, d]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Fans hint */}
        {[[-w/3, -d/4], [0, -d/4], [w/3, -d/4], [-w/3, d/4], [0, d/4], [w/3, d/4]].map(([x, z], i) => (
          <mesh key={i} position={[x, h * 0.85, z]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.1, 12]} />
            <meshStandardMaterial color="#3b82f6" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>
    );
  }

  // Transformer simplified
  if (isTransformer) {
    return (
      <group ref={groupRef} scale={scale}>
        {/* Tank */}
        <mesh position={[0, h/2, 0]} castShadow>
          <boxGeometry args={[w * 0.7, h * 0.65, d * 0.7]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Radiator fins */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * w * 0.4, h * 0.4, 0]}>
            {Array.from({ length: 5 }).map((_, i) => (
              <mesh key={i} position={[side * 0.08, 0, -d * 0.3 + i * (d * 0.15)]} castShadow>
                <boxGeometry args={[0.1, h * 0.5, 0.02]} />
                <meshStandardMaterial color="#d97706" metalness={0.45} roughness={0.5} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Bushings */}
        {[-0.15, 0, 0.15].map((x, i) => (
          <mesh key={i} position={[x, h * 0.85, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.15, 8]} />
            <meshStandardMaterial color="#7c3aed" metalness={0.3} roughness={0.6} />
          </mesh>
        ))}
      </group>
    );
  }

  // PDU / Distribution Skid
  if (isPDU) {
    return (
      <group ref={groupRef} scale={scale}>
        {/* Main cabinet */}
        <mesh position={[0, h/2, 0]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Front doors */}
        <mesh position={[0, h/2, d/2 + 0.02]} castShadow>
          <boxGeometry args={[w * 0.9, h * 0.85, 0.03]} />
          <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Top copper busbars */}
        <mesh position={[0, h * 0.9, 0]} castShadow>
          <boxGeometry args={[w * 0.8, 0.06, d * 0.4]} />
          <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Phase indicators L1, L2, L3 */}
        {[[-w * 0.25, '#dc2626'], [0, '#eab308'], [w * 0.25, '#3b82f6']].map(([x, col], i) => (
          <mesh key={i} position={[x as number, h * 0.92, 0]}>
            <boxGeometry args={[0.08, 0.02, 0.06]} />
            <meshStandardMaterial color={col as string} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        {/* ACB main breaker */}
        <mesh position={[0, h * 0.65, d/2 + 0.04]} castShadow>
          <boxGeometry args={[w * 0.4, h * 0.15, 0.08]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* ACB handle (red) */}
        <mesh position={[0, h * 0.65, d/2 + 0.09]} castShadow>
          <boxGeometry args={[0.1, 0.05, 0.02]} />
          <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* MCCB feeders */}
        {[-w * 0.25, 0, w * 0.25].map((x, i) => (
          <group key={i} position={[x, h * 0.35, d/2 + 0.04]}>
            <mesh castShadow>
              <boxGeometry args={[w * 0.2, h * 0.12, 0.06]} />
              <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
            </mesh>
            {/* Green LED */}
            <mesh position={[w * 0.08, h * 0.04, 0.04]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
            </mesh>
          </group>
        ))}
        {/* Power meter display */}
        <mesh position={[w * 0.3, h * 0.7, d/2 + 0.04]}>
          <boxGeometry args={[0.1, 0.06, 0.02]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
        </mesh>
        {/* Status LEDs */}
        <mesh position={[-w * 0.3, h * 0.8, d/2 + 0.03]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
        {/* Bottom cable tray */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[w * 0.7, 0.08, d * 0.5]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} wireframe />
        </mesh>
      </group>
    );
  }

  // RMU (Ring Main Unit)
  if (isRMU) {
    return (
      <group ref={groupRef} scale={scale}>
        {/* Main cabinet */}
        <mesh position={[0, h/2, 0]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Front panel */}
        <mesh position={[0, h/2, d/2 + 0.02]} castShadow>
          <boxGeometry args={[w * 0.85, h * 0.8, 0.03]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* SF6 indicator */}
        <mesh position={[w * 0.25, h * 0.75, d/2 + 0.04]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#22c55e" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Cable entries (top) */}
        {[-w * 0.2, 0, w * 0.2].map((x, i) => (
          <mesh key={i} position={[x, h + 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
            <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        {/* HV indicator light */}
        <mesh position={[-w * 0.25, h * 0.75, d/2 + 0.05]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
        </mesh>
        {/* Label 33kV */}
        <mesh position={[0, h * 0.2, d/2 + 0.03]}>
          <boxGeometry args={[0.15, 0.05, 0.01]} />
          <meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
    );
  }

  // Generic box
  return (
    <mesh ref={meshRef} position={[0, h/2 * scale, 0]} castShadow>
      <boxGeometry args={[w * scale, h * scale, d * scale]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

export default function ObjectCard({ object, onAdd, onEdit }: ObjectCardProps) {
  const dims = object.dimensions || { width: 1000, height: 1000, depth: 1000 };
  const color = object.color || '#8AFD81';

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-hearst-green hover:shadow-lg transition-all duration-300">
      {/* 3D Preview */}
      <div className="h-32 bg-gradient-to-b from-slate-50 to-slate-100 relative">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[4, 3, 4]} fov={40} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
          <Environment preset="warehouse" />
          
          {/* Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#64748b" metalness={0.1} roughness={0.9} />
          </mesh>
          
          <MiniPreview dimensions={dims} color={color} objectType={object.type} />
        </Canvas>
        
        {/* Quick add button overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="absolute top-2 right-2 w-8 h-8 bg-hearst-green rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
          title="Add to scene"
        >
          <Plus className="w-5 h-5 text-slate-900" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 truncate">{object.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {(dims.width / 1000).toFixed(1)} × {(dims.height / 1000).toFixed(1)} × {(dims.depth / 1000).toFixed(1)} m
            </p>
          </div>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              title="Edit object"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {object.subtype && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full">
              {object.subtype}
            </span>
          )}
          {object.powerCapacityMW && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full">
              {object.powerCapacityMW} MW
            </span>
          )}
          {object.machineSlots && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full">
              {object.machineSlots} slots
            </span>
          )}
        </div>

        {/* Add button */}
        <button
          onClick={onAdd}
          className="w-full mt-3 py-2 bg-slate-100 hover:bg-hearst-green text-slate-700 hover:text-slate-900 text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add to Scene
        </button>
      </div>
    </div>
  );
}
