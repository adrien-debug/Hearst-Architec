'use client';

import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CableRoute, CableSegment, CablePoint } from './cable-routing-tool';
import type { WorldSnapPoint, ConnectionType } from './cable-snap-points';
import type { CableZone } from './cable-zone-manager';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED MATERIALS
// ═══════════════════════════════════════════════════════════════════════════

const cableMaterials = {
  galvanizedSteel: new THREE.MeshStandardMaterial({ color: '#9ca3af', metalness: 0.75, roughness: 0.25 }),
  hotDipGalv: new THREE.MeshStandardMaterial({ color: '#a1a1aa', metalness: 0.8, roughness: 0.2 }),
  wireMesh: new THREE.MeshStandardMaterial({ color: '#71717a', metalness: 0.7, roughness: 0.3 }),
  cableBlack: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.2, roughness: 0.8 }),
  cableRed: new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.2, roughness: 0.8 }),
  cableBlue: new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.2, roughness: 0.8 }),
  cableGreen: new THREE.MeshStandardMaterial({ color: '#16a34a', metalness: 0.2, roughness: 0.8 }),
  selected: new THREE.MeshStandardMaterial({ color: '#22c55e', metalness: 0.5, roughness: 0.4, emissive: '#22c55e', emissiveIntensity: 0.3 }),
  preview: new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.6 }),
};

// ═══════════════════════════════════════════════════════════════════════════
// CABLE TRAY SEGMENT 3D
// ═══════════════════════════════════════════════════════════════════════════

