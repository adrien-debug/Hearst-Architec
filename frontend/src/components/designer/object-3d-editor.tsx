'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
import {
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  Maximize,
  MousePointer,
  Ruler,
  Palette,
  Link2,
  Unlink2,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Save,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Home,
  Grid3X3,
  Box,
  Layers,
  Lock,
  Unlock,
  X,
  Check,
  Plus,
  Minus,
  Settings
} from 'lucide-react';

// Types
export interface Object3D {
  id: string;
  name: string;
  type: string;
  objectType?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  dimensions: { width: number; height: number; depth: number };
  locked: boolean;
  visible: boolean;
  groupId?: string;
}

export interface ObjectGroup {
  id: string;
  name: string;
  objectIds: string[];
  locked: boolean;
}

interface Object3DEditorProps {
  objects: Object3D[];
  onObjectsChange: (objects: Object3D[]) => void;
  onSave?: (objects: Object3D[], groups: ObjectGroup[]) => void;
}

type TransformMode = 'translate' | 'rotate' | 'scale';
type Tool = 'select' | 'measure' | 'color' | 'group';

// Measurement Line Component
function MeasurementLine({ start, end, visible }: { 
  start: THREE.Vector3; 
  end: THREE.Vector3; 
  visible: boolean 
}) {
  if (!visible) return null;
  
  const distance = start.distanceTo(end);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  
  return (
    <group>
      <Line
        points={[start, end]}
        color="#ff6b6b"
        lineWidth={2}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      <Html position={midPoint} center>
        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
          {(distance * 1000).toFixed(0)} mm
        </div>
      </Html>
    </group>
  );
}

// Editable 3D Object Component
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
  onSelect: () => void;
  transformMode: TransformMode;
  onTransformEnd: (position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void;
  showDimensions: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
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

  return (
    <group>
      {isSelected && !object.locked && (
        <TransformControls
          ref={transformRef}
          object={meshRef.current || undefined}
          mode={transformMode}
          size={0.5}
        />
      )}
      
      <mesh
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          if (!object.locked) onSelect();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={object.color}
          metalness={0.2}
          roughness={0.5}
          opacity={object.locked ? 0.5 : 1}
          transparent={object.locked}
        />
      </mesh>
      
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
      
      {/* Dimensions display */}
      {(hovered || isSelected) && showDimensions && (
        <Html position={[object.position.x, object.position.y + scale[1]/2 + 0.3, object.position.z]} center>
          <div className="bg-slate-900/90 text-white text-xs px-3 py-2 rounded-2xl whitespace-nowrap shadow-lg">
            <div className="font-bold mb-1">{object.name}</div>
            <div className="text-slate-300">
              {object.dimensions.width} × {object.dimensions.height} × {object.dimensions.depth} mm
            </div>
          </div>
        </Html>
      )}
      
      {/* Lock indicator */}
      {object.locked && (
        <Html position={[object.position.x, object.position.y + scale[1]/2 + 0.1, object.position.z]} center>
          <div className="bg-orange-500 text-white p-1 rounded-full">
            <Lock className="w-3 h-3" />
          </div>
        </Html>
      )}
    </group>
  );
}

// Camera Controls Component
function CameraController({ 
  viewDirection 
}: { 
  viewDirection: 'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | null 
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (!viewDirection) return;
    
    const positions: Record<string, [number, number, number]> = {
      front: [0, 5, 15],
      back: [0, 5, -15],
      left: [-15, 5, 0],
      right: [15, 5, 0],
      top: [0, 20, 0.01],
      perspective: [10, 10, 10]
    };
    
    const pos = positions[viewDirection];
    camera.position.set(...pos);
    camera.lookAt(0, 0, 0);
  }, [viewDirection, camera]);
  
  return null;
}

