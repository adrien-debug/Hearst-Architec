'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { 
  OrbitControls, 
  TransformControls, 
  Grid, 
  PerspectiveCamera, 
  Environment, 
  Html,
  Line,
  Text
} from '@react-three/drei';
import * as THREE from 'three';
import { InfraObject, aiApi, AIPlacement, AIImplantationResult, layoutsApi, Layout, AIStatus, objectsApi } from '@/lib/api';
import LibraryDrawer from '@/components/designer/library-drawer';
import PropertiesPanel, { Object3D } from '@/components/designer/properties-panel';
import Toolbar, { Tool, TransformMode } from '@/components/designer/toolbar';
import CableRoutingTool, { CableRoute } from '@/components/designer/cable-routing-tool';
import CableScene from '@/components/designer/cable-3d-renderer';
import { 
  generateSnapPointsForObject, 
  WorldSnapPoint, 
  ConnectionType,
} from '@/components/designer/cable-snap-points';
import { 
  generateCableZones, 
  calculateOptimalHeight,
  CableZone,
  SimpleObject,
  DEFAULT_HEIGHT_CONFIG,
} from '@/components/designer/cable-zone-manager';
// Smart Alignment désactivé - à reconstruire proprement
// import SmartAlignmentPanel from '@/components/designer/smart-alignment-panel';
// import { analyzeScene, SceneObject } from '@/lib/smart-alignment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Save,
  FolderOpen,
  Trash2,
  Sparkles,
  Send,
  ChevronRight,
  AlertTriangle,
  Check,
  Lightbulb,
  MessageSquare,
  Wand2,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  RotateCcw,
  RotateCw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Move,
  Copy,
  BoxSelect,
  Lock,
  Unlock,
  Shapes
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SavedProject {
  id: string;
  name: string;
  objects: Object3D[];
  savedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════





// Editable 3D Object
// Hearst Logo Component - loads PNG texture
function HearstLogo({ 
  position, 
  height, 
  rotation = [0, 0, 0] 
}: { 
  position: [number, number, number]; 
  height: number; 
  rotation?: [number, number, number];
}) {
  const texture = useLoader(TextureLoader, '/hearst-logo.png');
  const logoWidth = height * 1; // Square aspect ratio
  
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[logoWidth, height]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

function EditableObject({ 
  object, 
  isSelected, 
  onSelect, 
  transformMode,
  onTransformEnd
}: { 
  object: Object3D; 
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  transformMode: TransformMode;
  onTransformEnd: (position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void;
}) {
  const meshRef = useRef<any>(null);
  const transformRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  
  const scale = [
    (object.dimensions.width / 1000) * object.scale.x,
    (object.dimensions.height / 1000) * object.scale.y,
    (object.dimensions.depth / 1000) * object.scale.z
  ] as [number, number, number];


  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current;
      const handleChange = () => {
        if (meshRef.current) {
          onTransformEnd(
            meshRef.current.position.clone(),
            meshRef.current.rotation.clone(),
            meshRef.current.scale.clone()
          );
        }
      };
      controls.addEventListener('objectChange', handleChange);
      return () => controls.removeEventListener('objectChange', handleChange);
    }
  }, [onTransformEnd]);

  if (!object.visible) return null;

  // Determine object type for styling
  const typeLC = object.type.toLowerCase();
  const isContainer = typeLC.includes('container');
  const isCooling = typeLC.includes('cooling');
  const isTransformer = typeLC.includes('transformer') && !typeLC.includes('rmu');
  const isPDU = typeLC.includes('pdu') || typeLC.includes('distribution') || typeLC.includes('skid') || typeLC.includes('switchboard');
  const isRMU = typeLC.includes('rmu');
  const isCanopy = typeLC.includes('canopy') || typeLC.includes('solar');
  const isRoad = typeLC.includes('road');
  const isBuilding = typeLC.includes('building') || typeLC.includes('guardhouse');
  const isLoading = typeLC.includes('loading');
  const isParking = typeLC.includes('parking');
  const isSlab = typeLC.includes('slab') || typeLC.includes('concrete') || typeLC.includes('dalle');

  // Color based on type
  let displayColor = object.color;
  if (isContainer) displayColor = '#e8e8e8';
  else if (isCooling) displayColor = '#1e3a5f';
  else if (isTransformer) displayColor = '#f59e0b';
  else if (isPDU) displayColor = '#374151';
  else if (isRMU) displayColor = '#1f2937';
  else if (isCanopy) displayColor = '#1e3a5f';
  else if (isRoad) displayColor = '#4b5563';
  else if (isBuilding) displayColor = '#1f2937';
  else if (isLoading) displayColor = '#fbbf24';
  else if (isParking) displayColor = '#374151';
  else if (isSlab) displayColor = '#e5e7eb';

  // Container realistic rendering - SAME STYLE as cooling
  const renderContainer = () => {
    const [w, h, d] = scale; // width, height, depth in meters
    const frameThickness = 0.12;
    const cornerPostSize = 0.12;
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Main body - white metallic */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w - 0.02, h - 0.02, d - 0.02]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* === BLACK METALLIC FRAME === */}
        
        {/* Bottom frame - front/back */}
        <mesh position={[0, -h/2 + frameThickness/2, -d/2 + 0.05]} castShadow>
          <boxGeometry args={[w, frameThickness, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -h/2 + frameThickness/2, d/2 - 0.05]} castShadow>
          <boxGeometry args={[w, frameThickness, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Bottom frame - sides */}
        <mesh position={[-w/2 + 0.05, -h/2 + frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.1, frameThickness, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[w/2 - 0.05, -h/2 + frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.1, frameThickness, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Top frame - front/back */}
        <mesh position={[0, h/2 - frameThickness/2, -d/2 + 0.04]} castShadow>
          <boxGeometry args={[w, frameThickness * 0.8, 0.08]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, h/2 - frameThickness/2, d/2 - 0.04]} castShadow>
          <boxGeometry args={[w, frameThickness * 0.8, 0.08]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Top frame - sides */}
        <mesh position={[-w/2 + 0.04, h/2 - frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.08, frameThickness * 0.8, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[w/2 - 0.04, h/2 - frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.08, frameThickness * 0.8, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Corner posts (4 vertical) */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([xSign, zSign], i) => (
          <mesh 
            key={`post-${i}`} 
            position={[xSign * (w/2 - cornerPostSize/2), 0, zSign * (d/2 - cornerPostSize/2)]} 
            castShadow
          >
            <boxGeometry args={[cornerPostSize, h + 0.02, cornerPostSize]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* ISO Corner castings (8 corners) */}
        {[
          [-w/2, -h/2, -d/2], [w/2, -h/2, -d/2], [-w/2, -h/2, d/2], [w/2, -h/2, d/2],
          [-w/2, h/2, -d/2], [w/2, h/2, -d/2], [-w/2, h/2, d/2], [w/2, h/2, d/2],
        ].map((pos, i) => (
          <mesh key={`casting-${i}`} position={pos as [number, number, number]} castShadow>
            <boxGeometry args={[0.18, 0.1, 0.18]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Front - Z negative) === */}
        {Array.from({ length: Math.floor(w / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-front-${i}`}
            position={[-w/2 + 0.06 + i * 0.12, 0, -d/2 - 0.015]}
            castShadow
          >
            <boxGeometry args={[0.06, h * 0.85, 0.03]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Back - Z positive) === */}
        {Array.from({ length: Math.floor(w / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-back-${i}`}
            position={[-w/2 + 0.06 + i * 0.12, 0, d/2 + 0.015]}
            castShadow
          >
            <boxGeometry args={[0.06, h * 0.85, 0.03]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Left) === */}
        {Array.from({ length: Math.floor(d / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-left-${i}`}
            position={[-w/2 - 0.015, 0, -d/2 + 0.06 + i * 0.12]}
            castShadow
          >
            <boxGeometry args={[0.03, h * 0.85, 0.06]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Right) === */}
        {Array.from({ length: Math.floor(d / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-right-${i}`}
            position={[w/2 + 0.015, 0, -d/2 + 0.06 + i * 0.12]}
            castShadow
          >
            <boxGeometry args={[0.03, h * 0.85, 0.06]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* HEARST LOGO - Using imported PNG texture on both sides */}
        <HearstLogo position={[0, 0, d/2 + 0.06]} height={h * 0.5} />
        <HearstLogo position={[0, 0, -d/2 - 0.06]} height={h * 0.5} rotation={[0, Math.PI, 0]} />
        
        {/* Container doors (back face X-) - double doors */}
        <group position={[-w/2 - 0.04, 0, 0]}>
          {/* Door frame */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.08, h * 0.9, d * 0.85]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
          </mesh>
          
          {/* Left door panel */}
          <mesh position={[-0.02, 0, -d * 0.22]} castShadow>
            <boxGeometry args={[0.06, h * 0.85, d * 0.38]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Right door panel */}
          <mesh position={[-0.02, 0, d * 0.22]} castShadow>
            <boxGeometry args={[0.06, h * 0.85, d * 0.38]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Door handles/lock bars */}
          <mesh position={[-0.06, 0, -d * 0.05]} castShadow>
            <boxGeometry args={[0.04, h * 0.7, 0.06]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[-0.06, 0, d * 0.05]} castShadow>
            <boxGeometry args={[0.04, h * 0.7, 0.06]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
          
          {/* Horizontal lock bars */}
          {[-0.3, 0, 0.3].map((yOffset, i) => (
            <mesh key={`lock-${i}`} position={[-0.08, yOffset * h, 0]} castShadow>
              <boxGeometry args={[0.03, 0.06, d * 0.75]} />
              <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      </group>
    );
  };
  
  // Cooling realistic rendering - SAME architecture as container (black metallic frames)
  const renderCooling = () => {
    const [w, h, d] = scale;
    const frameThickness = 0.12; // Same as container
    const cornerPostSize = 0.12; // Same as container
    
    // Number of fans based on width - 2 rows
    const fansPerRow = Math.max(4, Math.floor(w / 2));
    const fanRows = 2;
    const fanSpacingX = (w - 1) / fansPerRow;
    const fanSpacingZ = (d - 0.5) / (fanRows + 1);
    const fanRadius = Math.min(0.28, (d * 0.35) / fanRows);
    
    // Panel count for thermal exchanger
    const numPanels = Math.floor(w / 0.9);
    const panelWidth = (w - cornerPostSize * 2) / numPanels;
    const panelHeight = h * 0.7;
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* === MAIN BODY (White metallic - same as container) === */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w - 0.02, h - 0.02, d - 0.02]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* === BLACK METALLIC FRAME - Same architecture as container === */}
        
        {/* Bottom frame - front/back */}
        <mesh position={[0, -h/2 + frameThickness/2, -d/2 + 0.05]} castShadow>
          <boxGeometry args={[w, frameThickness, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -h/2 + frameThickness/2, d/2 - 0.05]} castShadow>
          <boxGeometry args={[w, frameThickness, 0.1]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Bottom frame - sides */}
        <mesh position={[-w/2 + 0.05, -h/2 + frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.1, frameThickness, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[w/2 - 0.05, -h/2 + frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.1, frameThickness, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Top frame - front/back */}
        <mesh position={[0, h/2 - frameThickness/2, -d/2 + 0.04]} castShadow>
          <boxGeometry args={[w, frameThickness * 0.8, 0.08]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, h/2 - frameThickness/2, d/2 - 0.04]} castShadow>
          <boxGeometry args={[w, frameThickness * 0.8, 0.08]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Top frame - sides */}
        <mesh position={[-w/2 + 0.04, h/2 - frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.08, frameThickness * 0.8, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[w/2 - 0.04, h/2 - frameThickness/2, 0]} castShadow>
          <boxGeometry args={[0.08, frameThickness * 0.8, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Corner posts (4 vertical) - same as container */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([xSign, zSign], i) => (
          <mesh 
            key={`post-${i}`} 
            position={[xSign * (w/2 - cornerPostSize/2), 0, zSign * (d/2 - cornerPostSize/2)]} 
            castShadow
          >
            <boxGeometry args={[cornerPostSize, h + 0.02, cornerPostSize]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* ISO Corner castings (8 corners) - same as container */}
        {[
          [-w/2, -h/2, -d/2], [w/2, -h/2, -d/2], [-w/2, -h/2, d/2], [w/2, -h/2, d/2],
          [-w/2, h/2, -d/2], [w/2, h/2, -d/2], [-w/2, h/2, d/2], [w/2, h/2, d/2],
        ].map((pos, i) => (
          <mesh key={`casting-${i}`} position={pos as [number, number, number]} castShadow>
            <boxGeometry args={[0.18, 0.1, 0.18]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Same style as container - Front) === */}
        {Array.from({ length: Math.floor(w / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-front-${i}`}
            position={[-w/2 + 0.06 + i * 0.12, 0, -d/2 - 0.015]}
            castShadow
          >
            <boxGeometry args={[0.06, h * 0.85, 0.03]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Same style as container - Back) === */}
        {Array.from({ length: Math.floor(w / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-back-${i}`}
            position={[-w/2 + 0.06 + i * 0.12, 0, d/2 + 0.015]}
            castShadow
          >
            <boxGeometry args={[0.06, h * 0.85, 0.03]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Left) === */}
        {Array.from({ length: Math.floor(d / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-left-${i}`}
            position={[-w/2 - 0.015, 0, -d/2 + 0.06 + i * 0.12]}
            castShadow
          >
            <boxGeometry args={[0.03, h * 0.85, 0.06]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === CORRUGATED SIDES (Right) === */}
        {Array.from({ length: Math.floor(d / 0.12) }).map((_, i) => (
          <mesh 
            key={`corr-right-${i}`}
            position={[w/2 + 0.015, 0, -d/2 + 0.06 + i * 0.12]}
            castShadow
          >
            <boxGeometry args={[0.03, h * 0.85, 0.06]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* === FAN PLATFORM (Top - dark frame) === */}
        <mesh position={[0, h/2 + 0.02, 0]} castShadow>
          <boxGeometry args={[w - cornerPostSize * 2, 0.05, d - cornerPostSize * 2]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* === EC2-DT AXIAL FANS (2 rows × 6 fans = 12 large fans) === */}
        {(() => {
          const fansPerRow = 6;
          const fanDiameter = 0.9; // 900mm axial fans
          const fanSpacingX = (w - 1) / fansPerRow;
          const rowSpacing = d * 0.4;
          
          return Array.from({ length: 2 }).map((_, rowIdx) => 
            Array.from({ length: fansPerRow }).map((_, colIdx) => {
              const xPos = -w/2 + 0.5 + fanSpacingX * (colIdx + 0.5);
              const zPos = (rowIdx === 0 ? -rowSpacing/2 : rowSpacing/2);
              const bladeRadius = fanDiameter / 2;
              
              return (
                <group key={`fan-${rowIdx}-${colIdx}`} position={[xPos, h/2 + 0.08, zPos]}>
                  {/* Fan shroud/housing (circular) */}
                  <mesh castShadow>
                    <cylinderGeometry args={[bladeRadius + 0.05, bladeRadius + 0.05, 0.15, 32]} />
                    <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
                  </mesh>
                  
                  {/* Inner ring */}
                  <mesh position={[0, 0.08, 0]}>
                    <cylinderGeometry args={[bladeRadius, bladeRadius, 0.02, 32]} />
                    <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
                  </mesh>
                  
                  {/* === VISIBLE FAN BLADES (7 blades - industrial axial) === */}
                  {[0, 51.4, 102.8, 154.2, 205.7, 257.1, 308.5].map((angle, j) => (
                    <mesh 
                      key={`blade-${j}`} 
                      position={[0, 0.1, 0]}
                      rotation={[0.18, (angle * Math.PI) / 180, 0]}
                    >
                      {/* Blade shape - tapered */}
                      <boxGeometry args={[bladeRadius * 0.85, 0.025, 0.15]} />
                      <meshStandardMaterial color="#d1d5db" metalness={0.7} roughness={0.25} />
                    </mesh>
                  ))}
                  
                  {/* Center motor hub */}
                  <mesh position={[0, 0.1, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
                    <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
                  </mesh>
                  
                  {/* Hub cap */}
                  <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.08, 0.06, 0.04, 16]} />
                    <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
                  </mesh>
                  
                  {/* Protective wire guard (finger guard) */}
                  <mesh position={[0, 0.12, 0]}>
                    <cylinderGeometry args={[bladeRadius - 0.02, bladeRadius - 0.02, 0.02, 32]} />
                    <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.4} wireframe />
                  </mesh>
                  
                  {/* Guard ring */}
                  <mesh position={[0, 0.13, 0]} rotation={[Math.PI/2, 0, 0]}>
                    <torusGeometry args={[bladeRadius - 0.02, 0.015, 8, 32]} />
                    <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
                  </mesh>
                  
                  {/* Motor mount cross bars */}
                  {[0, 90].map((angle, k) => (
                    <mesh key={`bar-${k}`} position={[0, 0.06, 0]} rotation={[0, (angle * Math.PI) / 180, 0]}>
                      <boxGeometry args={[bladeRadius * 1.8, 0.02, 0.03]} />
                      <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
                    </mesh>
                  ))}
                </group>
              );
            })
          );
        })()}
        
        {/* === ANTSPACE LOGO - Offset to avoid z-fighting === */}
        <mesh position={[w * 0.15, h * 0.15, -d/2 - 0.08]}>
          <boxGeometry args={[1.0, 0.08, 0.01]} />
          <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={0.2} />
        </mesh>
        
        {/* === BITMAIN LOGO - Offset to avoid z-fighting === */}
        <mesh position={[w/2 - 0.8, -h * 0.25, -d/2 - 0.08]}>
          <boxGeometry args={[0.6, 0.06, 0.01]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    );
  };
  
  // Transformer realistic rendering
  const renderTransformer = () => {
    const [w, h, d] = scale; // width, height, depth in meters
    const bodyColor = '#2d3748'; // Dark gray industrial
    const finColor = '#4a5568'; // Lighter gray for fins
    const insulatorColor = '#f0f0f0'; // White ceramic
    const copperColor = '#b87333'; // Copper terminals
    
    // Radiator fin count
    const finCount = 8;
    const finSpacing = d / (finCount + 1);
    const finHeight = h * 0.7;
    const finDepth = 0.08;
    const finWidth = 0.25;
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Main transformer body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={bodyColor} metalness={0.4} roughness={0.6} />
        </mesh>
        
        {/* Base plate */}
        <mesh position={[0, -h/2 - 0.05, 0]} castShadow>
          <boxGeometry args={[w + 0.3, 0.1, d + 0.3]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.8} />
        </mesh>
        
        {/* Radiator fins - left side */}
        {Array.from({ length: finCount }).map((_, i) => (
          <mesh key={`fin-left-${i}`} position={[-w/2 - finWidth/2, 0, -d/2 + finSpacing * (i + 1)]} castShadow>
            <boxGeometry args={[finWidth, finHeight, finDepth]} />
            <meshStandardMaterial color={finColor} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        
        {/* Radiator fins - right side */}
        {Array.from({ length: finCount }).map((_, i) => (
          <mesh key={`fin-right-${i}`} position={[w/2 + finWidth/2, 0, -d/2 + finSpacing * (i + 1)]} castShadow>
            <boxGeometry args={[finWidth, finHeight, finDepth]} />
            <meshStandardMaterial color={finColor} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        
        {/* High voltage insulators (3 bushings) */}
        {[-w/3, 0, w/3].map((xPos, i) => (
          <group key={`insulator-${i}`} position={[xPos, h/2, 0]}>
            {/* Ceramic insulator body - ribbed appearance */}
            {Array.from({ length: 5 }).map((_, j) => (
              <mesh key={`rib-${j}`} position={[0, 0.15 + j * 0.12, 0]} castShadow>
                <cylinderGeometry args={[0.12 - j * 0.015, 0.14 - j * 0.015, 0.08, 16]} />
                <meshStandardMaterial color={insulatorColor} metalness={0.1} roughness={0.3} />
              </mesh>
            ))}
            {/* Copper terminal on top */}
            <mesh position={[0, 0.8, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
              <meshStandardMaterial color={copperColor} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Terminal cap */}
            <mesh position={[0, 0.95, 0]} castShadow>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color={copperColor} metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}
        
        {/* Low voltage terminals (smaller, on back) */}
        {[-w/4, w/4].map((xPos, i) => (
          <group key={`lv-terminal-${i}`} position={[xPos, h/2 - 0.2, -d/2 - 0.1]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.06, 0.08, 0.25, 8]} />
              <meshStandardMaterial color={insulatorColor} metalness={0.1} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.15, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
              <meshStandardMaterial color={copperColor} metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))}
        
        {/* Oil level indicator */}
        <mesh position={[w/2 + 0.05, h/4, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[w/2 + 0.05, h/4, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.16, 8]} />
          <meshStandardMaterial color="#60a5fa" metalness={0.1} roughness={0.1} transparent opacity={0.7} />
        </mesh>
        
        {/* Control cabinet on side */}
        <mesh position={[-w/2 - 0.15, -h/4, 0]} castShadow>
          <boxGeometry args={[0.25, 0.6, 0.4]} />
          <meshStandardMaterial color="#374151" metalness={0.3} roughness={0.6} />
        </mesh>
        
        {/* Nameplate */}
        <mesh position={[0, 0, d/2 + 0.01]}>
          <planeGeometry args={[0.4, 0.25]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
        </mesh>
        
        {/* Lifting lugs on top */}
        {[[-w/3, d/3], [w/3, d/3], [-w/3, -d/3], [w/3, -d/3]].map(([x, z], i) => (
          <mesh key={`lug-${i}`} position={[x, h/2 + 0.1, z]} castShadow>
            <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        
        {/* Grounding terminal */}
        <mesh position={[w/2 + 0.02, -h/2 + 0.15, d/3]} castShadow>
          <boxGeometry args={[0.04, 0.1, 0.08]} />
          <meshStandardMaterial color="#16a34a" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    );
  };
  
  // PDU / Distribution Skid rendering
  const renderPDU = () => {
    const [w, h, d] = scale;
    const cabinetColor = '#374151';
    const doorColor = '#4b5563';
    const copperColor = '#b45309';
    const feeders = Math.max(2, Math.floor(w / 0.7));
    const feederSpacing = (w * 0.8) / feeders;
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Main cabinet body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={cabinetColor} metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Front door panels */}
        {Array.from({ length: feeders }).map((_, i) => (
          <mesh 
            key={`door-${i}`}
            position={[-w/2 + feederSpacing/2 + i * feederSpacing + w * 0.1, 0, d/2 + 0.015]}
            castShadow
          >
            <boxGeometry args={[feederSpacing * 0.85, h * 0.9, 0.03]} />
            <meshStandardMaterial color={doorColor} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        
        {/* Door handles */}
        {Array.from({ length: feeders }).map((_, i) => (
          <mesh 
            key={`handle-${i}`}
            position={[-w/2 + feederSpacing/2 + i * feederSpacing + w * 0.1 + feederSpacing * 0.35, 0, d/2 + 0.05]}
            castShadow
          >
            <boxGeometry args={[0.03, 0.15, 0.02]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        
        {/* Top copper busbars */}
        <mesh position={[0, h * 0.42, 0]} castShadow>
          <boxGeometry args={[w * 0.85, 0.08, d * 0.5]} />
          <meshStandardMaterial color={copperColor} metalness={0.8} roughness={0.3} />
        </mesh>
        
        {/* Phase indicators L1 (red), L2 (yellow), L3 (blue) */}
        {[[-w * 0.25, '#dc2626'], [0, '#eab308'], [w * 0.25, '#3b82f6']].map(([x, col], i) => (
          <mesh key={`phase-${i}`} position={[x as number, h * 0.45, -d * 0.15]}>
            <boxGeometry args={[0.1, 0.025, 0.08]} />
            <meshStandardMaterial color={col as string} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        
        {/* ACB main breaker housing */}
        <mesh position={[0, h * 0.22, d * 0.3]} castShadow>
          <boxGeometry args={[w * 0.45, h * 0.18, 0.15]} />
          <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* ACB handle (red) */}
        <mesh position={[0, h * 0.22, d * 0.4]} castShadow>
          <boxGeometry args={[0.12, 0.06, 0.03]} />
          <meshStandardMaterial color="#dc2626" metalness={0.4} roughness={0.6} />
        </mesh>
        
        {/* MCCB feeders */}
        {Array.from({ length: feeders }).map((_, i) => {
          const xPos = -w/2 + feederSpacing/2 + i * feederSpacing + w * 0.1;
          return (
            <group key={`mccb-${i}`} position={[xPos, -h * 0.12, d * 0.3]}>
              {/* MCCB Housing */}
              <mesh castShadow>
                <boxGeometry args={[feederSpacing * 0.55, h * 0.14, 0.12]} />
                <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
              </mesh>
              {/* MCCB Handle (green) */}
              <mesh position={[0, 0, 0.08]} castShadow>
                <boxGeometry args={[0.07, 0.045, 0.02]} />
                <meshStandardMaterial color="#22c55e" metalness={0.4} roughness={0.6} />
              </mesh>
              {/* Status LED */}
              <mesh position={[feederSpacing * 0.18, h * 0.045, 0.08]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
              </mesh>
              {/* Output cable gland */}
              <mesh position={[0, -h * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
                <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
              </mesh>
            </group>
          );
        })}
        
        {/* Power meter display */}
        <mesh position={[w * 0.28, h * 0.22, d / 2 + 0.025]}>
          <boxGeometry args={[0.12, 0.08, 0.025]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[w * 0.28, h * 0.22, d / 2 + 0.04]}>
          <boxGeometry args={[0.1, 0.06, 0.002]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
        </mesh>
        
        {/* Status LEDs row */}
        <group position={[-w * 0.28, h * 0.35, d / 2 + 0.025]}>
          <mesh position={[-0.05, 0, 0]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#7f1d1d" metalness={0.3} roughness={0.6} />
          </mesh>
          <mesh position={[0.05, 0, 0]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#713f12" metalness={0.3} roughness={0.6} />
          </mesh>
        </group>
        
        {/* Ventilation grilles */}
        {[-h * 0.38, h * 0.38].map((yPos, i) => (
          <mesh key={`vent-${i}`} position={[0, yPos, d / 2 + 0.02]}>
            <boxGeometry args={[w * 0.35, 0.08, 0.015]} />
            <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.6} />
          </mesh>
        ))}
        
        {/* Bottom cable tray */}
        <mesh position={[0, -h / 2 - 0.06, 0]} castShadow>
          <boxGeometry args={[w * 0.75, 0.1, d * 0.55]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} wireframe />
        </mesh>
        
        {/* Lifting eyes */}
        {[[-w * 0.32, 0], [w * 0.32, 0]].map(([x, z], i) => (
          <mesh key={`lift-${i}`} position={[x, h / 2 + 0.04, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.045, 0.018, 8, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        
        {/* Earthing point */}
        <mesh position={[-w / 2 + 0.06, -h * 0.38, d / 2]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.035, 8]} />
          <meshStandardMaterial color="#15803d" metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Nameplate */}
        <mesh position={[0, h * 0.42, d / 2 + 0.02]}>
          <boxGeometry args={[0.28, 0.055, 0.006]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.2} roughness={0.8} />
        </mesh>
      </group>
    );
  };

  // RMU (Ring Main Unit) rendering
  const renderRMU = () => {
    const [w, h, d] = scale;
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Main cabinet */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Front panel */}
        <mesh position={[0, 0, d/2 + 0.02]} castShadow>
          <boxGeometry args={[w * 0.85, h * 0.8, 0.03]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* SF6 pressure indicator */}
        <mesh position={[w * 0.25, h * 0.28, d/2 + 0.05]}>
          <cylinderGeometry args={[0.045, 0.045, 0.035, 12]} />
          <meshStandardMaterial color="#22c55e" metalness={0.5} roughness={0.4} />
        </mesh>
        
        {/* Cable entries (top) */}
        {[-w * 0.22, 0, w * 0.22].map((x, i) => (
          <mesh key={`cable-${i}`} position={[x, h/2 + 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.12, 8]} />
            <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        
        {/* HV indicator light */}
        <mesh position={[-w * 0.25, h * 0.28, d/2 + 0.06]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
        </mesh>
        
        {/* 33kV warning label */}
        <mesh position={[0, -h * 0.32, d/2 + 0.035]}>
          <boxGeometry args={[0.18, 0.06, 0.012]} />
          <meshStandardMaterial color="#dc2626" metalness={0.3} roughness={0.7} />
        </mesh>
        
        {/* Mimic diagram panel */}
        <mesh position={[0, h * 0.05, d/2 + 0.04]}>
          <boxGeometry args={[w * 0.5, h * 0.25, 0.015]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>
        
        {/* Control switches */}
        {[-w * 0.15, 0, w * 0.15].map((x, i) => (
          <mesh key={`switch-${i}`} position={[x, -h * 0.15, d/2 + 0.05]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
            <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    );
  };

  // Solar Canopy rendering - MONO-SLOPE Industrial steel structure
  const renderCanopy = () => {
    const [w, h, d] = scale;
    const steelColor = '#374151';
    const aluminumFrame = '#9ca3af';
    const solarCellColor = '#0f172a';
    const solarBlue = '#1e3a5f';
    
    // Structure dimensions
    const postSection = 0.3;    // HEB 300 column section
    const beamHeight = 0.4;     // IPE beam height
    const beamWidth = 0.2;      // IPE beam width
    const purlinHeight = 0.15;  // Purlin (C-channel) height
    const purlinWidth = 0.08;   // Purlin width
    
    // MONO-SLOPE ROOF: 10° inclination for Qatar (optimal for cleaning + solar)
    const roofAngle = Math.PI / 18; // 10 degrees
    const slopeRise = d * Math.tan(roofAngle); // Height difference across depth (~4.2m for 24m depth)
    
    // Thermal clearance calculation:
    // Cooling TOP = 6.192m (slab 0.4 + container 2.896 + cooling 2.896)
    // Required clearance above cooling = 4m for hot air extraction
    // Post LOW side minimum = 6.192 + 4 = 10.2m → use 10m from ground
    const postHeightLow = 10;  // 10m at low side (ensures 4m clearance above cooling)
    const postHeightHigh = postHeightLow + slopeRise; // ~14.2m at high side (Z = -d/2)
    
    // Grid layout: 5 posts in X, 4 posts in Z
    const nPostsX = 5;
    const nPostsZ = 4;
    const postSpacingX = w / (nPostsX - 1);
    const postSpacingZ = d / (nPostsZ - 1);
    
    // Panel dimensions
    const panelWidth = 2.1;
    const panelDepth = 1.05;
    
    // Calculate extractor opening positions (above each cooling unit)
    const extractorOpenings: Array<{ x: number; z: number }> = [];
    const row1X = -13.596;
    const row2X = 13.596;
    const containerSpacing = 6.438;
    const containersPerRow = 4;
    const centerOffsetZ = -(containersPerRow - 1) * containerSpacing / 2;
    
    for (let i = 0; i < containersPerRow; i++) {
      const zPos = centerOffsetZ + i * containerSpacing;
      extractorOpenings.push({ x: row1X, z: zPos });
      extractorOpenings.push({ x: row2X, z: zPos });
    }
    
    // Check if position is over extractor
    const isOverExtractor = (x: number, z: number) => {
      const openingWidth = 3;
      for (const opening of extractorOpenings) {
        if (Math.abs(x - opening.x) < openingWidth && Math.abs(z - opening.z) < openingWidth) {
          return true;
        }
      }
      return false;
    };
    
    // Calculate post height at given Z position (mono-slope)
    const getPostHeight = (zPos: number) => {
      // Linear interpolation: high at -d/2, low at +d/2
      const t = (zPos + d/2) / d; // 0 at -d/2, 1 at +d/2
      return postHeightHigh - t * slopeRise;
    };
    
    // Calculate roof Y at given Z position
    const getRoofY = (zPos: number) => {
      const postH = getPostHeight(zPos);
      return postH - postHeightLow; // Relative to the low side baseline
    };
    
    // Generate post data with heights
    const postData: Array<{ x: number; z: number; height: number }> = [];
    for (let xi = 0; xi < nPostsX; xi++) {
      for (let zi = 0; zi < nPostsZ; zi++) {
        const x = -w/2 + xi * postSpacingX;
        const z = -d/2 + zi * postSpacingZ;
        postData.push({ x, z, height: getPostHeight(z) });
      }
    }
    
    // Z positions for rows of posts/beams
    const rowZPositions = Array.from({ length: nPostsZ }, (_, i) => -d/2 + i * postSpacingZ);
    // X positions for columns
    const colXPositions = Array.from({ length: nPostsX }, (_, i) => -w/2 + i * postSpacingX);
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* ═══ STEEL COLUMNS (Variable height for mono-slope) ═══ */}
        {postData.map((post, i) => (
          <group key={`post-${i}`} position={[post.x, -postHeightLow + post.height/2, post.z]}>
            {/* Main column */}
            <mesh castShadow>
              <boxGeometry args={[postSection, post.height, postSection]} />
              <meshStandardMaterial color={steelColor} metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Base plate (at ground level) */}
            <mesh position={[0, -post.height/2 + 0.05, 0]} castShadow>
              <boxGeometry args={[postSection * 2, 0.1, postSection * 2]} />
              <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Column cap plate */}
            <mesh position={[0, post.height/2, 0]} castShadow>
              <boxGeometry args={[postSection * 1.5, 0.08, postSection * 1.5]} />
              <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        ))}
        
        {/* ═══ MAIN BEAMS - Longitudinal (X direction, following slope) ═══ */}
        {rowZPositions.map((zPos, i) => {
          const roofY = getRoofY(zPos);
          return (
            <mesh key={`main-beam-${i}`} position={[0, roofY, zPos]} castShadow>
              <boxGeometry args={[w + 0.5, beamHeight, beamWidth]} />
              <meshStandardMaterial color={steelColor} metalness={0.75} roughness={0.25} />
            </mesh>
          );
        })}
        
        {/* ═══ RAFTERS - Inclined beams (Z direction, connecting main beams) ═══ */}
        {colXPositions.map((xPos, i) => {
          // Rafter follows the slope (descends toward +Z)
          const rafterLength = Math.sqrt(d * d + slopeRise * slopeRise);
          const midY = slopeRise / 2;
          return (
            <mesh 
              key={`rafter-${i}`} 
              position={[xPos, midY, 0]} 
              rotation={[roofAngle, 0, 0]}
              castShadow
            >
              <boxGeometry args={[beamWidth, beamHeight, rafterLength]} />
              <meshStandardMaterial color={steelColor} metalness={0.75} roughness={0.25} />
            </mesh>
          );
        })}
        
        {/* ═══ PURLINS - Following slope (support for panels) ═══ */}
        {Array.from({ length: Math.floor(d / 1.5) }, (_, i) => {
          const zPos = -d/2 + 0.75 + i * 1.5;
          const yPos = getRoofY(zPos) + 0.3;
          return (
            <mesh key={`purlin-${i}`} position={[0, yPos, zPos]} castShadow>
              <boxGeometry args={[w, purlinHeight, purlinWidth]} />
              <meshStandardMaterial color={aluminumFrame} metalness={0.6} roughness={0.4} />
            </mesh>
          );
        })}
        
        {/* ═══ HORIZONTAL BRACING (at roof level) ═══ */}
        {/* Diagonal bracing in the roof plane */}
        <mesh 
          position={[-w/4, slopeRise/2, 0]} 
          rotation={[0, Math.PI/6, -roofAngle]}
          castShadow
        >
          <boxGeometry args={[0.06, 0.06, d * 0.6]} />
          <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh 
          position={[w/4, slopeRise/2, 0]} 
          rotation={[0, -Math.PI/6, -roofAngle]}
          castShadow
        >
          <boxGeometry args={[0.06, 0.06, d * 0.6]} />
          <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* ═══ VERTICAL BRACING (X-bracing on end walls) ═══ */}
        {/* Left end */}
        <mesh position={[-w/2, -postHeightLow/2 + 1, 0]} rotation={[0, 0, Math.PI/5]} castShadow>
          <boxGeometry args={[0.06, postHeightLow * 0.7, 0.06]} />
          <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-w/2, -postHeightLow/2 + 1, 0]} rotation={[0, 0, -Math.PI/5]} castShadow>
          <boxGeometry args={[0.06, postHeightLow * 0.7, 0.06]} />
          <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Right end */}
        <mesh position={[w/2, -postHeightLow/2 + 1, 0]} rotation={[0, 0, Math.PI/5]} castShadow>
          <boxGeometry args={[0.06, postHeightLow * 0.7, 0.06]} />
          <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[w/2, -postHeightLow/2 + 1, 0]} rotation={[0, 0, -Math.PI/5]} castShadow>
          <boxGeometry args={[0.06, postHeightLow * 0.7, 0.06]} />
          <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* ═══ SOLAR PANELS (on inclined roof structure) ═══ */}
        <group position={[0, slopeRise/2 + 0.4, 0]} rotation={[roofAngle, 0, 0]}>
          {/* Generate panels avoiding extractors */}
          {(() => {
            const panelCols = Math.floor(w / panelWidth);
            const panelRows = Math.floor(d / panelDepth);
            const panelElements: JSX.Element[] = [];
            
            for (let col = 0; col < panelCols; col++) {
              for (let row = 0; row < panelRows; row++) {
                const xPos = -w/2 + panelWidth/2 + col * panelWidth;
                const zPos = -d/2 + panelDepth/2 + row * panelDepth;
                
                if (!isOverExtractor(xPos, zPos)) {
                  panelElements.push(
                    <group key={`panel-${col}-${row}`} position={[xPos, 0, zPos]}>
                      {/* Panel frame */}
                      <mesh castShadow>
                        <boxGeometry args={[panelWidth * 0.98, 0.04, panelDepth * 0.98]} />
                        <meshStandardMaterial color={aluminumFrame} metalness={0.75} roughness={0.25} />
                      </mesh>
                      {/* Solar cells */}
                      <mesh position={[0, 0.025, 0]}>
                        <boxGeometry args={[panelWidth * 0.92, 0.02, panelDepth * 0.92]} />
                        <meshStandardMaterial color={solarCellColor} metalness={0.4} roughness={0.2} />
                      </mesh>
                      {/* Glass cover */}
                      <mesh position={[0, 0.04, 0]}>
                        <boxGeometry args={[panelWidth * 0.95, 0.005, panelDepth * 0.95]} />
                        <meshStandardMaterial color={solarBlue} metalness={0.1} roughness={0.1} transparent opacity={0.3} />
                      </mesh>
                    </group>
                  );
                }
              }
            }
            return panelElements;
          })()}
        </group>
        
        {/* ═══ EXTRACTOR OPENINGS (grilles above cooling units) ═══ */}
        {extractorOpenings.map((opening, i) => {
          const yPos = getRoofY(opening.z) + 0.5;
          return (
            <group key={`opening-${i}`} position={[opening.x, yPos, opening.z]}>
              {/* Opening frame */}
              <mesh>
                <boxGeometry args={[3.2, 0.15, 3.2]} />
                <meshStandardMaterial color={steelColor} metalness={0.6} roughness={0.4} />
              </mesh>
              {/* Mesh grating */}
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[2.8, 0.03, 2.8]} />
                <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} wireframe />
              </mesh>
              {/* Airflow indicator */}
              <mesh position={[0, 0.4, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <coneGeometry args={[0.4, 0.7, 8]} />
                <meshStandardMaterial color="#ef4444" transparent opacity={0.5} emissive="#ef4444" emissiveIntensity={0.3} />
              </mesh>
            </group>
          );
        })}
        
        {/* ═══ LIGHTNING RODS (at corners) ═══ */}
        {[
          [-w/2 + 0.5, -d/2 + 0.5],
          [w/2 - 0.5, -d/2 + 0.5],
          [-w/2 + 0.5, d/2 - 0.5],
          [w/2 - 0.5, d/2 - 0.5]
        ].map(([xPos, zPos], i) => {
          const yPos = getRoofY(zPos) + 1.5;
          return (
            <mesh key={`lightning-${i}`} position={[xPos, yPos, zPos]} castShadow>
              <cylinderGeometry args={[0.02, 0.03, 2, 8]} />
              <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
            </mesh>
          );
        })}
        
        {/* ═══ CABLE TRAYS (along main beams) ═══ */}
        <mesh position={[0, -0.3, -d/2 + 0.5]} castShadow>
          <boxGeometry args={[w * 0.9, 0.15, 0.3]} />
          <meshStandardMaterial color={steelColor} metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* ═══ INVERTER BOXES (at corners) ═══ */}
        {[
          [-w/2 + 1, -d/2 + 1],
          [w/2 - 1, -d/2 + 1],
          [-w/2 + 1, d/2 - 1],
          [w/2 - 1, d/2 - 1]
        ].map(([xPos, zPos], i) => (
          <group key={`inverter-${i}`} position={[xPos, -postHeightLow/2, zPos]}>
            <mesh castShadow>
              <boxGeometry args={[0.8, 1.2, 0.4]} />
              <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[0.25, 0.45, 0.21]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    );
  };

  // Road rendering - flat asphalt surface with markings
  const renderRoad = () => {
    const [w, h, d] = scale;
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Road surface - asphalt */}
        <mesh receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#4b5563" metalness={0.1} roughness={0.9} />
        </mesh>
        {/* Center line marking */}
        <mesh position={[0, h / 2 + 0.01, 0]}>
          <boxGeometry args={[w * 0.95, 0.01, 0.15]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Edge lines (yellow) */}
        <mesh position={[0, h / 2 + 0.01, d / 2 - 0.2]}>
          <boxGeometry args={[w * 0.98, 0.01, 0.1]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[0, h / 2 + 0.01, -d / 2 + 0.2]}>
          <boxGeometry args={[w * 0.98, 0.01, 0.1]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      </group>
    );
  };

  // Building rendering - guardhouse with window and roof
  const renderBuilding = () => {
    const [w, h, d] = scale;
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Main building body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* Roof */}
        <mesh position={[0, h / 2 + 0.1, 0]} castShadow>
          <boxGeometry args={[w * 1.1, 0.2, d * 1.1]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Window - blue glass */}
        <mesh position={[0, h * 0.2, d / 2 + 0.01]}>
          <boxGeometry args={[w * 0.4, h * 0.3, 0.05]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} transparent opacity={0.7} />
        </mesh>
        {/* Door */}
        <mesh position={[w * 0.25, -h * 0.15, d / 2 + 0.01]}>
          <boxGeometry args={[w * 0.2, h * 0.5, 0.03]} />
          <meshStandardMaterial color="#6b7280" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
    );
  };

  // Loading zone - flat yellow area with stripes
  const renderLoading = () => {
    const [w, h, d] = scale;
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Loading zone surface */}
        <mesh receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.1} roughness={0.8} transparent opacity={0.4} />
        </mesh>
        {/* Border */}
        <mesh position={[0, h + 0.01, 0]}>
          <boxGeometry args={[w + 0.2, 0.02, d + 0.2]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
      </group>
    );
  };

  // Parking zone - gray flat area
  const renderParking = () => {
    const [w, h, d] = scale;
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Parking surface */}
        <mesh receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#374151" metalness={0.15} roughness={0.85} />
        </mesh>
        {/* Parking lines */}
        {[...Array(5)].map((_, i) => (
          <mesh key={i} position={[w * (-0.4 + i * 0.2), h / 2 + 0.01, 0]}>
            <boxGeometry args={[0.1, 0.01, d * 0.8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>
    );
  };

  // Concrete Slab (Dalle Béton) rendering
  const renderSlab = () => {
    const [w, h, d] = scale;
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Concrete slab - white/light gray with slight texture */}
        <mesh receiveShadow castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#f3f4f6" metalness={0.05} roughness={0.9} />
        </mesh>
        {/* Edge detail - slightly darker border */}
        <mesh position={[0, h / 2 + 0.005, 0]}>
          <boxGeometry args={[w - 0.1, 0.01, d - 0.1]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.02} roughness={0.95} />
        </mesh>
      </group>
    );
  };

  // Standard object rendering
  const renderStandard = () => (
    <mesh
      ref={meshRef}
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      scale={scale}
      onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={displayColor}
        metalness={0.3}
        roughness={0.5}
        opacity={object.locked ? 0.5 : 1}
        transparent={object.locked}
      />
    </mesh>
  );

  return (
    <group>
      {isSelected && !object.locked && (
        <TransformControls
          ref={transformRef}
          object={meshRef.current || undefined}
          mode={transformMode}
          size={0.5}
          translationSnap={0.1}
          rotationSnap={Math.PI / 12}
          scaleSnap={0.1}
        />
      )}
      
      {/* Render based on type */}
      {isContainer ? renderContainer() : 
       isCooling ? renderCooling() : 
       isTransformer ? renderTransformer() : 
       isPDU ? renderPDU() : 
       isRMU ? renderRMU() : 
       isCanopy ? renderCanopy() : 
       isRoad ? renderRoad() : 
       isBuilding ? renderBuilding() : 
       isLoading ? renderLoading() : 
       isParking ? renderParking() : 
       isSlab ? renderSlab() :
       renderStandard()}
      
      {/* Selection outline */}
      {isSelected && (
        <mesh
          position={[object.position.x, object.position.y, object.position.z]}
          rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
          scale={scale.map(s => s * 1.02) as [number, number, number]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#8AFD81" wireframe />
        </mesh>
      )}
      
      
    </group>
  );
}

// Camera Controller
function CameraController({ 
  viewDirection,
  orbitRef
}: { 
  viewDirection: 'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | null;
  orbitRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (!viewDirection) return;
    
    const positions: Record<string, [number, number, number]> = {
      front: [0, 5, 25],
      back: [0, 5, -25],
      left: [-25, 5, 0],
      right: [25, 5, 0],
      top: [0, 30, 0.01],
      perspective: [15, 15, 15]
    };
    
    const pos = positions[viewDirection];
    camera.position.set(...pos);
    camera.lookAt(0, 0, 0);
    
    if (orbitRef.current) {
      orbitRef.current.target.set(0, 0, 0);
      orbitRef.current.update();
    }
  }, [viewDirection, camera, orbitRef]);
  
  return null;
}

// Main Scene
function Scene({ 
  objects,
  selectedIds,
  onSelect,
  transformMode,
  tool,
  onTransformEnd,
  showGrid,
  showAxes,
  showDistanceX,
  showDistanceZ,
  viewDirection,
  orbitRef,
  cameraLocked = false,
  // Cable routing props
  cableRoutes = [],
  cableSelectedSegments = [],
  cableSelectedPoints = [],
  onCableSegmentClick,
  onCablePointClick,
  showCableDimensions = true,
  showCableLabels = true,
  cableDrawingPoints = [],
  cablePreviewPoint = null,
  cableSnapPoints = [],
  cableActiveSnapPoint = null,
  cableIsDrawing = false,
  cableDefaultWidth = 300,
  cableDefaultHeight = 100,
  onFloorClick,
  showCableRouting = false,
  // Nouvelles props pour snap points intelligents
  intelligentSnapPoints = [],
  activeIntelligentSnapPointId = null,
  hoveredSnapPointId = null,
  onIntelligentSnapPointClick,
  filterConnectionTypes,
  cableZones = [],
  showForbiddenZones = false,
  showHeightIndicator = false,
  currentCableHeight = 3.5,
}: {
  objects: Object3D[];
  selectedIds: string[];
  onSelect: (id: string, multiSelect: boolean) => void;
  transformMode: TransformMode;
  tool: Tool;
  onTransformEnd: (id: string, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void;
  showGrid: boolean;
  showAxes: boolean;
  showDistanceX: boolean;
  showDistanceZ: boolean;
  viewDirection: 'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | null;
  orbitRef: React.RefObject<any>;
  cameraLocked?: boolean;
  // Cable routing types
  cableRoutes?: CableRoute[];
  cableSelectedSegments?: string[];
  cableSelectedPoints?: string[];
  onCableSegmentClick?: (segmentId: string) => void;
  onCablePointClick?: (pointId: string) => void;
  showCableDimensions?: boolean;
  showCableLabels?: boolean;
  cableDrawingPoints?: THREE.Vector3[];
  cablePreviewPoint?: THREE.Vector3 | null;
  cableSnapPoints?: WorldSnapPoint[];
  cableActiveSnapPoint?: THREE.Vector3 | null;
  cableIsDrawing?: boolean;
  cableDefaultWidth?: number;
  cableDefaultHeight?: number;
  onFloorClick?: (point: THREE.Vector3) => void;
  showCableRouting?: boolean;
  // Nouvelles props pour snap points intelligents
  intelligentSnapPoints?: WorldSnapPoint[];
  activeIntelligentSnapPointId?: string | null;
  hoveredSnapPointId?: string | null;
  onIntelligentSnapPointClick?: (snapPoint: WorldSnapPoint) => void;
  filterConnectionTypes?: ConnectionType[];
  cableZones?: CableZone[];
  showForbiddenZones?: boolean;
  showHeightIndicator?: boolean;
  currentCableHeight?: number;
}) {
  const { invalidate } = useThree();
  
  // Force re-render when objects change
  useEffect(() => {
    invalidate();
  }, [objects, selectedIds, cableRoutes, cableDrawingPoints, invalidate]);

  const handleFloorClick = (e: any) => {
    // If cable routing mode is active, capture the click point
    if (showCableRouting && onFloorClick && e.point) {
      e.stopPropagation();
      onFloorClick(e.point.clone());
      return;
    }
    // Otherwise deselect
    onSelect('', false);
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
      <OrbitControls 
        ref={orbitRef}
        makeDefault
        enabled={!cameraLocked}
        enableDamping 
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={150}
        zoomSpeed={0.3}
      />
      <CameraController viewDirection={viewDirection} orbitRef={orbitRef} />

      {/* Lighting - pure white, no warm tint */}
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-15, 20, -15]} intensity={0.6} color="#ffffff" />
      <hemisphereLight intensity={0.5} args={['#ffffff', '#f0f0f0']} />

      <Environment preset="city" />

      {/* Ground - grass/terrain below */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.01, 0]}
        receiveShadow
        onClick={handleFloorClick}
      >
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#6b7280" metalness={0} roughness={1} />
      </mesh>
      
      {/* Concrete slab - 40cm thick, centered at origin, tight fit */}
      {/* Only show if no custom slabs exist in objects */}
      {!objects.some(obj => obj.type.toLowerCase().includes('slab') || obj.type.toLowerCase().includes('concrete') || obj.type.toLowerCase().includes('dalle')) && (
        <mesh 
          position={[0, 0.2, 0]} 
          receiveShadow
          castShadow
          onClick={handleFloorClick}
        >
          <boxGeometry args={[45, 0.4, 30]} />
          <meshStandardMaterial color="#d1d5db" metalness={0.1} roughness={0.9} />
        </mesh>
      )}
      
      {/* Grid */}
      {showGrid && (
        <Grid
          position={[0, 0.01, 0]}
          args={[200, 200]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#94a3b8"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#64748b"
          fadeDistance={80}
          fadeStrength={1}
        />
      )}
      
      {/* === AXES WITH DISTANCES === */}
      {showAxes && (
        <group>
          {/* X Axis (Red) - 100m */}
          <Line
            points={[[-50, 0.05, 0], [50, 0.05, 0]]}
            color="#ef4444"
            lineWidth={3}
          />
          {/* X Arrow head */}
          <mesh position={[50, 0.05, 0]} rotation={[0, 0, -Math.PI/2]}>
            <coneGeometry args={[0.3, 0.8, 8]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          {/* X Label */}
          <Text position={[52, 0.5, 0]} fontSize={1} color="#ef4444" anchorX="left">
            X
          </Text>
          {/* X Distance markers every 10m */}
          {[-40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((x) => (
            <group key={`x-marker-${x}`}>
              <mesh position={[x, 0.05, 0]}>
                <boxGeometry args={[0.1, 0.5, 0.1]} />
                <meshStandardMaterial color="#ef4444" />
              </mesh>
              <Text 
                position={[x, 1.2, 0]} 
                fontSize={0.8} 
                color="#ef4444" 
                anchorX="center"
              >
                {x}m
              </Text>
            </group>
          ))}
          
          {/* Z Axis (Blue) - 100m */}
          <Line
            points={[[0, 0.05, -50], [0, 0.05, 50]]}
            color="#3b82f6"
            lineWidth={3}
          />
          {/* Z Arrow head */}
          <mesh position={[0, 0.05, 50]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.3, 0.8, 8]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>
          {/* Z Label */}
          <Text position={[0, 0.5, 52]} fontSize={1} color="#3b82f6" anchorX="center">
            Z
          </Text>
          {/* Z Distance markers every 10m */}
          {[-40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((z) => (
            <group key={`z-marker-${z}`}>
              <mesh position={[0, 0.05, z]}>
                <boxGeometry args={[0.1, 0.5, 0.1]} />
                <meshStandardMaterial color="#3b82f6" />
              </mesh>
              <Text 
                position={[1.5, 1.2, z]} 
                fontSize={0.8} 
                color="#3b82f6" 
                anchorX="center"
              >
                {z}m
              </Text>
            </group>
          ))}
          
          {/* Y Axis (Green) - Vertical 20m */}
          <Line
            points={[[0, 0, 0], [0, 20, 0]]}
            color="#22c55e"
            lineWidth={3}
          />
          {/* Y Arrow head */}
          <mesh position={[0, 20, 0]}>
            <coneGeometry args={[0.3, 0.8, 8]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          {/* Y Label */}
          <Text position={[0.5, 21, 0]} fontSize={1} color="#22c55e" anchorX="left">
            Y (hauteur)
          </Text>
          {/* Y Distance markers every 5m */}
          {[0, 5, 10, 15, 20].map((y) => (
            <group key={`y-marker-${y}`}>
              <mesh position={[0, y, 0]}>
                <boxGeometry args={[0.3, 0.1, 0.3]} />
                <meshStandardMaterial color="#22c55e" />
              </mesh>
              <Text 
                position={[1, y, 0]} 
                fontSize={0.6} 
                color="#22c55e" 
                anchorX="left"
              >
                {y}m
              </Text>
            </group>
          ))}
          
          {/* Origin marker */}
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
          </mesh>
          <Text position={[0, 2, 0]} fontSize={0.8} color="#fbbf24" anchorX="center">
            ORIGIN (0,0,0)
          </Text>
        </group>
      )}

      {/* === DISTANCE X MEASUREMENTS (Red lines from objects to Z-axis) === */}
      {showDistanceX && objects.map((obj) => {
        const objX = obj.position.x;
        const objZ = obj.position.z;
        const distX = Math.abs(objX).toFixed(1);
        const measureY = 0.55;
        
        return (
          <group key={`distX-${obj.id}`}>
            <Line
              points={[[objX, measureY, objZ], [0, measureY, objZ]]}
              color="#dc2626"
              lineWidth={3}
            />
            <mesh position={[objX, measureY, objZ]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <mesh position={[0, measureY, objZ]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <Html position={[objX / 2, measureY + 0.3, objZ]} center style={{ pointerEvents: 'none' }}>
              <div style={{
                background: '#dc2626',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'system-ui',
                whiteSpace: 'nowrap'
              }}>
                {distX}m
              </div>
            </Html>
          </group>
        );
      })}

      {/* === DISTANCE Z MEASUREMENTS (Blue lines from objects to X-axis) === */}
      {showDistanceZ && objects.map((obj) => {
        const objX = obj.position.x;
        const objZ = obj.position.z;
        const distZ = Math.abs(objZ).toFixed(1);
        const measureY = 0.55;
        
        return (
          <group key={`distZ-${obj.id}`}>
            <Line
              points={[[objX, measureY, objZ], [objX, measureY, 0]]}
              color="#2563eb"
              lineWidth={3}
            />
            <mesh position={[objX, measureY, 0]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#2563eb" />
            </mesh>
            <Html position={[objX, measureY + 0.3, objZ / 2]} center style={{ pointerEvents: 'none' }}>
              <div style={{
                background: '#2563eb',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                fontFamily: 'system-ui',
                whiteSpace: 'nowrap'
              }}>
                {distZ}m
              </div>
            </Html>
          </group>
        );
      })}

      {/* Objects */}
      {objects.map((obj) => (
        <EditableObject
          key={obj.id}
          object={obj}
          isSelected={selectedIds.includes(obj.id)}
          onSelect={(multiSelect: boolean) => onSelect(obj.id, multiSelect)}
          transformMode={transformMode}
          onTransformEnd={(pos, rot, scale) => onTransformEnd(obj.id, pos, rot, scale)}
        />
      ))}
      
      {/* Cable Routing 3D Visualization */}
      {(cableRoutes.length > 0 || cableIsDrawing || showCableRouting) && (
        <CableScene
          routes={cableRoutes}
          selectedSegmentIds={cableSelectedSegments}
          selectedPointIds={cableSelectedPoints}
          onSegmentClick={onCableSegmentClick || (() => {})}
          onPointClick={onCablePointClick || (() => {})}
          showDimensions={showCableDimensions}
          showLabels={showCableLabels}
          drawingPoints={cableDrawingPoints}
          previewPoint={cablePreviewPoint}
          snapPoints={cableSnapPoints}
          activeSnapPoint={cableActiveSnapPoint}
          isDrawing={cableIsDrawing}
          defaultWidth={cableDefaultWidth}
          defaultHeight={cableDefaultHeight}
          // Nouvelles props pour snap points intelligents
          intelligentSnapPoints={intelligentSnapPoints}
          activeIntelligentSnapPointId={activeIntelligentSnapPointId}
          hoveredSnapPointId={hoveredSnapPointId}
          onIntelligentSnapPointClick={onIntelligentSnapPointClick}
          filterConnectionTypes={filterConnectionTypes}
          cableZones={cableZones}
          showForbiddenZones={showForbiddenZones}
          showHeightIndicator={showHeightIndicator}
          currentHeight={currentCableHeight}
          showCableRouting={showCableRouting}
        />
      )}

    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QATAR 100MW 8 ZONES PRESET GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateQatar100MW8Zones(): Object3D[] {
  const objects: Object3D[] = [];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // EXACT REPRODUCTION FROM qatar-100mw-8zones.html
  // Site: 300m x 200m (centered at origin)
  // HTML coordinate system: X=0-300 (left to right), Y=0-200 (top to bottom)
  // 3D coordinate system: X (left-right centered at 0), Z (top-bottom centered at 0)
  // Conversion: 3D_X = HTML_X - 150, 3D_Z = HTML_Y - 100
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Dimensions (real world in mm)
  const containerDims = { width: 12192, height: 2896, depth: 2438 }; // 40ft ISO: 12.192m x 2.896m x 2.438m
  const containerWidthM = containerDims.width / 1000;  // 12.192m (length)
  const containerDepthM = containerDims.depth / 1000;  // 2.438m (width)
  const containerHeightM = containerDims.height / 1000; // 2.896m
  
  const coolingDims = { width: 12192, height: 1200, depth: 2438 };
  const coolingHeightM = coolingDims.height / 1000; // 1.2m
  
  const transformerDims = { width: 6000, height: 3000, depth: 4000 }; // 6m x 4m x 3m
  const transformerHeightM = transformerDims.height / 1000;
  
  const pduDims = { width: 2000, height: 2200, depth: 5000 }; // 2m x 5m x 2.2m
  const pduHeightM = pduDims.height / 1000;
  
  const loadingDims = { width: 20000, height: 100, depth: 15000 }; // 20m x 15m flat area
  const parkingDims = { width: 25000, height: 100, depth: 12000 }; // 25m x 12m flat area
  
  const slabHeight = 0.4;
  
  // Zone colors (matching HTML)
  const zoneColors = [
    '#ef4444', // Z1 Red
    '#f97316', // Z2 Orange
    '#eab308', // Z3 Yellow
    '#22c55e', // Z4 Green
    '#14b8a6', // Z5 Cyan
    '#3b82f6', // Z6 Blue
    '#8b5cf6', // Z7 Purple
    '#ec4899', // Z8 Pink
  ];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ZONE DEFINITIONS - Exact positions from HTML
  // HTML uses: translate(X, Y) where X,Y are SVG coordinates
  // Container size in HTML: 24 x 5 units (scaled to real dimensions)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Zone 1-4 (Top row: HTML Y = 5 to 90)
  // Zone 5-8 (Bottom row: HTML Y = 110 to 195)
  // Road: HTML Y = 95 to 105
  
  const zones = [
    // Zone 1: x=5-65, y=5-90 (Top-Left)
    { id: 1, htmlX: 35, htmlY: 47.5, color: zoneColors[0],
      containers: [
        // Row 1 (left column): translate(8, 15), (8, 22), (8, 29), (8, 36)
        { htmlX: 8 + 12, htmlY: 15 + 2.5 }, // C1 center
        { htmlX: 8 + 12, htmlY: 22 + 2.5 }, // C2
        { htmlX: 8 + 12, htmlY: 29 + 2.5 }, // C3
        { htmlX: 8 + 12, htmlY: 36 + 2.5 }, // C4
        // Row 2 (right column): translate(38, 15), (38, 22), (38, 29), (38, 36)
        { htmlX: 38 + 12, htmlY: 15 + 2.5 }, // C5
        { htmlX: 38 + 12, htmlY: 22 + 2.5 }, // C6
        { htmlX: 38 + 12, htmlY: 29 + 2.5 }, // C7
        { htmlX: 38 + 12, htmlY: 36 + 2.5 }, // C8
      ],
      transformers: [
        { htmlX: 35, htmlY: 47 },  // T1 at (32, 45)
        { htmlX: 35, htmlY: 53 },  // T2 at (32, 51)
      ],
      pdus: [
        { htmlX: 26, htmlY: 47.5 },  // at (25, 45)
        { htmlX: 26, htmlY: 54.5 },  // at (25, 52)
        { htmlX: 44, htmlY: 47.5 },  // at (43, 45)
        { htmlX: 44, htmlY: 54.5 },  // at (43, 52)
      ],
      loading: { htmlX: 20, htmlY: 72.5 },   // at (10, 65)
      parking: { htmlX: 47.5, htmlY: 71 },   // at (35, 65)
    },
    // Zone 2: x=83-143, y=5-90 (Top-Center-Left)
    { id: 2, htmlX: 113, htmlY: 47.5, color: zoneColors[1],
      containers: [
        { htmlX: 86 + 12, htmlY: 15 + 2.5 },
        { htmlX: 86 + 12, htmlY: 22 + 2.5 },
        { htmlX: 86 + 12, htmlY: 29 + 2.5 },
        { htmlX: 86 + 12, htmlY: 36 + 2.5 },
        { htmlX: 116 + 12, htmlY: 15 + 2.5 },
        { htmlX: 116 + 12, htmlY: 22 + 2.5 },
        { htmlX: 116 + 12, htmlY: 29 + 2.5 },
        { htmlX: 116 + 12, htmlY: 36 + 2.5 },
      ],
      transformers: [
        { htmlX: 113, htmlY: 47 },
        { htmlX: 113, htmlY: 53 },
      ],
      pdus: [
        { htmlX: 104, htmlY: 47.5 },
        { htmlX: 104, htmlY: 54.5 },
        { htmlX: 122, htmlY: 47.5 },
        { htmlX: 122, htmlY: 54.5 },
      ],
      loading: { htmlX: 98, htmlY: 72.5 },
      parking: { htmlX: 125.5, htmlY: 71 },
    },
    // Zone 3: x=161-221, y=5-90 (Top-Center-Right)
    { id: 3, htmlX: 191, htmlY: 47.5, color: zoneColors[2],
      containers: [
        { htmlX: 164 + 12, htmlY: 15 + 2.5 },
        { htmlX: 164 + 12, htmlY: 22 + 2.5 },
        { htmlX: 164 + 12, htmlY: 29 + 2.5 },
        { htmlX: 164 + 12, htmlY: 36 + 2.5 },
        { htmlX: 194 + 12, htmlY: 15 + 2.5 },
        { htmlX: 194 + 12, htmlY: 22 + 2.5 },
        { htmlX: 194 + 12, htmlY: 29 + 2.5 },
        { htmlX: 194 + 12, htmlY: 36 + 2.5 },
      ],
      transformers: [
        { htmlX: 191, htmlY: 47 },
        { htmlX: 191, htmlY: 53 },
      ],
      pdus: [
        { htmlX: 182, htmlY: 47.5 },
        { htmlX: 182, htmlY: 54.5 },
        { htmlX: 200, htmlY: 47.5 },
        { htmlX: 200, htmlY: 54.5 },
      ],
      loading: { htmlX: 176, htmlY: 72.5 },
      parking: { htmlX: 203.5, htmlY: 71 },
    },
    // Zone 4: x=239-295, y=5-90 (Top-Right)
    { id: 4, htmlX: 267, htmlY: 47.5, color: zoneColors[3],
      containers: [
        { htmlX: 242 + 12, htmlY: 15 + 2.5 },
        { htmlX: 242 + 12, htmlY: 22 + 2.5 },
        { htmlX: 242 + 12, htmlY: 29 + 2.5 },
        { htmlX: 242 + 12, htmlY: 36 + 2.5 },
        { htmlX: 268 + 12, htmlY: 15 + 2.5 },
        { htmlX: 268 + 12, htmlY: 22 + 2.5 },
        { htmlX: 268 + 12, htmlY: 29 + 2.5 },
        { htmlX: 268 + 12, htmlY: 36 + 2.5 },
      ],
      transformers: [
        { htmlX: 267, htmlY: 47 },
        { htmlX: 267, htmlY: 53 },
      ],
      pdus: [
        { htmlX: 258, htmlY: 47.5 },
        { htmlX: 258, htmlY: 54.5 },
        { htmlX: 276, htmlY: 47.5 },
        { htmlX: 276, htmlY: 54.5 },
      ],
      loading: { htmlX: 254, htmlY: 72.5 },
      parking: { htmlX: 280, htmlY: 71 },
    },
    // Zone 5: x=5-65, y=110-195 (Bottom-Left)
    { id: 5, htmlX: 35, htmlY: 152.5, color: zoneColors[4],
      containers: [
        { htmlX: 8 + 12, htmlY: 120 + 2.5 },
        { htmlX: 8 + 12, htmlY: 127 + 2.5 },
        { htmlX: 8 + 12, htmlY: 134 + 2.5 },
        { htmlX: 8 + 12, htmlY: 141 + 2.5 },
        { htmlX: 38 + 12, htmlY: 120 + 2.5 },
        { htmlX: 38 + 12, htmlY: 127 + 2.5 },
        { htmlX: 38 + 12, htmlY: 134 + 2.5 },
        { htmlX: 38 + 12, htmlY: 141 + 2.5 },
      ],
      transformers: [
        { htmlX: 35, htmlY: 152 },
        { htmlX: 35, htmlY: 158 },
      ],
      pdus: [
        { htmlX: 26, htmlY: 152.5 },
        { htmlX: 26, htmlY: 159.5 },
        { htmlX: 44, htmlY: 152.5 },
        { htmlX: 44, htmlY: 159.5 },
      ],
      loading: { htmlX: 20, htmlY: 177.5 },
      parking: { htmlX: 47.5, htmlY: 176 },
    },
    // Zone 6: x=83-143, y=110-195 (Bottom-Center-Left)
    { id: 6, htmlX: 113, htmlY: 152.5, color: zoneColors[5],
      containers: [
        { htmlX: 86 + 12, htmlY: 120 + 2.5 },
        { htmlX: 86 + 12, htmlY: 127 + 2.5 },
        { htmlX: 86 + 12, htmlY: 134 + 2.5 },
        { htmlX: 86 + 12, htmlY: 141 + 2.5 },
        { htmlX: 116 + 12, htmlY: 120 + 2.5 },
        { htmlX: 116 + 12, htmlY: 127 + 2.5 },
        { htmlX: 116 + 12, htmlY: 134 + 2.5 },
        { htmlX: 116 + 12, htmlY: 141 + 2.5 },
      ],
      transformers: [
        { htmlX: 113, htmlY: 152 },
        { htmlX: 113, htmlY: 158 },
      ],
      pdus: [
        { htmlX: 104, htmlY: 152.5 },
        { htmlX: 104, htmlY: 159.5 },
        { htmlX: 122, htmlY: 152.5 },
        { htmlX: 122, htmlY: 159.5 },
      ],
      loading: { htmlX: 98, htmlY: 177.5 },
      parking: { htmlX: 125.5, htmlY: 176 },
    },
    // Zone 7: x=161-221, y=110-195 (Bottom-Center-Right)
    { id: 7, htmlX: 191, htmlY: 152.5, color: zoneColors[6],
      containers: [
        { htmlX: 164 + 12, htmlY: 120 + 2.5 },
        { htmlX: 164 + 12, htmlY: 127 + 2.5 },
        { htmlX: 164 + 12, htmlY: 134 + 2.5 },
        { htmlX: 164 + 12, htmlY: 141 + 2.5 },
        { htmlX: 194 + 12, htmlY: 120 + 2.5 },
        { htmlX: 194 + 12, htmlY: 127 + 2.5 },
        { htmlX: 194 + 12, htmlY: 134 + 2.5 },
        { htmlX: 194 + 12, htmlY: 141 + 2.5 },
      ],
      transformers: [
        { htmlX: 191, htmlY: 152 },
        { htmlX: 191, htmlY: 158 },
      ],
      pdus: [
        { htmlX: 182, htmlY: 152.5 },
        { htmlX: 182, htmlY: 159.5 },
        { htmlX: 200, htmlY: 152.5 },
        { htmlX: 200, htmlY: 159.5 },
      ],
      loading: { htmlX: 176, htmlY: 177.5 },
      parking: { htmlX: 203.5, htmlY: 176 },
    },
    // Zone 8: x=239-295, y=110-195 (Bottom-Right)
    { id: 8, htmlX: 267, htmlY: 152.5, color: zoneColors[7],
      containers: [
        { htmlX: 242 + 12, htmlY: 120 + 2.5 },
        { htmlX: 242 + 12, htmlY: 127 + 2.5 },
        { htmlX: 242 + 12, htmlY: 134 + 2.5 },
        { htmlX: 242 + 12, htmlY: 141 + 2.5 },
        { htmlX: 268 + 12, htmlY: 120 + 2.5 },
        { htmlX: 268 + 12, htmlY: 127 + 2.5 },
        { htmlX: 268 + 12, htmlY: 134 + 2.5 },
        { htmlX: 268 + 12, htmlY: 141 + 2.5 },
      ],
      transformers: [
        { htmlX: 267, htmlY: 152 },
        { htmlX: 267, htmlY: 158 },
      ],
      pdus: [
        { htmlX: 258, htmlY: 152.5 },
        { htmlX: 258, htmlY: 159.5 },
        { htmlX: 276, htmlY: 152.5 },
        { htmlX: 276, htmlY: 159.5 },
      ],
      loading: { htmlX: 254, htmlY: 177.5 },
      parking: { htmlX: 280, htmlY: 176 },
    },
  ];
  
  // Convert HTML coords to 3D coords
  const toX = (htmlX: number) => htmlX - 150; // Center at 0
  const toZ = (htmlY: number) => htmlY - 100; // Center at 0
  
  // Generate all zones
  zones.forEach(zone => {
    // Containers + Cooling
    zone.containers.forEach((c, idx) => {
      const x3d = toX(c.htmlX);
      const z3d = toZ(c.htmlY);
      
      // Container
      objects.push({
        id: `z${zone.id}-container-${idx + 1}`,
        name: `Z${zone.id} Container C${idx + 1}`,
        type: 'container',
        position: { x: x3d, y: slabHeight + containerHeightM / 2, z: z3d },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#e8e8e8',
        dimensions: containerDims,
        locked: false,
        visible: true
      });
      
      // Cooling on top
      objects.push({
        id: `z${zone.id}-cooling-${idx + 1}`,
        name: `Z${zone.id} Cooling #${idx + 1}`,
        type: 'cooling',
        position: { x: x3d, y: slabHeight + containerHeightM + coolingHeightM / 2, z: z3d },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#1e3a5f',
        dimensions: coolingDims,
        locked: false,
        visible: true
      });
    });
    
    // Transformers
    zone.transformers.forEach((t, idx) => {
      objects.push({
        id: `z${zone.id}-transformer-${idx + 1}`,
        name: `Z${zone.id} Transformer T${idx + 1}`,
        type: 'transformer',
        position: { x: toX(t.htmlX), y: slabHeight + transformerHeightM / 2, z: toZ(t.htmlY) },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#f59e0b',
        dimensions: transformerDims,
        locked: false,
        visible: true
      });
    });
    
    // PDUs
    zone.pdus.forEach((p, idx) => {
      objects.push({
        id: `z${zone.id}-pdu-${idx + 1}`,
        name: `Z${zone.id} PDU #${idx + 1}`,
        type: 'pdu',
        position: { x: toX(p.htmlX), y: slabHeight + pduHeightM / 2, z: toZ(p.htmlY) },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#374151',
        dimensions: pduDims,
        locked: false,
        visible: true
      });
    });
    
    // Loading Zone
    objects.push({
      id: `z${zone.id}-loading`,
      name: `Z${zone.id} Loading Zone`,
      type: 'loading',
      position: { x: toX(zone.loading.htmlX), y: 0.05, z: toZ(zone.loading.htmlY) },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#fbbf24',
      dimensions: loadingDims,
      locked: true,
      visible: true
    });
    
    // Parking
    objects.push({
      id: `z${zone.id}-parking`,
      name: `Z${zone.id} Parking`,
      type: 'parking',
      position: { x: toX(zone.parking.htmlX), y: 0.05, z: toZ(zone.parking.htmlY) },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#374151',
      dimensions: parkingDims,
      locked: true,
      visible: true
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ROADS - From HTML
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Central horizontal road: y=95 to y=105 (10m wide)
  objects.push({
    id: 'road-central',
    name: 'Central Access Road',
    type: 'road',
    position: { x: 0, y: 0.05, z: 0 }, // Centered
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#4b5563',
    dimensions: { width: 300000, height: 100, depth: 10000 }, // 300m x 10m
    locked: true,
    visible: true
  });
  
  // Vertical service roads (3 pairs) - at x=70, 148, 226
  const verticalRoadPositions = [
    { htmlX: 74, name: 'Service Road 1' },  // Between Z1-Z2 and Z5-Z6
    { htmlX: 152, name: 'Service Road 2' }, // Between Z2-Z3 and Z6-Z7
    { htmlX: 230, name: 'Service Road 3' }, // Between Z3-Z4 and Z7-Z8
  ];
  
  verticalRoadPositions.forEach((road, idx) => {
    // Top section (y=0 to y=95)
    objects.push({
      id: `road-vertical-${idx + 1}-top`,
      name: `${road.name} (Top)`,
      type: 'road',
      position: { x: toX(road.htmlX), y: 0.05, z: -52.5 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#4b5563',
      dimensions: { width: 95000, height: 100, depth: 8000 }, // 95m x 8m
      locked: true,
      visible: true
    });
    
    // Bottom section (y=105 to y=200)
    objects.push({
      id: `road-vertical-${idx + 1}-bottom`,
      name: `${road.name} (Bottom)`,
      type: 'road',
      position: { x: toX(road.htmlX), y: 0.05, z: 52.5 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#4b5563',
      dimensions: { width: 95000, height: 100, depth: 8000 }, // 95m x 8m
      locked: true,
      visible: true
    });
  });
  
  // Entry road (left side)
  objects.push({
    id: 'road-entry',
    name: 'Entry Road',
    type: 'road',
    position: { x: -155, y: 0.05, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#6b7280',
    dimensions: { width: 15000, height: 100, depth: 16000 },
    locked: true,
    visible: true
  });
  
  // Security Guardhouse
  objects.push({
    id: 'guardhouse',
    name: 'Security Guardhouse',
    type: 'building',
    position: { x: -160, y: slabHeight + 1.5, z: -15 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#1f2937',
    dimensions: { width: 6000, height: 3000, depth: 8000 },
    locked: true,
    visible: true
  });
  
  return objects;
}

// ═══════════════════════════════════════════════════════════════════════════
// DUPLICATED SCENE GENERATOR - 2 IDENTICAL SITES WITH 20M GAP
// ═══════════════════════════════════════════════════════════════════════════

function generateDuplicatedScene(): Object3D[] {
  const objects: Object3D[] = [];
  
  // Scene dimensions (based on initial scene)
  const sceneWidth = 42; // 42m wide (canopy width)
  const gap = 20; // 20m separation between sites
  // Center both sites around X=0: Site A at -31m, Site B at +31m
  const siteACenterX = -(sceneWidth / 2 + gap / 2); // -31m
  const siteBCenterX = +(sceneWidth / 2 + gap / 2); // +31m
  
  // Dimensions (same as initialObjects)
  const containerDims = { width: 12192, height: 2896, depth: 2438 };
  const containerWidthM = containerDims.width / 1000;
  const containerDepthM = containerDims.depth / 1000;
  const containerHeightM = containerDims.height / 1000;
  
  // Cooling - SAME size as container (not reduced EC2-DT)
  const coolingDims = { width: 12192, height: 2896, depth: 2438 }; // Same as container
  const coolingHeightM = coolingDims.height / 1000; // 2.896m
  
  const transformerDims = { width: 2500, height: 3000, depth: 2000 };
  const transformerHeightM = transformerDims.height / 1000;
  const transformerWidthM = transformerDims.width / 1000;
  
  const pduDims = { width: 2400, height: 2200, depth: 800 };
  const pduHeightM = pduDims.height / 1000;
  const pduDepthAfterRotation = pduDims.depth / 1000;
  
  const slabHeight = 0.4;
  const gapBetweenRows = 4;
  const faceToFaceGap = 15;
  const containersPerRow = 4;
  
  const totalZSpan = (containersPerRow - 1) * (containerDepthM + gapBetweenRows);
  const centerOffsetZ = -totalZSpan / 2;
  const row1X = -(faceToFaceGap / 2) - (containerWidthM / 2);
  const row2X = (faceToFaceGap / 2) + (containerWidthM / 2);
  
  // Security distances
  const SECURITY_DIST_TRF_PDU = 3.0;
  const SECURITY_DIST_PDU_CONTAINER = 3.0;
  
  const containerInnerEdgeLeft = row1X + (containerWidthM / 2);
  const containerInnerEdgeRight = row2X - (containerWidthM / 2);
  
  const containerStep = containerDepthM + gapBetweenRows;
  const zTop = centerOffsetZ + containerStep / 2;
  const zBottom = centerOffsetZ + totalZSpan - containerStep / 2;
  
  const trfXFromCenter = containerInnerEdgeLeft + SECURITY_DIST_PDU_CONTAINER + pduDepthAfterRotation + SECURITY_DIST_TRF_PDU + (transformerWidthM / 2);
  
  const pduRow1X = containerInnerEdgeLeft + SECURITY_DIST_PDU_CONTAINER + (pduDepthAfterRotation / 2);
  const pduRow2X = containerInnerEdgeRight - SECURITY_DIST_PDU_CONTAINER - (pduDepthAfterRotation / 2);
  const containerSpacingZ = containerDepthM + gapBetweenRows;
  const pduZTop = centerOffsetZ + containerSpacingZ / 2;
  const pduZBottom = centerOffsetZ + totalZSpan - containerSpacingZ / 2;
  
  // Canopy dimensions
  const canopyWidth = 42000;
  const canopyDepth = 24000;
  const canopyStructureHeight = 2000;
  const canopyY = slabHeight + 10;
  
  // Slab dimensions - slightly larger than canopy to include feet (2m margin each side)
  const slabWidth = 46000;  // 46m (canopy 42m + 2m margin each side)
  const slabDepth = 28000;  // 28m (canopy 24m + 2m margin each side)
  
  // Generate both sites - centered around X=0 with 20m gap
  const sites = [
    { id: 'A', offsetX: siteACenterX, label: 'Site A' },
    { id: 'B', offsetX: siteBCenterX, label: 'Site B' }
  ];
  
  sites.forEach(site => {
    const xOffset = site.offsetX;
    
    // Row 1: 4 containers + cooling
    for (let i = 0; i < containersPerRow; i++) {
      const zPos = centerOffsetZ + i * (containerDepthM + gapBetweenRows);
      objects.push({
        id: `${site.id}-container-${i + 1}`,
        name: `${site.label} ANTSPACE HD5 #${i + 1}`,
        type: 'container',
        position: { x: row1X + xOffset, y: slabHeight + containerHeightM / 2, z: zPos },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#e8e8e8',
        dimensions: containerDims,
        locked: false,
        visible: true
      });
      objects.push({
        id: `${site.id}-cooling-${i + 1}`,
        name: `${site.label} EC2-DT #${i + 1}`,
        type: 'cooling',
        position: { x: row1X + xOffset, y: slabHeight + containerHeightM + coolingHeightM / 2, z: zPos },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#1e3a5f',
        dimensions: coolingDims,
        locked: false,
        visible: true
      });
    }
    
    // Row 2: 4 containers + cooling (rotated)
    for (let i = 0; i < containersPerRow; i++) {
      const zPos = centerOffsetZ + i * (containerDepthM + gapBetweenRows);
      objects.push({
        id: `${site.id}-container-${i + 5}`,
        name: `${site.label} ANTSPACE HD5 #${i + 5}`,
        type: 'container',
        position: { x: row2X + xOffset, y: slabHeight + containerHeightM / 2, z: zPos },
        rotation: { x: 0, y: Math.PI, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#e8e8e8',
        dimensions: containerDims,
        locked: false,
        visible: true
      });
      objects.push({
        id: `${site.id}-cooling-${i + 5}`,
        name: `${site.label} EC2-DT #${i + 5}`,
        type: 'cooling',
        position: { x: row2X + xOffset, y: slabHeight + containerHeightM + coolingHeightM / 2, z: zPos },
        rotation: { x: 0, y: Math.PI, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#1e3a5f',
        dimensions: coolingDims,
        locked: false,
        visible: true
      });
    }
    
    // 4 Transformers
    const transformerPositions = [
      { x: -trfXFromCenter + xOffset, z: zTop },
      { x: trfXFromCenter + xOffset, z: zTop },
      { x: -trfXFromCenter + xOffset, z: zBottom },
      { x: trfXFromCenter + xOffset, z: zBottom },
    ];
    transformerPositions.forEach((pos, i) => {
      objects.push({
        id: `${site.id}-transformer-${i + 1}`,
        name: `${site.label} Transformer 5MVA #${i + 1}`,
        type: 'transformer',
        position: { x: pos.x, y: slabHeight + transformerHeightM / 2, z: pos.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#f59e0b',
        dimensions: transformerDims,
        locked: false,
        visible: true
      });
    });
    
    // 4 PDUs
    const pduPositions = [
      { x: pduRow1X + xOffset, z: pduZTop, rot: Math.PI / 2, name: `${site.label} PDU Row1-A` },
      { x: pduRow1X + xOffset, z: pduZBottom, rot: Math.PI / 2, name: `${site.label} PDU Row1-B` },
      { x: pduRow2X + xOffset, z: pduZTop, rot: -Math.PI / 2, name: `${site.label} PDU Row2-A` },
      { x: pduRow2X + xOffset, z: pduZBottom, rot: -Math.PI / 2, name: `${site.label} PDU Row2-B` },
    ];
    pduPositions.forEach((pos, i) => {
      objects.push({
        id: `${site.id}-pdu-${i + 1}`,
        name: pos.name,
        type: 'pdu',
        position: { x: pos.x, y: slabHeight + pduHeightM / 2, z: pos.z },
        rotation: { x: 0, y: pos.rot, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#374151',
        dimensions: pduDims,
        locked: false,
        visible: true
      });
    });
    
    // Concrete Slab (Dalle Béton) - 46m x 28m x 0.4m (covers canopy feet)
    objects.push({
      id: `${site.id}-concrete-slab`,
      name: `${site.label} Dalle Béton`,
      type: 'concrete-slab',
      position: { x: xOffset, y: slabHeight / 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#e5e7eb',
      dimensions: { width: slabWidth, height: 400, depth: slabDepth }, // 46m x 0.4m x 28m
      locked: true,
      visible: true
    });
    
    // Solar Canopy
    objects.push({
      id: `${site.id}-solar-canopy`,
      name: `${site.label} Canopy Solaire`,
      type: 'solar-canopy',
      position: { x: xOffset, y: canopyY, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#1e3a5f',
      dimensions: { width: canopyWidth, height: canopyStructureHeight, depth: canopyDepth },
      locked: false,
      visible: true
    });
  });
  
  return objects;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function DesignerPage() {
  // Scene state
  // Dimensions in mm: 12192 x 2896 x 2438 (40ft ISO Container)
  const unitDims = { width: 12192, height: 2896, depth: 2438 };
  const unitWidthM = unitDims.width / 1000; // 12.192m (length)
  const unitDepthM = unitDims.depth / 1000; // 2.438m (depth)
  const unitHeightM = unitDims.height / 1000; // 2.896m
  
  // EC2-DT Cooling System - Real dimensions (1.2m height, same footprint as container)
  const coolingDims = { width: 12192, height: 1200, depth: 2438 };
  const coolingHeightM = coolingDims.height / 1000; // 1.2m (real EC2-DT height)
  
  const slabHeight = 0.4; // 40cm concrete slab
  const gapBetweenRows = 4; // 4m gap between containers in same row
  const faceToFaceGap = 15; // 15m between front faces
  const containersPerRow = 4;
  
  // Calculate total dimensions for centering
  const totalZSpan = (containersPerRow - 1) * (unitDepthM + gapBetweenRows); // Distance from first to last container center
  
  // Center offset for Z (so containers are symmetric around Z=0)
  const centerOffsetZ = -totalZSpan / 2;
  
  // Row positions (symmetric around X=0, with 15m gap in the middle)
  // Aisle center is at X=0, each row is offset by half the gap + half container width
  const row1X = -(faceToFaceGap / 2) - (unitWidthM / 2); // Left row
  const row2X = (faceToFaceGap / 2) + (unitWidthM / 2);  // Right row
  
  const initialObjects: Object3D[] = [];
  
  // Row 1: 4 containers + cooling (doors facing inward)
  for (let i = 0; i < containersPerRow; i++) {
    const zPos = centerOffsetZ + i * (unitDepthM + gapBetweenRows);
    // Container - on top of slab
    initialObjects.push({
      id: `container-${i + 1}`,
      name: `ANTSPACE HD5 #${i + 1}`,
      type: 'container',
      position: { x: row1X, y: slabHeight + unitHeightM / 2, z: zPos },
      rotation: { x: 0, y: 0, z: 0 }, // Door facing X+
      scale: { x: 1, y: 1, z: 1 },
      color: '#e8e8e8',
      dimensions: unitDims,
      locked: false,
      visible: true
    });
    // Cooling on roof - positioned at container top + cooling half height
    initialObjects.push({
      id: `cooling-${i + 1}`,
      name: `EC2-DT #${i + 1}`,
      type: 'cooling',
      position: { x: row1X, y: slabHeight + unitHeightM + coolingHeightM / 2, z: zPos },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#1e3a5f',
      dimensions: coolingDims,
      locked: false,
      visible: true
    });
  }
  
  // Row 2: 4 containers + cooling (doors facing inward, opposite direction)
  for (let i = 0; i < containersPerRow; i++) {
    const zPos = centerOffsetZ + i * (unitDepthM + gapBetweenRows);
    // Container (rotated 180°) - on top of slab
    initialObjects.push({
      id: `container-${i + 5}`,
      name: `ANTSPACE HD5 #${i + 5}`,
      type: 'container',
      position: { x: row2X, y: slabHeight + unitHeightM / 2, z: zPos },
      rotation: { x: 0, y: Math.PI, z: 0 }, // Door facing X- (toward row 1)
      scale: { x: 1, y: 1, z: 1 },
      color: '#e8e8e8',
      dimensions: unitDims,
      locked: false,
      visible: true
    });
    // Cooling on roof - positioned at container top + cooling half height
    initialObjects.push({
      id: `cooling-${i + 5}`,
      name: `EC2-DT #${i + 5}`,
      type: 'cooling',
      position: { x: row2X, y: slabHeight + unitHeightM + coolingHeightM / 2, z: zPos },
      rotation: { x: 0, y: Math.PI, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#1e3a5f',
      dimensions: coolingDims,
      locked: false,
      visible: true
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY DISTANCES (ZonDESK compliance)
  // ═══════════════════════════════════════════════════════════════════════════
  // TRF ↔ PDU : 3m (bord à bord)
  // PDU ↔ Container : 3m (bord à bord)
  const SECURITY_DIST_TRF_PDU = 3.0;      // 3m between transformer and PDU
  const SECURITY_DIST_PDU_CONTAINER = 3.0; // 3m between PDU and container edge
  
  // PDU dimensions (defined early for position calculations)
  const pduDims = { width: 2400, height: 2200, depth: 800 }; // 2.4m x 2.2m x 0.8m
  const pduHeightM = pduDims.height / 1000;
  const pduDepthAfterRotation = pduDims.depth / 1000;  // 0.8m (rotated 90°)
  
  // 4 Transformers 5 MVA - positioned at corners (2 containers × 2.116 MW = 4.232 MW each)
  const transformerDims = { width: 2500, height: 3000, depth: 2000 }; // 2.5m x 3m x 2m
  const transformerHeightM = transformerDims.height / 1000;
  const transformerWidthM = transformerDims.width / 1000;
  const transformerDepthM = transformerDims.depth / 1000;
  
  // Container inner edges (for distance calculations)
  const containerInnerEdgeLeft = row1X + (unitWidthM / 2);   // -7.5m
  const containerInnerEdgeRight = row2X - (unitWidthM / 2);  // +7.5m
  
  // Transformer positions: 2 pairs in the middle of the passage
  // Pair 1: between containers 1-2 (top of layout)
  // Pair 2: between containers 3-4 (bottom of layout)
  const containerStep = unitDepthM + gapBetweenRows; // Distance between container centers
  const zTop = centerOffsetZ + containerStep / 2; // Between container 1 and 2
  const zBottom = centerOffsetZ + totalZSpan - containerStep / 2; // Between container 3 and 4
  
  // Calculate transformer X positions based on security distances:
  // Layout: Container | 3m | PDU (0.8m) | 3m | TRF (2.5m) | center | TRF | 3m | PDU | 3m | Container
  // TRF center from container edge = 3m + 0.8m + 3m + 1.25m = 8.05m
  // Container edge at ±7.5m, so TRF at ±(7.5 - 8.05) = ±(-0.55m) → center side
  // For symmetric layout: TRF X = ±0.55m from center
  const trfXFromCenter = containerInnerEdgeLeft + SECURITY_DIST_PDU_CONTAINER + pduDepthAfterRotation + SECURITY_DIST_TRF_PDU + (transformerWidthM / 2);
  // This gives us the actual TRF X position (≈0.55m from center for each pair)
  
  const transformerPositions = [
    { x: -trfXFromCenter, z: zTop, rot: 0 }, // Top pair - left
    { x: trfXFromCenter, z: zTop, rot: 0 }, // Top pair - right
    { x: -trfXFromCenter, z: zBottom, rot: 0 }, // Bottom pair - left
    { x: trfXFromCenter, z: zBottom, rot: 0 }, // Bottom pair - right
  ];
  
  transformerPositions.forEach((pos, i) => {
    initialObjects.push({
      id: `transformer-${i + 1}`,
      name: `Transformer 5MVA #${i + 1}`,
      type: 'transformer',
      position: { x: pos.x, y: slabHeight + transformerHeightM / 2, z: pos.z },
      rotation: { x: 0, y: pos.rot, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#f59e0b',
      dimensions: transformerDims,
      locked: false,
      visible: true
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PDU - LV Distribution Skids (1 PDU per 2 containers)
  // ═══════════════════════════════════════════════════════════════════════════
  // 4 PDUs total: 2 per row, each serving 2 containers
  // Positioned at exactly 3m from container edge (ZonDESK security compliance)
  // pduDims already defined above for position calculations
  
  // PDU X positions based on security distances:
  // Container inner edge = row1X + unitWidthM/2 = -7.5m (left) / +7.5m (right)
  // PDU center = container edge + 3m + PDU_depth/2 (when rotated 90°)
  // PDU depth after rotation = 0.8m, so half = 0.4m
  const pduRow1X = containerInnerEdgeLeft + SECURITY_DIST_PDU_CONTAINER + (pduDepthAfterRotation / 2);
  // pduRow1X = -7.5 + 3.0 + 0.4 = -4.1m
  const pduRow2X = containerInnerEdgeRight - SECURITY_DIST_PDU_CONTAINER - (pduDepthAfterRotation / 2);
  // pduRow2X = +7.5 - 3.0 - 0.4 = +4.1m
  
  // PDU Z positions: centered between pairs of containers
  // Containers at Z: -9.657, -3.219, +3.219, +9.657
  const containerSpacingZ = unitDepthM + gapBetweenRows; // 6.438m
  const pduZTop = centerOffsetZ + containerSpacingZ / 2;    // Between container 1-2 ≈ -6.4m
  const pduZBottom = centerOffsetZ + totalZSpan - containerSpacingZ / 2; // Between container 3-4 ≈ +6.4m
  
  const pduPositions = [
    { x: pduRow1X, z: pduZTop, rot: Math.PI / 2, name: 'PDU Row1-A (C1-C2)' },
    { x: pduRow1X, z: pduZBottom, rot: Math.PI / 2, name: 'PDU Row1-B (C3-C4)' },
    { x: pduRow2X, z: pduZTop, rot: -Math.PI / 2, name: 'PDU Row2-A (C5-C6)' },
    { x: pduRow2X, z: pduZBottom, rot: -Math.PI / 2, name: 'PDU Row2-B (C7-C8)' },
  ];
  
  pduPositions.forEach((pos, i) => {
    initialObjects.push({
      id: `pdu-${i + 1}`,
      name: pos.name,
      type: 'pdu',
      position: { x: pos.x, y: slabHeight + pduHeightM / 2, z: pos.z },
      rotation: { x: 0, y: pos.rot, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#374151',
      dimensions: pduDims,
      locked: false,
      visible: true
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOLAR CANOPY - Covers entire installation with thermal extraction zones
  // ═══════════════════════════════════════════════════════════════════════════
  // Dimensions calculation:
  // Width (X): row1X=-13.596, row2X=+13.596, container width=12.192m
  //          = from -19.7 to +19.7 = 39.4m + 2m margin = 42m
  // Depth (Z): containers from -10.9 to +10.9 = 21.8m + 2m margin = 24m
  // 
  // THERMAL EXTRACTION CLEARANCE:
  // Cooling TOP = 4.496m (slab 0.4 + container 2.896 + cooling 1.2)
  // Required clearance = 4m minimum for hot air extraction
  // Canopy LOW side = 10.4m (4.496 + 5.9m clearance) ✓ Excellent
  // Canopy HIGH side = ~14.6m (10° mono-slope roof)
  const canopyWidth = 42000;   // 42m width to cover both rows + margins
  const canopyDepth = 24000;   // 24m depth to cover 4 containers + margins
  const canopyStructureHeight = 2000; // 2m structure height
  // Position canopy so that 10m posts reach down to ground (slabHeight)
  // Post LOW height = 10m, positioned so base is at slabHeight
  // canopyY = slabHeight + postHeightLow = 0.4 + 10 = 10.4m
  const canopyY = slabHeight + 10; // 10.4m - posts go down to slab level
  
  initialObjects.push({
    id: 'solar-canopy-1',
    name: 'Canopy Solaire Qatar 100MW',
    type: 'solar-canopy',
    position: { x: 0, y: canopyY, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    color: '#1e3a5f',
    dimensions: { width: canopyWidth, height: canopyStructureHeight, depth: canopyDepth },
    locked: false,
    visible: true
  });
  
  const [objects, setObjects] = useState<Object3D[]>(initialObjects);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT SELECTOR STATE - Show before 3D view
  // ═══════════════════════════════════════════════════════════════════════════
  const [isProjectSelectorVisible, setIsProjectSelectorVisible] = useState(true);
  
  // Box selection state
  const [boxSelectMode, setBoxSelectMode] = useState(false); // Mode toggle
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [boxCurrent, setBoxCurrent] = useState<{ x: number; y: number } | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Helper for single selection (backwards compatibility)
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : (selectedIds.length > 0 ? selectedIds[0] : null);
  const setSelectedId = (id: string | null) => setSelectedIds(id ? [id] : []);
  
  // Multi-select handler
  const handleSelect = (id: string, multiSelect: boolean) => {
    // Empty string means deselect all
    if (!id) {
      setSelectedIds([]);
      return;
    }
    if (multiSelect) {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };
  
  // Get selected objects
  const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));
  
  // Undo/Redo history
  const [history, setHistory] = useState<Object3D[][]>([initialObjects]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedo = useRef(false);
  
  // Track object changes for history
  useEffect(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    // Only add to history if objects actually changed
    const currentState = history[historyIndex];
    if (JSON.stringify(objects) !== JSON.stringify(currentState)) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...objects]);
      // Limit history to 50 states
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects]);
  
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex - 1);
      setObjects([...history[historyIndex - 1]]);
    }
  }, [historyIndex, history]);
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      setHistoryIndex(historyIndex + 1);
      setObjects([...history[historyIndex + 1]]);
    }
  }, [historyIndex, history]);
  
  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  
  // View state
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [showDistanceX, setShowDistanceX] = useState(false);
  const [showDistanceZ, setShowDistanceZ] = useState(false);
  const [viewDirection, setViewDirection] = useState<'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | null>(null);
  const [lowQuality, setLowQuality] = useState(false); // Low quality mode for performance
  
  // UI state
  const [showLibrary, setShowLibrary] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showCableRouting, setShowCableRouting] = useState(false);
  
  // Cable routing state
  const [cableRoutes, setCableRoutes] = useState<CableRoute[]>([]);
  const [cableSnapPoints, setCableSnapPoints] = useState<WorldSnapPoint[]>([]);
  const [cableDrawingPoints, setCableDrawingPoints] = useState<THREE.Vector3[]>([]);
  const [cablePreviewPoint, setCablePreviewPoint] = useState<THREE.Vector3 | null>(null);
  const [cableIsDrawing, setCableIsDrawing] = useState(false);
  const [cableSelectedSegments, setCableSelectedSegments] = useState<string[]>([]);
  const [cableSelectedPoints, setCableSelectedPoints] = useState<string[]>([]);
  const [cableActiveRouteId, setCableActiveRouteId] = useState<string | null>(null);
  // Style du chemin de câble
  const [cableTrayStyle, setCableTrayStyle] = useState<'ladder' | 'wire-mesh' | 'conduit' | 'busbar'>('ladder');
  const [cableTrayWidth, setCableTrayWidth] = useState(300); // mm
  
  // Intelligent snap points & zones state
  const [intelligentSnapPoints, setIntelligentSnapPoints] = useState<WorldSnapPoint[]>([]);
  const [cableZones, setCableZones] = useState<CableZone[]>([]);
  const [selectedIntelligentSnapPoint, setSelectedIntelligentSnapPoint] = useState<WorldSnapPoint | null>(null);
  const [hoveredSnapPointId, setHoveredSnapPointId] = useState<string | null>(null);
  const [filterConnectionTypes, setFilterConnectionTypes] = useState<ConnectionType[]>([]);
  const [currentCableHeight, setCurrentCableHeight] = useState(3.5);
  const [showForbiddenZones, setShowForbiddenZones] = useState(false);
  const [autoCalculateHeight, setAutoCalculateHeight] = useState(true);
  
  // Cable floor click handler - using ref to track points synchronously
  const cableDrawingPointsRef = useRef<THREE.Vector3[]>([]);
  
  // Reset ref when cable routing is toggled off
  useEffect(() => {
    if (!showCableRouting) {
      cableDrawingPointsRef.current = [];
      setCableDrawingPoints([]);
      setCableIsDrawing(false);
    }
  }, [showCableRouting]);
  
  const handleCableFloorClick = useCallback((point: THREE.Vector3) => {
    // SNAP SOFT : suggestion optionnelle, tracé manuel libre
    const snapRadius = 1.5; // m
    const candidates = cableSnapPoints.filter(sp =>
      sp.position.distanceTo(point) <= snapRadius
    );
    const snapPoint = candidates.length
      ? candidates.sort((a, b) => a.position.distanceTo(point) - b.position.distanceTo(point))[0]
      : null;
    // Snap soft - pas de blocage, tracé manuel libre
    const enforcedPoint = snapPoint ? snapPoint.position : point;
    
    if (!showCableRouting) {
      return;
    }
    
    // AUTO-CRÉER une route si aucune n'existe ou n'est sélectionnée
    let activeRouteIdToUse = cableActiveRouteId;
    if (!activeRouteIdToUse) {
      const newRouteId = `cable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newRoute: CableRoute = {
        id: newRouteId,
        name: `Route ${cableRoutes.length + 1}`,
        segments: [],
        points: [],
        routeType: 'main',
        voltage: 'lv',
        totalLength: 0,
        color: '#71717a',
        visible: true,
      };
      setCableRoutes(prev => [...prev, newRoute]);
      setCableActiveRouteId(newRouteId);
      activeRouteIdToUse = newRouteId;
    }
    
    // Calculer la hauteur optimale si auto-calcul activé
    let height = currentCableHeight;
    if (autoCalculateHeight && cableZones.length > 0) {
      const lastPoint = cableDrawingPointsRef.current[cableDrawingPointsRef.current.length - 1];
      if (lastPoint) {
        const result = calculateOptimalHeight(lastPoint, enforcedPoint, cableZones, DEFAULT_HEIGHT_CONFIG);
        height = result.height;
        // Mettre à jour la hauteur courante
        setCurrentCableHeight(height);
      }
    }
    
    // Point du câble = snap strict
    const cablePoint = new THREE.Vector3(enforcedPoint.x, height, enforcedPoint.z);
    
    // Get current points from ref (synchronous)
    const currentPoints = [...cableDrawingPointsRef.current];
    
    // Add new point to ref immediately (synchronous update)
    cableDrawingPointsRef.current = [...currentPoints, cablePoint];
    
    // Also update state for rendering
    setCableDrawingPoints(cableDrawingPointsRef.current);
    setCableIsDrawing(true);
    
    // If we have at least 1 previous point, create a segment
    if (currentPoints.length >= 1) {
      const prevPoint = currentPoints[currentPoints.length - 1];
      
      setCableRoutes(prev => prev.map(route => {
        if (route.id !== activeRouteIdToUse) return route;
        
        const timestamp = Date.now();
        const startPointId = `point-${timestamp}-start`;
        const endPointId = `point-${timestamp}-end`;
        
        // Only add start point if this is the first segment
        const newPoints = route.points.length === 0 
          ? [
              { id: startPointId, position: prevPoint.clone(), type: 'start' as const },
              { id: endPointId, position: cablePoint.clone(), type: 'waypoint' as const },
            ]
          : [
              ...route.points,
              { id: endPointId, position: cablePoint.clone(), type: 'waypoint' as const },
            ];
        
        // Get the actual start point ID for the segment
        const actualStartPointId = route.points.length === 0 
          ? startPointId 
          : route.points[route.points.length - 1].id;
        
        const newSegment = {
          id: `seg-${timestamp}`,
          startPointId: actualStartPointId,
          endPointId,
          type: cableTrayStyle,
          width: cableTrayWidth,
          height: cableTrayStyle === 'busbar' ? 150 : 100,
          cableCount: 6,
          cableTypes: (cableTrayStyle === 'wire-mesh' ? ['data'] : cableTrayStyle === 'conduit' ? ['control'] : ['power', 'earth']) as ('power' | 'data' | 'control' | 'earth')[],
          color: cableTrayStyle === 'wire-mesh' ? '#3b82f6' : cableTrayStyle === 'conduit' ? '#f59e0b' : cableTrayStyle === 'busbar' ? '#b45309' : '#71717a',
          locked: false,
          visible: true,
        };
        
        const segmentLength = prevPoint.distanceTo(cablePoint);
        
        return {
          ...route,
          points: newPoints,
          segments: [...route.segments, newSegment],
          totalLength: route.totalLength + segmentLength,
        };
      }));
    }
  }, [showCableRouting, cableActiveRouteId, autoCalculateHeight, cableZones, currentCableHeight, cableRoutes.length, cableTrayStyle, cableTrayWidth, cableSnapPoints]);
  
  // Project state
  const [projectName, setProjectName] = useState('Untitled Project');
  
  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUserPrompt, setAiUserPrompt] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: 'user' | 'ai'; message: string }>>([]);
  const [aiResult, setAiResult] = useState<AIImplantationResult | null>(null);
  const [aiDimensions, setAiDimensions] = useState({ width: 50, depth: 30 });
  const [aiTargetPower, setAiTargetPower] = useState(1);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [aiEngineerProfile, setAiEngineerProfile] = useState<'generalist' | 'electrical' | 'mining' | 'thermal' | '3d'>('mining');
  const [aiAvailableObjects, setAiAvailableObjects] = useState<{ [key: string]: InfraObject[] }>({});
  
  // Engineer profiles configuration - DÉBRIDÉ
  const engineerProfiles = {
    generalist: { 
      label: 'Généraliste', 
      icon: '🎯', 
      description: 'Expert polyvalent - Vue d\'ensemble complète',
      skills: ['layout', 'optimization', 'standards', 'analysis', 'recommendations', 'all-domains']
    },
    electrical: { 
      label: 'Électrique PRO', 
      icon: '⚡', 
      description: 'Expert HV/LV, Transfo 33kV, RMU, PDU, Câblage, Protection',
      skills: ['electrical', 'power', 'transformers', 'pdu', 'cables', 'grounding', 'hv-design', 'lv-distribution', 'protection', 'rmu', 'switchgear', 'genset', 'ups', 'metering']
    },
    mining: { 
      label: 'Mining EXPERT', 
      icon: '⛏️', 
      description: 'Expert containers HD5/HK3, ASICs S21/S19, Hashrate, ROI, Density',
      skills: ['mining', 'containers', 'asics', 'hashrate', 'profitability', 'density', 'antspace', 'bitmain', 'whatsminer', 'immersion', 'efficiency', 'power-per-th', 'roi-calculation', 'fleet-management']
    },
    thermal: { 
      label: 'Thermique PRO', 
      icon: '❄️', 
      description: 'Expert Dry Coolers, Immersion, Airflow, PUE, Delta-T',
      skills: ['thermal', 'cooling', 'airflow', 'pue', 'dry-coolers', 'immersion', 'ec2-dt', 'hydro-cooling', 'adiabatic', 'heat-rejection', 'ambient-design', 'psychrometric', 'cfm-calculation', 'water-flow']
    },
    '3d': { 
      label: '3D/CAO Expert', 
      icon: '🎨', 
      description: 'Expert Modélisation 3D, Layout, Visualisation, Rendu',
      skills: ['3d', 'visualization', 'modeling', 'threejs', 'react-three-fiber', 'layout-design', 'spatial-optimization', 'rendering', 'cad', 'bim', 'collision-detection']
    }
  };

  // Database save state
  const [dbLayouts, setDbLayouts] = useState<Layout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [dbSaving, setDbSaving] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDbPanel, setShowDbPanel] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false); // Disabled - access via Cloud button
  
  // Generate snap points from objects for cable routing (legacy + intelligent)
  useEffect(() => {
    // Legacy snap points (pour compatibilité)
    const snapPoints: WorldSnapPoint[] = [];
    // Intelligent snap points (nouveau système)
    const intSnapPoints: WorldSnapPoint[] = [];
    
    objects.forEach(obj => {
      const w = obj.dimensions.width / 2000;
      const h = obj.dimensions.height / 2000;
      const d = obj.dimensions.depth / 2000;
      
      // Legacy: Center point
      snapPoints.push({
        id: `${obj.id}-center`,
        position: new THREE.Vector3(obj.position.x, obj.position.y + h, obj.position.z),
        objectId: obj.id,
        objectName: obj.name,
        objectType: obj.objectType || 'generic',
        label: 'Center',
        connectionType: 'power-bt', // adaptez selon usage
        direction: new THREE.Vector3(0, 1, 0),
        cableWidth: 300,
        maxCables: 6,
        priority: 2,
        currentCables: 0,
      });
      
      // Legacy: Corner points (top of object)
      const corners = [
        [w, h, d], [-w, h, d], [w, h, -d], [-w, h, -d],
      ];
      corners.forEach(([cx, cy, cz]) => {
        snapPoints.push({
          id: `${obj.id}-corner-${cx}|${cy}|${cz}`,
          position: new THREE.Vector3(obj.position.x + cx, obj.position.y + cy, obj.position.z + cz),
          objectId: obj.id,
          objectName: obj.name,
          objectType: obj.objectType || 'generic',
          label: 'Corner',
          connectionType: 'power-bt', // adaptez si besoin
          direction: new THREE.Vector3(0, 1, 0),
          cableWidth: 300,
          maxCables: 6,
          priority: 2,
          currentCables: 0,
        });
      });
      
      // Legacy: Edge midpoints (for cable connections)
      const edges = [
        [0, h, d], [0, h, -d], [w, h, 0], [-w, h, 0],
      ];
      edges.forEach(([ex, ey, ez]) => {
        snapPoints.push({
          id: `${obj.id}-edge-${ex}|${ey}|${ez}`,
          position: new THREE.Vector3(obj.position.x + ex, obj.position.y + ey, obj.position.z + ez),
          objectId: obj.id,
          objectName: obj.name,
          objectType: obj.objectType || 'generic',
          label: 'Edge',
          connectionType: 'power-bt',
          direction: new THREE.Vector3(0, 1, 0),
          cableWidth: 300,
          maxCables: 6,
          priority: 2,
          currentCables: 0,
        });
      });
      
      // Nouveau: Snap points intelligents par type d'équipement
      const objSnapPoints = generateSnapPointsForObject(
        obj.id,
        obj.name,
        obj.objectType || 'generic',
        new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z),
        new THREE.Euler(0, (obj.rotation?.y || 0) * Math.PI / 180, 0),
        obj.dimensions
      );
      intSnapPoints.push(...objSnapPoints);
    });
    
    setCableSnapPoints(intSnapPoints);
    setIntelligentSnapPoints(intSnapPoints);
    
    // Générer les zones de câblage
    const simpleObjects: SimpleObject[] = objects.map(obj => ({
      id: obj.id,
      name: obj.name,
      objectType: obj.objectType || 'generic',
      position: new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z),
      rotation: new THREE.Euler(0, (obj.rotation?.y || 0) * Math.PI / 180, 0),
      dimensions: obj.dimensions,
    }));
    const zones = generateCableZones(simpleObjects, DEFAULT_HEIGHT_CONFIG);
    setCableZones(zones);
  }, [objects]);
  
  // Keyboard controls for moving objects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (selectedIds.length === 0) return;
      
      const moveStep = e.shiftKey ? 0.5 : 0.1; // 10cm normal, 50cm avec Shift
      const yStep = e.shiftKey ? 0.5 : 0.1; // 10cm normal, 50cm avec Shift
      const rotateStep = Math.PI / 2; // 90 degrees
      
      
      switch (e.key) {
        // Movement - Arrows
        case 'ArrowUp':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, z: obj.position.z - moveStep } } : obj
          ));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, z: obj.position.z + moveStep } } : obj
          ));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, x: obj.position.x - moveStep } } : obj
          ));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, x: obj.position.x + moveStep } } : obj
          ));
          break;
        // A = Monter (Y+)
        case 'a':
        case 'A':
        case 'PageUp':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, y: obj.position.y + yStep } } : obj
          ));
          break;
        // Q = Descendre (Y-)
        case 'q':
        case 'Q':
        case 'PageDown':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, y: Math.max(0, obj.position.y - yStep) } } : obj
          ));
          break;
        // S = Rotation +90°
        case 's':
        case 'S':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, rotation: { ...obj.rotation, y: obj.rotation.y + Math.PI / 2 } } : obj
          ));
          break;
        // E = Rotation -90°
        case 'e':
        case 'E':
          e.preventDefault();
          setObjects(prev => prev.map(obj => 
            selectedIds.includes(obj.id) ? { ...obj, rotation: { ...obj.rotation, y: obj.rotation.y - Math.PI / 2 } } : obj
          ));
          break;
        
        // Delete
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          setObjects(prev => prev.filter(obj => !selectedIds.includes(obj.id)));
          setSelectedIds([]);
          break;
        
        // Duplicate
        case 'd':
        case 'D':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const objsToDuplicate = objects.filter(obj => selectedIds.includes(obj.id));
            if (objsToDuplicate.length > 0) {
              const newObjs = objsToDuplicate.map((obj, i) => ({
                ...obj,
                id: `${obj.type}-${Date.now()}-${i}`,
                name: `${obj.name} (copy)`,
                position: {
                  x: obj.position.x + 2,
                  y: obj.position.y,
                  z: obj.position.z + 2
                }
              }));
              setObjects(prev => [...prev, ...newObjs]);
              setSelectedIds(newObjs.map(o => o.id));
            }
          }
          break;
        
        // Deselect
        case 'Escape':
          e.preventDefault();
          setSelectedIds([]);
          break;
        
        default:
          return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, objects]);

  const orbitRef = useRef<any>(null);

  // Project version - increment to force reload of initial objects with PDUs
  const PROJECT_VERSION = 'v2-pdu-zondesk';
  
  // Load DB layouts, restore last project, and AI status
  useEffect(() => {
    const init = async () => {
      // Force reload if version changed (to load new PDUs)
      const savedVersion = localStorage.getItem('hearst-designer-project-version');
      if (savedVersion !== PROJECT_VERSION) {
        localStorage.setItem('hearst-designer-project-version', PROJECT_VERSION);
        localStorage.removeItem('hearst-designer-last-project');
        setDbLoading(false);
        return; // Keep initial objects with PDUs
      }
      
      // Load DB layouts first
      setDbLoading(true);
      try {
        const layouts = await layoutsApi.getAll();
        setDbLayouts(layouts);
        
        // Check if there's a last used project to restore
        const lastProjectId = localStorage.getItem('hearst-designer-last-project');
        if (lastProjectId && layouts.length > 0) {
          const lastProject = layouts.find(l => l.id === lastProjectId);
          if (lastProject) {
            // Restore last project
            setCurrentLayoutId(lastProject.id);
            setProjectName(lastProject.name);
            if (lastProject.objects && lastProject.objects.length > 0) {
              setObjects(lastProject.objects.map((obj: any) => ({
                id: obj.id,
                name: obj.name || 'Object',
                type: obj.type || 'container',
                position: obj.position || { x: 0, y: 0, z: 0 },
                rotation: obj.rotation || { x: 0, y: 0, z: 0 },
                scale: obj.scale || { x: 1, y: 1, z: 1 },
                color: obj.color || '#8AFD81',
                dimensions: obj.dimensions || { width: 12.192, height: 2.896, depth: 2.438 },
                locked: obj.locked || false,
                visible: obj.visible !== false,
              })));
            }
          }
        }
      } catch (error) {
        console.error('Failed to load layouts from DB:', error);
      } finally {
        setDbLoading(false);
      }
      
      // Migrate local projects to cloud if any exist
      const saved = localStorage.getItem('hearst-designer-projects');
      if (saved) {
        const localProjects: SavedProject[] = JSON.parse(saved);
        if (localProjects.length > 0) {
          for (const project of localProjects) {
            try {
              await layoutsApi.create({
                name: project.name + ' (migrated)',
                description: `Migrated from local storage on ${new Date().toLocaleDateString()}`,
                dimensions: { width: 50000, height: 30000, depth: 10000 },
                objects: project.objects as any,
                groups: [],
              });
            } catch (error) {
              console.error(`Failed to migrate ${project.name}:`, error);
            }
          }
          // Clear local storage after migration
          localStorage.removeItem('hearst-designer-projects');
          // Refresh DB layouts
          await loadDbLayouts();
          setSaveMessage(`✓ ${localProjects.length} local project(s) migrated to cloud!`);
          setTimeout(() => setSaveMessage(null), 5000);
        }
      }
      
      // Load AI status
      loadAiStatus();
      
      // Load available objects for AI
      loadAvailableObjects();
    };
    
    init();
  }, []);

  // Load available objects for AI
  const loadAvailableObjects = async () => {
    try {
      const templates = await objectsApi.getTemplates();
      setAiAvailableObjects(templates);
    } catch (error) {
      console.error('Failed to load AI objects:', error);
    }
  };

  // Load layouts from database
  const loadDbLayouts = async () => {
    setDbLoading(true);
    try {
      const layouts = await layoutsApi.getAll();
      setDbLayouts(layouts);
    } catch (error) {
      console.error('Failed to load layouts from DB:', error);
    } finally {
      setDbLoading(false);
    }
  };

  // Load AI status
  const loadAiStatus = async () => {
    try {
      const status = await aiApi.getStatus();
      setAiStatus(status);
    } catch (error) {
      console.error('Failed to load AI status:', error);
      setAiStatus({ available: false, providers: { claude: { configured: false, model: '' }, openai: { configured: false, model: '' }, gemini: { configured: false, model: '' } } });
    }
  };

  // Save to database
  const saveToDatabase = async (createNew = false) => {
    setDbSaving(true);
    setSaveMessage(null);
    try {
      let savedId = currentLayoutId;
      
      if (currentLayoutId && !createNew) {
        // Update existing layout
        await layoutsApi.update(currentLayoutId, {
          name: projectName,
          objects: objects as any,
          groups: [],
        });
        setSaveMessage('✓ Project saved successfully!');
      } else {
        // Create new layout
        const created = await layoutsApi.create({
          name: projectName,
          description: `Created from designer`,
          dimensions: { width: 50000, height: 30000, depth: 10000 },
          objects: objects as any,
          groups: [],
        });
        savedId = created.id;
        setCurrentLayoutId(created.id);
        setSaveMessage('✓ New project created successfully!');
      }
      
      // Save last used project ID for auto-restore on refresh
      if (savedId) {
        localStorage.setItem('hearst-designer-last-project', savedId);
      }
      
      setLastSaved(new Date());
      loadDbLayouts(); // Refresh list
      // Auto-hide message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save to DB:', error);
      setSaveMessage('✗ Failed to save: ' + (error as Error).message);
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setDbSaving(false);
    }
  };

  // Load from database
  const loadFromDatabase = async (layout: Layout) => {
    setCurrentLayoutId(layout.id);
    setProjectName(layout.name);
    if (layout.objects && layout.objects.length > 0) {
      // Ensure all required properties are present
      const loadedObjects = layout.objects.map((obj: any) => ({
        id: obj.id,
        name: obj.name || 'Object',
        type: obj.type || 'container',
        position: obj.position || { x: 0, y: 0, z: 0 },
        rotation: obj.rotation || { x: 0, y: 0, z: 0 },
        scale: obj.scale || { x: 1, y: 1, z: 1 },
        color: obj.color || '#8AFD81',
        dimensions: obj.dimensions || { width: 12.192, height: 2.896, depth: 2.438 },
        locked: obj.locked || false,
        visible: obj.visible !== false,
      }));
      setObjects(loadedObjects);
    } else {
      setObjects([]);
    }
    setShowDbPanel(false);
    setShowProjects(false);
    setLastSaved(new Date(layout.updated_at || layout.created_at || Date.now()));
    
    // Save as last used project for auto-restore
    localStorage.setItem('hearst-designer-last-project', layout.id);
  };

  // Delete from database
  const deleteFromDatabase = async (layoutId: string) => {
    if (!confirm('Delete this layout permanently?')) return;
    try {
      await layoutsApi.delete(layoutId);
      if (currentLayoutId === layoutId) {
        setCurrentLayoutId(null);
      }
      loadDbLayouts();
    } catch (error) {
      console.error('Failed to delete layout:', error);
    }
  };

  // Global keyboard shortcuts (Ctrl+S, Ctrl+O, etc.)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Ctrl+S or Cmd+S = Save to Supabase
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToDatabase(false);
      }
      
      // Ctrl+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Ctrl+Shift+Z or Ctrl+Y = Redo
      if ((e.ctrlKey || e.metaKey) && ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
      }
      
      // Ctrl+O or Cmd+O = Open Projects
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsProjectSelectorVisible(true);
      }
      
      // L = Open Library (only when no object selected, A is for Y+ movement)
      if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey && !selectedId) {
        setShowLibrary(true);
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLayoutId, projectName, selectedId, undo, redo]);

  // Tool change handler
  const handleToolChange = useCallback((tool: Tool) => {
    setActiveTool(tool);
    if (tool === 'move') setTransformMode('translate');
    else if (tool === 'rotate') setTransformMode('rotate');
    else if (tool === 'scale') setTransformMode('scale');
  }, []);

  // Transform handler
  const handleTransformEnd = useCallback((
    id: string, 
    position: THREE.Vector3, 
    rotation: THREE.Euler, 
    meshScale: THREE.Vector3
  ) => {
    setObjects(prev => prev.map(obj => {
      if (obj.id !== id) return obj;
      
      // Check if this is a custom rendered object (container, cooling, transformer)
      const typeLC = obj.type.toLowerCase();
      const isCustomRendered = typeLC.includes('container') || typeLC.includes('cooling') || typeLC.includes('transformer');
      
      if (isCustomRendered) {
        // Custom rendered objects have scale built into geometry, don't modify scale
        return {
          ...obj,
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
          // Keep original scale
        };
      }
      
      // Standard objects: Convert mesh scale back to multiplier scale
      // meshScale = (dimensions / 1000) * objectScale
      // So: objectScale = meshScale / (dimensions / 1000)
      const baseScaleX = obj.dimensions.width / 1000;
      const baseScaleY = obj.dimensions.height / 1000;
      const baseScaleZ = obj.dimensions.depth / 1000;
      
      return {
        ...obj,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { 
          x: meshScale.x / baseScaleX, 
          y: meshScale.y / baseScaleY, 
          z: meshScale.z / baseScaleZ 
        }
      };
    }));
  }, []);

  // Add object from library
  const handleAddObject = useCallback((infraObj: InfraObject) => {
    const dims = (infraObj as any).combinedDimensions || infraObj.dimensions || { width: 1000, height: 1000, depth: 1000 };
    
    // Convert dimensions from mm to meters
    const heightInMeters = dims.height / 1000;
    
    // Calculate position: spread objects along X axis, Y centered so bottom touches ground
    const xSpacing = Math.max(dims.width / 1000, 5) + 2; // Object width + 2m gap
    
    const newObject: Object3D = {
      id: `${infraObj.id}-${Date.now()}`,
      name: infraObj.name,
      type: infraObj.type,
      position: { 
        x: objects.length * xSpacing, 
        y: heightInMeters / 2, // Center of object = half height (so bottom touches Y=0)
        z: 0 
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: infraObj.color || '#8AFD81',
      dimensions: dims,
      locked: false,
      visible: true
    };
    
    setObjects(prev => [...prev, newObject]);
    setSelectedId(newObject.id);
    setActiveTool('move');
    setTransformMode('translate');
  }, [objects.length]);

  // Update selected object
  const handleUpdateObject = useCallback((updates: Partial<Object3D>) => {
    if (!selectedId) return;
    setObjects(prev => prev.map(obj => 
      obj.id === selectedId ? { ...obj, ...updates } : obj
    ));
  }, [selectedId]);

  // Duplicate selected object
  const handleDuplicate = useCallback(() => {
    if (!selectedId) return;
    const obj = objects.find(o => o.id === selectedId);
    if (!obj) return;
    
    const newObject: Object3D = {
      ...obj,
      id: `${obj.id}-copy-${Date.now()}`,
      name: `${obj.name} (copy)`,
      position: { 
        x: obj.position.x + 2, 
        y: obj.position.y, 
        z: obj.position.z + 2 
      }
    };
    
    setObjects(prev => [...prev, newObject]);
    setSelectedId(newObject.id);
  }, [selectedId, objects]);

  // Delete selected object
  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    setObjects(prev => prev.filter(obj => obj.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Export JSON
  const handleExport = useCallback(() => {
    const data = {
      name: projectName,
      objects: objects,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projectName, objects]);

  // Export STEP (ISO 10303-21)
  const handleExportStep = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${projectName.replace(/\s+/g, '_')}_${timestamp}`;
    
    // Generate STEP file content
    let stepContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Hearst Mining Architect Export'),'2;1');
FILE_NAME('${filename}.step','${new Date().toISOString()}',('Hearst Mining'),('Hearst Control'),'Hearst Mining Architect','Hearst Mining Architect 1.0','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
`;
    
    let entityId = 1;
    const entities: string[] = [];
    
    // Helper to create unique IDs
    const nextId = () => `#${entityId++}`;
    
    // Create CARTESIAN_POINT
    const createPoint = (x: number, y: number, z: number) => {
      const id = nextId();
      entities.push(`${id}=CARTESIAN_POINT('',(${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}));`);
      return id;
    };
    
    // Create DIRECTION
    const createDirection = (x: number, y: number, z: number) => {
      const id = nextId();
      entities.push(`${id}=DIRECTION('',(${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}));`);
      return id;
    };
    
    // Create AXIS2_PLACEMENT_3D
    const createAxis2Placement = (origin: string, axis: string, refDir: string) => {
      const id = nextId();
      entities.push(`${id}=AXIS2_PLACEMENT_3D('',${origin},${axis},${refDir});`);
      return id;
    };
    
    // Create a box shape for each object
    objects.forEach((obj, index) => {
      if (!obj.visible) return;
      
      // Convert dimensions from mm to m
      const width = obj.dimensions.width / 1000;
      const height = obj.dimensions.height / 1000;
      const depth = obj.dimensions.depth / 1000;
      
      // Position (center to corner offset)
      const x = obj.position.x - width / 2;
      const y = obj.position.y - height / 2;
      const z = obj.position.z - depth / 2;
      
      // Create placement
      const origin = createPoint(x, y, z);
      const axisZ = createDirection(0, 0, 1);
      const axisX = createDirection(1, 0, 0);
      const placement = createAxis2Placement(origin, axisZ, axisX);
      
      // Create box
      const boxId = nextId();
      entities.push(`${boxId}=BLOCK('${obj.name}',${placement},${width.toFixed(3)},${depth.toFixed(3)},${height.toFixed(3)});`);
      
      // Create shape representation
      const shapeRepId = nextId();
      entities.push(`${shapeRepId}=SHAPE_REPRESENTATION('${obj.name}',(${boxId}),$);`);
      
      // Create product
      const productId = nextId();
      entities.push(`${productId}=PRODUCT('${obj.id}','${obj.name}','${obj.type}',$);`);
      
      // Create product definition
      const prodDefId = nextId();
      entities.push(`${prodDefId}=PRODUCT_DEFINITION('${obj.name}','',${productId},$);`);
      
      // Link shape to product
      const shapeDefId = nextId();
      entities.push(`${shapeDefId}=PRODUCT_DEFINITION_SHAPE('','',${prodDefId});`);
      
      const shapeDefRepId = nextId();
      entities.push(`${shapeDefRepId}=SHAPE_DEFINITION_REPRESENTATION(${shapeDefId},${shapeRepId});`);
    });
    
    stepContent += entities.join('\n');
    stepContent += '\nENDSEC;\nEND-ISO-10303-21;\n';
    
    // Download file
    const blob = new Blob([stepContent], { type: 'application/step' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.step`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projectName, objects]);

  // AI Generate
  const handleAIGenerate = useCallback(async (promptOverride?: string) => {
    const userMessage = promptOverride || aiUserPrompt;
    if (!userMessage.trim()) return;
    
    setAiChatHistory(prev => [...prev, { role: 'user', message: userMessage }]);
    setAiLoading(true);
    setAiResult(null);
    setAiUserPrompt('');
    
    try {
      const result = await aiApi.generateImplantation({
        availableObjects: aiAvailableObjects,
        dimensions: aiDimensions,
        targetPowerMW: aiTargetPower,
        existingPlacements: objects,
        model: 'auto',
        userPrompt: userMessage,
        engineerProfile: aiEngineerProfile,
        engineerSkills: engineerProfiles[aiEngineerProfile].skills,
        constraints: {
          maxPowerMW: 100,
          minSpacingMeters: 2,
          requireCooling: true,
          requireTransformers: true,
          optimizeFor: 'density'
        },
        preferences: {
          containerType: 'HD5',
          coolingType: 'dry-cooler',
          voltageLevel: '33kV',
          layout: 'rows'
        }
      });

      setAiResult(result);
      
      // Check response type
      const isConversational = (result as any).conversational === true;
      const isAnalysis = (result as any).analysis === true;
      const isAction = (result as any).action === true;
      const issues = (result as any).issues || [];
      const complianceScore = (result as any).complianceScore;
      const changes = (result as any).changes || {};
      
      let aiMessage: string;
      
      if (isAction) {
        // Action response - modifications applied to existing objects
        const movedCount = changes.moved?.length || 0;
        const deletedCount = changes.deleted?.length || 0;
        const duplicatedCount = changes.duplicated?.length || 0;
        const modifiedCount = changes.modified?.length || 0;
        
        const parts: string[] = [];
        if (movedCount > 0) parts.push(`${movedCount} déplacé(s)`);
        if (deletedCount > 0) parts.push(`${deletedCount} supprimé(s)`);
        if (duplicatedCount > 0) parts.push(`${duplicatedCount} dupliqué(s)`);
        if (modifiedCount > 0) parts.push(`${modifiedCount} modifié(s)`);
        
        aiMessage = (result as any).message || 
          (parts.length > 0 ? `✅ Actions effectuées: ${parts.join(', ')}` : 'Actions effectuées');
        
        if (result.recommendations?.[0]) {
          aiMessage += `\n\n💡 ${result.recommendations[0]}`;
        }
      } else if (isAnalysis) {
        // Analysis response - show issues and recommendations
        const criticalCount = issues.filter((i: any) => i.severity === 'critical').length;
        const warningCount = issues.filter((i: any) => i.severity === 'warning').length;
        
        if (issues.length === 0) {
          aiMessage = `✅ Analyse terminée: Aucun problème détecté ! Score de conformité: ${complianceScore || 100}/100`;
        } else {
          aiMessage = `📋 Analyse terminée:\n`;
          if (criticalCount > 0) aiMessage += `🔴 ${criticalCount} problème(s) critique(s)\n`;
          if (warningCount > 0) aiMessage += `🟡 ${warningCount} avertissement(s)\n`;
          aiMessage += `Score: ${complianceScore || 'N/A'}/100\n\n`;
          
          // Add top 3 issues
          issues.slice(0, 3).forEach((issue: any) => {
            const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
            aiMessage += `${icon} ${issue.objectName}: ${issue.issue}\n`;
          });
          
          if (issues.length > 3) {
            aiMessage += `\n...et ${issues.length - 3} autre(s) problème(s)`;
          }
        }
        
        // Add main recommendation
        if (result.recommendations?.[0]) {
          aiMessage += `\n\n💡 ${result.recommendations[0]}`;
        }
      } else if (isConversational) {
        // Conversational response - show the message, don't touch objects
        aiMessage = (result as any).message || result.recommendations?.[0] || 'Comment puis-je vous aider avec votre ferme de minage ?';
      } else if (result.placements?.length > 0) {
        aiMessage = `J'ai généré ${result.placements.length} objets. ${result.recommendations?.[0] || ''}`;
      } else {
        aiMessage = result.recommendations?.[0] || 'Je n\'ai pas pu générer de layout. Décrivez votre projet (ex: "Ferme 10 MW avec containers HD5")';
      }
      
      setAiChatHistory(prev => [...prev, { role: 'ai', message: aiMessage }]);

      // Update objects based on response type
      if (isAction && result.placements) {
        // ACTION MODE: Replace all objects with modified version
        const modifiedObjects: Object3D[] = result.placements.map((p: any) => ({
          id: p.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: p.name,
          type: p.type,
          position: p.position || { x: 0, y: 0, z: 0 },
          rotation: p.rotation || { x: 0, y: 0, z: 0 },
          scale: p.scale || { x: 1, y: 1, z: 1 },
          color: p.color || '#8AFD81',
          dimensions: p.dimensions || { width: 1000, height: 1000, depth: 1000 },
          locked: p.locked ?? false,
          visible: p.visible ?? true
        }));
        setObjects(modifiedObjects);
        setSelectedIds([]);
      } else if (!isConversational && !isAnalysis && result.placements && result.placements.length > 0) {
        // LAYOUT MODE: Generate new objects
        const newObjects: Object3D[] = result.placements.map((p: AIPlacement, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          name: p.name,
          type: p.type,
          position: p.position,
          rotation: p.rotation || { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: p.color || '#8AFD81',
          dimensions: p.dimensions,
          locked: false,
          visible: true
        }));

        setObjects(newObjects);
      }
    } catch (error) {
      console.error('AI Generation failed:', error);
      setAiChatHistory(prev => [...prev, { role: 'ai', message: `Erreur: ${(error as Error).message}` }]);
    } finally {
      setAiLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiUserPrompt, aiDimensions, aiTargetPower, objects, aiAvailableObjects, aiEngineerProfile]);

  const selectedObject = objects.find(o => o.id === selectedId) || null;

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-SELECT ACTIONS: Symmetry, Align, Distribute
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Mirror selected objects on X axis
  const mirrorX = () => {
    if (selectedIds.length === 0) return;
    const selectedObjs = objects.filter(o => selectedIds.includes(o.id));
    const centerX = selectedObjs.reduce((sum, o) => sum + o.position.x, 0) / selectedObjs.length;
    
    setObjects(prev => prev.map(obj => {
      if (selectedIds.includes(obj.id)) {
        const newX = centerX - (obj.position.x - centerX);
        return { ...obj, position: { ...obj.position, x: newX }, rotation: { ...obj.rotation, y: obj.rotation.y + Math.PI } };
      }
      return obj;
    }));
  };
  
  // Mirror selected objects on Z axis
  const mirrorZ = () => {
    if (selectedIds.length === 0) return;
    const selectedObjs = objects.filter(o => selectedIds.includes(o.id));
    const centerZ = selectedObjs.reduce((sum, o) => sum + o.position.z, 0) / selectedObjs.length;
    
    setObjects(prev => prev.map(obj => {
      if (selectedIds.includes(obj.id)) {
        const newZ = centerZ - (obj.position.z - centerZ);
        return { ...obj, position: { ...obj.position, z: newZ }, rotation: { ...obj.rotation, y: obj.rotation.y + Math.PI } };
      }
      return obj;
    }));
  };
  
  // Duplicate selected objects with mirror (symmetry)
  const duplicateWithSymmetry = (axis: 'x' | 'z') => {
    if (selectedIds.length === 0) return;
    const selectedObjs = objects.filter(o => selectedIds.includes(o.id));
    const center = axis === 'x' 
      ? selectedObjs.reduce((sum, o) => sum + o.position.x, 0) / selectedObjs.length
      : selectedObjs.reduce((sum, o) => sum + o.position.z, 0) / selectedObjs.length;
    
    const newObjects: Object3D[] = selectedObjs.map(obj => {
      const offset = axis === 'x' ? 20 : 20; // 20m gap for symmetry
      const newPos = axis === 'x' 
        ? { ...obj.position, x: center + offset + (center - obj.position.x) }
        : { ...obj.position, z: center + offset + (center - obj.position.z) };
      
      return {
        ...obj,
        id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: newPos,
        rotation: { ...obj.rotation, y: obj.rotation.y + Math.PI }
      };
    });
    
    setObjects(prev => [...prev, ...newObjects]);
    setSelectedIds(newObjects.map(o => o.id));
  };
  
  // Align selected objects
  const alignObjects = (alignment: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerZ') => {
    if (selectedIds.length < 2) return;
    const selectedObjs = objects.filter(o => selectedIds.includes(o.id));
    
    let targetValue: number;
    switch (alignment) {
      case 'left':
        targetValue = Math.min(...selectedObjs.map(o => o.position.x - (o.dimensions.width / 2000)));
        setObjects(prev => prev.map(obj => 
          selectedIds.includes(obj.id) 
            ? { ...obj, position: { ...obj.position, x: targetValue + (obj.dimensions.width / 2000) } }
            : obj
        ));
        break;
      case 'right':
        targetValue = Math.max(...selectedObjs.map(o => o.position.x + (o.dimensions.width / 2000)));
        setObjects(prev => prev.map(obj => 
          selectedIds.includes(obj.id) 
            ? { ...obj, position: { ...obj.position, x: targetValue - (obj.dimensions.width / 2000) } }
            : obj
        ));
        break;
      case 'top':
        targetValue = Math.min(...selectedObjs.map(o => o.position.z - (o.dimensions.depth / 2000)));
        setObjects(prev => prev.map(obj => 
          selectedIds.includes(obj.id) 
            ? { ...obj, position: { ...obj.position, z: targetValue + (obj.dimensions.depth / 2000) } }
            : obj
        ));
        break;
      case 'bottom':
        targetValue = Math.max(...selectedObjs.map(o => o.position.z + (o.dimensions.depth / 2000)));
        setObjects(prev => prev.map(obj => 
          selectedIds.includes(obj.id) 
            ? { ...obj, position: { ...obj.position, z: targetValue - (obj.dimensions.depth / 2000) } }
            : obj
        ));
        break;
      case 'centerX':
        targetValue = selectedObjs.reduce((sum, o) => sum + o.position.x, 0) / selectedObjs.length;
        setObjects(prev => prev.map(obj => 
          selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, x: targetValue } } : obj
        ));
        break;
      case 'centerZ':
        targetValue = selectedObjs.reduce((sum, o) => sum + o.position.z, 0) / selectedObjs.length;
        setObjects(prev => prev.map(obj => 
          selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, z: targetValue } } : obj
        ));
        break;
    }
  };
  
  // Distribute objects evenly
  const distributeObjects = (axis: 'x' | 'z') => {
    if (selectedIds.length < 3) return;
    const selectedObjs = objects.filter(o => selectedIds.includes(o.id));
    const sorted = [...selectedObjs].sort((a, b) => 
      axis === 'x' ? a.position.x - b.position.x : a.position.z - b.position.z
    );
    
    const first = sorted[0].position[axis];
    const last = sorted[sorted.length - 1].position[axis];
    const gap = (last - first) / (sorted.length - 1);
    
    setObjects(prev => prev.map(obj => {
      const idx = sorted.findIndex(o => o.id === obj.id);
      if (idx > 0 && idx < sorted.length - 1) {
        const newPos = first + gap * idx;
        return { ...obj, position: { ...obj.position, [axis]: newPos } };
      }
      return obj;
    }));
  };
  
  // Center selection to origin
  const centerToOrigin = () => {
    if (selectedIds.length === 0) return;
    const selectedObjs = objects.filter(o => selectedIds.includes(o.id));
    const centerX = selectedObjs.reduce((sum, o) => sum + o.position.x, 0) / selectedObjs.length;
    const centerZ = selectedObjs.reduce((sum, o) => sum + o.position.z, 0) / selectedObjs.length;
    
    setObjects(prev => prev.map(obj => {
      if (selectedIds.includes(obj.id)) {
        return { 
          ...obj, 
          position: { 
            ...obj.position, 
            x: obj.position.x - centerX, 
            z: obj.position.z - centerZ 
          } 
        };
      }
      return obj;
    }));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT SELECTOR SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (isProjectSelectorVisible) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-hearst-green to-emerald-400 rounded-3xl shadow-2xl shadow-hearst-green/30 mb-6">
              <span className="text-4xl font-black text-slate-900">H</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Mining Architect</h1>
            <p className="text-slate-400 text-lg">Design your mining infrastructure in 3D</p>
          </div>

          {/* Project Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* New Empty Project */}
            <button
              onClick={() => {
                setObjects([]);
                setProjectName('Untitled Project');
                setCurrentLayoutId(null);
                setIsProjectSelectorVisible(false);
              }}
              className="group p-8 bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-3xl hover:border-hearst-green/50 hover:bg-white/10 transition-all duration-300 text-left"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-hearst-green/20 rounded-2xl flex items-center justify-center group-hover:bg-hearst-green/30 transition-colors">
                  <Zap className="w-8 h-8 text-hearst-green" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">New Project</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Start with an empty canvas and build your infrastructure from scratch
                  </p>
                </div>
              </div>
            </button>

            {/* Qatar 100MW Preset */}
            <button
              onClick={() => {
                const qatar100MWObjects = generateQatar100MW8Zones();
                setObjects(qatar100MWObjects);
                setProjectName('Qatar 100MW - 8 Zones');
                setCurrentLayoutId(null);
                setIsProjectSelectorVisible(false);
              }}
              className="group p-8 bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm border-2 border-amber-500/30 rounded-3xl hover:border-amber-400 hover:from-amber-500/20 hover:to-orange-500/20 transition-all duration-300 text-left"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-amber-500/30 rounded-2xl flex items-center justify-center group-hover:bg-amber-500/40 transition-colors">
                  <span className="text-3xl">🏗️</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">Qatar 100MW - 8 Zones</h3>
                    <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-1 rounded-full font-semibold">PRESET</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    112.96 MW • 64 containers • 16 transformers • Full infrastructure
                  </p>
                </div>
              </div>
            </button>

            {/* Duplicated Scene - 2 Sites with 20m Gap */}
            <button
              onClick={() => {
                const duplicatedObjects = generateDuplicatedScene();
                setObjects(duplicatedObjects);
                setProjectName('Dual Site - 20m Gap');
                setCurrentLayoutId(null);
                setIsProjectSelectorVisible(false);
              }}
              className="group p-8 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border-2 border-emerald-500/30 rounded-3xl hover:border-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all duration-300 text-left"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-emerald-500/30 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500/40 transition-colors">
                  <Copy className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">Dual Site - 20m Gap</h3>
                    <span className="text-xs bg-emerald-500/30 text-emerald-300 px-2 py-1 rounded-full font-semibold">PRESET</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    2 sites identiques • 16 containers • 8 transformers • 20m separation
                  </p>
                </div>
              </div>
            </button>

            {/* 3D Piece Designer */}
            <Link
              href="/designer/piece-editor"
              className="group p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-2 border-purple-500/30 rounded-3xl hover:border-purple-400 hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300 text-left"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 bg-purple-500/30 rounded-2xl flex items-center justify-center group-hover:bg-purple-500/40 transition-colors">
                  <Shapes className="w-8 h-8 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">3D Piece Designer</h3>
                    <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full font-semibold">NEW</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Créez et modifiez des pièces 3D • Primitives • Import/Export • Bibliothèque
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Cloud Projects Section */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Cloud Projects</h3>
                <span className="text-sm text-slate-500">({dbLayouts.length})</span>
              </div>
              <button
                onClick={loadDbLayouts}
                disabled={dbLoading}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${dbLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {dbLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-3 text-slate-400">Loading projects...</span>
              </div>
            ) : dbLayouts.length === 0 ? (
              <div className="text-center py-12">
                <Cloud className="w-16 h-16 mx-auto text-slate-600 mb-3" />
                <p className="text-slate-500">No projects saved yet</p>
                <p className="text-sm text-slate-600 mt-1">Create a new project and save it to the cloud</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                {dbLayouts.map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      loadFromDatabase(layout);
                      setIsProjectSelectorVisible(false);
                    }}
                    className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                        {layout.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {layout.objects?.length || 0} objects • {new Date(layout.updated_at || layout.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-slate-500 hover:text-white transition-colors text-sm">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN 3D DESIGNER VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-slate-200 flex flex-col">
      {/* Designer Header - Full width */}
      <div className="flex-shrink-0 z-40 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Project Name */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-hearst-green rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-xl font-bold text-slate-900">H</span>
              </div>
            </Link>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="text-xl font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-hearst-green/50 rounded px-2 py-1 -ml-2"
                placeholder="Project Name"
              />
              <p className="text-xs text-slate-500 ml-0.5">
                {objects.length} object{objects.length !== 1 ? 's' : ''}
                {currentLayoutId && <span className="ml-2 text-green-600">• Cloud synced</span>}
                {lastSaved && <span className="ml-2">• Saved {lastSaved.toLocaleTimeString()}</span>}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Undo/Redo Buttons */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            
            {/* Save Button - Single save to Supabase (Ctrl+S) */}
            <button
              onClick={() => saveToDatabase(false)}
              disabled={dbSaving}
              className="flex items-center gap-2 px-4 py-2 bg-hearst-green hover:bg-hearst-green/80 text-slate-900 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
              title="Save to Supabase (Ctrl+S)"
            >
              {dbSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {dbSaving ? 'Saving...' : 'Save'}
            </button>
            
            {/* Save Message Toast */}
            {saveMessage && (
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                saveMessage.startsWith('✓') 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Projects Button - Return to project selector (Ctrl+O) */}
            <button
              onClick={() => setIsProjectSelectorVisible(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-medium transition-colors"
              title="Open Projects (Ctrl+O)"
            >
              <FolderOpen className="w-4 h-4" />
              Projects
            </button>

            {/* 3D Piece Designer Button - More Visible */}
            <Link
              href="/designer/piece-editor"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              title="3D Object Designer"
            >
              <Shapes className="w-4 h-4" />
              Design Objects
            </Link>

            {/* AI Status Indicator */}
            <button
              onClick={() => setShowAIPanel(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                aiStatus?.available 
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-700' 
                  : 'bg-red-50 hover:bg-red-100 text-red-700'
              }`}
              title={aiStatus?.available ? 'AI Ready' : 'AI Not Available'}
            >
              {aiStatus?.available ? (
                <><Sparkles className="w-4 h-4" /> AI</>
              ) : (
                <><CloudOff className="w-4 h-4" /> AI</>
              )}
            </button>
          </div>
          
        </div>
      </div>

      {/* 3D Viewport Container */}
      <div 
        className="flex-1 relative"
        ref={canvasContainerRef}
        onMouseDown={(e) => {
          // Only start box selection with left click when boxSelectMode is active
          if (e.button === 0 && boxSelectMode) {
            const rect = canvasContainerRef.current?.getBoundingClientRect();
            if (rect) {
              setBoxStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              setIsBoxSelecting(true);
            }
          }
        }}
        onMouseMove={(e) => {
          if (isBoxSelecting && boxStart) {
            const rect = canvasContainerRef.current?.getBoundingClientRect();
            if (rect) {
              setBoxCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
          }
        }}
        onMouseUp={() => {
          if (isBoxSelecting && boxStart && boxCurrent && boxSelectMode) {
            const rect = canvasContainerRef.current?.getBoundingClientRect();
            if (rect) {
              const minX = Math.min(boxStart.x, boxCurrent.x);
              const maxX = Math.max(boxStart.x, boxCurrent.x);
              const minY = Math.min(boxStart.y, boxCurrent.y);
              const maxY = Math.max(boxStart.y, boxCurrent.y);
              
              // Only select if box is at least 20px
              if (maxX - minX > 20 && maxY - minY > 20) {
                const selectedInBox: string[] = [];
                
                // Calculate scene bounds for mapping
                const allX = objects.map(o => o.position.x);
                const allZ = objects.map(o => o.position.z);
                const sceneMinX = Math.min(...allX) - 20;
                const sceneMaxX = Math.max(...allX) + 20;
                const sceneMinZ = Math.min(...allZ) - 20;
                const sceneMaxZ = Math.max(...allZ) + 20;
                const sceneWidth = sceneMaxX - sceneMinX;
                const sceneDepth = sceneMaxZ - sceneMinZ;
                
                objects.forEach(obj => {
                  // Map 3D position to screen position (top-down view approximation)
                  // Center of screen = center of scene
                  const normalizedX = (obj.position.x - sceneMinX) / sceneWidth;
                  const normalizedZ = (obj.position.z - sceneMinZ) / sceneDepth;
                  
                  const screenX = normalizedX * rect.width;
                  const screenY = normalizedZ * rect.height;
                  
                  // Check if in selection box
                  if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
                    selectedInBox.push(obj.id);
                  }
                });
                
                if (selectedInBox.length > 0) {
                  setSelectedIds(selectedInBox);
                }
              }
            }
          }
          setIsBoxSelecting(false);
          setBoxStart(null);
          setBoxCurrent(null);
        }}
        onMouseLeave={() => {
          setIsBoxSelecting(false);
          setBoxStart(null);
          setBoxCurrent(null);
        }}
      >
        {/* Box Selection Overlay */}
        {isBoxSelecting && boxStart && boxCurrent && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-50"
            style={{
              left: Math.min(boxStart.x, boxCurrent.x),
              top: Math.min(boxStart.y, boxCurrent.y),
              width: Math.abs(boxCurrent.x - boxStart.x),
              height: Math.abs(boxCurrent.y - boxStart.y),
            }}
          />
        )}
        
        {/* 3D Canvas */}
        <Canvas 
          shadows={!lowQuality}
          className="absolute inset-0"
          dpr={lowQuality ? 0.5 : 1}
          gl={{ 
            antialias: !lowQuality,
            powerPreference: lowQuality ? 'low-power' : 'high-performance',
            preserveDrawingBuffer: false, // Évite fuite mémoire
            alpha: false, // Meilleure performance
          }}
          frameloop="demand" // ⚡ CRITIQUE : Render on-demand uniquement
          performance={{ min: 0.5 }} // Throttle automatique si FPS < 30
        >
          <Scene
            objects={objects}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            transformMode={transformMode}
            tool={activeTool}
            onTransformEnd={handleTransformEnd}
            showGrid={showGrid}
            showAxes={showAxes}
            showDistanceX={showDistanceX}
            showDistanceZ={showDistanceZ}
            viewDirection={viewDirection}
            orbitRef={orbitRef}
            cameraLocked={boxSelectMode}
            // Cable routing props
            cableRoutes={cableRoutes}
            cableSelectedSegments={cableSelectedSegments}
            cableSelectedPoints={cableSelectedPoints}
            onCableSegmentClick={(id) => setCableSelectedSegments([id])}
            onCablePointClick={(id) => setCableSelectedPoints([id])}
            showCableDimensions={true}
            showCableLabels={true}
            cableDrawingPoints={cableDrawingPoints}
            cablePreviewPoint={cablePreviewPoint}
            cableSnapPoints={cableSnapPoints}
            cableIsDrawing={cableIsDrawing}
            onFloorClick={handleCableFloorClick}
            showCableRouting={showCableRouting}
            // Nouvelles props pour snap points intelligents
            intelligentSnapPoints={intelligentSnapPoints}
            activeIntelligentSnapPointId={selectedIntelligentSnapPoint?.id || null}
            hoveredSnapPointId={hoveredSnapPointId}
            onIntelligentSnapPointClick={(snapPoint) => {
              // Sélectionner visuellement le point
              setSelectedIntelligentSnapPoint(snapPoint);
              // TRACER LE CÂBLE vers ce point
              if (showCableRouting) {
                handleCableFloorClick(snapPoint.position);
              }
            }}
            filterConnectionTypes={filterConnectionTypes}
            cableZones={cableZones}
            showForbiddenZones={showForbiddenZones}
            showHeightIndicator={true}
            currentCableHeight={currentCableHeight}
          />
        </Canvas>

        {/* Box Select Mode Button */}
        <button
          onClick={() => {
            const newMode = !boxSelectMode;
            setBoxSelectMode(newMode);
            // Force top view when enabling box select mode
            if (newMode) {
              setViewDirection('top');
            }
          }}
          className={`absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-lg transition-all ${
            boxSelectMode 
              ? 'bg-blue-500 text-white ring-2 ring-blue-300' 
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BoxSelect className="w-4 h-4" />
          <span>Sélection Rectangle</span>
          {boxSelectMode && <Lock className="w-3 h-3 ml-1" />}
        </button>
        
        {/* Box Select Instructions */}
        {boxSelectMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Caméra verrouillée - Dessinez un rectangle pour sélectionner
          </div>
        )}

        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          showAxes={showAxes}
          onToggleAxes={() => setShowAxes(!showAxes)}
          showDistanceX={showDistanceX}
          onToggleDistanceX={() => setShowDistanceX(!showDistanceX)}
          showDistanceZ={showDistanceZ}
          onToggleDistanceZ={() => setShowDistanceZ(!showDistanceZ)}
          onOpenLibrary={() => setShowLibrary(true)}
          onExport={handleExport}
          onResetView={() => setViewDirection('perspective')}
          onTopView={() => setViewDirection('top')}
          onZoomIn={() => {
            if (orbitRef.current) {
              const camera = orbitRef.current.object;
              camera.position.multiplyScalar(0.8);
            }
          }}
          onZoomOut={() => {
            if (orbitRef.current) {
              const camera = orbitRef.current.object;
              camera.position.multiplyScalar(1.2);
            }
          }}
          lowQuality={lowQuality}
          onToggleLowQuality={() => setLowQuality(!lowQuality)}
          onExportStep={handleExportStep}
          objectCount={objects.length}
          onCableRouting={() => setShowCableRouting(!showCableRouting)}
          cableRoutingActive={showCableRouting}
        />

        {/* Floating Design Objects Button */}
        <Link
          href="/designer/piece-editor"
          className="absolute top-4 right-4 z-30 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl text-sm font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105"
        >
          <Shapes className="w-5 h-5" />
          <span>Design Objects</span>
        </Link>

      {/* Properties Panel */}
        {selectedObject && (
          <PropertiesPanel
            object={selectedObject}
            onUpdate={handleUpdateObject}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onClose={() => setSelectedId(null)}
          />
        )}
        
        {/* Cable Routing Tool Panel */}
        {showCableRouting && (
          <CableRoutingTool
            routes={cableRoutes}
            onRoutesChange={setCableRoutes}
            snapPoints={cableSnapPoints}
            selectedObjectIds={selectedIds}
            onClose={() => setShowCableRouting(false)}
            objects={objects}
          />
        )}

        {/* Movement Controls - Bottom Left */}
        {selectedIds.length > 0 && (
          <div className="absolute left-4 bottom-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-20">
            <p className="text-[11px] font-medium text-slate-500 mb-2 text-center truncate max-w-[200px]">
              {selectedIds.length === 1 ? (selectedObject?.name || 'Objet') : `${selectedIds.length} objets`}
            </p>
            
            <div className="flex items-center gap-3">
              {/* D-Pad - 10cm increments */}
              <div className="grid grid-cols-3 gap-0.5">
                <div />
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, z: obj.position.z - 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="↑ (10cm)">
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                </button>
                <div />
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, x: obj.position.x - 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="← (10cm)">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center">
                  <Move className="w-4 h-4 text-slate-300" />
                </div>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, x: obj.position.x + 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="→ (10cm)">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
                <div />
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, z: obj.position.z + 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="↓ (10cm)">
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                </button>
                <div />
              </div>
              
              <div className="w-px h-16 bg-slate-200" />
              
              {/* Y + Rotation */}
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, y: obj.position.y + 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="Up (A)">
                  <ArrowUp className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, rotation: { ...obj.rotation, y: obj.rotation.y + Math.PI / 2 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="+90° (S)">
                  <RotateCw className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, y: Math.max(0, obj.position.y - 0.1) } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="Down (Q)">
                  <ArrowDown className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, rotation: { ...obj.rotation, y: obj.rotation.y - Math.PI / 2 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="-90° (E)">
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              
              <div className="w-px h-16 bg-slate-200" />
              
              {/* Actions */}
              <div className="flex flex-col gap-1">
                <button onClick={() => { const newObjs = selectedObjects.map(obj => ({ ...obj, id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, position: { ...obj.position, x: obj.position.x + 2 } })); setObjects(prev => [...prev, ...newObjs]); setSelectedIds(newObjs.map(o => o.id)); }} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors" title="Dup (Ctrl+D)">
                  <Copy className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => { setObjects(prev => prev.filter(obj => !selectedIds.includes(obj.id))); setSelectedIds([]); }} className="w-9 h-9 bg-red-50 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors" title="Del">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Library Drawer */}
      <LibraryDrawer
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onAddObject={handleAddObject}
      />

      {/* Projects Modal - Now shows cloud projects */}
      {showProjects && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                Cloud Projects
              </h3>
              <button onClick={() => setShowProjects(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {dbLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-500">Loading...</span>
                </div>
              ) : dbLayouts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No cloud projects yet</p>
                  <p className="text-sm mt-1">Save your current project to the cloud</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dbLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                        currentLayoutId === layout.id 
                          ? 'border-hearst-green bg-hearst-green/5' 
                          : 'border-slate-200 hover:border-hearst-green/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                          {layout.name}
                          {currentLayoutId === layout.id && (
                            <span className="text-xs bg-hearst-green text-slate-900 px-2 py-0.5 rounded-full">Current</span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {layout.objects?.length || 0} objects • {new Date(layout.updated_at || layout.created_at || '').toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          loadFromDatabase(layout);
                          setShowProjects(false);
                        }}
                        disabled={currentLayoutId === layout.id}
                      >
                        {currentLayoutId === layout.id ? 'Loaded' : 'Open'}
                      </Button>
                      <button 
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                        onClick={() => deleteFromDatabase(layout.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-between">
              <button
                onClick={loadDbLayouts}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Button onClick={() => setShowProjects(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal - Saves to Cloud */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                Save to Cloud
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <Input
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Mining Farm"
              />
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <Database className="w-4 h-4" />
                {objects.length} objects will be saved to Supabase
              </div>
              {currentLayoutId && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-2xl">
                  This will update the existing project in the cloud
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowSaveModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={async () => {
                    await saveToDatabase(false);
                    setShowSaveModal(false);
                  }} 
                  disabled={dbSaving || !projectName.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {dbSaving ? 'Saving...' : currentLayoutId ? 'Update' : 'Save'}
                </Button>
              </div>
              {currentLayoutId && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={async () => {
                    await saveToDatabase(true);
                    setShowSaveModal(false);
                  }}
                  disabled={dbSaving}
                >
                  Save as New Project
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chat - Style Cursor */}
      {showAIPanel && (
        <div className="fixed inset-y-0 right-0 w-[420px] z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header minimal */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="font-semibold text-slate-800">AI Designer</span>
              {objects.length > 0 && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {objects.length} objets
                </span>
              )}
            </div>
            <button 
              onClick={() => setShowAIPanel(false)} 
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {aiChatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">Parle-moi de ton projet</h3>
                <p className="text-sm text-slate-500 max-w-[280px]">
                  Je peux créer, modifier, déplacer ou supprimer des objets. Décris simplement ce que tu veux.
                </p>
                <div className="mt-6 text-xs text-slate-400 space-y-1">
                  <p>&quot;Crée une ferme 10 MW&quot;</p>
                  <p>&quot;Déplace les containers à droite&quot;</p>
                  <p>&quot;Analyse ma scène&quot;</p>
                </div>
              </div>
            ) : (
              <>
                {aiChatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-slate-900 text-white rounded-br-md' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiUserPrompt}
                onChange={(e) => setAiUserPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !aiLoading && aiUserPrompt.trim() && handleAIGenerate()}
                placeholder="Demande quelque chose..."
                className="flex-1 px-4 py-2.5 bg-slate-100 border-0 rounded-full focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm"
                disabled={aiLoading}
                autoFocus
              />
              <button
                onClick={() => handleAIGenerate()}
                disabled={aiLoading || !aiUserPrompt.trim()}
                className="px-4 py-2.5 bg-[#0a0a0f] hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-full transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {aiChatHistory.length > 0 && (
              <button 
                onClick={() => { setAiChatHistory([]); setAiResult(null); }}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Effacer la conversation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Database Panel */}
      {showDbPanel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Cloud Storage</h3>
                  <p className="text-xs text-slate-500">Supabase Database</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={loadDbLayouts}
                  disabled={dbLoading}
                  className="p-2 hover:bg-slate-100 rounded-full"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${dbLoading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowDbPanel(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Current Project Save */}
              <div className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-slate-900">{projectName}</h4>
                    <p className="text-xs text-slate-500">{objects.length} objects • Current project</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => saveToDatabase(false)}
                      disabled={dbSaving}
                    >
                      {dbSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      {currentLayoutId ? 'Update' : 'Save'}
                    </Button>
                    {currentLayoutId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => saveToDatabase(true)}
                        disabled={dbSaving}
                      >
                        Save as New
                      </Button>
                    )}
                  </div>
                </div>
                {lastSaved && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last saved: {lastSaved.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Saved Layouts */}
              <h4 className="font-medium text-slate-700 mb-2">Saved Layouts</h4>
              {dbLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : dbLayouts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No layouts saved yet</p>
                  <p className="text-xs mt-1">Save your current project to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dbLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                        currentLayoutId === layout.id 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 flex items-center gap-2">
                          {layout.name}
                          {currentLayoutId === layout.id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Current</span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {layout.objects?.length || 0} objects • 
                          {layout.status} • 
                          {new Date(layout.updated_at || layout.created_at || '').toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadFromDatabase(layout)}
                          disabled={currentLayoutId === layout.id}
                        >
                          {currentLayoutId === layout.id ? 'Loaded' : 'Open'}
                        </Button>
                        <button 
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                          onClick={() => deleteFromDatabase(layout.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between">
              <div className="text-xs text-slate-500">
                {dbLayouts.length} layout{dbLayouts.length !== 1 ? 's' : ''} in database
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowDbPanel(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Selector Modal - Shows on startup */}
      {showProjectSelector && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-hearst-green to-emerald-400 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">M</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Mining Architect</h2>
                  <p className="text-slate-700">Select a project or create a new design</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* New Project Button */}
              <button
                onClick={() => {
                  setObjects([]);
                  setProjectName('Untitled Project');
                  setCurrentLayoutId(null);
                  setShowProjectSelector(false);
                }}
                className="w-full mb-6 p-6 border-2 border-dashed border-hearst-green/50 rounded-2xl hover:border-hearst-green hover:bg-hearst-green/5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-hearst-green/10 rounded-2xl flex items-center justify-center group-hover:bg-hearst-green/20 transition-colors">
                    <Zap className="w-6 h-6 text-hearst-green" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 text-lg">New Design</h3>
                    <p className="text-sm text-slate-500">Start with an empty canvas</p>
                  </div>
                </div>
              </button>

              {/* Existing Projects */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Cloud Projects ({dbLayouts.length})
                </h3>
                
                {dbLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-slate-500">Loading projects...</span>
                  </div>
                ) : dbLayouts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Cloud className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No projects saved yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {dbLayouts.map(layout => (
                      <button
                        key={layout.id}
                        onClick={() => {
                          loadFromDatabase(layout);
                          setShowProjectSelector(false);
                        }}
                        className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-hearst-green/10 border border-slate-200 hover:border-hearst-green/30 rounded-2xl transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                          <Database className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{layout.name}</h4>
                          <p className="text-xs text-slate-500">
                            {layout.objects?.length || 0} objects • 
                            {layout.status} • 
                            Updated {new Date(layout.updated_at || layout.created_at || '').toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={loadDbLayouts}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Button variant="ghost" onClick={() => setShowProjectSelector(false)}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