const CableTraySegment3D = memo(function CableTraySegment3D({
  segment,
  startPoint,
  endPoint,
  isSelected,
  showDimensions,
  onClick,
}: {
  segment: CableSegment;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  isSelected: boolean;
  showDimensions: boolean;
  onClick?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate segment properties
  const { length, midPoint, rotation, direction } = useMemo(() => {
    const dir = endPoint.clone().sub(startPoint);
    const len = dir.length();
    const mid = startPoint.clone().add(endPoint).multiplyScalar(0.5);
    const angle = Math.atan2(dir.z, dir.x);
    
    return {
      length: len,
      midPoint: mid,
      rotation: new THREE.Euler(0, -angle, 0),
      direction: dir.normalize(),
    };
  }, [startPoint, endPoint]);
  
  const w = segment.width / 1000;  // Convert mm to meters
  const h = segment.height / 1000;
  const railThickness = 0.003;
  const rungCount = Math.max(2, Math.floor(length / 0.25));
  
  const rungIndices = useMemo(() => 
    Array.from({ length: rungCount }, (_, i) => i), 
    [rungCount]
  );
  
  // Cable count based on width
  const cableCount = Math.min(segment.cableCount, Math.floor((w - 0.02) / 0.025));
  const cableSpacing = (w - 0.04) / (cableCount + 1);
  
  const getCableMaterial = (index: number) => {
    const types = segment.cableTypes;
    if (types.includes('power')) {
      return index % 3 === 0 ? cableMaterials.cableRed 
           : index % 3 === 1 ? cableMaterials.cableBlack 
           : cableMaterials.cableBlue;
    }
    if (types.includes('data')) {
      return cableMaterials.cableBlue;
    }
    return cableMaterials.cableBlack;
  };
  
  if (!segment.visible) return null;
  
  return (
    <group 
      ref={groupRef}
      position={midPoint.toArray()}
      rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      {/* LADDER TRAY TYPE */}
      {segment.type === 'ladder' && (
        <>
          {/* Side rails */}
          {[-1, 1].map((side) => (
            <group key={`rail-${side}`} position={[0, 0, side * (w/2 - railThickness/2)]}>
              {/* Vertical web */}
              <mesh castShadow>
                <boxGeometry args={[length, h, railThickness]} />
                <primitive object={isSelected ? cableMaterials.selected : cableMaterials.hotDipGalv} attach="material" />
              </mesh>
              {/* Top flange */}
              <mesh position={[0, h/2 - railThickness/2, -side * 0.008]} castShadow>
                <boxGeometry args={[length, railThickness, 0.02]} />
                <primitive object={isSelected ? cableMaterials.selected : cableMaterials.hotDipGalv} attach="material" />
              </mesh>
              {/* Bottom flange */}
              <mesh position={[0, -h/2 + railThickness/2, -side * 0.008]} castShadow>
                <boxGeometry args={[length, railThickness, 0.02]} />
                <primitive object={isSelected ? cableMaterials.selected : cableMaterials.hotDipGalv} attach="material" />
              </mesh>
            </group>
          ))}
          
          {/* Cross rungs */}
          {rungIndices.map((i) => (
            <mesh 
              key={`rung-${i}`}
              position={[-length/2 + (length / (rungCount + 1)) * (i + 1), -h/2 + 0.015, 0]}
              castShadow
            >
              <boxGeometry args={[0.03, 0.006, w - 0.01]} />
              <primitive object={isSelected ? cableMaterials.selected : cableMaterials.hotDipGalv} attach="material" />
            </mesh>
          ))}
          
          {/* Cables */}
          {Array.from({ length: cableCount }).map((_, i) => (
            <mesh 
              key={`cable-${i}`}
              position={[0, -h/2 + 0.025 + (i % 2) * 0.01, -w/2 + 0.02 + cableSpacing * (i + 1)]}
              castShadow
            >
              <boxGeometry args={[length * 0.98, 0.018, 0.018]} />
              <primitive object={getCableMaterial(i)} attach="material" />
            </mesh>
          ))}
        </>
      )}
      
      {/* WIRE MESH TYPE */}
      {segment.type === 'wire-mesh' && (
        <>
          {/* Side rails */}
          {[-1, 1].map((side) => (
            <mesh 
              key={`side-${side}`}
              position={[0, 0, side * w/2]}
              castShadow
            >
              <boxGeometry args={[length, h, 0.008]} />
              <primitive object={isSelected ? cableMaterials.selected : cableMaterials.wireMesh} attach="material" />
            </mesh>
          ))}
          
          {/* Wire mesh bottom (simplified as grid) */}
          <mesh position={[0, -h/2 + 0.002, 0]}>
            <boxGeometry args={[length, 0.004, w]} />
            <meshStandardMaterial color="#71717a" metalness={0.6} roughness={0.4} wireframe />
          </mesh>
          
          {/* Data cable bundle */}
          <mesh position={[0, -h/2 + 0.02, 0]} castShadow>
            <boxGeometry args={[length * 0.95, w * 0.4, w * 0.5]} />
            <primitive object={cableMaterials.cableBlue} attach="material" />
          </mesh>
        </>
      )}
      
      {/* CONDUIT TYPE */}
      {segment.type === 'conduit' && (
        <mesh rotation={[0, 0, Math.PI/2]} castShadow>
          <cylinderGeometry args={[w/2, w/2, length, 16]} />
          <primitive object={isSelected ? cableMaterials.selected : cableMaterials.galvanizedSteel} attach="material" />
        </mesh>
      )}
      
      {/* BUSBAR TYPE */}
      {segment.type === 'busbar' && (
        <group>
          {/* Busbar housing */}
          <mesh castShadow>
            <boxGeometry args={[length, h, w]} />
            <meshStandardMaterial 
              color={isSelected ? '#22c55e' : '#b45309'} 
              metalness={0.7} 
              roughness={0.3}
              emissive={isSelected ? '#22c55e' : undefined}
              emissiveIntensity={isSelected ? 0.2 : 0}
            />
          </mesh>
          {/* Phase indicators */}
          {[-w/3, 0, w/3].map((zPos, i) => (
            <mesh key={`phase-${i}`} position={[0, h/2 + 0.01, zPos]}>
              <boxGeometry args={[length * 0.95, 0.01, w/5]} />
              <meshStandardMaterial 
                color={i === 0 ? '#dc2626' : i === 1 ? '#eab308' : '#3b82f6'}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Dimension label */}
      {showDimensions && (
        <Html
          position={[0, h/2 + 0.1, 0]}
          center
          distanceFactor={10}
        >
          <div className="bg-slate-900/90 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
            {length.toFixed(2)}m
          </div>
        </Html>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// CABLE POINT 3D
// ═══════════════════════════════════════════════════════════════════════════

const CablePoint3D = memo(function CablePoint3D({
  point,
  isSelected,
  isHovered,
  showLabels,
  onClick,
}: {
  point: CablePoint;
  isSelected: boolean;
  isHovered?: boolean;
  showLabels: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Animate selected/hovered points
  useFrame((_, delta) => {
    if (meshRef.current && (isSelected || isHovered)) {
      meshRef.current.rotation.y += delta * 2;
    }
  });
  
  const getPointColor = () => {
    if (isSelected) return '#22c55e';
    if (isHovered) return '#3b82f6';
    
    switch (point.type) {
      case 'start': return '#22c55e';
      case 'end': return '#ef4444';
      case 'junction': return '#f59e0b';
      case 'branch': return '#8b5cf6';
      default: return '#6b7280';
    }
  };
  
  const size = isSelected ? 0.15 : isHovered ? 0.12 : 0.08;
  
  return (
    <group position={point.position.toArray()}>
      {/* Point marker */}
      <mesh 
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        castShadow
      >
        {point.type === 'junction' ? (
          <octahedronGeometry args={[size, 0]} />
        ) : (
          <sphereGeometry args={[size, 16, 16]} />
        )}
        <meshStandardMaterial 
          color={getPointColor()} 
          metalness={0.4} 
          roughness={0.6}
          emissive={getPointColor()}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* Ground marker (ring) */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -point.position.y + 0.01, 0]}>
        <ringGeometry args={[size * 0.8, size * 1.2, 16]} />
        <meshStandardMaterial 
          color={getPointColor()} 
          transparent 
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Label */}
      {showLabels && (
        <Html
          position={[0, size + 0.1, 0]}
          center
          distanceFactor={8}
        >
          <div className="bg-slate-900/90 text-white text-[9px] px-1 py-0.5 rounded whitespace-nowrap">
            {point.type.charAt(0).toUpperCase() + point.type.slice(1)}
          </div>
        </Html>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// DRAWING PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

const DrawingPreview = memo(function DrawingPreview({
  points,
  previewPoint,
  trayWidth,
  trayHeight,
}: {
  points: THREE.Vector3[];
  previewPoint: THREE.Vector3 | null;
  trayWidth: number;
  trayHeight: number;
}) {
  // Build path with preview
  const pathPoints = useMemo(() => {
    const allPoints = [...points];
    if (previewPoint) {
      allPoints.push(previewPoint);
    }
    return allPoints.map(p => p.toArray() as [number, number, number]);
  }, [points, previewPoint]);
  
  if (pathPoints.length < 1) return null;
  
  return (
    <group>
      {/* Preview line */}
      {pathPoints.length >= 2 && (
        <Line
          points={pathPoints}
          color="#3b82f6"
          lineWidth={3}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      )}
      
      {/* Preview points */}
      {points.map((point, i) => (
        <mesh key={i} position={point.toArray()}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <primitive object={cableMaterials.preview} attach="material" />
        </mesh>
      ))}
      
      {/* Current preview point (cursor) */}
      {previewPoint && (
        <group position={previewPoint.toArray()}>
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial 
              color="#3b82f6" 
              transparent 
              opacity={0.8}
              emissive="#3b82f6"
              emissiveIntensity={0.5}
            />
          </mesh>
          {/* Crosshair */}
          {[0, Math.PI/2].map((rot, i) => (
            <mesh key={i} rotation={[0, rot, 0]}>
              <boxGeometry args={[0.4, 0.01, 0.01]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SNAP POINTS VISUALIZATION (Legacy - simple)
// ═══════════════════════════════════════════════════════════════════════════

const SnapPointsVisualization = memo(function SnapPointsVisualization({
  snapPoints,
  activeSnapPoint,
}: {
  snapPoints: Array<{ position: THREE.Vector3; objectId: string; objectName: string; type: string }>;
  activeSnapPoint: THREE.Vector3 | null;
}) {
  return (
    <group>
      {snapPoints.map((sp, i) => {
        const isActive = activeSnapPoint && sp.position.distanceTo(activeSnapPoint) < 0.01;
        
        return (
          <mesh 
            key={i} 
            position={sp.position.toArray()}
          >
            <octahedronGeometry args={[isActive ? 0.15 : 0.08, 0]} />
            <meshStandardMaterial 
              color={isActive ? '#22c55e' : '#f59e0b'}
              transparent
              opacity={isActive ? 1 : 0.6}
              emissive={isActive ? '#22c55e' : '#f59e0b'}
              emissiveIntensity={isActive ? 0.5 : 0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// INTELLIGENT SNAP POINTS VISUALIZATION (Par type de connexion)
// ═══════════════════════════════════════════════════════════════════════════

// Couleurs par type de connexion
const CONNECTION_TYPE_COLORS: Record<ConnectionType, string> = {
  'power-ht': '#dc2626',     // Rouge - Haute tension
  'power-bt': '#f97316',     // Orange - Basse tension
  'power-input': '#eab308',  // Jaune - Entrée puissance
  'power-output': '#84cc16', // Lime - Sortie puissance
  'earth': '#22c55e',        // Vert - Terre
  'data': '#3b82f6',         // Bleu - Data
  'control': '#8b5cf6',      // Violet - Contrôle
  'cooling-in': '#06b6d4',   // Cyan - Refroidissement entrée
  'cooling-out': '#0891b2',  // Cyan foncé - Refroidissement sortie
};

const IntelligentSnapPoint3D = memo(function IntelligentSnapPoint3D({
  snapPoint,
  isActive,
  isHovered,
  showLabels,
  onClick,
}: {
  snapPoint: WorldSnapPoint;
  isActive: boolean;
  isHovered: boolean;
  showLabels: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Group>(null);
  
  // Animation pour les points actifs/hover
  useFrame((_, delta) => {
    if (meshRef.current && (isActive || isHovered)) {
      meshRef.current.rotation.y += delta * 3;
    }
  });
  
  const color = CONNECTION_TYPE_COLORS[snapPoint.connectionType] || '#6b7280';
  const size = isActive ? 0.18 : isHovered ? 0.14 : 0.10;
  const isFull = snapPoint.currentCables >= snapPoint.maxCables;
  
  // Forme selon type
  const getShape = () => {
    switch (snapPoint.connectionType) {
      case 'power-ht':
      case 'power-bt':
        return <boxGeometry args={[size, size, size]} />;
      case 'earth':
        return <coneGeometry args={[size * 0.7, size, 4]} />;
      case 'data':
        return <dodecahedronGeometry args={[size * 0.8]} />;
      default:
        return <octahedronGeometry args={[size * 0.9]} />;
    }
  };
  
  return (
    <group position={snapPoint.position.toArray()}>
      {/* Point principal */}
      <mesh 
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        castShadow
      >
        {getShape()}
        <meshStandardMaterial 
          color={isFull ? '#6b7280' : color}
          metalness={0.4}
          roughness={0.5}
          emissive={isActive ? color : undefined}
          emissiveIntensity={isActive ? 0.6 : 0}
          transparent={isFull}
          opacity={isFull ? 0.4 : 1}
        />
      </mesh>
      
      {/* Flèche de direction (si priorité 1) */}
      {snapPoint.priority === 1 && (
        <group ref={arrowRef}>
          <mesh 
            position={snapPoint.direction.clone().multiplyScalar(size + 0.08).toArray()}
            rotation={[
              Math.atan2(
                Math.sqrt(snapPoint.direction.x ** 2 + snapPoint.direction.z ** 2),
                snapPoint.direction.y
              ),
              Math.atan2(snapPoint.direction.x, snapPoint.direction.z),
              0
            ]}
          >
            <coneGeometry args={[0.04, 0.1, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      )}
      
      {/* Anneau de capacité */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[size * 1.1, size * 1.4, 16]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={isActive ? 0.8 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Label avec info de capacité */}
      {showLabels && (isActive || isHovered) && (
        <Html
          position={[0, size + 0.15, 0]}
          center
          distanceFactor={8}
        >
          <div className="bg-slate-900/95 text-white text-[10px] px-2 py-1 rounded-lg shadow-lg whitespace-nowrap border border-slate-700">
            <div className="font-semibold">{snapPoint.label}</div>
            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{snapPoint.connectionType}</span>
              <span>•</span>
              <span>{snapPoint.currentCables}/{snapPoint.maxCables}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});

const IntelligentSnapPointsVisualization = memo(function IntelligentSnapPointsVisualization({
  snapPoints,
  activeSnapPointId,
  hoveredSnapPointId,
  showLabels = true,
  filterTypes,
  onSnapPointClick,
}: {
  snapPoints: WorldSnapPoint[];
  activeSnapPointId: string | null;
  hoveredSnapPointId: string | null;
  showLabels?: boolean;
  filterTypes?: ConnectionType[];
  onSnapPointClick?: (snapPoint: WorldSnapPoint) => void;
}) {
  const filteredPoints = useMemo(() => {
    if (!filterTypes || filterTypes.length === 0) return snapPoints;
    return snapPoints.filter(sp => filterTypes.includes(sp.connectionType));
  }, [snapPoints, filterTypes]);

  return (
    <group>
      {filteredPoints.map(sp => (
        <IntelligentSnapPoint3D
          key={sp.id}
          snapPoint={sp}
          isActive={sp.id === activeSnapPointId}
          isHovered={sp.id === hoveredSnapPointId}
          showLabels={showLabels}
          onClick={() => onSnapPointClick?.(sp)}
        />
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// FORBIDDEN ZONES VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const ForbiddenZoneVisualization = memo(function ForbiddenZoneVisualization({
  zone,
  showLabel = false,
}: {
  zone: CableZone;
  showLabel?: boolean;
}) {
  if (zone.type !== 'forbidden') return null;
  
  const center = new THREE.Vector3();
  zone.bounds.getCenter(center);
  const size = new THREE.Vector3();
  zone.bounds.getSize(size);
  
  return (
    <group position={center.toArray()}>
      {/* Zone semi-transparente rouge */}
      <mesh>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial 
          color="#ef4444"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Bordure */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size.x, size.y, size.z)]} />
        <lineBasicMaterial color="#ef4444" transparent opacity={0.5} />
      </lineSegments>
      
      {/* Label */}
      {showLabel && zone.reason && (
        <Html position={[0, size.y / 2 + 0.2, 0]} center distanceFactor={12}>
          <div className="bg-red-500/90 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap">
            ⚠️ {zone.reason}
          </div>
        </Html>
      )}
    </group>
  );
});

const ForbiddenZonesVisualization = memo(function ForbiddenZonesVisualization({
  zones,
  showLabels = false,
}: {
  zones: CableZone[];
  showLabels?: boolean;
}) {
  const forbiddenZones = zones.filter(z => z.type === 'forbidden');
  
  return (
    <group>
      {forbiddenZones.map(zone => (
        <ForbiddenZoneVisualization 
          key={zone.id} 
          zone={zone} 
          showLabel={showLabels}
        />
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// HEIGHT INDICATOR (Preview de la hauteur de câble)
// ═══════════════════════════════════════════════════════════════════════════

const HeightIndicator = memo(function HeightIndicator({
  position,
  height,
  color = '#3b82f6',
}: {
  position: THREE.Vector3;
  height: number;
  color?: string;
}) {
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Ligne verticale pointillée */}
      <Line
        points={[[0, 0.01, 0], [0, height, 0]]}
        color={color}
        lineWidth={1}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      
      {/* Marqueur au sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.15, 0.2, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Marqueur en hauteur */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      
      {/* Label hauteur */}
      <Html position={[0.15, height / 2, 0]} center distanceFactor={10}>
        <div className="bg-slate-800/90 text-white text-[10px] px-1.5 py-0.5 rounded">
          {height.toFixed(2)}m
        </div>
      </Html>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CABLE SCENE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface CableSceneProps {
  routes: CableRoute[];
  selectedSegmentIds: string[];
  selectedPointIds: string[];
  onSegmentClick: (segmentId: string) => void;
  onPointClick: (pointId: string) => void;
  showDimensions: boolean;
  showLabels: boolean;
  drawingPoints: THREE.Vector3[];
  previewPoint: THREE.Vector3 | null;
  snapPoints: Array<{ position: THREE.Vector3; objectId: string; objectName: string; type: string }>;
  activeSnapPoint: THREE.Vector3 | null;
  isDrawing: boolean;
  defaultWidth: number;
  defaultHeight: number;
  // Nouvelles props pour snap points intelligents
  intelligentSnapPoints?: WorldSnapPoint[];
  activeIntelligentSnapPointId?: string | null;
  hoveredSnapPointId?: string | null;
  onIntelligentSnapPointClick?: (snapPoint: WorldSnapPoint) => void;
  filterConnectionTypes?: ConnectionType[];
  // Zones
  cableZones?: CableZone[];
  showForbiddenZones?: boolean;
  // Indicateur de hauteur
  showHeightIndicator?: boolean;
  currentHeight?: number;
}

const CableScene = memo(function CableScene({
  routes,
  selectedSegmentIds,
  selectedPointIds,
  onSegmentClick,
  onPointClick,
  showDimensions,
  showLabels,
  drawingPoints,
  previewPoint,
  snapPoints,
  activeSnapPoint,
  isDrawing,
  defaultWidth,
  defaultHeight,
  // Nouvelles props
  intelligentSnapPoints = [],
  activeIntelligentSnapPointId = null,
  hoveredSnapPointId = null,
  onIntelligentSnapPointClick,
  filterConnectionTypes,
  cableZones = [],
  showForbiddenZones = false,
  showHeightIndicator = false,
  currentHeight = 3.5,
}: CableSceneProps) {
  // Build point lookup map
  const pointMap = useMemo(() => {
    const map = new Map<string, CablePoint>();
    routes.forEach(route => {
      route.points.forEach(point => {
        map.set(point.id, point);
      });
    });
    return map;
  }, [routes]);
  
  return (
    <group>
      {/* Render all routes */}
      {routes.map(route => (
        <group key={route.id} visible={route.visible}>
          {/* Segments */}
          {route.segments.map(segment => {
            const startPoint = pointMap.get(segment.startPointId);
            const endPoint = pointMap.get(segment.endPointId);
            
            if (!startPoint || !endPoint) return null;
            
            return (
              <CableTraySegment3D
                key={segment.id}
                segment={segment}
                startPoint={startPoint.position}
                endPoint={endPoint.position}
                isSelected={selectedSegmentIds.includes(segment.id)}
                showDimensions={showDimensions}
                onClick={() => onSegmentClick(segment.id)}
              />
            );
          })}
          
          {/* Points */}
          {route.points.map(point => (
            <CablePoint3D
              key={point.id}
              point={point}
              isSelected={selectedPointIds.includes(point.id)}
              showLabels={showLabels}
              onClick={() => onPointClick(point.id)}
            />
          ))}
        </group>
      ))}
      
      {/* Drawing preview */}
      {isDrawing && (
        <DrawingPreview
          points={drawingPoints}
          previewPoint={previewPoint}
          trayWidth={defaultWidth}
          trayHeight={defaultHeight}
        />
      )}
      
      {/* Legacy snap points (compatibilité) */}
      {isDrawing && snapPoints.length > 0 && intelligentSnapPoints.length === 0 && (
        <SnapPointsVisualization
          snapPoints={snapPoints}
          activeSnapPoint={activeSnapPoint}
        />
      )}
      
      {/* Intelligent snap points (nouveau système) */}
      {isDrawing && intelligentSnapPoints.length > 0 && (
        <IntelligentSnapPointsVisualization
          snapPoints={intelligentSnapPoints}
          activeSnapPointId={activeIntelligentSnapPointId}
          hoveredSnapPointId={hoveredSnapPointId}
          showLabels={showLabels}
          filterTypes={filterConnectionTypes}
          onSnapPointClick={onIntelligentSnapPointClick}
        />
      )}
      
      {/* Forbidden zones */}
      {showForbiddenZones && cableZones.length > 0 && (
        <ForbiddenZonesVisualization
          zones={cableZones}
          showLabels={showLabels}
        />
      )}
      
      {/* Height indicator on preview point */}
      {isDrawing && showHeightIndicator && previewPoint && (
        <HeightIndicator
          position={previewPoint}
          height={currentHeight}
        />
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { 
  CableScene, 
  CableTraySegment3D, 
  CablePoint3D, 
  DrawingPreview, 
  SnapPointsVisualization,
  IntelligentSnapPointsVisualization,
  IntelligentSnapPoint3D,
  ForbiddenZonesVisualization,
  HeightIndicator,
  CONNECTION_TYPE_COLORS,
};
export type { CableSceneProps };
export default CableScene;