// Main Scene Component
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
  showDimensions
}: {
  objects: Object3D[];
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  transformMode: TransformMode;
  tool: Tool;
  measurePoints: THREE.Vector3[];
  onMeasureClick: (point: THREE.Vector3) => void;
  onTransformEnd: (id: string, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void;
  showGrid: boolean;
  showDimensions: boolean;
}) {
  const handleFloorClick = (e: any) => {
    if (tool === 'measure') {
      e.stopPropagation();
      onMeasureClick(e.point.clone());
    } else {
      onSelect('', false);
    }
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={100}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />
      <hemisphereLight intensity={0.3} />

      <Environment preset="warehouse" />

      {/* Floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleFloorClick}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      
      {/* Grid */}
      {showGrid && (
        <Grid
          position={[0, 0.01, 0]}
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#e2e8f0"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#cbd5e1"
          fadeDistance={50}
          fadeStrength={1}
        />
      )}

      {/* Objects */}
      {objects.map((obj) => (
        <EditableObject
          key={obj.id}
          object={obj}
          isSelected={selectedIds.includes(obj.id)}
          onSelect={() => onSelect(obj.id, false)}
          transformMode={transformMode}
          onTransformEnd={(pos, rot, scale) => onTransformEnd(obj.id, pos, rot, scale)}
          showDimensions={showDimensions}
        />
      ))}

      {/* Measurement lines */}
      {measurePoints.length === 2 && (
        <MeasurementLine 
          start={measurePoints[0]} 
          end={measurePoints[1]} 
          visible={true}
        />
      )}
    </>
  );
}

