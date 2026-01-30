'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  PerspectiveCamera, 
  Environment,
  Html,
  Edges,
  TransformControls
} from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';
import {
  Box,
  Circle,
  Triangle,
  Cylinder,
  Move,
  RotateCcw,
  Maximize,
  MousePointer,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Grid3X3,
  ChevronLeft,
  X,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Home,
  Package,
  Shapes,
  Search,
  Star,
  Clock,
  Database,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  RefreshCw,
  Palette,
  Settings,
  SquareStack,
  Sparkles
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PieceObject {
  id: string;
  name: string;
  type: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'plane' | 'imported';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  color: string;
  material: string;
  opacity: number;
  visible: boolean;
  locked: boolean;
  metalness: number;
  roughness: number;
}

interface SavedPiece {
  id: string;
  name: string;
  description: string;
  objects: PieceObject[];
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  isCloud?: boolean;
}

type TransformMode = 'translate' | 'rotate' | 'scale';

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════

const PRIMITIVE_SHAPES = [
  { id: 'box', name: 'Cube', icon: Box, defaultDims: { width: 1, height: 1, depth: 1 } },
  { id: 'cylinder', name: 'Cylindre', icon: Cylinder, defaultDims: { width: 1, height: 2, depth: 1 } },
  { id: 'sphere', name: 'Sphère', icon: Circle, defaultDims: { width: 1, height: 1, depth: 1 } },
  { id: 'cone', name: 'Cône', icon: Triangle, defaultDims: { width: 1, height: 2, depth: 1 } },
  { id: 'torus', name: 'Tore', icon: Circle, defaultDims: { width: 1, height: 0.3, depth: 1 } },
  { id: 'plane', name: 'Plan', icon: Layers, defaultDims: { width: 2, height: 0.01, depth: 2 } },
];

const MATERIAL_PRESETS = [
  { id: 'standard', name: 'Standard', roughness: 0.5, metalness: 0, icon: '🎨' },
  { id: 'metal-steel', name: 'Acier', roughness: 0.3, metalness: 1, icon: '🔩' },
  { id: 'metal-aluminum', name: 'Aluminium', roughness: 0.2, metalness: 0.9, icon: '✨' },
  { id: 'metal-copper', name: 'Cuivre', roughness: 0.25, metalness: 1, icon: '🟠' },
  { id: 'container', name: 'Container', roughness: 0.6, metalness: 0.8, icon: '📦' },
  { id: 'radiator', name: 'Radiateur', roughness: 0.4, metalness: 0.9, icon: '🌡️' },
  { id: 'glass', name: 'Verre', roughness: 0, metalness: 0, icon: '🪟' },
  { id: 'plastic', name: 'Plastique', roughness: 0.7, metalness: 0, icon: '🧱' },
  { id: 'rubber', name: 'Caoutchouc', roughness: 0.9, metalness: 0, icon: '⚫' },
  { id: 'concrete', name: 'Béton', roughness: 0.95, metalness: 0, icon: '🧱' },
  { id: 'wood', name: 'Bois', roughness: 0.8, metalness: 0, icon: '🪵' },
  { id: 'emissive', name: 'LED/Émissif', roughness: 1, metalness: 0, icon: '💡' },
];

const COLOR_PRESETS = [
  // Neutrals
  '#ffffff', '#f5f5f5', '#e5e7eb', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#0a0a0f',
  // Hearst Green
  '#8AFD81', '#6BD563', '#4ade80', '#22c55e', '#16a34a', '#15803d',
  // Blues
  '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af',
  // Oranges / Warning
  '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e',
  // Reds / Danger
  '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
  // Container colors
  '#e8e8e8', '#1e3a5f', '#2d4a6f', '#8b4513', '#228b22',
];

const CONTAINER_PRESETS = [
  { id: 'antspace-hd5', name: 'ANTSPACE HD5', dims: { width: 12.192, height: 2.896, depth: 2.438 }, color: '#e8e8e8' },
  { id: 'transformer-5mva', name: 'Transformer 5MVA', dims: { width: 2.5, height: 3.0, depth: 2.0 }, color: '#f59e0b' },
  { id: 'pdu', name: 'PDU', dims: { width: 2.4, height: 2.2, depth: 0.8 }, color: '#374151' },
  { id: 'cooling-ec2dt', name: 'EC2-DT Cooling', dims: { width: 12.192, height: 2.896, depth: 2.438 }, color: '#1e3a5f' },
  { id: 'switchgear', name: 'Switchgear', dims: { width: 3.0, height: 2.5, depth: 1.5 }, color: '#6b7280' },
  { id: 'ups', name: 'UPS Unit', dims: { width: 1.5, height: 2.0, depth: 1.0 }, color: '#1f2937' },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3D OBJECT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PrimitiveShape({ 
  object, 
  isSelected, 
  onClick 
}: { 
  object: PieceObject; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const getMaterialProps = () => {
    const preset = MATERIAL_PRESETS.find(m => m.id === object.material);
    const isGlass = object.material === 'glass';
    const isEmissive = object.material === 'emissive';
    
    return {
      color: object.color,
      roughness: preset?.roughness ?? object.roughness,
      metalness: preset?.metalness ?? object.metalness,
      transparent: isGlass || object.opacity < 1,
      opacity: isGlass ? 0.3 : object.opacity,
      emissive: isEmissive ? object.color : '#000000',
      emissiveIntensity: isEmissive ? 0.8 : 0,
    };
  };

  if (!object.visible) return null;

  const position: [number, number, number] = [object.position.x, object.position.y, object.position.z];
  const rotation: [number, number, number] = [object.rotation.x, object.rotation.y, object.rotation.z];
  const scale: [number, number, number] = [
    object.scale.x * object.dimensions.width,
    object.scale.y * object.dimensions.height,
    object.scale.z * object.dimensions.depth
  ];

  const renderGeometry = () => {
    switch (object.type) {
      case 'box': return <boxGeometry args={[1, 1, 1]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
      case 'torus': return <torusGeometry args={[0.5, 0.15, 16, 48]} />;
      case 'plane': return <planeGeometry args={[1, 1]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
      castShadow
      receiveShadow
    >
      {renderGeometry()}
      <meshStandardMaterial {...getMaterialProps()} />
      {isSelected && <Edges color="#8AFD81" lineWidth={3} />}
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function Scene({
  objects,
  selectedId,
  onSelectObject,
  showGrid,
}: {
  objects: PieceObject[];
  selectedId: string | null;
  onSelectObject: (id: string | null) => void;
  showGrid: boolean;
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
      <OrbitControls 
        makeDefault 
        enableDamping 
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <hemisphereLight args={['#87CEEB', '#3d3d3d', 0.3]} />

      {/* Grid */}
      {showGrid && (
        <Grid
          args={[50, 50]}
          position={[0, -0.01, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#444"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#666"
          fadeDistance={50}
          infiniteGrid
        />
      )}

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow onClick={() => onSelectObject(null)}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a24" transparent opacity={0.5} />
      </mesh>

      {/* Objects */}
      {objects.map(obj => (
        <PrimitiveShape
          key={obj.id}
          object={obj}
          isSelected={selectedId === obj.id}
          onClick={() => onSelectObject(obj.id)}
        />
      ))}

      <Environment preset="city" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function PieceEditorPage() {
  // State
  const [objects, setObjects] = useState<PieceObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [projectName, setProjectName] = useState('Nouvelle Pièce');
  const [leftTab, setLeftTab] = useState<'primitives' | 'library' | 'containers'>('primitives');
  
  // History for undo/redo
  const [history, setHistory] = useState<PieceObject[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Database state
  const [savedPieces, setSavedPieces] = useState<SavedPiece[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [currentPieceId, setCurrentPieceId] = useState<string | null>(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const selectedObject = objects.find(o => o.id === selectedId);

  // Load saved pieces on mount
  useEffect(() => {
    loadSavedPieces();
  }, []);

  // Load from localStorage and backend
  const loadSavedPieces = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load from localStorage
      const localData = localStorage.getItem('hearst-pieces-library');
      const localPieces: SavedPiece[] = localData ? JSON.parse(localData) : [];
      
      // Try to load from backend API
      try {
        const response = await fetch('/api/layouts?status=piece');
        if (response.ok) {
          const cloudData = await response.json();
          const cloudPieces = (cloudData.data || []).map((item: { id: string; name: string; objects: PieceObject[]; created_at: string; updated_at: string }) => ({
            id: item.id,
            name: item.name,
            description: '',
            objects: item.objects || [],
            category: 'cloud',
            tags: [],
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            isCloud: true,
          }));
          setSavedPieces([...localPieces, ...cloudPieces]);
        } else {
          setSavedPieces(localPieces);
        }
      } catch {
        setSavedPieces(localPieces);
      }
    } catch (e) {
      console.error('Failed to load pieces:', e);
    }
    setIsLoading(false);
  }, []);

  // Save to history
  const saveToHistory = useCallback((newObjects: PieceObject[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newObjects]);
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Add object
  const addObject = useCallback((type: PieceObject['type'], dims?: { width: number; height: number; depth: number }, color?: string, material?: string) => {
    const shape = PRIMITIVE_SHAPES.find(s => s.id === type);
    const dimensions = dims || shape?.defaultDims || { width: 1, height: 1, depth: 1 };
    const newObject: PieceObject = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${shape?.name || 'Objet'} ${objects.length + 1}`,
      type,
      position: { x: 0, y: dimensions.height / 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions,
      color: color || '#8AFD81',
      material: material || 'standard',
      opacity: 1,
      visible: true,
      locked: false,
      metalness: 0,
      roughness: 0.5,
    };
    const newObjects = [...objects, newObject];
    setObjects(newObjects);
    setSelectedId(newObject.id);
    saveToHistory(newObjects);
  }, [objects, saveToHistory]);

  // Update object
  const updateObject = useCallback((id: string, updates: Partial<PieceObject>) => {
    setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
  }, []);

  // Delete object
  const deleteObject = useCallback((id: string) => {
    const newObjects = objects.filter(o => o.id !== id);
    setObjects(newObjects);
    if (selectedId === id) setSelectedId(null);
    saveToHistory(newObjects);
  }, [objects, selectedId, saveToHistory]);

  // Duplicate object
  const duplicateObject = useCallback((id: string) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    
    const newObject: PieceObject = {
      ...obj,
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${obj.name} (copie)`,
      position: { x: obj.position.x + 1, y: obj.position.y, z: obj.position.z + 1 },
    };
    const newObjects = [...objects, newObject];
    setObjects(newObjects);
    setSelectedId(newObject.id);
    saveToHistory(newObjects);
  }, [objects, saveToHistory]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setObjects(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setObjects(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Save to database
  const saveToDatabase = useCallback(async (name: string, description: string, category: string) => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const pieceData: SavedPiece = {
        id: currentPieceId || `piece-${Date.now()}`,
        name,
        description,
        objects: [...objects],
        category,
        tags: [],
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      const existing = localStorage.getItem('hearst-pieces-library');
      const pieces: SavedPiece[] = existing ? JSON.parse(existing) : [];
      const existingIndex = pieces.findIndex(p => p.id === pieceData.id);
      
      if (existingIndex >= 0) {
        pieces[existingIndex] = pieceData;
      } else {
        pieces.push(pieceData);
      }
      
      localStorage.setItem('hearst-pieces-library', JSON.stringify(pieces));
      
      // Try to save to backend
      try {
        const endpoint = currentPieceId ? `/api/layouts/${currentPieceId}` : '/api/layouts';
        const method = currentPieceId ? 'PUT' : 'POST';
        
        await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            status: 'piece',
            objects,
          }),
        });
      } catch {
        // Backend save failed, but localStorage succeeded
      }
      
      setSaveMessage('✓ Sauvegardé');
      setShowSaveModal(false);
      setProjectName(name);
      loadSavedPieces();
    } catch (e) {
      setSaveMessage('✗ Erreur de sauvegarde');
      console.error(e);
    }
    
    setIsSaving(false);
    setTimeout(() => setSaveMessage(null), 3000);
  }, [objects, currentPieceId, loadSavedPieces]);

  // Load piece
  const loadPiece = useCallback((piece: SavedPiece) => {
    setObjects(piece.objects.map(obj => ({
      ...obj,
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    })));
    setProjectName(piece.name);
    setCurrentPieceId(piece.id);
    saveToHistory(piece.objects);
  }, [saveToHistory]);

  // Export as JSON
  const exportAsJSON = useCallback(() => {
    const data = { name: projectName, objects, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectName, objects]);

  // Import JSON
  const importFromJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.objects && Array.isArray(data.objects)) {
          setObjects(data.objects);
          if (data.name) setProjectName(data.name);
          saveToHistory(data.objects);
        }
      } catch {
        alert('Erreur lors de l\'importation');
      }
    };
    reader.readAsText(file);
  }, [saveToHistory]);

  // Import container preset
  const importContainer = useCallback((preset: typeof CONTAINER_PRESETS[0]) => {
    addObject('box', preset.dims, preset.color, 'container');
    setObjects(prev => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0) {
        const updated = [...prev];
        updated[lastIdx] = { ...updated[lastIdx], name: preset.name };
        return updated;
      }
      return prev;
    });
  }, [addObject]);

  // Select all
  const selectAll = useCallback(() => {
    if (objects.length > 0) {
      setSelectedId(objects[0].id);
    }
  }, [objects]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 bg-[#111118] border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Link href="/designer" className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </Link>
          <div className="h-6 w-px bg-slate-700" />
          <Shapes className="w-5 h-5 text-purple-400" />
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-white font-semibold text-lg border-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 rounded px-2 py-1 w-48"
          />
          {currentPieceId && <span title="Synced"><Cloud className="w-4 h-4 text-green-400" /></span>}
        </div>

        {/* Center - Tools */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-full px-2 py-1">
          {[
            { mode: 'translate' as const, icon: Move, label: 'Déplacer' },
            { mode: 'rotate' as const, icon: RotateCcw, label: 'Rotation' },
            { mode: 'scale' as const, icon: Maximize, label: 'Échelle' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setTransformMode(mode)}
              className={`p-2 rounded-full transition-colors ${transformMode === mode ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-6 bg-slate-600 mx-1" />
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors" title="Annuler">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors" title="Rétablir">
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-600 mx-1" />
          <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-full transition-colors ${showGrid ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`} title="Grille">
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className={`px-3 py-1 rounded-full text-sm ${saveMessage.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {saveMessage}
            </span>
          )}
          <button onClick={() => setShowSaveModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors">
            <Database className="w-4 h-4" />
            <span className="text-sm">Sauvegarder</span>
          </button>
          <button onClick={exportAsJSON} className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm">Exporter</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 bg-[#111118] border-r border-slate-700 flex flex-col flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {[
              { id: 'primitives' as const, label: 'Formes', icon: Shapes },
              { id: 'containers' as const, label: 'Containers', icon: Package },
              { id: 'library' as const, label: 'Bibliothèque', icon: Database },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                className={`flex-1 px-2 py-3 text-xs font-medium transition-colors ${leftTab === tab.id ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}`}
              >
                <tab.icon className="w-4 h-4 mx-auto mb-1" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {leftTab === 'primitives' && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Formes de base</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PRIMITIVE_SHAPES.map(shape => (
                    <button
                      key={shape.id}
                      onClick={() => addObject(shape.id as PieceObject['type'])}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 transition-all"
                    >
                      <shape.icon className="w-5 h-5 text-purple-400" />
                      <span className="text-xs text-slate-300">{shape.name}</span>
                    </button>
                  ))}
                </div>
                
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 mt-4">Importer JSON</h3>
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-500/50 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">Importer fichier</span>
                  <input type="file" accept=".json" onChange={(e) => e.target.files?.[0] && importFromJSON(e.target.files[0])} className="hidden" />
                </label>
              </>
            )}

            {leftTab === 'containers' && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Équipements Mining</h3>
                <div className="space-y-2">
                  {CONTAINER_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => importContainer(preset)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: preset.color }}>
                        <Package className="w-4 h-4 text-white/80" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{preset.name}</div>
                        <div className="text-xs text-slate-500">{preset.dims.width.toFixed(2)} × {preset.dims.height.toFixed(2)} × {preset.dims.depth.toFixed(2)}m</div>
                      </div>
                      <Plus className="w-4 h-4 text-amber-400" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {leftTab === 'library' && (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-full text-white text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase">Pièces sauvegardées</h3>
                  <button onClick={loadSavedPieces} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : savedPieces.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Aucune pièce sauvegardée
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedPieces.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(piece => (
                      <button
                        key={piece.id}
                        onClick={() => loadPiece(piece)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                          {piece.isCloud ? <Cloud className="w-5 h-5 text-blue-400" /> : <Box className="w-5 h-5 text-purple-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium truncate">{piece.name}</div>
                          <div className="text-xs text-slate-500">{piece.objects.length} objets</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Canvas shadows className="bg-[#0a0a0f]">
            <Scene
              objects={objects}
              selectedId={selectedId}
              onSelectObject={setSelectedId}
              showGrid={showGrid}
            />
          </Canvas>

          {/* Info overlay */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-slate-800/80 backdrop-blur text-xs text-slate-400">
              {objects.length} objets
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-slate-800/80 backdrop-blur rounded-full p-1">
            <button className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <Home className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-72 bg-[#111118] border-l border-slate-700 flex flex-col flex-shrink-0 overflow-hidden">
          {selectedObject ? (
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="p-3 border-b border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold text-sm">Propriétés</h3>
                  <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedObject.name}
                  onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Transform */}
              <div className="p-3 border-b border-slate-700">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Position (m)</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(['x', 'y', 'z'] as const).map(axis => (
                    <div key={axis} className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 uppercase">{axis}</span>
                      <input
                        type="number"
                        value={selectedObject.position[axis].toFixed(2)}
                        onChange={(e) => updateObject(selectedObject.id, { position: { ...selectedObject.position, [axis]: parseFloat(e.target.value) || 0 } })}
                        step={0.1}
                        className="w-full pl-6 pr-1 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs text-right focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  ))}
                </div>
                
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 mt-3">Dimensions (m)</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[{ key: 'width', label: 'L' }, { key: 'height', label: 'H' }, { key: 'depth', label: 'P' }].map(dim => (
                    <div key={dim.key} className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">{dim.label}</span>
                      <input
                        type="number"
                        value={selectedObject.dimensions[dim.key as keyof typeof selectedObject.dimensions].toFixed(2)}
                        onChange={(e) => updateObject(selectedObject.id, { dimensions: { ...selectedObject.dimensions, [dim.key]: parseFloat(e.target.value) || 0.1 } })}
                        step={0.1}
                        min={0.01}
                        className="w-full pl-6 pr-1 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs text-right focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Material */}
              <div className="p-3 border-b border-slate-700">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Matériau</h4>
                <div className="grid grid-cols-4 gap-1">
                  {MATERIAL_PRESETS.map(mat => (
                    <button
                      key={mat.id}
                      onClick={() => updateObject(selectedObject.id, { material: mat.id, metalness: mat.metalness, roughness: mat.roughness })}
                      className={`p-2 rounded-lg text-center transition-colors ${selectedObject.material === mat.id ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      title={mat.name}
                    >
                      <span className="text-sm">{mat.icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="p-3 border-b border-slate-700">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Couleur</h4>
                <div className="grid grid-cols-10 gap-1 mb-2">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      onClick={() => updateObject(selectedObject.id, { color })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedObject.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={selectedObject.color} onChange={(e) => updateObject(selectedObject.id, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  <input
                    type="text"
                    value={selectedObject.color}
                    onChange={(e) => updateObject(selectedObject.id, { color: e.target.value })}
                    className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => duplicateObject(selectedObject.id)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs transition-colors">
                    <Copy className="w-3 h-3" /> Dupliquer
                  </button>
                  <button
                    onClick={() => updateObject(selectedObject.id, { locked: !selectedObject.locked })}
                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors ${selectedObject.locked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                  >
                    {selectedObject.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {selectedObject.locked ? 'Locked' : 'Lock'}
                  </button>
                  <button
                    onClick={() => updateObject(selectedObject.id, { visible: !selectedObject.visible })}
                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors ${!selectedObject.visible ? 'bg-slate-600/50 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                  >
                    {selectedObject.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {selectedObject.visible ? 'Visible' : 'Hidden'}
                  </button>
                  <button onClick={() => deleteObject(selectedObject.id)} className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors">
                    <Trash2 className="w-3 h-3" /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-slate-500">
                <MousePointer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sélectionnez un objet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar - Objects List */}
      <div className="h-16 bg-[#111118] border-t border-slate-700 flex items-center px-4 gap-2 overflow-x-auto flex-shrink-0">
        <span className="text-xs text-slate-500 uppercase mr-2 flex-shrink-0">Objets:</span>
        {objects.map(obj => (
          <button
            key={obj.id}
            onClick={() => setSelectedId(obj.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${selectedId === obj.id ? 'bg-purple-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: obj.color }} />
            <span className="text-xs whitespace-nowrap">{obj.name}</span>
            {obj.locked && <Lock className="w-3 h-3" />}
          </button>
        ))}
        {objects.length === 0 && <span className="text-slate-600 text-sm">Ajoutez des formes depuis le panneau de gauche</span>}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111118] rounded-2xl border border-slate-700 w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Sauvegarder la pièce</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              saveToDatabase(
                formData.get('name') as string,
                formData.get('description') as string,
                formData.get('category') as string
              );
            }}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Nom</label>
                  <input name="name" type="text" defaultValue={projectName} required className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Description</label>
                  <textarea name="description" rows={2} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50 resize-none" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Catégorie</label>
                  <select name="category" defaultValue="custom" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50">
                    <option value="containers">Containers</option>
                    <option value="electrical">Électrique</option>
                    <option value="cooling">Refroidissement</option>
                    <option value="custom">Personnalisé</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowSaveModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
