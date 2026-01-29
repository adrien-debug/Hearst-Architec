'use client';

import { useRef, useMemo, memo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { validateDimensions } from '../../lib/validation';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED GEOMETRIES - Created once, reused everywhere
// ═══════════════════════════════════════════════════════════════════════════
const sharedGeometries = {
  corrugationBox: new THREE.BoxGeometry(0.06, 1, 0.025),
  smallBox: new THREE.BoxGeometry(0.05, 0.025, 1),
  cornerPost: new THREE.BoxGeometry(0.12, 1, 0.12),
  cornerCasting: new THREE.BoxGeometry(0.18, 0.12, 0.18),
  fanBlade: new THREE.BoxGeometry(0.25, 0.012, 0.07),
  fanHub: new THREE.CylinderGeometry(0.055, 0.055, 0.05, 16),
  pipe: new THREE.CylinderGeometry(0.055, 0.055, 0.2, 16),
  flange: new THREE.CylinderGeometry(0.085, 0.085, 0.025, 16),
  wheel: new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16),
};

// Shared materials - created once
const sharedMaterials = {
  darkFrame: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.7, roughness: 0.3 }),
  lightGray: new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 0.6, roughness: 0.35 }),
  white: new THREE.MeshStandardMaterial({ color: '#f5f5f5', metalness: 0.35, roughness: 0.5 }),
  bluePanel: new THREE.MeshStandardMaterial({ color: '#1e3a5f', metalness: 0.45, roughness: 0.45 }),
  bluePanelLight: new THREE.MeshStandardMaterial({ color: '#2d5a87', metalness: 0.45, roughness: 0.45 }),
  fanBlue: new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.5, roughness: 0.4 }),
  fanHousingGray: new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.5, roughness: 0.5 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.4 }),
  radiatorYellow: new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.45, roughness: 0.5 }),
  purple: new THREE.MeshStandardMaterial({ color: '#7c3aed', metalness: 0.3, roughness: 0.6 }),
  green: new THREE.MeshStandardMaterial({ color: '#059669', metalness: 0.3, roughness: 0.6 }),
  red: new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.6, roughness: 0.4 }),
  blue: new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.6, roughness: 0.4 }),
};

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
  objectType?: string;
  isModule?: boolean;
  baseObjectDimensions?: { width: number; height: number; depth: number };
  attachments?: Attachment[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTAINER ISO 40FT SIMPLE (White metal with rear doors)
// Base container - Goes underneath the cooling system
// ═══════════════════════════════════════════════════════════════════════════
const ISOContainer = memo(function ISOContainer({ 
  dimensions, 
  position = [0, 0, 0]
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
}) {
  const w = dimensions.width / 1000;  // ~12.2m
  const h = dimensions.height / 1000; // ~2.9m
  const d = dimensions.depth / 1000;  // ~2.4m
  
  // Pre-calculate arrays once
  const corrugationCount = Math.floor(w / 0.12);
  const roofCount = Math.floor(w / 0.1);
  
  const corrugationIndices = useMemo(() => 
    Array.from({ length: corrugationCount }, (_, i) => i), 
    [corrugationCount]
  );
  
  const roofIndices = useMemo(() => 
    Array.from({ length: roofCount }, (_, i) => i), 
    [roofCount]
  );
  
  // Static corner positions
  const cornerPositions = useMemo(() => [
    [-w/2, 0, -d/2], [w/2, 0, -d/2],
    [-w/2, 0, d/2], [w/2, 0, d/2],
  ] as [number, number, number][], [w, d]);
  
  const castingPositions = useMemo(() => [
    [-w/2, -h/2, -d/2], [w/2, -h/2, -d/2], [-w/2, -h/2, d/2], [w/2, -h/2, d/2],
    [-w/2, h/2, -d/2], [w/2, h/2, -d/2], [-w/2, h/2, d/2], [w/2, h/2, d/2],
  ] as [number, number, number][], [w, h, d]);
  
  return (
    <group position={position}>
      {/* === MAIN CONTAINER BODY === */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.6} roughness={0.35} />
      </mesh>
      
      {/* === CORRUGATED SIDE WALLS (Front - Z negative) === */}
      {corrugationIndices.map((i) => (
        <mesh 
          key={`corr-front-${i}`}
          position={[-w/2 + 0.06 + i * 0.12, 0, -d/2 - 0.0125]}
          castShadow
        >
          <boxGeometry args={[0.06, h * 0.92, 0.025]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* === CORRUGATED SIDE WALLS (Back - Z positive) === */}
      {corrugationIndices.map((i) => (
        <mesh 
          key={`corr-back-${i}`}
          position={[-w/2 + 0.06 + i * 0.12, 0, d/2 + 0.0125]}
          castShadow
        >
          <boxGeometry args={[0.06, h * 0.92, 0.025]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* === TOP CORRUGATED ROOF === */}
      {roofIndices.map((i) => (
        <mesh 
          key={`roof-${i}`}
          position={[-w/2 + 0.05 + i * 0.1, h/2 + 0.012, 0]}
          castShadow
        >
          <boxGeometry args={[0.05, 0.025, d * 0.95]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.65} roughness={0.35} />
        </mesh>
      ))}
      
      {/* === BOTTOM FRAME === */}
      <mesh position={[0, -h/2, -d/2]} castShadow>
        <boxGeometry args={[w, 0.15, 0.1]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      <mesh position={[0, -h/2, d/2]} castShadow>
        <boxGeometry args={[w, 0.15, 0.1]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* === TOP FRAME === */}
      <mesh position={[0, h/2, -d/2]} castShadow>
        <boxGeometry args={[w, 0.08, 0.08]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      <mesh position={[0, h/2, d/2]} castShadow>
        <boxGeometry args={[w, 0.08, 0.08]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* === CORNER POSTS (4 vertical) === */}
      {cornerPositions.map((pos, i) => (
        <mesh key={`post-${i}`} position={pos} castShadow>
          <boxGeometry args={[0.12, h + 0.1, 0.12]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
      
      {/* === ISO CORNER CASTINGS (8 corners) === */}
      {castingPositions.map((pos, i) => (
        <mesh key={`casting-${i}`} position={pos} castShadow>
          <primitive object={sharedGeometries.cornerCasting} attach="geometry" />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
      
      {/* === LEFT END WALL (Solid) === */}
      <mesh position={[-w/2 - 0.02, 0, 0]} castShadow>
        <boxGeometry args={[0.04, h * 0.9, d * 0.85]} />
        <primitive object={sharedMaterials.lightGray} attach="material" />
      </mesh>
      
      {/* === RIGHT END - DOUBLE DOORS === */}
      {/* Left door */}
      <mesh position={[w/2 + 0.025, 0, -d/4]} castShadow>
        <boxGeometry args={[0.05, h * 0.9, d/2 * 0.85]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.55} roughness={0.45} />
      </mesh>
      {/* Right door */}
      <mesh position={[w/2 + 0.025, 0, d/4]} castShadow>
        <boxGeometry args={[0.05, h * 0.9, d/2 * 0.85]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.55} roughness={0.45} />
      </mesh>
      
      {/* Door corrugations */}
      {[-d/4, d/4].map((zPos, doorIdx) => (
        Array.from({ length: 8 }).map((_, i) => (
          <mesh 
            key={`door-corr-${doorIdx}-${i}`}
            position={[w/2 + 0.055, -h * 0.35 + i * (h * 0.8 / 8), zPos]}
            castShadow
          >
            <boxGeometry args={[0.015, 0.04, d/2 * 0.7]} />
            <meshStandardMaterial color="#d4d4d4" metalness={0.6} roughness={0.4} />
          </mesh>
        ))
      ))}
      
      {/* Door locking bars */}
      {[-d/4 + 0.15, -d/4 - 0.15, d/4 + 0.15, d/4 - 0.15].map((zPos, i) => (
        <mesh key={`lock-bar-${i}`} position={[w/2 + 0.08, 0, zPos]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, h * 0.75, 8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Door handles (cam locks) */}
      {[-d/4 + 0.15, d/4 - 0.15].map((zPos, i) => (
        <group key={`handle-${i}`}>
          <mesh position={[w/2 + 0.1, h * 0.2, zPos]} castShadow>
            <boxGeometry args={[0.04, 0.12, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[w/2 + 0.1, -h * 0.2, zPos]} castShadow>
            <boxGeometry args={[0.04, 0.12, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.15} />
          </mesh>
        </group>
      ))}
      
      {/* === FORKLIFT POCKETS === */}
      {[-w/3, 0, w/3].map((xPos, i) => (
        <mesh key={`pocket-${i}`} position={[xPos, -h/2 - 0.04, 0]} castShadow>
          <boxGeometry args={[0.25, 0.08, d * 0.6]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
      
      {/* === VENTILATION OPENINGS (small) === */}
      {[h/3, -h/3].map((yPos, i) => (
        <mesh key={`vent-${i}`} position={[-w/2 - 0.025, yPos, 0]}>
          <boxGeometry args={[0.01, 0.15, 0.4]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// BITMAIN EC2-DT COOLING SYSTEM (Blue panels + top fans)
// Goes on TOP of the container
// ═══════════════════════════════════════════════════════════════════════════
const BitmainCoolingSystem = memo(function BitmainCoolingSystem({ 
  dimensions, 
  position = [0, 0, 0]
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
}) {
  const w = dimensions.width / 1000;
  const h = dimensions.height / 1000;
  const d = dimensions.depth / 1000;
  
  // Store refs to fan blade groups for animation
  const fanBladesRefs = useRef<THREE.Group[]>([]);
  
  // Animate fans - optimized to directly access refs
  useFrame((_, delta) => {
    const speed = delta * 12;
    for (let i = 0; i < fanBladesRefs.current.length; i++) {
      const bladeGroup = fanBladesRefs.current[i];
      if (bladeGroup) {
        bladeGroup.rotation.y += speed;
      }
    }
  });
  
  // Pre-calculate panel and fan arrays
  const numPanels = 12;
  const panelWidth = (w * 0.85) / numPanels;
  const panelHeight = h * 0.65;
  const fansPerRow = 6;
  const fanRows = 2;
  const fanRadius = 0.32;
  const fanSpacingX = w / fansPerRow;
  const fanSpacingZ = d / (fanRows + 1);
  
  const panelIndices = useMemo(() => Array.from({ length: numPanels }, (_, i) => i), [numPanels]);
  
  const fanPositions = useMemo(() => {
    const positions: Array<{ xPos: number; zPos: number; key: string }> = [];
    for (let rowIdx = 0; rowIdx < fanRows; rowIdx++) {
      for (let colIdx = 0; colIdx < fansPerRow; colIdx++) {
        positions.push({
          xPos: -w/2 + fanSpacingX/2 + colIdx * fanSpacingX,
          zPos: -d/2 + fanSpacingZ * (rowIdx + 1),
          key: `fan-${rowIdx}-${colIdx}`
        });
      }
    }
    return positions;
  }, [w, d, fanSpacingX, fanSpacingZ, fanRows, fansPerRow]);
  
  const bladeAngles = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(i => (i * Math.PI * 2) / 7), []);
  
  const cornerPositions = useMemo(() => [
    [-w/2, 0, -d/2], [w/2, 0, -d/2],
    [-w/2, 0, d/2], [w/2, 0, d/2],
  ] as [number, number, number][], [w, d]);
  
  return (
    <group position={position}>
      {/* === MAIN BODY (White top section) === */}
      <mesh position={[0, h * 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.4, d]} />
        <primitive object={sharedMaterials.white} attach="material" />
      </mesh>
      
      {/* === BLUE THERMAL PANELS BASE === */}
      <mesh position={[0, -h * 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.5, d]} />
        <primitive object={sharedMaterials.bluePanel} attach="material" />
      </mesh>
      
      {/* === BLUE THERMAL EXCHANGE PANELS (Front Side) === */}
      {panelIndices.map((i) => (
        <group key={`front-panel-${i}`}>
          <mesh 
            position={[-w/2 + w*0.075 + panelWidth/2 + i * panelWidth, -h * 0.15, -d/2 - 0.025]}
            castShadow
          >
            <boxGeometry args={[panelWidth * 0.88, panelHeight, 0.05]} />
            <primitive object={i % 2 === 0 ? sharedMaterials.bluePanel : sharedMaterials.bluePanelLight} attach="material" />
          </mesh>
          <mesh position={[-w/2 + w*0.075 + i * panelWidth, -h * 0.15, -d/2 - 0.01]}>
            <boxGeometry args={[0.02, panelHeight + 0.05, 0.02]} />
            <primitive object={sharedMaterials.darkFrame} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === BLUE THERMAL EXCHANGE PANELS (Back Side) === */}
      {panelIndices.map((i) => (
        <group key={`back-panel-${i}`}>
          <mesh 
            position={[-w/2 + w*0.075 + panelWidth/2 + i * panelWidth, -h * 0.15, d/2 + 0.025]}
            castShadow
          >
            <boxGeometry args={[panelWidth * 0.88, panelHeight, 0.05]} />
            <primitive object={i % 2 === 0 ? sharedMaterials.bluePanel : sharedMaterials.bluePanelLight} attach="material" />
          </mesh>
          <mesh position={[-w/2 + w*0.075 + i * panelWidth, -h * 0.15, d/2 + 0.01]}>
            <boxGeometry args={[0.02, panelHeight + 0.05, 0.02]} />
            <primitive object={sharedMaterials.darkFrame} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === TOP WHITE SECTION === */}
      <mesh position={[0, h * 0.1, -d/2 - 0.01]} castShadow>
        <boxGeometry args={[w * 0.98, h * 0.25, 0.02]} />
        <primitive object={sharedMaterials.white} attach="material" />
      </mesh>
      <mesh position={[0, h * 0.1, d/2 + 0.01]} castShadow>
        <boxGeometry args={[w * 0.98, h * 0.25, 0.02]} />
        <primitive object={sharedMaterials.white} attach="material" />
      </mesh>
      
      {/* === FAN PLATFORM === */}
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <boxGeometry args={[w * 1.01, 0.06, d * 1.01]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* === FANS GROUP === */}
      <group position={[0, h * 0.48, 0]}>
        {fanPositions.map(({ xPos, zPos, key }, fanIdx) => (
          <group key={key} position={[xPos, 0.12, zPos]}>
            {/* Fan housing (square) */}
            <mesh castShadow>
              <boxGeometry args={[fanRadius * 2.3, 0.2, fanRadius * 2.3]} />
              <primitive object={sharedMaterials.fanHousingGray} attach="material" />
            </mesh>
            
            {/* Fan shroud (circular) */}
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[fanRadius + 0.02, fanRadius + 0.02, 0.04, 24]} />
              <primitive object={sharedMaterials.fanBlue} attach="material" />
            </mesh>
            
            {/* Rotating fan blades - ref for animation */}
            <group 
              position={[0, 0.15, 0]} 
              ref={(el) => { if (el) fanBladesRefs.current[fanIdx] = el; }}
            >
              {bladeAngles.map((angle, bladeIdx) => (
                <mesh key={bladeIdx} rotation={[0, angle, Math.PI / 10]}>
                  <boxGeometry args={[fanRadius * 0.8, 0.012, 0.07]} />
                  <primitive object={sharedMaterials.fanBlue} attach="material" />
                </mesh>
              ))}
              {/* Hub */}
              <mesh>
                <primitive object={sharedGeometries.fanHub} attach="geometry" />
                <primitive object={sharedMaterials.darkFrame} attach="material" />
              </mesh>
            </group>
            
            {/* Protective grill */}
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[fanRadius - 0.02, fanRadius - 0.02, 0.015, 24]} />
              <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} wireframe />
            </mesh>
          </group>
        ))}
      </group>
      
      {/* === CORNER POSTS === */}
      {cornerPositions.map((pos, i) => (
        <mesh key={`corner-${i}`} position={[pos[0], 0, pos[2]]} castShadow>
          <boxGeometry args={[0.1, h, 0.1]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
      
      {/* === BOTTOM FRAME === */}
      <mesh position={[0, -h/2, -d/2]} castShadow>
        <boxGeometry args={[w, 0.12, 0.1]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      <mesh position={[0, -h/2, d/2]} castShadow>
        <boxGeometry args={[w, 0.12, 0.1]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* === PIPE CONNECTIONS (Right side) === */}
      {/* Inlet (red - hot) */}
      <group position={[w/2 + 0.1, -h * 0.25, -d/4]}>
        <mesh rotation={[0, 0, Math.PI/2]}>
          <primitive object={sharedGeometries.pipe} attach="geometry" />
          <primitive object={sharedMaterials.red} attach="material" />
        </mesh>
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <primitive object={sharedGeometries.flange} attach="geometry" />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      </group>
      
      {/* Outlet (blue - cold) */}
      <group position={[w/2 + 0.1, -h * 0.25, d/4]}>
        <mesh rotation={[0, 0, Math.PI/2]}>
          <primitive object={sharedGeometries.pipe} attach="geometry" />
          <primitive object={sharedMaterials.blue} attach="material" />
        </mesh>
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <primitive object={sharedGeometries.flange} attach="geometry" />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      </group>
      
      {/* === ANTSPACE LOGO === */}
      <mesh position={[w * 0.2, h * 0.08, -d/2 - 0.02]}>
        <boxGeometry args={[1.2, 0.1, 0.01]} />
        <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={0.25} />
      </mesh>
      
      {/* === BITMAIN LOGO === */}
      <mesh position={[w/2 - 0.6, -h * 0.38, -d/2 - 0.03]}>
        <boxGeometry args={[0.7, 0.07, 0.01]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSEMBLED MODULE (ISO Container + Cooling System on Top)
// ═══════════════════════════════════════════════════════════════════════════
const AssembledModule = memo(function AssembledModule({ 
  baseDimensions, 
  attachments,
  autoRotate 
}: { 
  baseDimensions: { width: number; height: number; depth: number }; 
  baseColor: string;
  attachments: Attachment[];
  autoRotate: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Only animate when autoRotate is true
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  const baseY = baseDimensions.height / 2000;
  
  // Pre-calculate attachment positions
  const attachmentPositions = useMemo(() => {
    return attachments.map((att) => {
      const attDims = att.dimensions || { width: 12192, height: 2896, depth: 2438 };
      let position: [number, number, number] = [0, 0, 0];
      
      if (att.mountPoint === 'top') {
        const yOffset = (baseDimensions.height / 1000) + (attDims.height / 2000);
        position = [0, yOffset, 0];
      } else if (att.mountPoint === 'side' || att.mountPoint === 'side-right') {
        const xOffset = (baseDimensions.width / 1000) / 2 + (attDims.width / 1000) / 2 + 0.3;
        position = [xOffset, attDims.height / 2000, 0];
      } else if (att.mountPoint === 'side-left') {
        const xOffset = -((baseDimensions.width / 1000) / 2 + (attDims.width / 1000) / 2 + 0.3);
        position = [xOffset, attDims.height / 2000, 0];
      }
      
      return { dims: attDims, position };
    });
  }, [attachments, baseDimensions]);
  
  return (
    <group ref={groupRef}>
      {/* Base ISO container (white with metal texture) */}
      <ISOContainer 
        dimensions={baseDimensions} 
        position={[0, baseY, 0]}
      />
      
      {/* Cooling system on top */}
      {attachmentPositions.map((att, idx) => (
        <BitmainCoolingSystem 
          key={idx}
          dimensions={att.dims} 
          position={att.position}
        />
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// OIL-IMMERSED TRANSFORMER (Yellow with radiator fins)
// Premium 3D model for electrical transformers
// ═══════════════════════════════════════════════════════════════════════════
const OilTransformer = memo(function OilTransformer({ 
  dimensions, 
  position = [0, 0, 0],
  capacityMVA = 3.75
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
  capacityMVA?: number;
}) {
  const w = dimensions.width / 1000;
  const h = dimensions.height / 1000;
  const d = dimensions.depth / 1000;
  
  // Pre-calculate arrays
  const finCount = Math.max(6, Math.floor(capacityMVA * 2));
  const finSpacing = d * 0.8 / finCount;
  
  const finIndices = useMemo(() => Array.from({ length: finCount }, (_, i) => i), [finCount]);
  const hvPositions = useMemo(() => [-w * 0.2, 0, w * 0.2], [w]);
  const lvPositions = useMemo(() => [-w * 0.15, w * 0.15], [w]);
  const ringOffsets = useMemo(() => [0.08, 0.12, 0.16], []);
  
  const wheelPositions = useMemo(() => [
    [-w * 0.25, -h * 0.35, -d * 0.25],
    [w * 0.25, -h * 0.35, -d * 0.25],
    [-w * 0.25, -h * 0.35, d * 0.25],
    [w * 0.25, -h * 0.35, d * 0.25],
  ] as [number, number, number][], [w, h, d]);
  
  return (
    <group position={position}>
      {/* === MAIN TANK === */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w * 0.7, h * 0.65, d * 0.7]} />
        <primitive object={sharedMaterials.yellow} attach="material" />
      </mesh>
      
      {/* === TANK LID === */}
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <boxGeometry args={[w * 0.75, h * 0.08, d * 0.75]} />
        <primitive object={sharedMaterials.yellow} attach="material" />
      </mesh>
      
      {/* === CONSERVATOR TANK (Expansion tank on top) === */}
      <mesh position={[0, h * 0.42, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[d * 0.12, d * 0.12, w * 0.5, 16]} />
        <primitive object={sharedMaterials.yellow} attach="material" />
      </mesh>
      
      {/* === OIL LEVEL INDICATOR === */}
      <mesh position={[w * 0.2, h * 0.42, d * 0.1]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
        <meshStandardMaterial color="#92400e" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* === HV BUSHINGS (Purple - High Voltage) === */}
      {hvPositions.map((xPos, i) => (
        <group key={`hv-${i}`} position={[xPos, h * 0.48, -d * 0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.15, 12]} />
            <primitive object={sharedMaterials.purple} attach="material" />
          </mesh>
          {ringOffsets.map((yOffset, j) => (
            <mesh key={j} position={[0, yOffset, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.05, 0.015, 8, 16]} />
              <primitive object={sharedMaterials.purple} attach="material" />
            </mesh>
          ))}
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
            <primitive object={sharedMaterials.darkFrame} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === LV BUSHINGS (Green - Low Voltage) === */}
      {lvPositions.map((xPos, i) => (
        <group key={`lv-${i}`} position={[xPos, h * 0.42, d * 0.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.055, 0.1, 12]} />
            <primitive object={sharedMaterials.green} attach="material" />
          </mesh>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.05, 8]} />
            <primitive object={sharedMaterials.darkFrame} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === RADIATOR FINS (Both sides) === */}
      {[-1, 1].map((side) => (
        <group key={`radiator-${side}`} position={[side * w * 0.42, -h * 0.05, 0]}>
          {finIndices.map((i) => (
            <mesh key={i} position={[side * 0.08, 0, -d * 0.35 + i * finSpacing]} castShadow>
              <boxGeometry args={[0.12, h * 0.55, 0.015]} />
              <primitive object={sharedMaterials.radiatorYellow} attach="material" />
            </mesh>
          ))}
          <mesh position={[side * 0.08, h * 0.28, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, d * 0.8, 8]} />
            <primitive object={sharedMaterials.radiatorYellow} attach="material" />
          </mesh>
          <mesh position={[side * 0.08, -h * 0.28, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, d * 0.8, 8]} />
            <primitive object={sharedMaterials.radiatorYellow} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === BASE WHEELS/SKIDS === */}
      {wheelPositions.map((pos, i) => (
        <mesh key={`wheel-${i}`} position={pos} castShadow rotation={[Math.PI / 2, 0, 0]}>
          <primitive object={sharedGeometries.wheel} attach="geometry" />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
      
      {/* === RATING PLATE === */}
      <mesh position={[w * 0.36, 0, 0]} castShadow>
        <boxGeometry args={[0.01, 0.2, 0.15]} />
        <primitive object={sharedMaterials.white} attach="material" />
      </mesh>
      
      {/* === TAP CHANGER === */}
      <mesh position={[-w * 0.36, h * 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.25, 12]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// POWER BLOCK (Transformers + Switchgear array)
// Complete electrical infrastructure for mining containers
// ═══════════════════════════════════════════════════════════════════════════
function PowerBlock({ 
  dimensions, 
  position = [0, 0, 0],
  transformerCount = 8
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
  transformerCount?: number;
}) {
  const w = dimensions.width / 1000;
  const h = dimensions.height / 1000;
  const d = dimensions.depth / 1000;
  
  // Colors
  const concreteColor = '#6b7280';
  const switchgearColor = '#1f2937';
  const hvColor = '#dc2626';
  const mvColor = '#f59e0b';
  const lvColor = '#22c55e';
  const cableColor = '#374151';
  
  // Layout
  const transformerSpacing = w / (transformerCount / 2 + 1);
  const rowCount = 2;
  const colCount = transformerCount / rowCount;
  
  return (
    <group position={position}>
      {/* === CONCRETE PAD === */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[w * 1.1, 0.3, d * 1.1]} />
        <meshStandardMaterial color={concreteColor} metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* === SAFETY PERIMETER MARKING === */}
<mesh position={[0, 0.11, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>          <ringGeometry args={[Math.max(w, d) * 0.48, Math.max(w, d) * 0.5, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
      
      {/* === HV SWITCHGEAR (Ring Main Unit) === */}
      <group position={[-w * 0.4, h * 0.2, -d * 0.35]}>
        {/* Main cabinet */}
        <mesh castShadow>
          <boxGeometry args={[w * 0.15, h * 0.35, d * 0.2]} />
          <meshStandardMaterial color={switchgearColor} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* HV indicator light */}
        <mesh position={[w * 0.076, h * 0.12, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={hvColor} emissive={hvColor} emissiveIntensity={0.5} />
        </mesh>
        {/* Cable entry */}
        <mesh position={[0, h * 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
          <meshStandardMaterial color={cableColor} metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Label */}
        <mesh position={[w * 0.076, 0, d * 0.05]}>
          <boxGeometry args={[0.01, 0.08, 0.12]} />
          <meshStandardMaterial color={hvColor} />
        </mesh>
      </group>
      
      {/* === TRANSFORMERS ARRAY === */}
      {Array.from({ length: colCount }).map((_, col) => (
        Array.from({ length: rowCount }).map((_, row) => {
          const xPos = -w * 0.25 + (col + 0.5) * transformerSpacing;
          const zPos = (row - 0.5) * (d * 0.35);
          
          return (
            <OilTransformer
              key={`transformer-${col}-${row}`}
              dimensions={{ width: 2200, height: 2800, depth: 1800 }}
              position={[xPos, h * 0.5, zPos]}
              capacityMVA={3.75}
            />
          );
        })
      )).flat()}
      
      {/* === LV DISTRIBUTION BOARDS === */}
      {Array.from({ length: transformerCount }).map((_, i) => {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const xPos = -w * 0.25 + (col + 0.5) * transformerSpacing;
        const zPos = (row - 0.5) * (d * 0.35) + d * 0.18;
        
        return (
          <group key={`lv-board-${i}`} position={[xPos, h * 0.15, zPos]}>
            {/* Cabinet */}
            <mesh castShadow>
              <boxGeometry args={[0.8, h * 0.25, 0.4]} />
              <meshStandardMaterial color={switchgearColor} metalness={0.55} roughness={0.45} />
            </mesh>
            {/* LV indicator */}
            <mesh position={[0.41, h * 0.08, 0]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color={lvColor} emissive={lvColor} emissiveIntensity={0.5} />
            </mesh>
            {/* Output cables */}
            <mesh position={[0, -h * 0.12, 0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.15, 8]} />
              <meshStandardMaterial color={cableColor} metalness={0.4} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      
      {/* === BUSBAR TRUNKING === */}
      <mesh position={[0, h * 0.65, 0]} castShadow>
        <boxGeometry args={[w * 0.85, 0.15, 0.12]} />
        <meshStandardMaterial color={mvColor} metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* === CABLE TRAYS === */}
      {[-d * 0.25, d * 0.25].map((zPos, i) => (
        <mesh key={`tray-${i}`} position={[0, 0.05, zPos]} castShadow>
          <boxGeometry args={[w * 0.9, 0.08, 0.3]} />
          <meshStandardMaterial color={cableColor} metalness={0.4} roughness={0.6} wireframe />
        </mesh>
      ))}
      
      {/* === EARTHING GRID INDICATOR === */}
      {[
        [-w * 0.45, 0.12, -d * 0.45],
        [w * 0.45, 0.12, -d * 0.45],
        [-w * 0.45, 0.12, d * 0.45],
        [w * 0.45, 0.12, d * 0.45],
      ].map((pos, i) => (
        <mesh key={`earth-${i}`} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.05, 0.05, 0.15, 8]} />
          <meshStandardMaterial color="#15803d" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      
      {/* === FIRE SUPPRESSION SYSTEM === */}
      <mesh position={[w * 0.4, h * 0.3, -d * 0.35]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
        <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LV DISTRIBUTION SKID (PDU between transformer and containers)
// Industrial power distribution unit with ACB and MCCB feeders
// ═══════════════════════════════════════════════════════════════════════════
const LVDistributionSkid = memo(function LVDistributionSkid({ 
  dimensions, 
  position = [0, 0, 0],
  feeders = 3
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
  feeders?: number;
}) {
  const w = dimensions.width / 1000;  // ~2.4m
  const h = dimensions.height / 1000; // ~2.2m
  const d = dimensions.depth / 1000;  // ~0.8m
  
  // Colors
  const cabinetColor = '#374151';      // Dark gray cabinet
  const doorColor = '#4b5563';         // Lighter gray doors
  const copperColor = '#b45309';       // Copper busbars
  const greenLed = '#22c55e';          // Status OK
  const redLed = '#dc2626';            // Alarm
  const yellowLed = '#eab308';         // Warning
  const cableColor = '#1f2937';
  const ventColor = '#6b7280';
  
  // Pre-calculate feeder positions
  const feederSpacing = w * 0.7 / (feeders + 1);
  const feederIndices = useMemo(() => Array.from({ length: feeders }, (_, i) => i), [feeders]);
  
  return (
    <group position={position}>
      {/* === MAIN CABINET BODY === */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={cabinetColor} metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* === CABINET DOORS (Front panels) === */}
      {feederIndices.map((i) => (
        <mesh 
          key={`door-${i}`}
          position={[-w * 0.35 + feederSpacing * (i + 1), 0, d / 2 + 0.01]}
          castShadow
        >
          <boxGeometry args={[feederSpacing * 0.85, h * 0.9, 0.02]} />
          <meshStandardMaterial color={doorColor} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      
      {/* === DOOR HANDLES === */}
      {feederIndices.map((i) => (
        <mesh 
          key={`handle-${i}`}
          position={[-w * 0.35 + feederSpacing * (i + 1) + feederSpacing * 0.35, 0, d / 2 + 0.04]}
          castShadow
        >
          <boxGeometry args={[0.03, 0.15, 0.02]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* === TOP COPPER BUSBARS (Input from transformer) === */}
      <group position={[0, h * 0.42, 0]}>
        {/* Main busbar trunking */}
        <mesh castShadow>
          <boxGeometry args={[w * 0.9, 0.08, d * 0.5]} />
          <meshStandardMaterial color={copperColor} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Phase indicators L1, L2, L3 */}
        {[-w * 0.3, 0, w * 0.3].map((xPos, i) => (
          <mesh key={`phase-${i}`} position={[xPos, 0.05, -d * 0.15]}>
            <boxGeometry args={[0.12, 0.02, 0.08]} />
            <meshStandardMaterial 
              color={i === 0 ? '#dc2626' : i === 1 ? '#eab308' : '#3b82f6'} 
              metalness={0.6} 
              roughness={0.4} 
            />
          </mesh>
        ))}
      </group>
      
      {/* === MAIN ACB (Air Circuit Breaker) === */}
      <group position={[0, h * 0.25, d * 0.3]}>
        {/* ACB Housing */}
        <mesh castShadow>
          <boxGeometry args={[w * 0.5, h * 0.2, 0.15]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* ACB Handle */}
        <mesh position={[0, 0, 0.09]} castShadow>
          <boxGeometry args={[0.15, 0.08, 0.03]} />
          <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* Rating plate */}
        <mesh position={[w * 0.18, 0, 0.08]}>
          <boxGeometry args={[0.08, 0.04, 0.01]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
      
      {/* === MCCB FEEDERS (Output to containers) === */}
      {feederIndices.map((i) => {
        const xPos = -w * 0.35 + feederSpacing * (i + 1);
        return (
          <group key={`mccb-${i}`} position={[xPos, -h * 0.1, d * 0.3]}>
            {/* MCCB Housing */}
            <mesh castShadow>
              <boxGeometry args={[feederSpacing * 0.6, h * 0.15, 0.12]} />
              <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
            </mesh>
            {/* MCCB Handle */}
            <mesh position={[0, 0, 0.07]} castShadow>
              <boxGeometry args={[0.08, 0.05, 0.02]} />
              <meshStandardMaterial color="#22c55e" metalness={0.4} roughness={0.6} />
            </mesh>
            {/* Status LED */}
            <mesh position={[feederSpacing * 0.2, h * 0.05, 0.07]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color={greenLed} emissive={greenLed} emissiveIntensity={0.8} />
            </mesh>
            {/* Output cable gland */}
            <mesh position={[0, -h * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
              <meshStandardMaterial color={cableColor} metalness={0.5} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
      
      {/* === POWER METER DISPLAY === */}
      <group position={[w * 0.3, h * 0.25, d / 2 + 0.02]}>
        {/* Display screen */}
        <mesh>
          <boxGeometry args={[0.12, 0.08, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </mesh>
        {/* Screen glow */}
        <mesh position={[0, 0, 0.011]}>
          <boxGeometry args={[0.1, 0.06, 0.001]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
        </mesh>
      </group>
      
      {/* === STATUS LEDs ROW === */}
      <group position={[-w * 0.3, h * 0.35, d / 2 + 0.02]}>
        {/* Power LED (green) */}
        <mesh position={[-0.06, 0, 0]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color={greenLed} emissive={greenLed} emissiveIntensity={1} />
        </mesh>
        {/* Alarm LED (red - off) */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#7f1d1d" metalness={0.3} roughness={0.6} />
        </mesh>
        {/* Warning LED (yellow - off) */}
        <mesh position={[0.06, 0, 0]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#713f12" metalness={0.3} roughness={0.6} />
        </mesh>
      </group>
      
      {/* === VENTILATION GRILLES === */}
      {[-h * 0.35, h * 0.35].map((yPos, i) => (
        <mesh key={`vent-${i}`} position={[0, yPos, d / 2 + 0.015]}>
          <boxGeometry args={[w * 0.4, 0.08, 0.01]} />
          <meshStandardMaterial color={ventColor} metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      
      {/* === BOTTOM CABLE ENTRY === */}
      <group position={[0, -h / 2 - 0.05, 0]}>
        {/* Cable tray */}
        <mesh castShadow>
          <boxGeometry args={[w * 0.8, 0.1, d * 0.6]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} wireframe />
        </mesh>
        {/* Output cables (to containers) */}
        {feederIndices.map((i) => {
          const xPos = -w * 0.35 + feederSpacing * (i + 1);
          return (
            <mesh key={`cable-out-${i}`} position={[xPos, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
              <meshStandardMaterial color={cableColor} metalness={0.3} roughness={0.7} />
            </mesh>
          );
        })}
      </group>
      
      {/* === LIFTING EYES === */}
      {[[-w * 0.35, h / 2 + 0.03, 0], [w * 0.35, h / 2 + 0.03, 0]].map((pos, i) => (
        <mesh key={`lift-${i}`} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.015, 8, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* === EARTHING POINT === */}
      <group position={[-w / 2 + 0.05, -h * 0.35, d / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
          <meshStandardMaterial color="#15803d" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Earth symbol plate */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.005]} />
          <meshStandardMaterial color="#22c55e" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
      
      {/* === NAMEPLATE === */}
      <mesh position={[0, h * 0.4, d / 2 + 0.015]}>
        <boxGeometry args={[0.3, 0.06, 0.005]} />
        <meshStandardMaterial color="#f5f5f5" metalness={0.2} roughness={0.8} />
      </mesh>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SOLAR CANOPY (Covers mining installation with thermal extraction zones)
// Designed for Qatar 100MW - 8 containers layout
// ═══════════════════════════════════════════════════════════════════════════
const SolarCanopy = memo(function SolarCanopy({ 
  dimensions, 
  position = [0, 0, 0],
  containerRows = 2,
  containersPerRow = 4,
  extractorOpeningWidth = 2.5, // Width of opening above each cooling unit
  clearanceAboveCooling = 4,   // 4m clearance above EC2-DT extractors
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
  containerRows?: number;
  containersPerRow?: number;
  extractorOpeningWidth?: number;
  clearanceAboveCooling?: number;
}) {
  const w = dimensions.width / 1000;   // Total width (X axis) ~40m
  const h = dimensions.height / 1000;  // Canopy height structure ~2m
  const d = dimensions.depth / 1000;   // Total depth (Z axis) ~25m
  
  // Solar panel dimensions
  const panelWidth = 2.1;  // Standard solar panel width
  const panelDepth = 1.05; // Standard solar panel depth
  const panelAngle = Math.PI / 7; // ~25° tilt angle for Qatar latitude
  
  // Structure colors
  const steelColor = '#374151';
  const solarBlue = '#1e3a5f';
  const solarCellColor = '#0f172a';
  const aluminumFrame = '#9ca3af';
  
  // Calculate post positions (corners and intermediates)
  const postSpacingX = w / 4;
  const postSpacingZ = d / 3;
  
  // Pre-calculate arrays
  const postPositionsX = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i <= 4; i++) {
      positions.push(-w/2 + i * postSpacingX);
    }
    return positions;
  }, [w, postSpacingX]);
  
  const postPositionsZ = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i <= 3; i++) {
      positions.push(-d/2 + i * postSpacingZ);
    }
    return positions;
  }, [d, postSpacingZ]);
  
  // Calculate extractor openings positions (above each cooling unit)
  // 8 containers = 8 cooling units = 8 openings
  const extractorOpenings = useMemo(() => {
    const openings: Array<{ x: number; z: number }> = [];
    
    // Container layout: 2 rows x 4 containers
    // Row 1 at X = -(15/2) - (12.192/2) = -13.596
    // Row 2 at X = (15/2) + (12.192/2) = 13.596
    // Z positions: from -9.66 to +9.66, step = 2.438 + 4 = 6.438m
    
    const row1X = -13.596;
    const row2X = 13.596;
    const containerSpacing = 6.438;
    const centerOffsetZ = -(containersPerRow - 1) * containerSpacing / 2;
    
    for (let i = 0; i < containersPerRow; i++) {
      const zPos = centerOffsetZ + i * containerSpacing;
      openings.push({ x: row1X, z: zPos }); // Row 1
      openings.push({ x: row2X, z: zPos }); // Row 2
    }
    
    return openings;
  }, [containersPerRow]);
  
  // Panel row indices for solar panels
  const panelRowsZ = useMemo(() => {
    const rows: number[] = [];
    const panelCount = Math.floor(d / panelDepth);
    for (let i = 0; i < panelCount; i++) {
      rows.push(-d/2 + panelDepth/2 + i * panelDepth);
    }
    return rows;
  }, [d, panelDepth]);
  
  const panelColsX = useMemo(() => {
    const cols: number[] = [];
    const panelCount = Math.floor(w / panelWidth);
    for (let i = 0; i < panelCount; i++) {
      cols.push(-w/2 + panelWidth/2 + i * panelWidth);
    }
    return cols;
  }, [w, panelWidth]);
  
  // Check if a panel position is above an extractor opening
  const isOverExtractor = useCallback((x: number, z: number) => {
    for (const opening of extractorOpenings) {
      const dx = Math.abs(x - opening.x);
      const dz = Math.abs(z - opening.z);
      if (dx < extractorOpeningWidth && dz < extractorOpeningWidth) {
        return true;
      }
    }
    return false;
  }, [extractorOpenings, extractorOpeningWidth]);
  
  return (
    <group position={position}>
      {/* === MAIN SUPPORT POSTS (Steel I-beams) === */}
      {postPositionsX.map((xPos, xi) => 
        postPositionsZ.map((zPos, zi) => (
          <group key={`post-${xi}-${zi}`} position={[xPos, -h/2, zPos]}>
            {/* Main post */}
            <mesh castShadow>
              <boxGeometry args={[0.25, h + clearanceAboveCooling, 0.25]} />
              <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Base plate */}
            <mesh position={[0, -(h + clearanceAboveCooling)/2, 0]} castShadow>
              <boxGeometry args={[0.5, 0.1, 0.5]} />
              <meshStandardMaterial color={steelColor} metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Anchor bolts (4 per post) */}
            {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([dx, dz], bi) => (
              <mesh 
                key={`bolt-${bi}`} 
                position={[dx, -(h + clearanceAboveCooling)/2 - 0.02, dz]}
                castShadow
              >
                <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
                <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
              </mesh>
            ))}
          </group>
        ))
      )}
      
      {/* === MAIN LONGITUDINAL BEAMS (X direction) === */}
      {postPositionsZ.map((zPos, zi) => (
        <mesh key={`beam-x-${zi}`} position={[0, 0, zPos]} castShadow>
          <boxGeometry args={[w, 0.2, 0.15]} />
          <meshStandardMaterial color={steelColor} metalness={0.65} roughness={0.35} />
        </mesh>
      ))}
      
      {/* === CROSS BEAMS (Z direction) === */}
      {postPositionsX.map((xPos, xi) => (
        <mesh key={`beam-z-${xi}`} position={[xPos, 0, 0]} castShadow>
          <boxGeometry args={[0.15, 0.2, d]} />
          <meshStandardMaterial color={steelColor} metalness={0.65} roughness={0.35} />
        </mesh>
      ))}
      
      {/* === PURLINS (Support rails for solar panels) === */}
      {[-d/3, 0, d/3].map((zPos, i) => (
        <mesh 
          key={`purlin-${i}`} 
          position={[0, 0.15, zPos]} 
          rotation={[0, 0, 0]}
          castShadow
        >
          <boxGeometry args={[w, 0.08, 0.06]} />
          <meshStandardMaterial color={aluminumFrame} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* === SOLAR PANELS (with gaps for extractors) === */}
      <group position={[0, 0.25, 0]} rotation={[panelAngle, 0, 0]}>
        {panelColsX.map((xPos, xi) =>
          panelRowsZ.map((zPos, zi) => {
            // Skip panels that are over extractor openings
            if (isOverExtractor(xPos, zPos)) {
              return null;
            }
            
            return (
              <group key={`panel-${xi}-${zi}`} position={[xPos, 0, zPos]}>
                {/* Panel frame */}
                <mesh castShadow>
                  <boxGeometry args={[panelWidth * 0.98, 0.04, panelDepth * 0.98]} />
                  <meshStandardMaterial color={aluminumFrame} metalness={0.75} roughness={0.25} />
                </mesh>
                {/* Solar cells (dark blue) */}
                <mesh position={[0, 0.025, 0]}>
                  <boxGeometry args={[panelWidth * 0.92, 0.02, panelDepth * 0.92]} />
                  <meshStandardMaterial 
                    color={solarCellColor} 
                    metalness={0.4} 
                    roughness={0.2}
                  />
                </mesh>
                {/* Glass cover (slight reflection) */}
                <mesh position={[0, 0.04, 0]}>
                  <boxGeometry args={[panelWidth * 0.95, 0.005, panelDepth * 0.95]} />
                  <meshStandardMaterial 
                    color={solarBlue} 
                    metalness={0.1} 
                    roughness={0.1}
                    transparent
                    opacity={0.4}
                  />
                </mesh>
              </group>
            );
          })
        )}
      </group>
      
      {/* === EXTRACTOR OPENING FRAMES (Visible openings above cooling units) === */}
      {extractorOpenings.map((opening, i) => (
        <group key={`opening-${i}`} position={[opening.x, 0.2, opening.z]}>
          {/* Opening frame */}
          <mesh>
            <boxGeometry args={[extractorOpeningWidth + 0.2, 0.1, extractorOpeningWidth + 0.2]} />
            <meshStandardMaterial color={steelColor} metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Inner opening (visible as darker area) */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[extractorOpeningWidth, 0.02, extractorOpeningWidth]} />
            <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.7} />
          </mesh>
          {/* Mesh grating (for safety) */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[extractorOpeningWidth * 0.9, 0.02, extractorOpeningWidth * 0.9]} />
            <meshStandardMaterial 
              color="#4b5563" 
              metalness={0.5} 
              roughness={0.5} 
              wireframe 
            />
          </mesh>
          {/* Airflow indicator arrows (visual hint) */}
          <mesh position={[0, 0.15, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.3, 0.5, 8]} />
            <meshStandardMaterial 
              color="#ef4444" 
              transparent 
              opacity={0.6}
              emissive="#ef4444"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      ))}
      
      {/* === CABLE TRAYS (for DC wiring) === */}
      <mesh position={[0, -0.1, d/2 - 0.3]} castShadow>
        <boxGeometry args={[w * 0.9, 0.1, 0.2]} />
        <meshStandardMaterial color={steelColor} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.1, -d/2 + 0.3]} castShadow>
        <boxGeometry args={[w * 0.9, 0.1, 0.2]} />
        <meshStandardMaterial color={steelColor} metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* === INVERTER BOXES (at ends) === */}
      {[[-w/2 + 1, -d/2 + 1], [w/2 - 1, -d/2 + 1], [-w/2 + 1, d/2 - 1], [w/2 - 1, d/2 - 1]].map(([xPos, zPos], i) => (
        <group key={`inverter-${i}`} position={[xPos, -h/4, zPos]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 1.2, 0.4]} />
            <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Ventilation grille */}
          <mesh position={[0, 0.3, 0.21]}>
            <boxGeometry args={[0.5, 0.3, 0.02]} />
            <meshStandardMaterial color="#4b5563" metalness={0.4} roughness={0.6} />
          </mesh>
          {/* Status LED */}
          <mesh position={[0.25, 0.45, 0.21]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
      
      {/* === LIGHTNING RODS (Safety requirement) === */}
      {[[-w/2 + 0.5, -d/2 + 0.5], [w/2 - 0.5, -d/2 + 0.5], [-w/2 + 0.5, d/2 - 0.5], [w/2 - 0.5, d/2 - 0.5]].map(([xPos, zPos], i) => (
        <mesh key={`lightning-${i}`} position={[xPos, h/2 + 0.5, zPos]} castShadow>
          <cylinderGeometry args={[0.015, 0.025, 1.5, 8]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW BOX (Routes to correct component based on type)
// ═══════════════════════════════════════════════════════════════════════════
const PreviewBox = memo(function PreviewBox({ 
  dimensions, 
  color, 
  autoRotate,
  objectType
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  color: string;
  autoRotate: boolean;
  objectType?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Animation only when autoRotate is enabled
  useFrame((_, delta) => {
    if (!autoRotate) return;
    const speed = delta * 0.15;
    if (groupRef.current) {
      groupRef.current.rotation.y += speed;
    } else if (meshRef.current) {
      meshRef.current.rotation.y += speed;
    }
  });
  
  // Memoize type detection
  const { isContainer, isCooling, isTransformer, isPowerBlock, isPDU, isCanopy } = useMemo(() => {
    const typeLC = objectType?.toLowerCase() || '';
    return {
      isContainer: typeLC.includes('container') || typeLC === 'container' || typeLC === 'containers',
      isCooling: typeLC.includes('cooling') || typeLC === 'cooling' || typeLC === 'coolin',
      isTransformer: typeLC.includes('transformer') || typeLC === 'transformer' || typeLC === 'transformers',
      isPowerBlock: typeLC.includes('powerblock') || typeLC === 'powerblock' || typeLC === 'powerblocks' || typeLC.includes('power-block'),
      isPDU: typeLC.includes('pdu') || typeLC.includes('distribution') || typeLC.includes('skid') || typeLC.includes('switchboard') || typeLC.includes('lv-skid'),
      isCanopy: typeLC.includes('canopy') || typeLC.includes('solar-canopy') || typeLC.includes('solarcanopy') || typeLC.includes('solar'),
    };
  }, [objectType]);
  
  if (!validateDimensions(dimensions)) {
    return null;
  }
  
  const y = dimensions.height / 2000;

  if (isContainer) {
    return (
      <group ref={groupRef}>
        <ISOContainer 
          dimensions={dimensions} 
          position={[0, y, 0]}
        />
      </group>
    );
  }
  
  if (isCooling) {
    return (
      <group ref={groupRef}>
        <BitmainCoolingSystem 
          dimensions={dimensions} 
          position={[0, y, 0]}
        />
      </group>
    );
  }
  
  if (isTransformer) {
    return (
      <group ref={groupRef}>
        <OilTransformer 
          dimensions={dimensions} 
          position={[0, y, 0]}
          capacityMVA={3.75}
        />
      </group>
    );
  }
  
  if (isPowerBlock) {
    const transformerCount = dimensions.width > 30000 ? 16 : dimensions.width > 20000 ? 8 : 4;
    return (
      <group ref={groupRef}>
        <PowerBlock 
          dimensions={dimensions} 
          position={[0, y, 0]}
          transformerCount={transformerCount}
        />
      </group>
    );
  }
  
  if (isPDU) {
    // Calculate feeders based on power capacity (1 feeder per 1.5MW)
    const powerMW = (dimensions.width > 2000 ? 3 : 1.5);
    const feeders = powerMW > 2 ? 3 : 2;
    return (
      <group ref={groupRef}>
        <LVDistributionSkid 
          dimensions={dimensions} 
          position={[0, y, 0]}
          feeders={feeders}
        />
      </group>
    );
  }
  
  if (isCanopy) {
    return (
      <group ref={groupRef}>
        <SolarCanopy 
          dimensions={dimensions} 
          position={[0, y, 0]}
          containerRows={2}
          containersPerRow={4}
          extractorOpeningWidth={2.5}
          clearanceAboveCooling={4}
        />
      </group>
    );
  }

  // Generic box for other types (racks, networking)
  const scale: [number, number, number] = [
    dimensions.width / 1000,
    dimensions.height / 1000,
    dimensions.depth / 1000
  ];

  return (
    <mesh ref={meshRef} position={[0, y, 0]} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial 
        color={color} 
        metalness={0.4} 
        roughness={0.5}
      />
    </mesh>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PREVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Object3DPreview({ 
  dimensions, 
  color, 
  name,
  autoRotate = true,
  objectType,
  isModule = false,
  baseObjectDimensions,
  attachments = []
}: Object3DPreviewProps) {
  // Calculate total size for camera
  let totalHeight = dimensions.height;
  let totalWidth = dimensions.width;
  
  if (isModule && attachments.length > 0) {
    attachments.forEach(att => {
      if (att.mountPoint === 'top') {
        totalHeight += (att.dimensions?.height || 2896);
      } else if (att.mountPoint === 'side' || att.mountPoint === 'side-right' || att.mountPoint === 'side-left') {
        totalWidth += (att.dimensions?.width || 12192) + 500;
      }
    });
  }
  
  const maxDim = Math.max(totalWidth, totalHeight, dimensions.depth) / 1000;
  const cameraDistance = maxDim * 2.5;

  const baseDims = baseObjectDimensions || {
    width: 12192,
    height: 2896,
    depth: 2438
  };

  // Determine object type
  const nameLC = name.toLowerCase();
  const typeLC = objectType?.toLowerCase() || '';
  
  const detectedType = (() => {
    // Power blocks (check first - more specific)
    if (typeLC.includes('powerblock') || typeLC === 'powerblocks' || typeLC.includes('power-block')) return 'powerblock';
    if (nameLC.includes('power block') || nameLC.includes('powerblock') || nameLC.includes('pb-')) return 'powerblock';
    
    // PDU / Distribution Skid (before transformers)
    if (typeLC.includes('pdu') || typeLC.includes('distribution') || typeLC.includes('skid') || typeLC.includes('switchboard') || typeLC.includes('lv-skid')) return 'distribution';
    if (nameLC.includes('pdu') || nameLC.includes('distribution') || nameLC.includes('skid') || 
        nameLC.includes('switchboard') || nameLC.includes('lv distribution') || nameLC.includes('mns') ||
        nameLC.includes('mccb') || nameLC.includes('acb')) {
      return 'distribution';
    }
    
    // Transformers
    if (typeLC.includes('transformer') || typeLC === 'transformers') return 'transformer';
    if (nameLC.includes('transformer') || nameLC.includes('mva') || nameLC.includes('trf-')) return 'transformer';
    
    // Containers
    if (typeLC.includes('container') || typeLC === 'containers') return 'container';
    if (nameLC.includes('container') || nameLC.includes('hd5') || nameLC.includes('hd3') || 
        nameLC.includes('antspace') || nameLC.includes('hydro') || nameLC.includes('immersion')) {
      return 'container';
    }
    
    // Cooling
    if (typeLC.includes('cooling') || typeLC === 'coolin') return 'cooling';
    if (nameLC.includes('cool') || nameLC.includes('ec2') || nameLC.includes('dry') || 
        nameLC.includes('chiller') || nameLC.includes('hvac')) {
      return 'cooling';
    }
    
    // Solar Canopy
    if (typeLC.includes('canopy') || typeLC.includes('solar')) return 'canopy';
    if (nameLC.includes('canopy') || nameLC.includes('solar') || nameLC.includes('ombrière')) {
      return 'canopy';
    }
    
    return typeLC || 'generic';
  })();

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden bg-white relative border border-slate-200 shadow-lg">
      <Canvas shadows>
        <PerspectiveCamera 
          makeDefault 
          position={[cameraDistance * 0.7, cameraDistance * 0.45, cameraDistance * 0.65]} 
          fov={45} 
        />
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minDistance={maxDim * 1.5}
          maxDistance={maxDim * 6}
          autoRotate={false}
        />
        
        {/* Industrial Lighting */}
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[20, 28, 18]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight
          position={[-18, 18, -18]}
          intensity={0.45}
        />
        <pointLight position={[0, 18, 0]} intensity={0.35} color="#ffffff" />
        
        <Environment preset="warehouse" />
        
        {/* Industrial concrete floor */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[maxDim * 6, maxDim * 6]} />
          <meshStandardMaterial color="#52525b" metalness={0.15} roughness={0.85} />
        </mesh>
        
        {/* Floor safety markings */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <ringGeometry args={[maxDim * 0.95, maxDim * 1.0, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.15} />
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
            objectType={detectedType}
          />
        )}
      </Canvas>
      
      {/* Info overlay */}
      <div className="absolute bottom-3 left-3 right-3">
        {/* Premium white overlay */}
        <div className="bg-white/90 rounded-xl px-3 py-2 shadow-lg border border-slate-200">
          <p className="font-bold text-white text-sm truncate">{name}</p>
          <p className="text-xs text-slate-400">
            {(dimensions.width / 1000).toFixed(2)}m × 
            {(dimensions.height / 1000).toFixed(2)}m × 
            {(dimensions.depth / 1000).toFixed(2)}m
          </p>
          {isModule && attachments.length > 0 && (
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Container ISO + {attachments.length} cooling EC2-DT
            </p>
          )}
        </div>
      </div>
      
      {/* Drag hint */}
      <div className="absolute top-3 right-3">
        {/* Premium drag hint */}
        <div className="bg-white rounded-full px-2 py-1 text-[10px] text-slate-500 border border-slate-200 shadow-sm">
          🖱️ Glisser pour tourner
        </div>
      </div>
    </div>
  );
}

// Export individual components for use in scene
export { SolarCanopy, ISOContainer, BitmainCoolingSystem, OilTransformer, LVDistributionSkid };