// Toolbar Button Component
function ToolbarButton({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  disabled,
  variant = 'default'
}: { 
  icon: any; 
  label: string; 
  active?: boolean; 
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success';
}) {
  const baseClasses = "p-2 rounded-full transition-all flex items-center justify-center";
  const variantClasses = {
    default: active 
      ? "bg-hearst-green text-slate-900" 
      : "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-100 hover:bg-red-200 text-red-600",
    success: "bg-green-100 hover:bg-green-200 text-green-600"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// Color Picker Component
function ColorPicker({ 
  color, 
  onChange, 
  onClose 
}: { 
  color: string; 
  onChange: (color: string) => void; 
  onClose: () => void;
}) {
  const colors = [
    '#8AFD81', '#6BD563', '#4CAF50', '#2E7D32',
    '#ef4444', '#f97316', '#eab308', '#84cc16',
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e', '#64748b',
    '#374151', '#1f2937', '#0f172a', '#ffffff'
  ];

  return (
    <div className="absolute left-full ml-2 top-0 bg-white rounded-2xl shadow-2xl p-4 z-20 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700">Color</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-6 gap-2 mb-3">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              color === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-full cursor-pointer"
      />
    </div>
  );
}

// Main Editor Component
export default function Object3DEditor({ 
  objects: initialObjects, 
  onObjectsChange,
  onSave 
}: Object3DEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [objects, setObjects] = useState<Object3D[]>(initialObjects);
  const [groups, setGroups] = useState<ObjectGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [tool, setTool] = useState<Tool>('select');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [viewDirection, setViewDirection] = useState<'front' | 'back' | 'left' | 'right' | 'top' | 'perspective' | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Sync objects with parent
  useEffect(() => {
    setObjects(initialObjects);
  }, [initialObjects]);

  useEffect(() => {
    onObjectsChange(objects);
  }, [objects, onObjectsChange]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Selection handling
  const handleSelect = useCallback((id: string, additive: boolean) => {
    if (!id) {
      setSelectedIds([]);
      return;
    }
    
    if (additive) {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  // Transform handling
  const handleTransformEnd = useCallback((
    id: string, 
    position: THREE.Vector3, 
    rotation: THREE.Euler, 
    scale: THREE.Vector3
  ) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? {
        ...obj,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { x: scale.x, y: scale.y, z: scale.z }
      } : obj
    ));
  }, []);

  // Measure tool
  const handleMeasureClick = useCallback((point: THREE.Vector3) => {
    setMeasurePoints(prev => {
      if (prev.length >= 2) return [point];
      return [...prev, point];
    });
  }, []);

  // Color change
  const handleColorChange = useCallback((color: string) => {
    setObjects(prev => prev.map(obj => 
      selectedIds.includes(obj.id) ? { ...obj, color } : obj
    ));
  }, [selectedIds]);

  // Lock/Unlock
  const toggleLock = useCallback(() => {
    setObjects(prev => prev.map(obj => 
      selectedIds.includes(obj.id) ? { ...obj, locked: !obj.locked } : obj
    ));
  }, [selectedIds]);

  // Visibility
  const toggleVisibility = useCallback(() => {
    setObjects(prev => prev.map(obj => 
      selectedIds.includes(obj.id) ? { ...obj, visible: !obj.visible } : obj
    ));
  }, [selectedIds]);

  // Delete
  const handleDelete = useCallback(() => {
    setObjects(prev => prev.filter(obj => !selectedIds.includes(obj.id)));
    setSelectedIds([]);
  }, [selectedIds]);

  // Duplicate
  const handleDuplicate = useCallback(() => {
    const newObjects = objects
      .filter(obj => selectedIds.includes(obj.id))
      .map(obj => ({
        ...obj,
        id: `${obj.id}-copy-${Date.now()}`,
        name: `${obj.name} (copy)`,
        position: { 
          x: obj.position.x + 1, 
          y: obj.position.y, 
          z: obj.position.z + 1 
        }
      }));
    setObjects(prev => [...prev, ...newObjects]);
    setSelectedIds(newObjects.map(o => o.id));
  }, [objects, selectedIds]);

  // Grouping
  const handleGroup = useCallback(() => {
    if (selectedIds.length < 2) return;
    
    const groupId = `group-${Date.now()}`;
    const newGroup: ObjectGroup = {
      id: groupId,
      name: `Group ${groups.length + 1}`,
      objectIds: selectedIds,
      locked: false
    };
    
    setGroups(prev => [...prev, newGroup]);
    setObjects(prev => prev.map(obj => 
      selectedIds.includes(obj.id) ? { ...obj, groupId } : obj
    ));
  }, [selectedIds, groups.length]);

  const handleUngroup = useCallback(() => {
    const groupIds = new Set(
      objects
        .filter(obj => selectedIds.includes(obj.id))
        .map(obj => obj.groupId)
        .filter(Boolean)
    );
    
    setGroups(prev => prev.filter(g => !groupIds.has(g.id)));
    setObjects(prev => prev.map(obj => 
      selectedIds.includes(obj.id) ? { ...obj, groupId: undefined } : obj
    ));
  }, [objects, selectedIds]);

  // Save
  const handleSave = useCallback(() => {
    onSave?.(objects, groups);
  }, [objects, groups, onSave]);

  // Move selected objects
  const moveSelected = useCallback((dx: number, dy: number, dz: number) => {
    setObjects(prev => prev.map(obj => 
      selectedIds.includes(obj.id) && !obj.locked ? {
        ...obj,
        position: {
          x: obj.position.x + dx,
          y: Math.max(0, obj.position.y + dy), // Don't go below ground
          z: obj.position.z + dz
        }
      } : obj
    ));
  }, [selectedIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const step = e.shiftKey ? 0.1 : 0.5; // Fine control with Shift

      switch (e.key.toLowerCase()) {
        // Transform modes
        case 'v': setTool('select'); break;
        case 'g': setTransformMode('translate'); setTool('select'); break;
        case 'r': setTransformMode('rotate'); setTool('select'); break;
        case 's': if (!e.ctrlKey && !e.metaKey) { setTransformMode('scale'); setTool('select'); } break;
        case 'm': setTool('measure'); setMeasurePoints([]); break;
        case 'f': toggleFullscreen(); break;

        // Movement - WASD + QE for Y
        case 'w': case 'arrowup': e.preventDefault(); moveSelected(0, 0, -step); break;
        case 's': if (e.ctrlKey || e.metaKey) break; // Don't interfere with save
        case 'arrowdown': e.preventDefault(); moveSelected(0, 0, step); break;
        case 'a': case 'arrowleft': e.preventDefault(); moveSelected(-step, 0, 0); break;
        case 'd': case 'arrowright': e.preventDefault(); moveSelected(step, 0, 0); break;
        case 'q': e.preventDefault(); moveSelected(0, -step, 0); break; // Down
        case 'e': e.preventDefault(); moveSelected(0, step, 0); break;  // Up

        // Actions
        case 'delete': case 'backspace': if (selectedIds.length > 0) { e.preventDefault(); handleDelete(); } break;
        case 'escape': setSelectedIds([]); setTool('select'); break;

        // Views
        case '1': setViewDirection('front'); break;
        case '2': setViewDirection('back'); break;
        case '3': setViewDirection('left'); break;
        case '4': setViewDirection('right'); break;
        case '5': setViewDirection('top'); break;
        case '0': setViewDirection('perspective'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, moveSelected, handleDelete, toggleFullscreen]);

  // Export
  const handleExport = useCallback(() => {
    const data = {
      objects,
      groups,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3d-layout-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [objects, groups]);

  const selectedObject = objects.find(o => selectedIds[0] === o.id);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-slate-100 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full min-h-[700px] rounded-2xl'
      }`}
    >
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BOTTOM TOOLBAR - Main Tools */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl rounded-2xl p-1.5 shadow-xl border border-slate-200">
          {/* Transform Tools Group */}
          <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-0.5">
            <ToolbarButton 
              icon={MousePointer} 
              label="Select (V)" 
              active={tool === 'select'}
              onClick={() => setTool('select')}
            />
            <ToolbarButton 
              icon={Move} 
              label="Move (G)" 
              active={transformMode === 'translate' && tool === 'select'}
              onClick={() => { setTransformMode('translate'); setTool('select'); }}
            />
            <ToolbarButton 
              icon={RotateCcw} 
              label="Rotate (R)" 
              active={transformMode === 'rotate' && tool === 'select'}
              onClick={() => { setTransformMode('rotate'); setTool('select'); }}
            />
            <ToolbarButton 
              icon={Maximize} 
              label="Scale (S)" 
              active={transformMode === 'scale' && tool === 'select'}
              onClick={() => { setTransformMode('scale'); setTool('select'); }}
            />
          </div>

          <div className="w-px h-8 bg-slate-300 mx-1" />

          {/* Tools Group */}
          <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-0.5">
            <ToolbarButton 
              icon={Ruler} 
              label="Measure (M)" 
              active={tool === 'measure'}
              onClick={() => {
                setTool('measure');
                setMeasurePoints([]);
              }}
            />
            <div className="relative">
              <ToolbarButton 
                icon={Palette} 
                label="Color (C)" 
                active={showColorPicker}
                onClick={() => setShowColorPicker(!showColorPicker)}
                disabled={selectedIds.length === 0}
              />
              {showColorPicker && selectedObject && (
                <ColorPicker
                  color={selectedObject.color}
                  onChange={handleColorChange}
                  onClose={() => setShowColorPicker(false)}
                />
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-slate-300 mx-1" />

          {/* View Group */}
          <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-0.5">
            <ToolbarButton 
              icon={Home} 
              label="Reset View" 
              onClick={() => setViewDirection('perspective')}
            />
            <ToolbarButton 
              icon={ArrowUp} 
              label="Top View" 
              onClick={() => setViewDirection('top')}
            />
            <ToolbarButton 
              icon={ArrowDown} 
              label="Front View" 
              onClick={() => setViewDirection('front')}
            />
            <ToolbarButton 
              icon={ArrowLeft} 
              label="Left View" 
              onClick={() => setViewDirection('left')}
            />
            <ToolbarButton 
              icon={ArrowRight} 
              label="Right View" 
              onClick={() => setViewDirection('right')}
            />
          </div>

          <div className="w-px h-8 bg-slate-300 mx-1" />

          {/* Display Group */}
          <div className="flex items-center bg-slate-50 rounded-2xl p-1 gap-0.5">
            <ToolbarButton 
              icon={Grid3X3} 
              label="Toggle Grid" 
              active={showGrid}
              onClick={() => setShowGrid(!showGrid)}
            />
            <ToolbarButton 
              icon={Box} 
              label="Show Dimensions" 
              active={showDimensions}
              onClick={() => setShowDimensions(!showDimensions)}
            />
          </div>

          <div className="w-px h-8 bg-slate-300 mx-1" />

          {/* Fullscreen */}
          <ToolbarButton 
            icon={isFullscreen ? Minimize2 : Maximize2} 
            label="Fullscreen (F)" 
            onClick={toggleFullscreen}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Object Actions (only when object selected) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedIds.length > 0 && (
        <div className="absolute left-4 bottom-20 z-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-2 shadow-xl border border-slate-200 flex items-center gap-1">
            {/* Object Actions */}
            <ToolbarButton 
              icon={selectedObject?.locked ? Unlock : Lock} 
              label={selectedObject?.locked ? "Unlock" : "Lock"} 
              onClick={toggleLock}
            />
            <ToolbarButton 
              icon={selectedObject?.visible ? EyeOff : Eye} 
              label={selectedObject?.visible ? "Hide" : "Show"} 
              onClick={toggleVisibility}
            />

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Edit Actions */}
            <ToolbarButton 
              icon={Copy} 
              label="Duplicate (Ctrl+D)" 
              onClick={handleDuplicate}
            />
            <ToolbarButton 
              icon={Trash2} 
              label="Delete (Del)" 
              variant="danger"
              onClick={handleDelete}
            />

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Group Actions */}
            <ToolbarButton 
              icon={Link2} 
              label="Group Objects" 
              onClick={handleGroup}
              disabled={selectedIds.length < 2}
            />
            <ToolbarButton 
              icon={Unlink2} 
              label="Ungroup" 
              onClick={handleUngroup}
              disabled={!selectedObject?.groupId}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SCENE INFO - Top Right (when no selection) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedIds.length === 0 && objects.length > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur rounded-2xl px-4 py-2 shadow-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-4">
              <div className="text-slate-600">
                <span className="font-bold text-slate-900">{objects.length}</span> objects
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="text-slate-600">
                <span className="font-bold text-slate-900">{groups.length}</span> groups
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* RIGHT SIDEBAR - Properties Panel */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedObject && (
        <div className="absolute right-4 top-4 z-10 max-h-[calc(100%-120px)] overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-slate-200 w-64">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 pb-2 border-b border-slate-200 text-sm">
              <Settings className="w-4 h-4 text-hearst-green" />
              {selectedObject.name}
            </h3>
            
            <div className="space-y-3 text-sm">
              {/* Quick Height Control */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  Height (Y)
                  <span className="text-slate-500 font-mono">{selectedObject.position.y.toFixed(2)}m</span>
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => moveSelected(0, -0.5, 0)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 font-medium text-xs flex items-center justify-center gap-1"
                    disabled={selectedObject.locked}
                  >
                    <Minus className="w-3 h-3" /> Down
                  </button>
                  <button
                    onClick={() => moveSelected(0, 0.5, 0)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 font-medium text-xs flex items-center justify-center gap-1"
                    disabled={selectedObject.locked}
                  >
                    <Plus className="w-3 h-3" /> Up
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={selectedObject.position.y}
                  onChange={(e) => {
                    const newY = parseFloat(e.target.value);
                    setObjects(prev => prev.map(obj => 
                      obj.id === selectedObject.id ? { ...obj, position: { ...obj.position, y: newY } } : obj
                    ));
                  }}
                  className="w-full mt-2 accent-hearst-green"
                  disabled={selectedObject.locked}
                />
              </div>

              {/* Position - Editable */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Position (m)</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  <div className="bg-red-50 rounded-2xl p-1 border border-red-100">
                    <span className="text-[9px] text-red-400 block text-center">X</span>
                    <input
                      type="number"
                      value={selectedObject.position.x.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setObjects(prev => prev.map(obj => 
                          obj.id === selectedObject.id ? { ...obj, position: { ...obj.position, x: val } } : obj
                        ));
                      }}
                      className="w-full text-center font-mono text-xs bg-transparent text-red-600 font-bold focus:outline-none"
                      step="0.1"
                      disabled={selectedObject.locked}
                    />
                  </div>
                  <div className="bg-green-50 rounded-2xl p-1 border border-green-100">
                    <span className="text-[9px] text-green-400 block text-center">Y</span>
                    <input
                      type="number"
                      value={selectedObject.position.y.toFixed(2)}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        setObjects(prev => prev.map(obj => 
                          obj.id === selectedObject.id ? { ...obj, position: { ...obj.position, y: val } } : obj
                        ));
                      }}
                      className="w-full text-center font-mono text-xs bg-transparent text-green-600 font-bold focus:outline-none"
                      step="0.1"
                      min="0"
                      disabled={selectedObject.locked}
                    />
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-1 border border-blue-100">
                    <span className="text-[9px] text-blue-400 block text-center">Z</span>
                    <input
                      type="number"
                      value={selectedObject.position.z.toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setObjects(prev => prev.map(obj => 
                          obj.id === selectedObject.id ? { ...obj, position: { ...obj.position, z: val } } : obj
                        ));
                      }}
                      className="w-full text-center font-mono text-xs bg-transparent text-blue-600 font-bold focus:outline-none"
                      step="0.1"
                      disabled={selectedObject.locked}
                    />
                  </div>
                </div>
              </div>
              
              {/* Dimensions */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dimensions (mm)</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  <div className="bg-slate-50 rounded-2xl p-1 text-center border border-slate-100">
                    <span className="text-[9px] text-slate-400 block">W</span>
                    <p className="font-mono text-xs font-bold text-slate-900">{selectedObject.dimensions?.width || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-1 text-center border border-slate-100">
                    <span className="text-[9px] text-slate-400 block">H</span>
                    <p className="font-mono text-xs font-bold text-slate-900">{selectedObject.dimensions?.height || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-1 text-center border border-slate-100">
                    <span className="text-[9px] text-slate-400 block">D</span>
                    <p className="font-mono text-xs font-bold text-slate-900">{selectedObject.dimensions?.depth || 0}</p>
                  </div>
                </div>
              </div>
              
              {/* Color */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-md cursor-pointer"
                    style={{ backgroundColor: selectedObject.color }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                  <input
                    type="text"
                    value={selectedObject.color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="flex-1 font-mono text-xs bg-slate-50 rounded-full px-2 py-1.5 border border-slate-200"
                  />
                </div>
              </div>

              {/* Type Badge */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className="px-2 py-1 bg-slate-100 rounded-full text-[10px] font-medium text-slate-600">
                  {selectedObject.type}
                </span>
                {selectedObject.locked && (
                  <span className="px-2 py-1 bg-orange-100 rounded-full text-[10px] font-medium text-orange-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* KEYBOARD SHORTCUTS HELP */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 left-4 z-10">
        <details className="group">
          <summary className="bg-white/90 backdrop-blur rounded-full px-3 py-2 text-xs font-medium text-slate-600 cursor-pointer hover:bg-white shadow-lg border border-slate-200 list-none flex items-center gap-2">
            <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">?</span>
            Shortcuts
          </summary>
          <div className="mt-2 bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-slate-200 w-56 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-slate-900 pb-1 border-b border-slate-100">Navigation</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">W/↑</kbd> Forward</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">S/↓</kbd> Back</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">A/←</kbd> Left</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">D/→</kbd> Right</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">Q</kbd> Down</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">E</kbd> Up</span>
              </div>
              
              <div className="font-semibold text-slate-900 pb-1 border-b border-slate-100 pt-2">Tools</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">V</kbd> Select</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">G</kbd> Move</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">R</kbd> Rotate</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">M</kbd> Measure</span>
              </div>
              
              <div className="font-semibold text-slate-900 pb-1 border-b border-slate-100 pt-2">Views</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">0</kbd> Perspective</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">5</kbd> Top</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">1-4</kbd> Sides</span>
                <span><kbd className="bg-slate-100 px-1 rounded text-[10px]">F</kbd> Fullscreen</span>
              </div>
              
              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                Hold <kbd className="bg-slate-100 px-1 rounded">Shift</kbd> for fine control
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Measurement info */}
      {tool === 'measure' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-red-500 text-white px-4 py-2 rounded-full text-sm shadow-lg">
          {measurePoints.length === 0 
            ? 'Click first point to measure' 
            : measurePoints.length === 1 
              ? 'Click second point' 
              : `Distance: ${(measurePoints[0].distanceTo(measurePoints[1]) * 1000).toFixed(0)} mm`
          }
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas shadows>
        <CameraController viewDirection={viewDirection} />
        <Scene
          objects={objects}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          transformMode={transformMode}
          tool={tool}
          measurePoints={measurePoints}
          onMeasureClick={handleMeasureClick}
          onTransformEnd={handleTransformEnd}
          showGrid={showGrid}
          showDimensions={showDimensions}
        />
      </Canvas>
    </div>
  );
}
