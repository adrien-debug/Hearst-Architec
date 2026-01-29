'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
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
  Copy
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

// Measurement Line
function MeasurementLine({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const distance = start.distanceTo(end);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  
  return (
    <group>
      <Line
        points={[start, end]}
        color="#ef4444"
        lineWidth={2}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      <Html position={midPoint} center>
        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
          {(distance * 1000).toFixed(0)} mm ({distance.toFixed(2)} m)
        </div>
      </Html>
    </group>
  );
}

// Center Guides - Simple axes at origin
function CenterGuides() {
  return (
    <group>
      {/* Axe X (rouge) - ligne centrale de symétrie */}
      <Line
        points={[[-80, 0.08, 0], [80, 0.08, 0]]}
        color="#dc2626"
        lineWidth={3}
      />
      
      {/* Axe Z (vert) - ligne centrale de symétrie */}
      <Line
        points={[[0, 0.08, -80], [0, 0.08, 80]]}
        color="#16a34a"
        lineWidth={3}
      />
      
      {/* Croix centrale à l'origine */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}

// Alignment Lines - Dynamic alignment guides based on objects
function AlignmentLines({ objects }: { objects: Object3D[] }) {
  // Détecter les lignes d'alignement (objets avec même X ou Z)
  const containers = objects.filter(o => 
    o.type.toLowerCase().includes('container') || 
    o.name.toLowerCase().includes('hd5') ||
    o.name.toLowerCase().includes('antspace')
  );
  
  if (containers.length < 2) return null;
  
  // Trouver les rangées (groupes d'objets avec X similaire)
  const xPositions = new Map<number, Object3D[]>();
  const zPositions = new Map<number, Object3D[]>();
  
  containers.forEach(obj => {
    // Arrondir à 0.5m pour grouper
    const roundedX = Math.round(obj.position.x * 2) / 2;
    const roundedZ = Math.round(obj.position.z * 2) / 2;
    
    if (!xPositions.has(roundedX)) xPositions.set(roundedX, []);
    if (!zPositions.has(roundedZ)) zPositions.set(roundedZ, []);
    
    xPositions.get(roundedX)!.push(obj);
    zPositions.get(roundedZ)!.push(obj);
  });
  
  // Filtrer pour n'avoir que les vraies rangées (2+ objets)
  const xRows = Array.from(xPositions.entries()).filter(([, objs]) => objs.length >= 2);
  const zRows = Array.from(zPositions.entries()).filter(([, objs]) => objs.length >= 2);
  
  // Calculer l'étendue de la scène
  const allX = containers.map(o => o.position.x);
  const allZ = containers.map(o => o.position.z);
  const minX = Math.min(...allX) - 10;
  const maxX = Math.max(...allX) + 10;
  const minZ = Math.min(...allZ) - 10;
  const maxZ = Math.max(...allZ) + 10;
  
  return (
    <group>
      {/* Lignes d'alignement X (bleu clair) - pour chaque rangée verticale */}
      {xRows.map(([x], idx) => (
        <Line
          key={`x-align-${idx}`}
          points={[[x, 0.06, minZ], [x, 0.06, maxZ]]}
          color="#3b82f6"
          lineWidth={2}
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
      ))}
      
      {/* Lignes d'alignement Z (cyan) - pour chaque rangée horizontale */}
      {zRows.map(([z], idx) => (
        <Line
          key={`z-align-${idx}`}
          points={[[minX, 0.06, z], [maxX, 0.06, z]]}
          color="#06b6d4"
          lineWidth={2}
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
      ))}
      
      {/* Marqueurs aux intersections */}
      {xRows.flatMap(([x], i) => 
        zRows.map(([z], j) => (
          <mesh key={`marker-${i}-${j}`} position={[x, 0.07, z]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.3, 0.5, 16]} />
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
          </mesh>
        ))
      )}
    </group>
  );
}

// Dimension Label with Hover Tooltip
function DimensionLabel({ 
  position, 
  distance, 
  axis, 
  obj1Name, 
  obj2Name,
  ruleInfo
}: { 
  position: [number, number, number]; 
  distance: number; 
  axis: 'x' | 'z';
  obj1Name: string;
  obj2Name: string;
  ruleInfo: { rule: string; description: string; status: 'ok' | 'warning' | 'error' };
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  
  const handleMouseEnter = () => {
    const timer = setTimeout(() => setShowTooltip(true), 1500); // 1.5s delay
    setHoverTimer(timer);
  };
  
  const handleMouseLeave = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setShowTooltip(false);
  };
  
  const statusColors = {
    ok: 'bg-green-500 border-green-400',
    warning: 'bg-amber-500 border-amber-400',
    error: 'bg-red-500 border-red-400'
  };
  
  const statusIcons = {
    ok: '✓',
    warning: '⚠',
    error: '✗'
  };
  
  return (
    <Html position={position} center>
      <div 
        className="relative cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`${statusColors[ruleInfo.status]} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap font-bold shadow-lg border-2 transition-transform hover:scale-110`}>
          {distance.toFixed(1)}m {statusIcons[ruleInfo.status]}
        </div>
        
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fadeIn">
            <div className="bg-slate-900 text-white text-xs rounded-lg shadow-2xl border border-slate-600 p-3 min-w-[220px]">
              <div className="font-bold text-hearst-green mb-2 text-sm">
                {axis === 'x' ? '↔ Espacement horizontal' : '↕ Espacement vertical'}
              </div>
              
              <div className="space-y-1.5 text-slate-300">
                <p><span className="text-white">Distance:</span> {distance.toFixed(2)}m ({(distance * 1000).toFixed(0)}mm)</p>
                <p><span className="text-white">Entre:</span></p>
                <p className="pl-2 text-blue-400">• {obj1Name}</p>
                <p className="pl-2 text-blue-400">• {obj2Name}</p>
              </div>
              
              <div className={`mt-2 pt-2 border-t border-slate-700 ${
                ruleInfo.status === 'ok' ? 'text-green-400' : 
                ruleInfo.status === 'warning' ? 'text-amber-400' : 'text-red-400'
              }`}>
                <p className="font-semibold">{statusIcons[ruleInfo.status]} {ruleInfo.rule}</p>
                <p className="text-slate-400 text-[10px] mt-1">{ruleInfo.description}</p>
              </div>
              
              {/* Arrow pointing down */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-900"></div>
            </div>
          </div>
        )}
      </div>
    </Html>
  );
}

// Floor Dimensions - Shows total footprint, spacing between objects
function FloorDimensions({ objects }: { objects: Object3D[] }) {
  if (objects.length === 0) return null;
  
  const lineY = 0.5; // Height above ground for visibility
  
  // Calculate bounding box of all objects
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  objects.forEach(obj => {
    const w = (obj.dimensions.width / 1000) * obj.scale.x;
    const d = (obj.dimensions.depth / 1000) * obj.scale.z;
    minX = Math.min(minX, obj.position.x - w/2);
    maxX = Math.max(maxX, obj.position.x + w/2);
    minZ = Math.min(minZ, obj.position.z - d/2);
    maxZ = Math.max(maxZ, obj.position.z + d/2);
  });
  
  const totalWidth = maxX - minX;
  const totalDepth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  
  // Get rule info based on distance and object types
  const getRuleInfo = (distance: number, obj1: Object3D, obj2: Object3D): { rule: string; description: string; status: 'ok' | 'warning' | 'error' } => {
    const type1 = obj1.type.toLowerCase();
    const type2 = obj2.type.toLowerCase();
    
    // Aisle/maintenance access rules
    if (distance >= 15) {
      return {
        rule: 'Allée principale (≥15m)',
        description: 'Conforme aux normes de circulation des véhicules lourds et accès pompiers',
        status: 'ok'
      };
    }
    
    // Container-to-container spacing
    if ((type1.includes('container') && type2.includes('container')) || 
        (type1.includes('cooling') && type2.includes('cooling')) ||
        (type1.includes('antspace') && type2.includes('antspace'))) {
      if (distance >= 3.9) { // 4m with tolerance
        return {
          rule: 'Espacement containers (≥4m)',
          description: 'Conforme: permet accès maintenance et ventilation adéquate',
          status: 'ok'
        };
      } else if (distance >= 2) {
        return {
          rule: 'Espacement réduit (2-4m)',
          description: 'Attention: accès maintenance limité, vérifier ventilation',
          status: 'warning'
        };
      } else {
        return {
          rule: 'Espacement insuffisant (<2m)',
          description: 'Non conforme: risque thermique, accès impossible',
          status: 'error'
        };
      }
    }
    
    // Transformer spacing
    if (type1.includes('transformer') || type2.includes('transformer')) {
      if (distance >= 5) {
        return {
          rule: 'Distance sécurité transfo (≥5m)',
          description: 'Conforme: zone de sécurité électrique respectée',
          status: 'ok'
        };
      } else if (distance >= 3) {
        return {
          rule: 'Distance transfo limite (3-5m)',
          description: 'Attention: vérifier normes électriques locales',
          status: 'warning'
        };
      } else {
        return {
          rule: 'Distance transfo critique (<3m)',
          description: 'Non conforme: risque électrique, augmenter distance',
          status: 'error'
        };
      }
    }
    
    // Default spacing
    if (distance >= 3) {
      return {
        rule: 'Espacement standard (≥3m)',
        description: 'Conforme aux recommandations générales',
        status: 'ok'
      };
    } else if (distance >= 1) {
      return {
        rule: 'Espacement minimal (1-3m)',
        description: 'Acceptable mais limité pour maintenance',
        status: 'warning'
      };
    }
    
    return {
      rule: 'Espacement très réduit (<1m)',
      description: 'Vérifier si intentionnel (objets adjacents)',
      status: 'warning'
    };
  };
  
  // Find all unique spacings between objects
  const spacings: { 
    start: THREE.Vector3; 
    end: THREE.Vector3; 
    distance: number; 
    axis: 'x' | 'z';
    obj1: Object3D;
    obj2: Object3D;
  }[] = [];
  
  // Check all pairs for spacing
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const obj1 = objects[i];
      const obj2 = objects[j];
      
      const w1 = (obj1.dimensions.width / 1000) * obj1.scale.x;
      const w2 = (obj2.dimensions.width / 1000) * obj2.scale.x;
      const d1 = (obj1.dimensions.depth / 1000) * obj1.scale.z;
      const d2 = (obj2.dimensions.depth / 1000) * obj2.scale.z;
      
      // Check if aligned in Z (same row) - X spacing
      const zOverlap = !(obj1.position.z + d1/2 < obj2.position.z - d2/2 || obj2.position.z + d2/2 < obj1.position.z - d1/2);
      
      if (zOverlap) {
        const leftObj = obj1.position.x < obj2.position.x ? obj1 : obj2;
        const rightObj = obj1.position.x < obj2.position.x ? obj2 : obj1;
        const leftW = leftObj === obj1 ? w1 : w2;
        const rightW = rightObj === obj1 ? w1 : w2;
        
        const edge1 = leftObj.position.x + leftW/2;
        const edge2 = rightObj.position.x - rightW/2;
        const gap = edge2 - edge1;
        
        if (gap > 0.2) {
          const z = (obj1.position.z + obj2.position.z) / 2;
          spacings.push({
            start: new THREE.Vector3(edge1, lineY, z),
            end: new THREE.Vector3(edge2, lineY, z),
            distance: gap,
            axis: 'x',
            obj1: leftObj,
            obj2: rightObj
          });
        }
      }
      
      // Check if aligned in X (same column) - Z spacing
      const xOverlap = !(obj1.position.x + w1/2 < obj2.position.x - w2/2 || obj2.position.x + w2/2 < obj1.position.x - w1/2);
      
      if (xOverlap) {
        const frontObj = obj1.position.z < obj2.position.z ? obj1 : obj2;
        const backObj = obj1.position.z < obj2.position.z ? obj2 : obj1;
        const frontD = frontObj === obj1 ? d1 : d2;
        const backD = backObj === obj1 ? d1 : d2;
        
        const edge1 = frontObj.position.z + frontD/2;
        const edge2 = backObj.position.z - backD/2;
        const gap = edge2 - edge1;
        
        if (gap > 0.2) {
          const x = (obj1.position.x + obj2.position.x) / 2;
          spacings.push({
            start: new THREE.Vector3(x, lineY, edge1),
            end: new THREE.Vector3(x, lineY, edge2),
            distance: gap,
            axis: 'z',
            obj1: frontObj,
            obj2: backObj
          });
        }
      }
    }
  }
  
  // Remove duplicates - check midpoint and distance
  const uniqueSpacings = spacings.filter((s, i) => {
    const midX = (s.start.x + s.end.x) / 2;
    const midZ = (s.start.z + s.end.z) / 2;
    
    for (let j = 0; j < i; j++) {
      const other = spacings[j];
      const otherMidX = (other.start.x + other.end.x) / 2;
      const otherMidZ = (other.start.z + other.end.z) / 2;
      
      // Same midpoint (within 2m) and same distance (within 0.5m) = duplicate
      if (Math.abs(midX - otherMidX) < 2 && 
          Math.abs(midZ - otherMidZ) < 2 &&
          Math.abs(s.distance - other.distance) < 0.5) {
        return false;
      }
      
      // Same line segment (endpoints match within tolerance)
      const sameStart = Math.abs(s.start.x - other.start.x) < 0.5 && Math.abs(s.start.z - other.start.z) < 0.5;
      const sameEnd = Math.abs(s.end.x - other.end.x) < 0.5 && Math.abs(s.end.z - other.end.z) < 0.5;
      if (sameStart && sameEnd) return false;
    }
    return true;
  });
  
  // Further filter: only show spacings for adjacent objects (not all pairs)
  // Sort by distance and keep only reasonable ones
  const filteredSpacings = uniqueSpacings
    .filter(s => s.distance < 30) // Max 30m spacing shown
    .sort((a, b) => a.distance - b.distance);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DISTANCES ENTRE OBJETS NON-ALIGNÉS (center to center)
  // ═══════════════════════════════════════════════════════════════════════════
  const centerDistances: {
    obj1: Object3D;
    obj2: Object3D;
    distance: number;
    midPoint: THREE.Vector3;
  }[] = [];
  
  // Pour chaque objet, trouver son plus proche voisin
  for (let i = 0; i < objects.length; i++) {
    const obj1 = objects[i];
    let closestDist = Infinity;
    let closestObj: Object3D | null = null;
    
    for (let j = 0; j < objects.length; j++) {
      if (i === j) continue;
      const obj2 = objects[j];
      
      // Distance bord à bord (approximation)
      const dx = Math.abs(obj1.position.x - obj2.position.x);
      const dz = Math.abs(obj1.position.z - obj2.position.z);
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < closestDist) {
        closestDist = dist;
        closestObj = obj2;
      }
    }
    
    // Ajouter seulement si pas déjà dans filteredSpacings et distance < 25m
    if (closestObj && closestDist < 25) {
      const alreadyShown = filteredSpacings.some(s => 
        (s.obj1.id === obj1.id && s.obj2.id === closestObj!.id) ||
        (s.obj1.id === closestObj!.id && s.obj2.id === obj1.id)
      );
      
      const alreadyAdded = centerDistances.some(cd =>
        (cd.obj1.id === obj1.id && cd.obj2.id === closestObj!.id) ||
        (cd.obj1.id === closestObj!.id && cd.obj2.id === obj1.id)
      );
      
      if (!alreadyShown && !alreadyAdded) {
        centerDistances.push({
          obj1,
          obj2: closestObj,
          distance: closestDist,
          midPoint: new THREE.Vector3(
            (obj1.position.x + closestObj.position.x) / 2,
            lineY + 1,
            (obj1.position.z + closestObj.position.z) / 2
          )
        });
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONNEXIONS ÉLECTRIQUES avec règles de distance
  // TRF → PDU: 5m optimal | PDU → Container: 10m optimal
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Règles de distance
  const ELEC_RULES = {
    TRF_TO_PDU: { optimal: 5, max: 8 },
    PDU_TO_CONTAINER: { optimal: 10, max: 15 },
    TRF_TO_CONTAINER: { optimal: 15, max: 20 } // Si pas de PDU
  };
  
  // Identifier les équipements
  const transformers = objects.filter(o => {
    const t = o.type.toLowerCase();
    const n = o.name.toLowerCase();
    return (t.includes('transformer') || t.includes('transfo') || n.includes('transformer') || n.includes('transfo')) 
           && !t.includes('rmu') && !n.includes('rmu');
  });
  
  const pdus = objects.filter(o => {
    const t = o.type.toLowerCase();
    const n = o.name.toLowerCase();
    return t.includes('pdu') || t.includes('distribution') || t.includes('skid') || t.includes('switchboard') ||
           n.includes('pdu') || n.includes('distribution') || n.includes('skid');
  });
  
  const containers = objects.filter(o => {
    const t = o.type.toLowerCase();
    const n = o.name.toLowerCase();
    return t.includes('container') || t.includes('hd5') || t.includes('antspace') ||
           n.includes('container') || n.includes('hd5') || n.includes('antspace');
  });
  
  // Connexions électriques
  interface ElecConnection {
    from: Object3D;
    to: Object3D;
    distance: number;
    type: 'trf-pdu' | 'pdu-container' | 'trf-container';
    rule: { optimal: number; max: number };
  }
  
  const electricalConnections: ElecConnection[] = [];
  
  // TRF → PDU (5m optimal)
  for (const trf of transformers) {
    // Trouver le PDU le plus proche
    let closestPDU: Object3D | null = null;
    let closestDist = Infinity;
    
    for (const pdu of pdus) {
      const dx = trf.position.x - pdu.position.x;
      const dz = trf.position.z - pdu.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closestPDU = pdu;
      }
    }
    
    if (closestPDU && closestDist < 20) {
      electricalConnections.push({
        from: trf,
        to: closestPDU,
        distance: closestDist,
        type: 'trf-pdu',
        rule: ELEC_RULES.TRF_TO_PDU
      });
    }
  }
  
  // PDU → Container (10m optimal, 2 containers par PDU)
  for (const pdu of pdus) {
    const distances = containers.map(container => {
      const dx = pdu.position.x - container.position.x;
      const dz = pdu.position.z - container.position.z;
      return { container, distance: Math.sqrt(dx * dx + dz * dz) };
    });
    
    distances.sort((a, b) => a.distance - b.distance);
    const closest2 = distances.slice(0, 2);
    
    for (const { container, distance } of closest2) {
      electricalConnections.push({
        from: pdu,
        to: container,
        distance,
        type: 'pdu-container',
        rule: ELEC_RULES.PDU_TO_CONTAINER
      });
    }
  }
  
  // TRF → Container direct (si pas de PDU proche)
  for (const trf of transformers) {
    // Vérifier si ce TRF a un PDU connecté
    const hasPDU = electricalConnections.some(c => c.from.id === trf.id && c.type === 'trf-pdu');
    
    if (!hasPDU) {
      // Connexion directe aux 2 containers les plus proches
      const distances = containers.map(container => {
        const dx = trf.position.x - container.position.x;
        const dz = trf.position.z - container.position.z;
        return { container, distance: Math.sqrt(dx * dx + dz * dz) };
      });
      
      distances.sort((a, b) => a.distance - b.distance);
      const closest2 = distances.slice(0, 2);
      
      for (const { container, distance } of closest2) {
        electricalConnections.push({
          from: trf,
          to: container,
          distance,
          type: 'trf-container',
          rule: ELEC_RULES.TRF_TO_CONTAINER
        });
      }
    }
  }
  
  return (
    <group>
      {/* Total footprint outline on ground */}
      <mesh position={[centerX, 0.02, centerZ]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[totalWidth + 0.2, totalDepth + 0.2]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.08} />
      </mesh>
      
      {/* Outline edges - blue dashed */}
      <Line
        points={[
          [minX - 0.5, lineY, minZ - 0.5],
          [maxX + 0.5, lineY, minZ - 0.5],
          [maxX + 0.5, lineY, maxZ + 0.5],
          [minX - 0.5, lineY, maxZ + 0.5],
          [minX - 0.5, lineY, minZ - 0.5],
        ]}
        color="#3b82f6"
        lineWidth={3}
        dashed
        dashSize={1}
        gapSize={0.5}
      />
      
      {/* Total width dimension (X axis) */}
      <group position={[0, lineY, maxZ + 4]}>
        <Line points={[[minX, 0, 0], [maxX, 0, 0]]} color="#3b82f6" lineWidth={3} />
        <Line points={[[minX, 0, -0.5], [minX, 0, 0.5]]} color="#3b82f6" lineWidth={3} />
        <Line points={[[maxX, 0, -0.5], [maxX, 0, 0.5]]} color="#3b82f6" lineWidth={3} />
        <Html position={[centerX, 0.5, 0]} center>
          <div className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full whitespace-nowrap font-bold shadow-lg">
            ↔ {totalWidth.toFixed(1)}m
          </div>
        </Html>
      </group>
      
      {/* Total depth dimension (Z axis) */}
      <group position={[maxX + 4, lineY, 0]}>
        <Line points={[[0, 0, minZ], [0, 0, maxZ]]} color="#3b82f6" lineWidth={3} />
        <Line points={[[-0.5, 0, minZ], [0.5, 0, minZ]]} color="#3b82f6" lineWidth={3} />
        <Line points={[[-0.5, 0, maxZ], [0.5, 0, maxZ]]} color="#3b82f6" lineWidth={3} />
        <Html position={[0, 0.5, centerZ]} center>
          <div className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full whitespace-nowrap font-bold shadow-lg">
            ↕ {totalDepth.toFixed(1)}m
          </div>
        </Html>
      </group>
      
      {/* All spacing lines with interactive labels */}
      {filteredSpacings.map((s, i) => {
        const ruleInfo = getRuleInfo(s.distance, s.obj1, s.obj2);
        const lineColor = ruleInfo.status === 'ok' ? '#22c55e' : ruleInfo.status === 'warning' ? '#f59e0b' : '#ef4444';
        const key = `${s.obj1.id}-${s.obj2.id}-${s.axis}-${s.distance.toFixed(1)}`;
        
        return (
          <group key={key}>
            <Line points={[s.start, s.end]} color={lineColor} lineWidth={3} />
            {/* End markers */}
            {s.axis === 'x' ? (
              <>
                <Line points={[[s.start.x, s.start.y, s.start.z - 0.3], [s.start.x, s.start.y, s.start.z + 0.3]]} color={lineColor} lineWidth={2} />
                <Line points={[[s.end.x, s.end.y, s.end.z - 0.3], [s.end.x, s.end.y, s.end.z + 0.3]]} color={lineColor} lineWidth={2} />
              </>
            ) : (
              <>
                <Line points={[[s.start.x - 0.3, s.start.y, s.start.z], [s.start.x + 0.3, s.start.y, s.start.z]]} color={lineColor} lineWidth={2} />
                <Line points={[[s.end.x - 0.3, s.end.y, s.end.z], [s.end.x + 0.3, s.end.y, s.end.z]]} color={lineColor} lineWidth={2} />
              </>
            )}
            <DimensionLabel 
              position={[(s.start.x + s.end.x) / 2, lineY + 0.5, (s.start.z + s.end.z) / 2]}
              distance={s.distance}
              axis={s.axis}
              obj1Name={s.obj1.name}
              obj2Name={s.obj2.name}
              ruleInfo={ruleInfo}
            />
          </group>
        );
      })}
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONNEXIONS ÉLECTRIQUES avec règles de distance */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {electricalConnections.map((ec, i) => {
        // Couleur selon règle: vert si ≤ optimal, orange si ≤ max, rouge si > max
        const isOptimal = ec.distance <= ec.rule.optimal;
        const isAcceptable = ec.distance <= ec.rule.max;
        const lineColor = isOptimal ? '#22c55e' : isAcceptable ? '#f59e0b' : '#ef4444';
        const bgColor = isOptimal ? 'bg-green-500' : isAcceptable ? 'bg-amber-500' : 'bg-red-500';
        
        const midX = (ec.from.position.x + ec.to.position.x) / 2;
        const midZ = (ec.from.position.z + ec.to.position.z) / 2;
        
        // Icône selon type de connexion
        const icon = ec.type === 'trf-pdu' ? '🔌' : ec.type === 'pdu-container' ? '⚡' : '⚡';
        const label = ec.type === 'trf-pdu' ? 'TRF→PDU' : ec.type === 'pdu-container' ? 'PDU→CNT' : 'TRF→CNT';
        
        return (
          <group key={`elec-${i}`}>
            {/* Ligne électrique */}
            <Line 
              points={[
                [ec.from.position.x, lineY + 0.3, ec.from.position.z],
                [ec.to.position.x, lineY + 0.3, ec.to.position.z]
              ]} 
              color={lineColor} 
              lineWidth={4}
            />
            {/* Marqueur source */}
            <mesh position={[ec.from.position.x, lineY + 0.3, ec.from.position.z]} rotation={[-Math.PI/2, 0, 0]}>
              <circleGeometry args={[0.4, 16]} />
              <meshBasicMaterial color={lineColor} />
            </mesh>
            {/* Marqueur destination */}
            <mesh position={[ec.to.position.x, lineY + 0.3, ec.to.position.z]} rotation={[-Math.PI/2, 0, 0]}>
              <circleGeometry args={[0.3, 16]} />
              <meshBasicMaterial color={lineColor} />
            </mesh>
            {/* Label distance avec règle */}
            <Html position={[midX, lineY + 1.5, midZ]} center>
              <div className={`${bgColor} text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap font-bold shadow-lg`}>
                {icon} {ec.distance.toFixed(1)}m {isOptimal ? '✓' : isAcceptable ? '⚠' : '✗'}
                <span className="opacity-70 ml-1">({ec.rule.optimal}m)</span>
              </div>
            </Html>
          </group>
        );
      })}
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LIGNES DE CENTRE DU LAYOUT (si décalé de l'origine) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      {/* Ligne de centre du layout (X) - violet pointillé */}
      {Math.abs(centerX) > 0.5 && (
        <>
          <Line
            points={[[centerX, 0.08, minZ - 3], [centerX, 0.08, maxZ + 3]]}
            color="#8b5cf6"
            lineWidth={2}
            dashed
            dashSize={1}
            gapSize={0.5}
          />
          <Html position={[centerX, 0.5, minZ - 4]} center>
            <div className="bg-violet-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
              Centre X: {centerX.toFixed(1)}m
            </div>
          </Html>
        </>
      )}
      
      {/* Ligne de centre du layout (Z) - violet pointillé */}
      {Math.abs(centerZ) > 0.5 && (
        <>
          <Line
            points={[[minX - 3, 0.08, centerZ], [maxX + 3, 0.08, centerZ]]}
            color="#8b5cf6"
            lineWidth={2}
            dashed
            dashSize={1}
            gapSize={0.5}
          />
          <Html position={[minX - 4, 0.5, centerZ]} center>
            <div className="bg-violet-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
              Centre Z: {centerZ.toFixed(1)}m
            </div>
          </Html>
        </>
      )}
      
      {/* Indicateur de décalage par rapport à l'origine */}
      {(Math.abs(centerX) > 0.5 || Math.abs(centerZ) > 0.5) && (
        <Html position={[centerX, 2, centerZ]} center>
          <div className="bg-violet-600/90 text-white text-xs px-2 py-1 rounded-lg shadow-lg border border-violet-400">
            <span className="font-medium">Décalage:</span> X={centerX.toFixed(1)}m, Z={centerZ.toFixed(1)}m
          </div>
        </Html>
      )}
    </group>
  );
}

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
  onTransformEnd,
  showDimensions
}: { 
  object: Object3D; 
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  transformMode: TransformMode;
  onTransformEnd: (position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void;
  showDimensions: boolean;
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

  // Color based on type
  let displayColor = object.color;
  if (isContainer) displayColor = '#e8e8e8';
  else if (isCooling) displayColor = '#1e3a5f';
  else if (isTransformer) displayColor = '#f59e0b';
  else if (isPDU) displayColor = '#374151';
  else if (isRMU) displayColor = '#1f2937';
  else if (isCanopy) displayColor = '#1e3a5f';

  // Container realistic rendering
  const renderContainer = () => {
    const [w, h, d] = scale; // width, height, depth in meters
    const frameThickness = 0.15;
    const corrugationCount = 12;
    
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
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Frame edges - darker steel */}
        {/* Bottom frame - inside container */}
        <mesh position={[0, -h/2 + frameThickness/2, 0]} castShadow>
          <boxGeometry args={[w - 0.02, frameThickness, d - 0.02]} />
          <meshStandardMaterial color="#3d3d3d" metalness={0.1} roughness={0.8} />
        </mesh>
        {/* Top frame - inside container */}
        <mesh position={[0, h/2 - frameThickness/2, 0]} castShadow>
          <boxGeometry args={[w - 0.02, frameThickness, d - 0.02]} />
          <meshStandardMaterial color="#3d3d3d" metalness={0.1} roughness={0.8} />
        </mesh>
        
        {/* Corner posts - inside, matte black */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([xDir, zDir], i) => (
          <mesh key={`post-${i}`} position={[xDir * (w/2 - 0.15), 0, zDir * (d/2 - 0.15)]} castShadow>
            <boxGeometry args={[0.18, h - 0.1, 0.18]} />
            <meshStandardMaterial color="#3d3d3d" metalness={0.1} roughness={0.8} />
          </mesh>
        ))}
        
        {/* Corrugations on sides (Z faces) - white metallic */}
        {Array.from({ length: corrugationCount }).map((_, i) => {
          const xPos = -w/2 + (w / corrugationCount) * (i + 0.5);
          return (
            <group key={`corr-${i}`}>
              {/* Front side corrugation */}
              <mesh position={[xPos, 0, d/2 + 0.02]} castShadow>
                <boxGeometry args={[w / corrugationCount * 0.3, h * 0.85, 0.05]} />
                <meshStandardMaterial color="#f5f5f5" metalness={0.7} roughness={0.3} />
              </mesh>
              {/* Back side corrugation */}
              <mesh position={[xPos, 0, -d/2 - 0.02]} castShadow>
                <boxGeometry args={[w / corrugationCount * 0.3, h * 0.85, 0.05]} />
                <meshStandardMaterial color="#f5f5f5" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          );
        })}
        
        {/* HEARST LOGO - Using imported PNG texture on both sides */}
        <HearstLogo position={[0, 0, d/2 + 0.06]} height={h * 0.6} />
        <HearstLogo position={[0, 0, -d/2 - 0.06]} height={h * 0.6} rotation={[0, Math.PI, 0]} />
        
        {/* Container doors (back face X-) - double doors */}
        <group position={[-w/2 - 0.03, 0, 0]}>
          {/* Door frame */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.08, h * 0.92, d * 0.85]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.7} />
          </mesh>
          
          {/* Left door panel */}
          <mesh position={[-0.02, 0, -d * 0.22]} castShadow>
            <boxGeometry args={[0.06, h * 0.88, d * 0.38]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.6} roughness={0.3} />
          </mesh>
          
          {/* Right door panel */}
          <mesh position={[-0.02, 0, d * 0.22]} castShadow>
            <boxGeometry args={[0.06, h * 0.88, d * 0.38]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.6} roughness={0.3} />
          </mesh>
          
          {/* Door handles/lock bars - left door */}
          <mesh position={[-0.06, 0, -d * 0.05]} castShadow>
            <boxGeometry args={[0.04, h * 0.7, 0.08]} />
            <meshStandardMaterial color="#2d2d2d" metalness={0.4} roughness={0.5} />
          </mesh>
          
          {/* Door handles/lock bars - right door */}
          <mesh position={[-0.06, 0, d * 0.05]} castShadow>
            <boxGeometry args={[0.04, h * 0.7, 0.08]} />
            <meshStandardMaterial color="#2d2d2d" metalness={0.4} roughness={0.5} />
          </mesh>
          
          {/* Horizontal lock bars */}
          {[-0.3, 0, 0.3].map((yOffset, i) => (
            <mesh key={`lock-${i}`} position={[-0.08, yOffset * h, 0]} castShadow>
              <boxGeometry args={[0.03, 0.06, d * 0.75]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>
    );
  };
  
  // Cooling realistic rendering - white metallic  
  const renderCooling = () => {
    const [w, h, d] = scale;
    const frameColor = '#3d3d3d'; // Dark gray frame (same as container)
    const bodyColor = '#ffffff'; // Pure white (same as container)
    const fanColor = '#1f2937'; // Dark fan housing
    const grillColor = '#6b7280'; // Gray grill
    
    // Number of fans based on width
    const fanCount = Math.max(4, Math.floor(w / 2));
    const fanSpacing = w / fanCount;
    const fanRadius = Math.min(fanSpacing * 0.35, d * 0.3);
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Main body frame */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={bodyColor} metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Top frame border */}
        <mesh position={[0, h/2, 0]} castShadow>
          <boxGeometry args={[w + 0.05, 0.08, d + 0.05]} />
          <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.5} />
        </mesh>
        
        {/* Circular fans on top - Bitmain style */}
        {Array.from({ length: fanCount }).map((_, i) => {
          const xPos = -w/2 + fanSpacing * (i + 0.5);
          return (
            <group key={`fan-unit-${i}`} position={[xPos, h/2 + 0.1, 0]}>
              {/* Fan housing (cylinder) */}
              <mesh castShadow>
                <cylinderGeometry args={[fanRadius, fanRadius, 0.15, 24]} />
                <meshStandardMaterial color={fanColor} metalness={0.5} roughness={0.4} />
              </mesh>
              {/* Fan grill */}
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[fanRadius * 0.95, fanRadius * 0.95, 0.02, 24]} />
                <meshStandardMaterial color={grillColor} metalness={0.6} roughness={0.3} />
              </mesh>
              {/* Fan center hub */}
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[fanRadius * 0.2, fanRadius * 0.2, 0.05, 12]} />
                <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.2} />
              </mesh>
              {/* Fan blades (simplified) */}
              {[0, 60, 120, 180, 240, 300].map((angle, j) => (
                <mesh key={`blade-${j}`} position={[0, 0.09, 0]} rotation={[0, (angle * Math.PI) / 180, 0]}>
                  <boxGeometry args={[fanRadius * 1.6, 0.02, fanRadius * 0.15]} />
                  <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} />
                </mesh>
              ))}
            </group>
          );
        })}
        
        {/* Side louvers - air intake (front) */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`louver-front-${i}`} position={[0, -h/3 + (h * 0.6 / 8) * i, d/2 + 0.02]} castShadow>
            <boxGeometry args={[w * 0.9, 0.03, 0.04]} />
            <meshStandardMaterial color={grillColor} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        
        {/* Side louvers - air intake (back) */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`louver-back-${i}`} position={[0, -h/3 + (h * 0.6 / 8) * i, -d/2 - 0.02]} castShadow>
            <boxGeometry args={[w * 0.9, 0.03, 0.04]} />
            <meshStandardMaterial color={grillColor} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        
        {/* Corner posts */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([xSign, zSign], i) => (
          <mesh key={`post-${i}`} position={[xSign * (w/2 - 0.05), 0, zSign * (d/2 - 0.05)]} castShadow>
            <boxGeometry args={[0.1, h, 0.1]} />
            <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
        
        {/* Bottom mounting rails */}
        <mesh position={[0, -h/2 + 0.05, 0]} castShadow>
          <boxGeometry args={[w, 0.1, d]} />
          <meshStandardMaterial color={frameColor} metalness={0.4} roughness={0.5} />
        </mesh>
        
        {/* Bitmain logo area (front panel) */}
        <mesh position={[-w/2 + 0.8, 0, d/2 + 0.01]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshStandardMaterial color="#f97316" metalness={0.3} roughness={0.5} />
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

  // Solar Canopy rendering
  const renderCanopy = () => {
    const [w, h, d] = scale;
    const steelColor = '#374151';
    const aluminumFrame = '#9ca3af';
    const solarCellColor = '#0f172a';
    const solarBlue = '#1e3a5f';
    
    // Panel dimensions
    const panelWidth = 2.1;
    const panelDepth = 1.05;
    const panelAngle = Math.PI / 7; // ~25° for Qatar latitude
    
    // Post spacing
    const postSpacingX = w / 4;
    const postSpacingZ = d / 3;
    
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
      const openingWidth = 2.5;
      for (const opening of extractorOpenings) {
        if (Math.abs(x - opening.x) < openingWidth && Math.abs(z - opening.z) < openingWidth) {
          return true;
        }
      }
      return false;
    };
    
    // Generate panel positions
    const panelCols = Math.floor(w / panelWidth);
    const panelRows = Math.floor(d / panelDepth);
    const panels: Array<{ x: number; z: number }> = [];
    
    for (let col = 0; col < panelCols; col++) {
      for (let row = 0; row < panelRows; row++) {
        const xPos = -w/2 + panelWidth/2 + col * panelWidth;
        const zPos = -d/2 + panelDepth/2 + row * panelDepth;
        if (!isOverExtractor(xPos, zPos)) {
          panels.push({ x: xPos, z: zPos });
        }
      }
    }
    
    // Post positions
    const posts: Array<[number, number]> = [];
    for (let xi = 0; xi <= 4; xi++) {
      for (let zi = 0; zi <= 3; zi++) {
        posts.push([-w/2 + xi * postSpacingX, -d/2 + zi * postSpacingZ]);
      }
    }
    
    return (
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        onClick={(e) => { e.stopPropagation(); if (!object.locked) onSelect(e.ctrlKey || e.metaKey || e.shiftKey); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Support Posts */}
        {posts.map(([xPos, zPos], i) => (
          <group key={`post-${i}`} position={[xPos, -h/2 - 2, zPos]}>
            <mesh castShadow>
              <boxGeometry args={[0.25, h + 4, 0.25]} />
              <meshStandardMaterial color={steelColor} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, -(h + 4)/2, 0]} castShadow>
              <boxGeometry args={[0.5, 0.1, 0.5]} />
              <meshStandardMaterial color={steelColor} metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        ))}
        
        {/* Main Longitudinal Beams (X direction) */}
        {[-d/3, 0, d/3].map((zPos, i) => (
          <mesh key={`beam-x-${i}`} position={[0, 0, zPos]} castShadow>
            <boxGeometry args={[w, 0.2, 0.15]} />
            <meshStandardMaterial color={steelColor} metalness={0.65} roughness={0.35} />
          </mesh>
        ))}
        
        {/* Cross Beams (Z direction) */}
        {[-w/2, -w/4, 0, w/4, w/2].map((xPos, i) => (
          <mesh key={`beam-z-${i}`} position={[xPos, 0, 0]} castShadow>
            <boxGeometry args={[0.15, 0.2, d]} />
            <meshStandardMaterial color={steelColor} metalness={0.65} roughness={0.35} />
          </mesh>
        ))}
        
        {/* Solar Panels (tilted, with gaps for extractors) */}
        <group position={[0, 0.25, 0]} rotation={[panelAngle, 0, 0]}>
          {panels.map(({ x, z }, i) => (
            <group key={`panel-${i}`} position={[x, 0, z]}>
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
                <meshStandardMaterial color={solarBlue} metalness={0.1} roughness={0.1} transparent opacity={0.4} />
              </mesh>
            </group>
          ))}
        </group>
        
        {/* Extractor Opening Frames (visible openings above cooling units) */}
        {extractorOpenings.map((opening, i) => (
          <group key={`opening-${i}`} position={[opening.x, 0.2, opening.z]}>
            {/* Opening frame */}
            <mesh>
              <boxGeometry args={[2.7, 0.1, 2.7]} />
              <meshStandardMaterial color={steelColor} metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Mesh grating */}
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[2.3, 0.02, 2.3]} />
              <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} wireframe />
            </mesh>
            {/* Airflow indicator (red cone) */}
            <mesh position={[0, 0.4, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <coneGeometry args={[0.3, 0.6, 8]} />
              <meshStandardMaterial color="#ef4444" transparent opacity={0.6} emissive="#ef4444" emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}
        
        {/* Inverter Boxes (at corners) */}
        {[[-w/2 + 1, -d/2 + 1], [w/2 - 1, -d/2 + 1], [-w/2 + 1, d/2 - 1], [w/2 - 1, d/2 - 1]].map(([xPos, zPos], i) => (
          <group key={`inverter-${i}`} position={[xPos, -h/4, zPos]}>
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
        
        {/* Lightning Rods */}
        {[[-w/2 + 0.5, -d/2 + 0.5], [w/2 - 0.5, -d/2 + 0.5], [-w/2 + 0.5, d/2 - 0.5], [w/2 - 0.5, d/2 - 0.5]].map(([xPos, zPos], i) => (
          <mesh key={`lightning-${i}`} position={[xPos, h/2 + 0.5, zPos]} castShadow>
            <cylinderGeometry args={[0.015, 0.025, 1.5, 8]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
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
      {isContainer ? renderContainer() : isCooling ? renderCooling() : isTransformer ? renderTransformer() : isPDU ? renderPDU() : isRMU ? renderRMU() : isCanopy ? renderCanopy() : renderStandard()}
      
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
  measurePoints,
  onMeasureClick,
  onTransformEnd,
  showGrid,
  showDimensions,
  viewDirection,
  orbitRef
}: {
  objects: Object3D[];
  selectedIds: string[];
  onSelect: (id: string, multiSelect: boolean) => void;
  transformMode: TransformMode;
  tool: Tool;
  measurePoints: THREE.Vector3[];
  onMeasureClick: (point: THREE.Vector3) => void;
  onTransformEnd: (id: string, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void;
  showGrid: boolean;
  showDimensions: boolean;
  viewDirection: 'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | null;
  orbitRef: React.RefObject<any>;
}) {
  const handleFloorClick = (e: any) => {
    if (tool === 'measure') {
      e.stopPropagation();
      onMeasureClick(e.point.clone());
    } else {
      // Deselect by passing empty string - handled in parent
      onSelect('', false);
    }
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
      <OrbitControls 
        ref={orbitRef}
        makeDefault
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
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#6b7280" metalness={0} roughness={1} />
      </mesh>
      
      {/* Concrete slab - 40cm thick, centered at origin, tight fit */}
      <mesh 
        position={[0, 0.2, 0]} 
        receiveShadow
        castShadow
        onClick={handleFloorClick}
      >
        <boxGeometry args={[45, 0.4, 30]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.1} roughness={0.9} />
      </mesh>
      
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

      {/* Objects */}
      {objects.map((obj) => (
        <EditableObject
          key={obj.id}
          object={obj}
          isSelected={selectedIds.includes(obj.id)}
          onSelect={(multiSelect: boolean) => onSelect(obj.id, multiSelect)}
          transformMode={transformMode}
          onTransformEnd={(pos, rot, scale) => onTransformEnd(obj.id, pos, rot, scale)}
          showDimensions={showDimensions}
        />
      ))}

      {/* Center Guides, Alignment Lines and Floor dimensions */}
      {showDimensions && (
        <>
          <CenterGuides />
          <AlignmentLines objects={objects} />
          {objects.length > 0 && <FloorDimensions objects={objects} />}
        </>
      )}

      {/* Measurement line */}
      {measurePoints.length === 2 && (
        <MeasurementLine start={measurePoints[0]} end={measurePoints[1]} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function DesignerPage() {
  // Scene state
  // Dimensions in mm: 12192 x 2896 x 2438 (40ft ISO)
  const unitDims = { width: 12192, height: 2896, depth: 2438 };
  const unitWidthM = unitDims.width / 1000; // 12.192m (length)
  const unitDepthM = unitDims.depth / 1000; // 2.438m (depth)
  const unitHeightM = unitDims.height / 1000; // 2.896m
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
    // Cooling on roof
    initialObjects.push({
      id: `cooling-${i + 1}`,
      name: `EC2-DT #${i + 1}`,
      type: 'cooling',
      position: { x: row1X, y: slabHeight + unitHeightM + unitHeightM / 2, z: zPos },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#1e3a5f',
      dimensions: unitDims,
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
    // Cooling on roof
    initialObjects.push({
      id: `cooling-${i + 5}`,
      name: `EC2-DT #${i + 5}`,
      type: 'cooling',
      position: { x: row2X, y: slabHeight + unitHeightM + unitHeightM / 2, z: zPos },
      rotation: { x: 0, y: Math.PI, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#1e3a5f',
      dimensions: unitDims,
      locked: false,
      visible: true
    });
  }
  
  // 4 Transformers 4MW - positioned at corners
  const transformerDims = { width: 2500, height: 3000, depth: 2000 }; // 2.5m x 3m x 2m
  const transformerHeightM = transformerDims.height / 1000;
  const transformerWidthM = transformerDims.width / 1000;
  const transformerDepthM = transformerDims.depth / 1000;
  
  // Transformer positions: 2 pairs in the middle of the passage
  // Pair 1: between containers 1-2 (top of layout)
  // Pair 2: between containers 3-4 (bottom of layout)
  const pairGap = 3; // 3m gap between transformers in a pair
  const containerStep = unitDepthM + gapBetweenRows; // Distance between container centers
  const zTop = centerOffsetZ + containerStep / 2; // Between container 1 and 2
  const zBottom = centerOffsetZ + totalZSpan - containerStep / 2; // Between container 3 and 4
  
  const transformerPositions = [
    { x: -pairGap / 2, z: zTop, rot: 0 }, // Top pair - left
    { x: pairGap / 2, z: zTop, rot: 0 }, // Top pair - right
    { x: -pairGap / 2, z: zBottom, rot: 0 }, // Bottom pair - left
    { x: pairGap / 2, z: zBottom, rot: 0 }, // Bottom pair - right
  ];
  
  transformerPositions.forEach((pos, i) => {
    initialObjects.push({
      id: `transformer-${i + 1}`,
      name: `Transformer 4MW #${i + 1}`,
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
  // SOLAR CANOPY - Covers entire installation with thermal extraction zones
  // ═══════════════════════════════════════════════════════════════════════════
  // Dimensions calculation:
  // Width (X): from row1X - containerWidth/2 - margin to row2X + containerWidth/2 + margin
  //          = -13.596 - 6.096 - 2 to 13.596 + 6.096 + 2 = -21.7 to 21.7 ≈ 44m
  // Depth (Z): from centerOffsetZ - containerDepth/2 - margin to centerOffsetZ + totalZSpan + containerDepth/2 + margin
  //          ≈ 28m
  // Height: Structure height = 2m (positioned at top of cooling systems + 4m clearance)
  const canopyWidth = 44000;   // 44m width to cover both rows + margins
  const canopyDepth = 28000;   // 28m depth to cover 4 containers + margins
  const canopyStructureHeight = 2000; // 2m structure height
  const coolingTopY = slabHeight + unitHeightM + unitHeightM; // Top of cooling system
  const canopyClearance = 4; // 4m clearance above cooling extractors
  const canopyY = coolingTopY + canopyClearance + (canopyStructureHeight / 2000);
  
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
  
  // Box selection state
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
  const [showDimensions, setShowDimensions] = useState(true);
  const [viewDirection, setViewDirection] = useState<'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | null>(null);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  
  // UI state
  const [showLibrary, setShowLibrary] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  
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

  // Load DB layouts, restore last project, and AI status
  useEffect(() => {
    const init = async () => {
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
              console.log(`Loaded ${lastProject.objects.length} objects from project`);
            }
            console.log(`Restored project: ${lastProject.name}`);
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
          console.log(`Migrating ${localProjects.length} local projects to cloud...`);
          for (const project of localProjects) {
            try {
              await layoutsApi.create({
                name: project.name + ' (migrated)',
                description: `Migrated from local storage on ${new Date().toLocaleDateString()}`,
                dimensions: { width: 50000, height: 30000, depth: 10000 },
                objects: project.objects as any,
                groups: [],
              });
              console.log(`Migrated: ${project.name}`);
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
      console.log('AI Objects loaded:', Object.keys(templates).map(k => `${k}: ${templates[k].length}`));
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
      console.log(`Loaded ${loadedObjects.length} objects from "${layout.name}"`);
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
        setShowProjects(true);
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
    
    if (tool === 'measure') {
      setMeasurePoints([]);
    }
  }, []);

  // Measure click handler
  const handleMeasureClick = useCallback((point: THREE.Vector3) => {
    setMeasurePoints(prev => {
      if (prev.length >= 2) return [point];
      return [...prev, point];
    });
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

  // Export
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

  return (
    <div className="fixed inset-0 bg-slate-200 flex flex-col">
      {/* Designer Header - Full width */}
      <div className="flex-shrink-0 z-40 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Project Name */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-hearst-green rounded-xl flex items-center justify-center shadow-md">
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
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Shift+Z)"
              >
                <RotateCw className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            
            {/* Save Button - Single save to Supabase (Ctrl+S) */}
            <button
              onClick={() => saveToDatabase(false)}
              disabled={dbSaving}
              className="flex items-center gap-2 px-4 py-2 bg-hearst-green hover:bg-hearst-green/80 text-slate-900 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
              title="Save to Supabase (Ctrl+S)"
            >
              {dbSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {dbSaving ? 'Saving...' : 'Save'}
            </button>
            
            {/* Save Message Toast */}
            {saveMessage && (
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                saveMessage.startsWith('✓') 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Projects Button - Open list of saved projects (Ctrl+O) */}
            <button
              onClick={() => setShowProjects(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
              title="Open Projects (Ctrl+O)"
            >
              <FolderOpen className="w-4 h-4" />
              Projects
            </button>

            {/* AI Status Indicator */}
            <button
              onClick={() => setShowAIPanel(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
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
          
          {/* Measure info */}
          {activeTool === 'measure' && (
            <div className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-medium">
              {measurePoints.length === 0 
                ? 'Click first point' 
                : measurePoints.length === 1 
                  ? 'Click second point'
                  : `Distance: ${(measurePoints[0].distanceTo(measurePoints[1]) * 1000).toFixed(0)} mm`
              }
            </div>
          )}
        </div>
      </div>

      {/* 3D Viewport Container */}
      <div className="flex-1 relative">
        {/* 3D Canvas */}
        <Canvas shadows className="absolute inset-0">
          <Scene
          objects={objects}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          transformMode={transformMode}
          tool={activeTool}
          measurePoints={measurePoints}
          onMeasureClick={handleMeasureClick}
          onTransformEnd={handleTransformEnd}
          showGrid={showGrid}
          showDimensions={showDimensions}
          viewDirection={viewDirection}
          orbitRef={orbitRef}
        />
        </Canvas>

        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          showDimensions={showDimensions}
          onToggleDimensions={() => setShowDimensions(!showDimensions)}
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
          objectCount={objects.length}
        />

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
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, z: obj.position.z - 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="↑ (10cm)">
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                </button>
                <div />
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, x: obj.position.x - 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="← (10cm)">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Move className="w-4 h-4 text-slate-300" />
                </div>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, x: obj.position.x + 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="→ (10cm)">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
                <div />
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, z: obj.position.z + 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="↓ (10cm)">
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                </button>
                <div />
              </div>
              
              <div className="w-px h-16 bg-slate-200" />
              
              {/* Y + Rotation */}
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, y: obj.position.y + 0.1 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="Up (A)">
                  <ArrowUp className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, rotation: { ...obj.rotation, y: obj.rotation.y + Math.PI / 2 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="+90° (S)">
                  <RotateCw className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, position: { ...obj.position, y: Math.max(0, obj.position.y - 0.1) } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="Down (Q)">
                  <ArrowDown className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => setObjects(prev => prev.map(obj => selectedIds.includes(obj.id) ? { ...obj, rotation: { ...obj.rotation, y: obj.rotation.y - Math.PI / 2 } } : obj))} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="-90° (E)">
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              
              <div className="w-px h-16 bg-slate-200" />
              
              {/* Actions */}
              <div className="flex flex-col gap-1">
                <button onClick={() => { const newObjs = selectedObjects.map(obj => ({ ...obj, id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, position: { ...obj.position, x: obj.position.x + 2 } })); setObjects(prev => [...prev, ...newObjs]); setSelectedIds(newObjs.map(o => o.id)); }} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors" title="Dup (Ctrl+D)">
                  <Copy className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={() => { setObjects(prev => prev.filter(obj => !selectedIds.includes(obj.id))); setSelectedIds([]); }} className="w-9 h-9 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors" title="Del">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emprise Totale - Bottom Right */}
        {objects.length > 0 && showDimensions && (() => {
          let minX = Infinity, maxX = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;
          objects.forEach(obj => {
            const w = (obj.dimensions.width / 1000) * obj.scale.x;
            const d = (obj.dimensions.depth / 1000) * obj.scale.z;
            minX = Math.min(minX, obj.position.x - w/2);
            maxX = Math.max(maxX, obj.position.x + w/2);
            minZ = Math.min(minZ, obj.position.z - d/2);
            maxZ = Math.max(maxZ, obj.position.z + d/2);
          });
          const totalWidth = maxX - minX;
          const totalDepth = maxZ - minZ;
          const area = totalWidth * totalDepth;
          
          return (
            <div className="absolute right-4 bottom-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 z-20 shadow-lg border border-slate-200 text-xs">
              <span className="text-slate-500">Emprise:</span>
              <span className="font-semibold text-slate-700 ml-1">{totalWidth.toFixed(1)}×{totalDepth.toFixed(1)}m</span>
              <span className="font-bold text-slate-900 ml-2">{area.toFixed(0)}m²</span>
            </div>
          );
        })()}
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
              <button onClick={() => setShowProjects(false)} className="p-2 hover:bg-slate-100 rounded-lg">
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
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        currentLayoutId === layout.id 
                          ? 'border-hearst-green bg-hearst-green/5' 
                          : 'border-slate-200 hover:border-hearst-green/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
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
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
              <button onClick={() => setShowSaveModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
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
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
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
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
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
                className="flex-1 px-4 py-2.5 bg-slate-100 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm"
                disabled={aiLoading}
                autoFocus
              />
              <button
                onClick={() => handleAIGenerate()}
                disabled={aiLoading || !aiUserPrompt.trim()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl transition-colors"
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
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
                  className="p-2 hover:bg-slate-100 rounded-lg"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${dbLoading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowDbPanel(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Current Project Save */}
              <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
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
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        currentLayoutId === layout.id 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
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
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
                  <div className="w-12 h-12 bg-hearst-green/10 rounded-xl flex items-center justify-center group-hover:bg-hearst-green/20 transition-colors">
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
                        className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-hearst-green/10 border border-slate-200 hover:border-hearst-green/30 rounded-xl transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
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
