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
// Goes on TOP of the container - SAME WIDTH/DEPTH as container
// ═══════════════════════════════════════════════════════════════════════════
const BitmainCoolingSystem = memo(function BitmainCoolingSystem({ 
  dimensions, 
  position = [0, 0, 0]
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
}) {
  // Use same width/depth as container (12192 x 2438), height is cooling-specific
  const w = dimensions.width / 1000;   // 12.192m (same as container)
  const h = dimensions.height / 1000;  // 1.2m cooling height
  const d = dimensions.depth / 1000;   // 2.438m (same as container)
  
  // Frame thickness - same as container for consistency
  const frameThickness = 0.12;
  const cornerPostSize = 0.12;
  
  // Store refs to fan blade groups for animation
  const fanBladesRefs = useRef<THREE.Group[]>([]);
  
  // Animate fans - optimized to directly access refs
  useFrame((_, delta) => {
    const speed = delta * 8; // Slower rotation
    for (let i = 0; i < fanBladesRefs.current.length; i++) {
      const bladeGroup = fanBladesRefs.current[i];
      if (bladeGroup) {
        bladeGroup.rotation.y += speed;
      }
    }
  });
  
  // Pre-calculate panel and fan arrays
  const numPanels = Math.floor(w / 0.9); // ~13-14 panels for 12.2m
  const panelWidth = (w - cornerPostSize * 2) / numPanels;
  const panelHeight = h * 0.7;
  
  // Fans layout - proportional to width
  const fansPerRow = Math.max(4, Math.floor(w / 2)); // ~6 fans per row
  const fanRows = 2;
  const fanRadius = Math.min(0.28, (d * 0.35) / fanRows); // Scale fans to fit
  const fanSpacingX = (w - 1) / fansPerRow;
  const fanSpacingZ = (d - 0.5) / (fanRows + 1);
  
  const panelIndices = useMemo(() => Array.from({ length: numPanels }, (_, i) => i), [numPanels]);
  
  const fanPositions = useMemo(() => {
    const positions: Array<{ xPos: number; zPos: number; key: string }> = [];
    for (let rowIdx = 0; rowIdx < fanRows; rowIdx++) {
      for (let colIdx = 0; colIdx < fansPerRow; colIdx++) {
        positions.push({
          xPos: -w/2 + 0.5 + fanSpacingX/2 + colIdx * fanSpacingX,
          zPos: -d/2 + 0.25 + fanSpacingZ * (rowIdx + 1),
          key: `fan-${rowIdx}-${colIdx}`
        });
      }
    }
    return positions;
  }, [w, d, fanSpacingX, fanSpacingZ, fanRows, fansPerRow]);
  
  const bladeAngles = useMemo(() => [0, 1, 2, 3, 4, 5].map(i => (i * Math.PI * 2) / 6), []);
  
  // Corner positions - same as container
  const cornerPositions = useMemo(() => [
    [-w/2 + cornerPostSize/2, 0, -d/2 + cornerPostSize/2],
    [w/2 - cornerPostSize/2, 0, -d/2 + cornerPostSize/2],
    [-w/2 + cornerPostSize/2, 0, d/2 - cornerPostSize/2],
    [w/2 - cornerPostSize/2, 0, d/2 - cornerPostSize/2],
  ] as [number, number, number][], [w, d]);
  
  // ISO corner casting positions (8 corners) - same as container
  const castingPositions = useMemo(() => [
    [-w/2, -h/2, -d/2], [w/2, -h/2, -d/2], [-w/2, -h/2, d/2], [w/2, -h/2, d/2],
    [-w/2, h/2, -d/2], [w/2, h/2, -d/2], [-w/2, h/2, d/2], [w/2, h/2, d/2],
  ] as [number, number, number][], [w, h, d]);
  
  return (
    <group position={position}>
      {/* === MAIN BODY (Blue thermal section) === */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w - 0.02, h - 0.02, d - 0.02]} />
        <primitive object={sharedMaterials.bluePanel} attach="material" />
      </mesh>
      
      {/* === BLACK METALLIC FRAME - Same architecture as container === */}
      
      {/* Bottom frame - front/back */}
      <mesh position={[0, -h/2 + frameThickness/2, -d/2 + 0.05]} castShadow>
        <boxGeometry args={[w, frameThickness, 0.1]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      <mesh position={[0, -h/2 + frameThickness/2, d/2 - 0.05]} castShadow>
        <boxGeometry args={[w, frameThickness, 0.1]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* Bottom frame - sides */}
      <mesh position={[-w/2 + 0.05, -h/2 + frameThickness/2, 0]} castShadow>
        <boxGeometry args={[0.1, frameThickness, d]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      <mesh position={[w/2 - 0.05, -h/2 + frameThickness/2, 0]} castShadow>
        <boxGeometry args={[0.1, frameThickness, d]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* Top frame - front/back */}
      <mesh position={[0, h/2 - frameThickness/2, -d/2 + 0.04]} castShadow>
        <boxGeometry args={[w, frameThickness * 0.8, 0.08]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      <mesh position={[0, h/2 - frameThickness/2, d/2 - 0.04]} castShadow>
        <boxGeometry args={[w, frameThickness * 0.8, 0.08]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* Top frame - sides */}
      <mesh position={[-w/2 + 0.04, h/2 - frameThickness/2, 0]} castShadow>
        <boxGeometry args={[0.08, frameThickness * 0.8, d]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      <mesh position={[w/2 - 0.04, h/2 - frameThickness/2, 0]} castShadow>
        <boxGeometry args={[0.08, frameThickness * 0.8, d]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* Corner posts (4 vertical) - same as container */}
      {cornerPositions.map((pos, i) => (
        <mesh key={`post-${i}`} position={pos} castShadow>
          <boxGeometry args={[cornerPostSize, h + 0.02, cornerPostSize]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
      
      {/* ISO Corner castings (8 corners) - same as container */}
      {castingPositions.map((pos, i) => (
        <mesh key={`casting-${i}`} position={pos} castShadow>
          <boxGeometry args={[0.18, 0.1, 0.18]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      ))}
      
      {/* === BLUE THERMAL EXCHANGE PANELS (Front Side) - Offset to avoid z-fighting === */}
      {panelIndices.map((i) => (
        <group key={`front-panel-${i}`}>
          <mesh 
            position={[-w/2 + cornerPostSize + panelWidth/2 + i * panelWidth, 0, -d/2 - 0.04]}
            castShadow
          >
            <boxGeometry args={[panelWidth * 0.85, panelHeight, 0.06]} />
            <primitive object={i % 2 === 0 ? sharedMaterials.bluePanel : sharedMaterials.bluePanelLight} attach="material" />
          </mesh>
          {/* Vertical divider */}
          <mesh position={[-w/2 + cornerPostSize + i * panelWidth, 0, -d/2 - 0.02]}>
            <boxGeometry args={[0.025, panelHeight + 0.08, 0.03]} />
            <primitive object={sharedMaterials.darkFrame} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === BLUE THERMAL EXCHANGE PANELS (Back Side) - Offset to avoid z-fighting === */}
      {panelIndices.map((i) => (
        <group key={`back-panel-${i}`}>
          <mesh 
            position={[-w/2 + cornerPostSize + panelWidth/2 + i * panelWidth, 0, d/2 + 0.04]}
            castShadow
          >
            <boxGeometry args={[panelWidth * 0.85, panelHeight, 0.06]} />
            <primitive object={i % 2 === 0 ? sharedMaterials.bluePanel : sharedMaterials.bluePanelLight} attach="material" />
          </mesh>
          {/* Vertical divider */}
          <mesh position={[-w/2 + cornerPostSize + i * panelWidth, 0, d/2 + 0.02]}>
            <boxGeometry args={[0.025, panelHeight + 0.08, 0.03]} />
            <primitive object={sharedMaterials.darkFrame} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === FAN PLATFORM (Top grill) === */}
      <mesh position={[0, h/2 + 0.03, 0]} castShadow>
        <boxGeometry args={[w - cornerPostSize * 2, 0.04, d - cornerPostSize * 2]} />
        <primitive object={sharedMaterials.darkFrame} attach="material" />
      </mesh>
      
      {/* === FANS GROUP === */}
      <group position={[0, h/2 + 0.08, 0]}>
        {fanPositions.map(({ xPos, zPos, key }, fanIdx) => (
          <group key={key} position={[xPos, 0, zPos]}>
            {/* Fan housing (square) */}
            <mesh castShadow>
              <boxGeometry args={[fanRadius * 2.2, 0.15, fanRadius * 2.2]} />
              <primitive object={sharedMaterials.fanHousingGray} attach="material" />
            </mesh>
            
            {/* Fan shroud (circular) */}
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[fanRadius, fanRadius, 0.03, 20]} />
              <primitive object={sharedMaterials.fanBlue} attach="material" />
            </mesh>
            
            {/* Rotating fan blades - ref for animation */}
            <group 
              position={[0, 0.12, 0]} 
              ref={(el) => { if (el) fanBladesRefs.current[fanIdx] = el; }}
            >
              {bladeAngles.map((angle, bladeIdx) => (
                <mesh key={bladeIdx} rotation={[0, angle, Math.PI / 12]}>
                  <boxGeometry args={[fanRadius * 0.75, 0.01, 0.05]} />
                  <primitive object={sharedMaterials.fanBlue} attach="material" />
                </mesh>
              ))}
              {/* Hub */}
              <mesh>
                <cylinderGeometry args={[0.04, 0.04, 0.04, 12]} />
                <primitive object={sharedMaterials.darkFrame} attach="material" />
              </mesh>
            </group>
            
            {/* Protective grill */}
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[fanRadius - 0.02, fanRadius - 0.02, 0.01, 20]} />
              <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} wireframe />
            </mesh>
          </group>
        ))}
      </group>
      
      {/* === PIPE CONNECTIONS (Right side) - Offset to avoid z-fighting === */}
      {/* Inlet (red - hot) */}
      <group position={[w/2 + 0.15, -h * 0.15, -d/4]}>
        <mesh rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.25, 12]} />
          <primitive object={sharedMaterials.red} attach="material" />
        </mesh>
        <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 12]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      </group>
      
      {/* Outlet (blue - cold) */}
      <group position={[w/2 + 0.15, -h * 0.15, d/4]}>
        <mesh rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.25, 12]} />
          <primitive object={sharedMaterials.blue} attach="material" />
        </mesh>
        <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 12]} />
          <primitive object={sharedMaterials.darkFrame} attach="material" />
        </mesh>
      </group>
      
      {/* === ANTSPACE LOGO - Offset to avoid z-fighting === */}
      <mesh position={[w * 0.15, h * 0.15, -d/2 - 0.08]}>
        <boxGeometry args={[1.0, 0.08, 0.01]} />
        <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={0.2} />
      </mesh>
      
      {/* === BITMAIN LOGO - Offset to avoid z-fighting === */}
      <mesh position={[w/2 - 0.8, -h * 0.25, -d/2 - 0.08]}>
        <boxGeometry args={[0.6, 0.06, 0.01]} />
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
  // Default cooling dimensions: EC2-DT = 12192 x 1200 x 2438 (1.2m height)
  const attachmentPositions = useMemo(() => {
    return attachments.map((att) => {
      // Default to EC2-DT cooling dimensions (1.2m height, not container height)
      const attDims = att.dimensions || { width: 12192, height: 1200, depth: 2438 };
      let position: [number, number, number] = [0, 0, 0];
      
      if (att.mountPoint === 'top') {
        // Position cooling on top of container: container height + half cooling height
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
// GENERATOR 5MW (Diesel/Gas Generator for mining operations)
// Industrial power generation unit with radiator, exhaust, and control panel
// ═══════════════════════════════════════════════════════════════════════════
const Generator5MW = memo(function Generator5MW({ 
  dimensions, 
  position = [0, 0, 0],
  powerMW = 5
}: { 
  dimensions: { width: number; height: number; depth: number }; 
  position?: [number, number, number];
  powerMW?: number;
}) {
  const w = dimensions.width / 1000;  // ~6m
  const h = dimensions.height / 1000; // ~3m
  const d = dimensions.depth / 1000;  // ~2.5m
  
  // Colors
  const frameColor = '#1f2937';       // Dark frame
  const bodyColor = '#374151';        // Gray body
  const engineColor = '#4b5563';      // Engine block
  const radiatorColor = '#6b7280';    // Radiator fins
  const exhaustColor = '#292524';     // Exhaust stack
  const panelColor = '#1e3a5f';       // Control panel blue
  const copperColor = '#b45309';      // Copper connections
  const greenLed = '#22c55e';
  const yellowLed = '#eab308';
  
  // Pre-calculate radiator fin count
  const finCount = 24;
  const finSpacing = (d * 0.7) / finCount;
  const finIndices = useMemo(() => Array.from({ length: finCount }, (_, i) => i), []);
  
  return (
    <group position={position}>
      {/* === BASE SKID (Steel frame) === */}
      <mesh position={[0, -h * 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 1.05, h * 0.1, d * 1.05]} />
        <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Skid rails */}
      {[-d * 0.4, d * 0.4].map((zPos, i) => (
        <mesh key={`rail-${i}`} position={[0, -h * 0.48, zPos]} castShadow>
          <boxGeometry args={[w * 1.1, 0.08, 0.15]} />
          <meshStandardMaterial color={frameColor} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* === MAIN ENGINE HOUSING === */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.85, h * 0.75, d * 0.85]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* === ENGINE BLOCK (visible through side vents) === */}
      <mesh position={[-w * 0.1, -h * 0.05, 0]} castShadow>
        <boxGeometry args={[w * 0.45, h * 0.5, d * 0.6]} />
        <meshStandardMaterial color={engineColor} metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Engine cylinders (V-configuration hint) */}
      {[-1, 1].map((side, i) => (
        <mesh 
          key={`cylinder-${i}`} 
          position={[-w * 0.1, h * 0.08, side * d * 0.15]}
          rotation={[0, 0, side * 0.3]}
          castShadow
        >
          <boxGeometry args={[w * 0.35, h * 0.2, d * 0.15]} />
          <meshStandardMaterial color="#374151" metalness={0.55} roughness={0.45} />
        </mesh>
      ))}
      
      {/* === ALTERNATOR (Right side) === */}
      <mesh position={[w * 0.25, 0, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[d * 0.25, d * 0.25, w * 0.25, 24]} />
        <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Alternator end cap */}
      <mesh position={[w * 0.38, 0, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[d * 0.22, d * 0.22, 0.08, 24]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* === RADIATOR SECTION (Left end) === */}
      <group position={[-w * 0.45, 0, 0]}>
        {/* Radiator frame */}
        <mesh castShadow>
          <boxGeometry args={[w * 0.15, h * 0.65, d * 0.8]} />
          <meshStandardMaterial color={frameColor} metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Radiator fins (vertical) */}
        {finIndices.map((i) => (
          <mesh 
            key={`fin-${i}`}
            position={[-w * 0.085, 0, -d * 0.35 + i * finSpacing]}
            castShadow
          >
            <boxGeometry args={[0.015, h * 0.55, 0.02]} />
            <meshStandardMaterial color={radiatorColor} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        
        {/* Radiator fan shroud */}
        <mesh position={[-w * 0.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[d * 0.32, d * 0.32, 0.08, 24]} />
          <meshStandardMaterial color={frameColor} metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Fan blades hint */}
        <mesh position={[-w * 0.12, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[d * 0.25, d * 0.25, 0.02, 24]} />
          <meshStandardMaterial color="#4b5563" metalness={0.4} roughness={0.6} />
        </mesh>
      </group>
      
      {/* === EXHAUST STACK === */}
      <group position={[w * 0.1, h * 0.45, -d * 0.25]}>
        {/* Main stack */}
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.15, h * 0.4, 16]} />
          <meshStandardMaterial color={exhaustColor} metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Rain cap */}
        <mesh position={[0, h * 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.12, 0.08, 16]} />
          <meshStandardMaterial color={exhaustColor} metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Exhaust tip */}
        <mesh position={[0, h * 0.28, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      
      {/* === CONTROL PANEL (Front) === */}
      <group position={[w * 0.35, h * 0.1, d * 0.44]}>
        {/* Panel housing */}
        <mesh castShadow>
          <boxGeometry args={[w * 0.25, h * 0.35, 0.1]} />
          <meshStandardMaterial color={panelColor} metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Display screen */}
        <mesh position={[0, h * 0.08, 0.052]}>
          <boxGeometry args={[w * 0.15, h * 0.12, 0.01]} />
          <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.3} />
        </mesh>
        
        {/* Status LEDs */}
        <mesh position={[-w * 0.08, h * 0.15, 0.055]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={greenLed} emissive={greenLed} emissiveIntensity={1} />
        </mesh>
        <mesh position={[-w * 0.04, h * 0.15, 0.055]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={greenLed} emissive={greenLed} emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, h * 0.15, 0.055]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color={yellowLed} emissive={yellowLed} emissiveIntensity={0.5} />
        </mesh>
        
        {/* Control buttons */}
        {[-0.06, -0.02, 0.02, 0.06].map((xPos, i) => (
          <mesh key={`btn-${i}`} position={[xPos, -h * 0.08, 0.055]}>
            <cylinderGeometry args={[0.015, 0.015, 0.015, 12]} />
            <meshStandardMaterial 
              color={i === 0 ? '#22c55e' : i === 3 ? '#dc2626' : '#4b5563'} 
              metalness={0.4} 
              roughness={0.6} 
            />
          </mesh>
        ))}
      </group>
      
      {/* === POWER OUTPUT CONNECTIONS (Right side) === */}
      <group position={[w * 0.43, -h * 0.15, 0]}>
        {/* Main output busbar box */}
        <mesh castShadow>
          <boxGeometry args={[0.15, h * 0.25, d * 0.4]} />
          <meshStandardMaterial color={frameColor} metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Copper busbars (3 phases) */}
        {[-d * 0.12, 0, d * 0.12].map((zPos, i) => (
          <mesh key={`busbar-${i}`} position={[0.09, 0, zPos]}>
            <boxGeometry args={[0.04, h * 0.18, 0.06]} />
            <meshStandardMaterial color={copperColor} metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
        
        {/* Output cable glands */}
        {[-d * 0.12, 0, d * 0.12].map((zPos, i) => (
          <mesh key={`gland-${i}`} position={[0.12, -h * 0.15, zPos]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>
      
      {/* === FUEL CONNECTIONS (Rear) === */}
      <group position={[0, -h * 0.2, -d * 0.44]}>
        {/* Fuel inlet */}
        <mesh position={[-w * 0.15, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Fuel return */}
        <mesh position={[w * 0.15, 0, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      
      {/* === VENTILATION LOUVRES (Sides) === */}
      {[d * 0.43, -d * 0.43].map((zPos, side) => (
        <group key={`vent-side-${side}`} position={[0, 0, zPos]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh 
              key={`louver-${i}`}
              position={[-w * 0.15 + i * (w * 0.08), h * 0.15, side === 0 ? 0.02 : -0.02]}
              rotation={[0.3 * (side === 0 ? 1 : -1), 0, 0]}
            >
              <boxGeometry args={[w * 0.06, 0.015, 0.08]} />
              <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* === NAMEPLATE === */}
      <mesh position={[w * 0.1, h * 0.3, d * 0.44]}>
        <boxGeometry args={[w * 0.2, h * 0.08, 0.01]} />
        <meshStandardMaterial color="#f5f5f5" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* === LIFTING EYES === */}
      {[[-w * 0.35, h * 0.4, 0], [w * 0.35, h * 0.4, 0]].map((pos, i) => (
        <mesh key={`lift-${i}`} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.06, 0.02, 8, 16]} />
          <meshStandardMaterial color={frameColor} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* === POWER RATING LABEL (visual indicator) === */}
      <mesh position={[-w * 0.3, h * 0.25, d * 0.44]}>
        <boxGeometry args={[0.15, 0.06, 0.01]} />
        <meshStandardMaterial color="#16a34a" emissive="#16a34a" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// POWER LAYOUT 5MW (Complete layout: Generator + PDU + 2 Containers)
// Pre-configured layout with correct safety distances
// ═══════════════════════════════════════════════════════════════════════════
const PowerLayout5MW = memo(function PowerLayout5MW({ 
  position = [0, 0, 0],
  showLabels = true,
  showDistances = true
}: { 
  position?: [number, number, number];
  showLabels?: boolean;
  showDistances?: boolean;
}) {
  // Layout dimensions (in meters, converted from mm for components)
  const generatorDims = { width: 6000, height: 3000, depth: 2500 };
  const pduDims = { width: 2400, height: 2200, depth: 800 };
  const containerDims = { width: 12192, height: 2896, depth: 2438 };
  const coolingDims = { width: 12192, height: 1200, depth: 2438 };
  
  // Safety distances (meters)
  const distGenToPDU = 3.0;      // Generator to PDU
  const distPDUToContainer = 3.0; // PDU to containers
  const distBetweenContainers = 4.0; // Between containers
  
  // Calculate positions
  const genY = generatorDims.height / 2000;
  const pduY = pduDims.height / 2000;
  const containerY = containerDims.height / 2000;
  const coolingY = containerDims.height / 1000 + coolingDims.height / 2000;
  
  // X positions (layout flows from left to right)
  const genX = 0;
  const pduX = genX + generatorDims.width / 2000 + distGenToPDU + pduDims.width / 2000;
  const containerBaseX = pduX + pduDims.width / 2000 + distPDUToContainer + containerDims.width / 2000;
  
  // Z positions for containers (centered, with spacing)
  const container1Z = -distBetweenContainers / 2 - containerDims.depth / 2000;
  const container2Z = distBetweenContainers / 2 + containerDims.depth / 2000;
  
  return (
    <group position={position}>
      {/* === CONCRETE PAD (Ground) === */}
      <mesh position={[containerBaseX / 2, -0.05, 0]} receiveShadow>
        <boxGeometry args={[35, 0.3, 20]} />
        <meshStandardMaterial color="#6b7280" metalness={0.1} roughness={0.9} />
      </mesh>
      
      {/* === SAFETY ZONE MARKING (Yellow perimeter) === */}
      <mesh position={[containerBaseX / 2, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[16, 16.3, 4]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
      
      {/* === GENERATOR 5 MW === */}
      <Generator5MW 
        dimensions={generatorDims}
        position={[genX, genY, 0]}
        powerMW={5}
      />
      
      {/* === PDU (Power Distribution Unit) === */}
      <LVDistributionSkid 
        dimensions={pduDims}
        position={[pduX, pduY, 0]}
        feeders={2}
      />
      
      {/* === CONTAINER #1 + COOLING === */}
      <group position={[containerBaseX, 0, container1Z]}>
        <ISOContainer 
          dimensions={containerDims}
          position={[0, containerY, 0]}
        />
        <BitmainCoolingSystem 
          dimensions={coolingDims}
          position={[0, coolingY, 0]}
        />
      </group>
      
      {/* === CONTAINER #2 + COOLING === */}
      <group position={[containerBaseX, 0, container2Z]}>
        <ISOContainer 
          dimensions={containerDims}
          position={[0, containerY, 0]}
        />
        <BitmainCoolingSystem 
          dimensions={coolingDims}
          position={[0, coolingY, 0]}
        />
      </group>
      
      {/* === CABLE TRAYS (Visual connection) === */}
      {/* Generator to PDU */}
      <mesh position={[(genX + pduX) / 2, 0.15, 0]} castShadow>
        <boxGeometry args={[distGenToPDU + 1, 0.1, 0.3]} />
        <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} />
      </mesh>
      
      {/* PDU to Container 1 */}
      <mesh position={[(pduX + containerBaseX) / 2, 0.15, container1Z / 2]} castShadow>
        <boxGeometry args={[distPDUToContainer + containerDims.width / 2000, 0.1, 0.3]} />
        <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} />
      </mesh>
      
      {/* PDU to Container 2 */}
      <mesh position={[(pduX + containerBaseX) / 2, 0.15, container2Z / 2]} castShadow>
        <boxGeometry args={[distPDUToContainer + containerDims.width / 2000, 0.1, 0.3]} />
        <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} />
      </mesh>
      
      {/* === DISTANCE MARKERS (Red dashed lines) === */}
      {showDistances && (
        <group>
          {/* Generator to PDU distance */}
          <mesh position={[(genX + generatorDims.width / 2000 + pduX - pduDims.width / 2000) / 2, 0.5, -2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[distGenToPDU, 0.05]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          
          {/* PDU to Containers distance */}
          <mesh position={[(pduX + pduDims.width / 2000 + containerBaseX - containerDims.width / 2000) / 2, 0.5, -2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[distPDUToContainer, 0.05]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          
          {/* Between containers distance */}
          <mesh position={[containerBaseX, 0.5, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[distBetweenContainers, 0.05]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>
      )}
      
      {/* === EARTHING POINTS === */}
      {[
        [genX - 3, 0.1, -1.5],
        [pduX - 1.5, 0.1, -1],
        [containerBaseX - 7, 0.1, container1Z - 1.5],
        [containerBaseX - 7, 0.1, container2Z + 1.5],
      ].map((pos, i) => (
        <mesh key={`earth-${i}`} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.08, 0.08, 0.2, 8]} />
          <meshStandardMaterial color="#15803d" metalness={0.6} roughness={0.4} />
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
  const { isContainer, isCooling, isTransformer, isPowerBlock, isPDU, isCanopy, isCableTray, isJunctionBox } = useMemo(() => {
    const typeLC = objectType?.toLowerCase() || '';
    return {
      isContainer: typeLC.includes('container') || typeLC === 'container' || typeLC === 'containers',
      isCooling: typeLC.includes('cooling') || typeLC === 'cooling' || typeLC === 'coolin',
      isTransformer: typeLC.includes('transformer') || typeLC === 'transformer' || typeLC === 'transformers',
      isPowerBlock: typeLC.includes('powerblock') || typeLC === 'powerblock' || typeLC === 'powerblocks' || typeLC.includes('power-block'),
      isPDU: typeLC.includes('pdu') || typeLC.includes('distribution') || typeLC.includes('skid') || typeLC.includes('switchboard') || typeLC.includes('lv-skid'),
      isCanopy: typeLC.includes('canopy') || typeLC.includes('solar-canopy') || typeLC.includes('solarcanopy') || typeLC.includes('solar'),
      isCableTray: typeLC.includes('cable') || typeLC.includes('chemin') || typeLC.includes('tray') || typeLC.includes('ladder') || typeLC.includes('wire-mesh'),
      isJunctionBox: typeLC.includes('junction') || typeLC.includes('boite') || typeLC.includes('box') || typeLC.includes('raccord'),
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
  
  if (isCableTray) {
    return (
      <group ref={groupRef}>
        <LadderCableTray 
          length={dimensions.width}
          width={dimensions.depth}
          height={dimensions.height}
          position={[0, y, 0]}
          withCables={true}
          cableCount={6}
        />
      </group>
    );
  }
  
  if (isJunctionBox) {
    return (
      <group ref={groupRef}>
        <JunctionBox 
          width={dimensions.width}
          height={dimensions.height}
          depth={dimensions.depth}
          position={[0, y, 0]}
          cableEntries={4}
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
    
    // Cable Trays
    if (typeLC.includes('cable') || typeLC.includes('tray') || typeLC.includes('chemin')) return 'cable-tray';
    if (nameLC.includes('cable') || nameLC.includes('chemin') || nameLC.includes('tray') || 
        nameLC.includes('ladder') || nameLC.includes('échelle') || nameLC.includes('goulotte')) {
      return 'cable-tray';
    }
    
    // Junction Boxes
    if (typeLC.includes('junction') || typeLC.includes('box') || typeLC.includes('raccord')) return 'junction-box';
    if (nameLC.includes('junction') || nameLC.includes('boîte') || nameLC.includes('raccord') ||
        nameLC.includes('derivation') || nameLC.includes('coffret')) {
      return 'junction-box';
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

// ═══════════════════════════════════════════════════════════════════════════
// CABLE TRAY SYSTEM - Industrial cable management (Chemin de câbles)
// Premium galvanized steel ladder tray with accessories
// ═══════════════════════════════════════════════════════════════════════════

// Shared materials for cable management
const cableMaterials = {
  galvanizedSteel: new THREE.MeshStandardMaterial({ color: '#9ca3af', metalness: 0.75, roughness: 0.25 }),
  hotDipGalv: new THREE.MeshStandardMaterial({ color: '#a1a1aa', metalness: 0.8, roughness: 0.2 }),
  powderCoated: new THREE.MeshStandardMaterial({ color: '#374151', metalness: 0.6, roughness: 0.4 }),
  wireMesh: new THREE.MeshStandardMaterial({ color: '#71717a', metalness: 0.7, roughness: 0.3, wireframe: false }),
  cableBlack: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.2, roughness: 0.8 }),
  cableRed: new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.2, roughness: 0.8 }),
  cableBlue: new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.2, roughness: 0.8 }),
  cableGreen: new THREE.MeshStandardMaterial({ color: '#16a34a', metalness: 0.2, roughness: 0.8 }),
  cableYellow: new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.2, roughness: 0.8 }),
  junctionBox: new THREE.MeshStandardMaterial({ color: '#52525b', metalness: 0.5, roughness: 0.5 }),
};

// ═══════════════════════════════════════════════════════════════════════════
// LADDER CABLE TRAY (Chemin de câbles type échelle)
// Industrial standard - hot dip galvanized steel
// ═══════════════════════════════════════════════════════════════════════════
const LadderCableTray = memo(function LadderCableTray({ 
  length = 3000,      // mm - standard 3m section
  width = 300,        // mm - 300mm standard width
  height = 100,       // mm - side rail height
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  withCables = true,
  cableCount = 6,
}: { 
  length?: number;
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  withCables?: boolean;
  cableCount?: number;
}) {
  const l = length / 1000;  // Convert to meters
  const w = width / 1000;
  const h = height / 1000;
  
  // Rail thickness
  const railThickness = 0.003; // 3mm steel
  const rungSpacing = 0.25;   // 250mm between rungs
  const rungCount = Math.floor(l / rungSpacing);
  
  const rungIndices = useMemo(() => Array.from({ length: rungCount }, (_, i) => i), [rungCount]);
  
  // Cable positions (distributed across width)
  const cablePositions = useMemo(() => {
    const positions: Array<{ xOffset: number; color: THREE.MeshStandardMaterial; radius: number }> = [];
    const cableColors = [cableMaterials.cableBlack, cableMaterials.cableRed, cableMaterials.cableBlue, 
                         cableMaterials.cableGreen, cableMaterials.cableYellow, cableMaterials.cableBlack];
    const spacing = (w - 0.04) / (cableCount + 1);
    
    for (let i = 0; i < cableCount; i++) {
      positions.push({
        xOffset: -w/2 + 0.02 + spacing * (i + 1),
        color: cableColors[i % cableColors.length],
        radius: 0.012 + Math.random() * 0.008 // Varied cable sizes
      });
    }
    return positions;
  }, [w, cableCount]);
  
  return (
    <group position={position} rotation={rotation}>
      {/* === SIDE RAILS (C-channel profile) === */}
      {[-1, 1].map((side) => (
        <group key={`rail-${side}`} position={[side * (w/2 - railThickness/2), 0, 0]}>
          {/* Vertical web */}
          <mesh castShadow>
            <boxGeometry args={[railThickness, h, l]} />
            <primitive object={cableMaterials.hotDipGalv} attach="material" />
          </mesh>
          {/* Top flange */}
          <mesh position={[-side * 0.008, h/2 - railThickness/2, 0]} castShadow>
            <boxGeometry args={[0.02, railThickness, l]} />
            <primitive object={cableMaterials.hotDipGalv} attach="material" />
          </mesh>
          {/* Bottom flange */}
          <mesh position={[-side * 0.008, -h/2 + railThickness/2, 0]} castShadow>
            <boxGeometry args={[0.02, railThickness, l]} />
            <primitive object={cableMaterials.hotDipGalv} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === CROSS RUNGS (Ladder rungs) === */}
      {rungIndices.map((i) => (
        <mesh 
          key={`rung-${i}`}
          position={[0, -h/2 + 0.015, -l/2 + rungSpacing/2 + i * rungSpacing]}
          castShadow
        >
          <boxGeometry args={[w - 0.01, 0.006, 0.03]} />
          <primitive object={cableMaterials.hotDipGalv} attach="material" />
        </mesh>
      ))}
      
      {/* === SPLICE PLATES (End connectors) === */}
      {[-l/2, l/2].map((zPos, i) => (
        <group key={`splice-${i}`} position={[0, 0, zPos]}>
          {[-1, 1].map((side) => (
            <mesh 
              key={`splice-plate-${side}`}
              position={[side * (w/2 - railThickness), 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.025, h * 0.8, 0.04]} />
              <primitive object={cableMaterials.galvanizedSteel} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* === CABLES (if enabled) === */}
      {withCables && cablePositions.map((cable, i) => (
        <mesh 
          key={`cable-${i}`}
          position={[cable.xOffset, -h/2 + cable.radius + 0.02, 0]}
          rotation={[Math.PI/2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[cable.radius, cable.radius, l * 0.98, 12]} />
          <primitive object={cable.color} attach="material" />
        </mesh>
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// WIRE MESH CABLE TRAY (Chemin de câbles fil)
// For data/network cables - lighter duty
// ═══════════════════════════════════════════════════════════════════════════
const WireMeshTray = memo(function WireMeshTray({ 
  length = 3000,
  width = 200,
  height = 60,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  withCables = true,
}: { 
  length?: number;
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  withCables?: boolean;
}) {
  const l = length / 1000;
  const w = width / 1000;
  const h = height / 1000;
  
  const wireThickness = 0.004;
  const meshSpacingX = 0.05;
  const meshSpacingZ = 0.1;
  
  const wireCountX = Math.floor(w / meshSpacingX);
  const wireCountZ = Math.floor(l / meshSpacingZ);
  
  return (
    <group position={position} rotation={rotation}>
      {/* === SIDE RAILS === */}
      {[-1, 1].map((side) => (
        <mesh 
          key={`side-${side}`}
          position={[side * w/2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[wireThickness * 2, h, l]} />
          <primitive object={cableMaterials.wireMesh} attach="material" />
        </mesh>
      ))}
      
      {/* === BOTTOM MESH (Longitudinal wires) === */}
      {Array.from({ length: wireCountX }).map((_, i) => (
        <mesh 
          key={`long-wire-${i}`}
          position={[-w/2 + meshSpacingX/2 + i * meshSpacingX, -h/2 + wireThickness, 0]}
          castShadow
        >
          <boxGeometry args={[wireThickness, wireThickness, l]} />
          <primitive object={cableMaterials.wireMesh} attach="material" />
        </mesh>
      ))}
      
      {/* === BOTTOM MESH (Cross wires) === */}
      {Array.from({ length: wireCountZ }).map((_, i) => (
        <mesh 
          key={`cross-wire-${i}`}
          position={[0, -h/2 + wireThickness, -l/2 + meshSpacingZ/2 + i * meshSpacingZ]}
          castShadow
        >
          <boxGeometry args={[w, wireThickness, wireThickness]} />
          <primitive object={cableMaterials.wireMesh} attach="material" />
        </mesh>
      ))}
      
      {/* === DATA CABLES (Blue Cat6/Cat6a) === */}
      {withCables && (
        <group position={[0, -h/2 + 0.02, 0]}>
          {/* Cable bundle */}
          <mesh rotation={[Math.PI/2, 0, 0]} castShadow>
            <cylinderGeometry args={[w * 0.3, w * 0.3, l * 0.95, 16]} />
            <meshStandardMaterial color="#1e40af" metalness={0.15} roughness={0.85} />
          </mesh>
          {/* Cable ties (visible) */}
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh 
              key={`tie-${i}`}
              position={[0, 0.01, -l/2 + l/7 + i * (l/7)]}
              rotation={[0, 0, Math.PI/2]}
            >
              <torusGeometry args={[w * 0.32, 0.003, 8, 16]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CABLE TRAY ELBOW 90° (Coude 90°)
// For direction changes in cable routing
// ═══════════════════════════════════════════════════════════════════════════
const CableTrayElbow90 = memo(function CableTrayElbow90({ 
  width = 300,
  height = 100,
  bendRadius = 300,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  horizontal = true,  // true = horizontal turn, false = vertical turn
}: { 
  width?: number;
  height?: number;
  bendRadius?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  horizontal?: boolean;
}) {
  const w = width / 1000;
  const h = height / 1000;
  const r = bendRadius / 1000;
  
  // Create curved segments
  const segments = 8;
  const angleStep = (Math.PI / 2) / segments;
  
  const curvePoints = useMemo(() => {
    const points: Array<{ x: number; z: number; angle: number }> = [];
    for (let i = 0; i <= segments; i++) {
      const angle = i * angleStep;
      points.push({
        x: r * Math.sin(angle),
        z: r * (1 - Math.cos(angle)),
        angle: angle
      });
    }
    return points;
  }, [r, segments, angleStep]);
  
  return (
    <group position={position} rotation={rotation}>
      {horizontal ? (
        // Horizontal elbow (turn left/right)
        <>
          {/* Curved side rails */}
          {[-1, 1].map((side) => (
            <group key={`curve-rail-${side}`}>
              {curvePoints.slice(0, -1).map((point, i) => {
                const nextPoint = curvePoints[i + 1];
                const midX = (point.x + nextPoint.x) / 2;
                const midZ = (point.z + nextPoint.z) / 2;
                const segLength = Math.sqrt(
                  Math.pow(nextPoint.x - point.x, 2) + 
                  Math.pow(nextPoint.z - point.z, 2)
                );
                const segAngle = Math.atan2(nextPoint.x - point.x, nextPoint.z - point.z);
                
                return (
                  <mesh 
                    key={`seg-${i}`}
                    position={[midX + side * (w/2) * Math.cos(point.angle + angleStep/2), 0, midZ + side * (w/2) * Math.sin(point.angle + angleStep/2)]}
                    rotation={[0, segAngle, 0]}
                    castShadow
                  >
                    <boxGeometry args={[0.003, h, segLength * 1.1]} />
                    <primitive object={cableMaterials.hotDipGalv} attach="material" />
                  </mesh>
                );
              })}
            </group>
          ))}
          
          {/* Curved bottom plate */}
          <mesh position={[r/2, -h/2 + 0.002, r/2]} castShadow>
            <boxGeometry args={[r * 0.9, 0.004, r * 0.9]} />
            <primitive object={cableMaterials.galvanizedSteel} attach="material" />
          </mesh>
        </>
      ) : (
        // Vertical elbow (up/down)
        <>
          {curvePoints.slice(0, -1).map((point, i) => {
            const nextPoint = curvePoints[i + 1];
            return (
              <mesh 
                key={`vseg-${i}`}
                position={[0, point.x, point.z]}
                rotation={[point.angle + angleStep/2, 0, 0]}
                castShadow
              >
                <boxGeometry args={[w, h, r / segments]} />
                <primitive object={cableMaterials.galvanizedSteel} attach="material" />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CABLE TRAY TEE (Raccord en T)
// For branching cable routes
// ═══════════════════════════════════════════════════════════════════════════
const CableTrayTee = memo(function CableTrayTee({ 
  width = 300,
  height = 100,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}: { 
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const w = width / 1000;
  const h = height / 1000;
  
  return (
    <group position={position} rotation={rotation}>
      {/* === MAIN THROUGH SECTION === */}
      {/* Side rails */}
      {[-1, 1].map((side) => (
        <mesh 
          key={`main-rail-${side}`}
          position={[side * w/2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.003, h, w * 1.5]} />
          <primitive object={cableMaterials.hotDipGalv} attach="material" />
        </mesh>
      ))}
      
      {/* Bottom plate (main) */}
      <mesh position={[0, -h/2 + 0.002, 0]} castShadow>
        <boxGeometry args={[w, 0.004, w * 1.5]} />
        <primitive object={cableMaterials.galvanizedSteel} attach="material" />
      </mesh>
      
      {/* === BRANCH SECTION === */}
      {/* Branch rails */}
      {[-1, 1].map((side) => (
        <mesh 
          key={`branch-rail-${side}`}
          position={[w/2 + w * 0.4, 0, side * w/2]}
          rotation={[0, Math.PI/2, 0]}
          castShadow
        >
          <boxGeometry args={[0.003, h, w * 0.8]} />
          <primitive object={cableMaterials.hotDipGalv} attach="material" />
        </mesh>
      ))}
      
      {/* Branch bottom plate */}
      <mesh position={[w/2 + w * 0.4, -h/2 + 0.002, 0]} castShadow>
        <boxGeometry args={[w * 0.8, 0.004, w]} />
        <primitive object={cableMaterials.galvanizedSteel} attach="material" />
      </mesh>
      
      {/* === CORNER REINFORCEMENTS === */}
      {[[-w/2, w * 0.5], [w/2, w * 0.5], [-w/2, -w * 0.5], [w/2, -w * 0.5]].map((pos, i) => (
        <mesh 
          key={`gusset-${i}`}
          position={[pos[0], -h/2 + 0.01, pos[1]]}
          castShadow
        >
          <boxGeometry args={[0.04, 0.008, 0.04]} />
          <primitive object={cableMaterials.hotDipGalv} attach="material" />
        </mesh>
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CABLE TRAY REDUCER (Réducteur)
// For transitioning between different tray widths
// ═══════════════════════════════════════════════════════════════════════════
const CableTrayReducer = memo(function CableTrayReducer({ 
  widthLarge = 450,
  widthSmall = 300,
  length = 300,
  height = 100,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}: { 
  widthLarge?: number;
  widthSmall?: number;
  length?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const wL = widthLarge / 1000;
  const wS = widthSmall / 1000;
  const l = length / 1000;
  const h = height / 1000;
  
  return (
    <group position={position} rotation={rotation}>
      {/* === TAPERED SIDE RAILS === */}
      {[-1, 1].map((side) => {
        // Create angled rail
        const startX = side * wL/2;
        const endX = side * wS/2;
        const midX = (startX + endX) / 2;
        const angle = Math.atan2(startX - endX, l);
        const railLength = Math.sqrt(Math.pow(startX - endX, 2) + Math.pow(l, 2));
        
        return (
          <mesh 
            key={`taper-rail-${side}`}
            position={[midX, 0, 0]}
            rotation={[0, -side * angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.003, h, railLength]} />
            <primitive object={cableMaterials.hotDipGalv} attach="material" />
          </mesh>
        );
      })}
      
      {/* === TAPERED BOTTOM === */}
      <mesh position={[0, -h/2 + 0.002, 0]} castShadow>
        <boxGeometry args={[(wL + wS) / 2, 0.004, l]} />
        <primitive object={cableMaterials.galvanizedSteel} attach="material" />
      </mesh>
      
      {/* === END PLATES === */}
      <mesh position={[0, 0, -l/2]} castShadow>
        <boxGeometry args={[wL, h, 0.004]} />
        <primitive object={cableMaterials.galvanizedSteel} attach="material" />
      </mesh>
      <mesh position={[0, 0, l/2]} castShadow>
        <boxGeometry args={[wS, h, 0.004]} />
        <primitive object={cableMaterials.galvanizedSteel} attach="material" />
      </mesh>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// WALL BRACKET (Console murale)
// For mounting cable trays to walls
// ═══════════════════════════════════════════════════════════════════════════
const WallBracket = memo(function WallBracket({ 
  width = 300,        // Tray width it supports
  depth = 200,        // How far from wall
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}: { 
  width?: number;
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const w = width / 1000;
  const d = depth / 1000;
  
  return (
    <group position={position} rotation={rotation}>
      {/* === WALL PLATE === */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.4, 0.15, 0.008]} />
        <primitive object={cableMaterials.powderCoated} attach="material" />
      </mesh>
      
      {/* === SUPPORT ARM (Triangular bracket) === */}
      {[-1, 1].map((side) => (
        <group key={`arm-${side}`} position={[side * w * 0.15, 0, 0]}>
          {/* Horizontal arm */}
          <mesh position={[0, 0, d/2]} castShadow>
            <boxGeometry args={[0.04, 0.006, d]} />
            <primitive object={cableMaterials.powderCoated} attach="material" />
          </mesh>
          {/* Diagonal brace */}
          <mesh 
            position={[0, -0.05, d * 0.35]} 
            rotation={[Math.PI/4, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.03, 0.005, d * 0.5]} />
            <primitive object={cableMaterials.powderCoated} attach="material" />
          </mesh>
        </group>
      ))}
      
      {/* === TOP SUPPORT RAIL === */}
      <mesh position={[0, 0, d]} castShadow>
        <boxGeometry args={[w * 0.35, 0.008, 0.04]} />
        <primitive object={cableMaterials.powderCoated} attach="material" />
      </mesh>
      
      {/* === MOUNTING HOLES (Visual) === */}
      {[[-w * 0.12, 0.05], [w * 0.12, 0.05], [-w * 0.12, -0.05], [w * 0.12, -0.05]].map((pos, i) => (
        <mesh key={`hole-${i}`} position={[pos[0], pos[1], 0.005]}>
          <cylinderGeometry args={[0.006, 0.006, 0.01, 8]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CEILING TRAPEZE (Suspension plafond)
// For hanging cable trays from ceiling/structure
// ═══════════════════════════════════════════════════════════════════════════
const CeilingTrapeze = memo(function CeilingTrapeze({ 
  width = 300,        // Tray width it supports
  dropHeight = 500,   // Distance from ceiling
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}: { 
  width?: number;
  dropHeight?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const w = width / 1000;
  const drop = dropHeight / 1000;
  
  return (
    <group position={position} rotation={rotation}>
      {/* === THREADED RODS (2 per trapeze) === */}
      {[-1, 1].map((side) => (
        <group key={`rod-${side}`} position={[side * (w/2 + 0.02), drop/2, 0]}>
          {/* Threaded rod */}
          <mesh castShadow>
            <cylinderGeometry args={[0.006, 0.006, drop, 8]} />
            <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Top anchor plate */}
          <mesh position={[0, drop/2, 0]} castShadow>
            <boxGeometry args={[0.05, 0.008, 0.05]} />
            <primitive object={cableMaterials.galvanizedSteel} attach="material" />
          </mesh>
          {/* Bottom nut */}
          <mesh position={[0, -drop/2 + 0.01, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.015, 6]} />
            <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      
      {/* === CROSS MEMBER (Supports tray) === */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[w + 0.05, 0.04, 0.04]} />
        <primitive object={cableMaterials.powderCoated} attach="material" />
      </mesh>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// JUNCTION BOX (Boîte de jonction)
// For cable connections and transitions
// ═══════════════════════════════════════════════════════════════════════════
const JunctionBox = memo(function JunctionBox({ 
  width = 300,
  height = 200,
  depth = 150,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  cableEntries = 4,
}: { 
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  cableEntries?: number;
}) {
  const w = width / 1000;
  const h = height / 1000;
  const d = depth / 1000;
  
  const entrySpacing = w / (cableEntries + 1);
  
  return (
    <group position={position} rotation={rotation}>
      {/* === MAIN BOX === */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <primitive object={cableMaterials.junctionBox} attach="material" />
      </mesh>
      
      {/* === COVER PLATE === */}
      <mesh position={[0, 0, d/2 + 0.002]} castShadow>
        <boxGeometry args={[w * 0.95, h * 0.95, 0.004]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* === COVER SCREWS === */}
      {[[-w * 0.4, h * 0.4], [w * 0.4, h * 0.4], [-w * 0.4, -h * 0.4], [w * 0.4, -h * 0.4]].map((pos, i) => (
        <mesh key={`screw-${i}`} position={[pos[0], pos[1], d/2 + 0.006]}>
          <cylinderGeometry args={[0.008, 0.008, 0.008, 12]} />
          <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* === CABLE ENTRIES (Bottom) === */}
      {Array.from({ length: cableEntries }).map((_, i) => (
        <group key={`entry-${i}`} position={[-w/2 + entrySpacing * (i + 1), -h/2 - 0.02, 0]}>
          {/* Cable gland */}
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.04, 12]} />
            <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Locknut */}
          <mesh position={[0, 0.025, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.01, 6]} />
            <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
      
      {/* === EARTH TERMINAL (Green/Yellow) === */}
      <mesh position={[w * 0.35, h * 0.35, d/2 + 0.01]}>
        <boxGeometry args={[0.025, 0.015, 0.008]} />
        <meshStandardMaterial color="#22c55e" metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* === IP RATING LABEL === */}
      <mesh position={[0, -h * 0.3, d/2 + 0.004]}>
        <boxGeometry args={[0.04, 0.015, 0.001]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE CABLE ROUTING SYSTEM
// Pre-configured professional cable layout for mining facility
// ═══════════════════════════════════════════════════════════════════════════
const CableRoutingSystem = memo(function CableRoutingSystem({ 
  dimensions,
  position = [0, 0, 0] as [number, number, number],
  cableHeight = 3500,  // Height of cable trays above ground (mm)
}: { 
  dimensions: { width: number; height: number; depth: number };
  position?: [number, number, number];
  cableHeight?: number;
}) {
  const w = dimensions.width / 1000;
  const d = dimensions.depth / 1000;
  const cableY = cableHeight / 1000;
  
  // Main cable run length
  const mainRunLength = w * 0.8;
  const branchCount = 4;
  const branchSpacing = mainRunLength / (branchCount + 1);
  
  return (
    <group position={position}>
      {/* === MAIN POWER CABLE RUN (Ladder tray 450mm) === */}
      <LadderCableTray 
        length={mainRunLength * 1000}
        width={450}
        height={100}
        position={[0, cableY, 0]}
        rotation={[0, Math.PI/2, 0]}
        withCables={true}
        cableCount={8}
      />
      
      {/* === CEILING SUPPORTS FOR MAIN RUN === */}
      {Array.from({ length: Math.ceil(mainRunLength / 2) }).map((_, i) => (
        <CeilingTrapeze 
          key={`main-support-${i}`}
          width={450}
          dropHeight={500}
          position={[-mainRunLength/2 + 1 + i * 2, cableY + 0.25, 0]}
        />
      ))}
      
      {/* === BRANCH RUNS TO CONTAINERS (Ladder tray 300mm) === */}
      {Array.from({ length: branchCount }).map((_, i) => {
        const xPos = -mainRunLength/2 + branchSpacing * (i + 1);
        const branchLength = d * 0.4;
        
        return (
          <group key={`branch-${i}`}>
            {/* Branch tray */}
            <LadderCableTray 
              length={branchLength * 1000}
              width={300}
              height={100}
              position={[xPos, cableY - 0.15, branchLength/2 + 0.2]}
              rotation={[0, 0, 0]}
              withCables={true}
              cableCount={4}
            />
            
            {/* Tee connector */}
            <CableTrayTee 
              width={300}
              height={100}
              position={[xPos - 0.15, cableY, 0]}
              rotation={[0, Math.PI/2, 0]}
            />
            
            {/* Reducer (main to branch) */}
            <CableTrayReducer 
              widthLarge={450}
              widthSmall={300}
              length={300}
              height={100}
              position={[xPos, cableY - 0.08, 0.15]}
              rotation={[0, 0, 0]}
            />
            
            {/* Wall brackets for branch */}
            <WallBracket 
              width={300}
              depth={200}
              position={[xPos, cableY - 0.15, branchLength + 0.3]}
              rotation={[0, Math.PI, 0]}
            />
            
            {/* Junction box at end */}
            <JunctionBox 
              width={400}
              height={300}
              depth={200}
              position={[xPos, cableY - 0.5, branchLength + 0.5]}
              rotation={[0, Math.PI, 0]}
              cableEntries={4}
            />
          </group>
        );
      })}
      
      {/* === DATA/NETWORK CABLE RUN (Wire mesh tray) === */}
      <WireMeshTray 
        length={mainRunLength * 1000 * 0.9}
        width={200}
        height={60}
        position={[0, cableY + 0.12, -0.25]}
        rotation={[0, Math.PI/2, 0]}
        withCables={true}
      />
      
      {/* === VERTICAL DROPS AT ENDS === */}
      {[-1, 1].map((side) => (
        <group key={`vertical-${side}`} position={[side * mainRunLength/2, 0, 0]}>
          {/* Vertical cable tray section */}
          <LadderCableTray 
            length={cableY * 1000}
            width={300}
            height={100}
            position={[side * 0.3, cableY/2, 0]}
            rotation={[Math.PI/2, 0, 0]}
            withCables={true}
            cableCount={4}
          />
          
          {/* 90° elbow */}
          <CableTrayElbow90 
            width={300}
            height={100}
            bendRadius={300}
            position={[side * mainRunLength/2 - side * 0.15, cableY - 0.15, 0]}
            rotation={[0, side > 0 ? 0 : Math.PI, 0]}
            horizontal={false}
          />
        </group>
      ))}
      
      {/* === FLOOR LEVEL JUNCTION BOXES === */}
      {[-mainRunLength/2, mainRunLength/2].map((xPos, i) => (
        <JunctionBox 
          key={`floor-jbox-${i}`}
          width={500}
          height={400}
          depth={250}
          position={[xPos + (i === 0 ? 0.3 : -0.3), 0.25, 0]}
          cableEntries={6}
        />
      ))}
    </group>
  );
});

// Export individual components for use in scene
export { 
  SolarCanopy, 
  ISOContainer, 
  BitmainCoolingSystem, 
  OilTransformer, 
  LVDistributionSkid,
  // Cable Management System
  LadderCableTray,
  WireMeshTray,
  CableTrayElbow90,
  CableTrayTee,
  CableTrayReducer,
  WallBracket,
  CeilingTrapeze,
  JunctionBox,
  CableRoutingSystem,
};
