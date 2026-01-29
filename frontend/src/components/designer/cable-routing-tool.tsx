'use client';

import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { 
  Cable,
  Route,
  GitBranch,
  CornerDownRight,
  ArrowRightLeft,
  Box,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Layers,
  Settings,
  Zap,
  Network,
  ChevronDown,
  ChevronUp,
  Move,
  RotateCcw,
  Copy,
  Lock,
  Unlock,
  Grid,
  Magnet,
  Ruler,
  PenTool,
  MousePointer,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CablePoint {
  id: string;
  position: THREE.Vector3;
  type: 'start' | 'waypoint' | 'end' | 'junction' | 'branch';
  connectedTo?: string[]; // IDs of connected cable segments
  objectId?: string; // ID of connected infrastructure object
}

export interface CableSegment {
  id: string;
  startPointId: string;
  endPointId: string;
  type: 'ladder' | 'wire-mesh' | 'conduit' | 'busbar';
  width: number;  // mm
  height: number; // mm
  cableCount: number;
  cableTypes: ('power' | 'data' | 'control' | 'earth')[];
  color: string;
  locked: boolean;
  visible: boolean;
}

export interface CableRoute {
  id: string;
  name: string;
  segments: CableSegment[];
  points: CablePoint[];
  routeType: 'main' | 'branch' | 'feeder';
  voltage: 'hv' | 'mv' | 'lv' | 'data';
  totalLength: number; // meters
  color: string;
  visible: boolean;
}

export interface CableFitting {
  id: string;
  type: 'elbow-90' | 'elbow-45' | 'tee' | 'cross' | 'reducer' | 'end-cap' | 'junction-box';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  width: number;
  connectedSegments: string[];
}

export interface SnapPoint {
  position: THREE.Vector3;
  objectId: string;
  objectName: string;
  type: 'connection' | 'edge' | 'center' | 'corner';
  direction?: THREE.Vector3;
}

export type CableToolMode = 'select' | 'draw' | 'edit' | 'delete' | 'junction';

export interface CableRoutingState {
  mode: CableToolMode;
  activeRouteId: string | null;
  selectedSegmentIds: string[];
  selectedPointIds: string[];
  isDrawing: boolean;
  drawingPoints: THREE.Vector3[];
  previewPoint: THREE.Vector3 | null;
  snapEnabled: boolean;
  snapRadius: number;
  autoFitting: boolean;
  showLabels: boolean;
  showDimensions: boolean;
  defaultTrayType: 'ladder' | 'wire-mesh' | 'conduit' | 'busbar';
  defaultWidth: number;
  defaultHeight: number;
  gridSnap: boolean;
  gridSize: number;
}

interface CableRoutingToolProps {
  routes: CableRoute[];
  onRoutesChange: (routes: CableRoute[]) => void;
  snapPoints: SnapPoint[];
  selectedObjectIds: string[];
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const generateId = () => `cable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const calculateDistance = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  return p1.distanceTo(p2);
};

const calculateAngle = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  return Math.atan2(dz, dx);
};

const detectFittingType = (
  prevPoint: THREE.Vector3 | null,
  currentPoint: THREE.Vector3,
  nextPoint: THREE.Vector3 | null
): CableFitting['type'] | null => {
  if (!prevPoint || !nextPoint) return null;
  
  const angle1 = calculateAngle(prevPoint, currentPoint);
  const angle2 = calculateAngle(currentPoint, nextPoint);
  const angleDiff = Math.abs(angle2 - angle1);
  
  // Normalize to 0-180
  const normalizedAngle = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
  
  if (normalizedAngle > Math.PI * 0.4 && normalizedAngle < Math.PI * 0.6) {
    return 'elbow-90';
  } else if (normalizedAngle > Math.PI * 0.2 && normalizedAngle < Math.PI * 0.3) {
    return 'elbow-45';
  }
  
  return null;
};

const snapToGrid = (point: THREE.Vector3, gridSize: number): THREE.Vector3 => {
  return new THREE.Vector3(
    Math.round(point.x / gridSize) * gridSize,
    Math.round(point.y / gridSize) * gridSize,
    Math.round(point.z / gridSize) * gridSize
  );
};

const findNearestSnapPoint = (
  position: THREE.Vector3,
  snapPoints: SnapPoint[],
  radius: number
): SnapPoint | null => {
  let nearest: SnapPoint | null = null;
  let minDistance = radius;
  
  for (const sp of snapPoints) {
    const dist = position.distanceTo(sp.position);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = sp;
    }
  }
  
  return nearest;
};

// ═══════════════════════════════════════════════════════════════════════════
// CABLE TRAY PRESETS
// ═══════════════════════════════════════════════════════════════════════════

const TRAY_PRESETS = {
  'power-main': {
    type: 'ladder' as const,
    width: 600,
    height: 100,
    name: 'Chemin Principal HT/BT',
    color: '#71717a',
    cableTypes: ['power', 'earth'] as ('power' | 'earth')[],
    voltage: 'mv' as const,
  },
  'power-branch': {
    type: 'ladder' as const,
    width: 300,
    height: 100,
    name: 'Dérivation Puissance',
    color: '#71717a',
    cableTypes: ['power', 'earth'] as ('power' | 'earth')[],
    voltage: 'lv' as const,
  },
  'data-main': {
    type: 'wire-mesh' as const,
    width: 200,
    height: 60,
    name: 'Réseau Data Principal',
    color: '#3b82f6',
    cableTypes: ['data'] as ('data')[],
    voltage: 'data' as const,
  },
  'control': {
    type: 'conduit' as const,
    width: 50,
    height: 50,
    name: 'Câbles de Contrôle',
    color: '#f59e0b',
    cableTypes: ['control'] as ('control')[],
    voltage: 'lv' as const,
  },
  'busbar': {
    type: 'busbar' as const,
    width: 100,
    height: 150,
    name: 'Jeu de Barres',
    color: '#b45309',
    cableTypes: ['power'] as ('power')[],
    voltage: 'mv' as const,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const ToolButton = memo(function ToolButton({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  disabled,
  size = 'md'
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  active?: boolean; 
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-2';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses} rounded-lg transition-all flex items-center justify-center
        ${active 
          ? 'bg-emerald-500 text-white shadow-sm' 
          : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
      title={label}
    >
      <Icon className={iconSize} />
    </button>
  );
});

const PresetButton = memo(function PresetButton({
  preset,
  label,
  active,
  onClick
}: {
  preset: keyof typeof TRAY_PRESETS;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const config = TRAY_PRESETS[preset];
  
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
        ${active 
          ? 'bg-slate-900 text-white' 
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}
      `}
    >
      <div 
        className="w-3 h-3 rounded-sm"
        style={{ backgroundColor: config.color }}
      />
      <span className="font-medium">{label}</span>
      <span className="text-xs opacity-60">{config.width}mm</span>
    </button>
  );
});

const StatDisplay = memo(function StatDisplay({
  label,
  value,
  unit
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">
        {value}{unit && <span className="text-xs text-slate-500 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CableRoutingTool({
  routes,
  onRoutesChange,
  snapPoints,
  selectedObjectIds,
  onClose
}: CableRoutingToolProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  
  const [state, setState] = useState<CableRoutingState>({
    mode: 'draw',
    activeRouteId: null,
    selectedSegmentIds: [],
    selectedPointIds: [],
    isDrawing: false,
    drawingPoints: [],
    previewPoint: null,
    snapEnabled: true,
    snapRadius: 0.5, // meters
    autoFitting: true,
    showLabels: true,
    showDimensions: true,
    defaultTrayType: 'ladder',
    defaultWidth: 300,
    defaultHeight: 100,
    gridSnap: true,
    gridSize: 0.25, // meters (25cm grid)
  });
  
  const [activePreset, setActivePreset] = useState<keyof typeof TRAY_PRESETS>('power-branch');
  const [showSettings, setShowSettings] = useState(false);
  const [showRouteList, setShowRouteList] = useState(true);
  
  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────
  
  const activeRoute = useMemo(() => {
    return routes.find(r => r.id === state.activeRouteId) || null;
  }, [routes, state.activeRouteId]);
  
  const totalStats = useMemo(() => {
    let totalLength = 0;
    let segmentCount = 0;
    let pointCount = 0;
    
    routes.forEach(route => {
      totalLength += route.totalLength;
      segmentCount += route.segments.length;
      pointCount += route.points.length;
    });
    
    return { totalLength, segmentCount, pointCount, routeCount: routes.length };
  }, [routes]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const setMode = useCallback((mode: CableToolMode) => {
    setState(prev => ({
      ...prev,
      mode,
      isDrawing: false,
      drawingPoints: [],
      previewPoint: null,
    }));
  }, []);
  
  const handlePresetChange = useCallback((preset: keyof typeof TRAY_PRESETS) => {
    const config = TRAY_PRESETS[preset];
    setActivePreset(preset);
    setState(prev => ({
      ...prev,
      defaultTrayType: config.type,
      defaultWidth: config.width,
      defaultHeight: config.height,
    }));
  }, []);
  
  const createNewRoute = useCallback(() => {
    const config = TRAY_PRESETS[activePreset];
    const newRoute: CableRoute = {
      id: generateId(),
      name: `Route ${routes.length + 1} - ${config.name}`,
      segments: [],
      points: [],
      routeType: config.voltage === 'data' ? 'branch' : 'main',
      voltage: config.voltage,
      totalLength: 0,
      color: config.color,
      visible: true,
    };
    
    onRoutesChange([...routes, newRoute]);
    setState(prev => ({
      ...prev,
      activeRouteId: newRoute.id,
      mode: 'draw',
    }));
  }, [routes, onRoutesChange, activePreset]);
  
  const deleteRoute = useCallback((routeId: string) => {
    onRoutesChange(routes.filter(r => r.id !== routeId));
    if (state.activeRouteId === routeId) {
      setState(prev => ({ ...prev, activeRouteId: null }));
    }
  }, [routes, onRoutesChange, state.activeRouteId]);
  
  const toggleRouteVisibility = useCallback((routeId: string) => {
    onRoutesChange(routes.map(r => 
      r.id === routeId ? { ...r, visible: !r.visible } : r
    ));
  }, [routes, onRoutesChange]);
  
  const duplicateRoute = useCallback((routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    const newRoute: CableRoute = {
      ...route,
      id: generateId(),
      name: `${route.name} (Copy)`,
      points: route.points.map(p => ({
        ...p,
        id: generateId(),
        position: p.position.clone().add(new THREE.Vector3(2, 0, 0)),
      })),
      segments: route.segments.map(s => ({
        ...s,
        id: generateId(),
      })),
    };
    
    onRoutesChange([...routes, newRoute]);
  }, [routes, onRoutesChange]);
  
  const handlePointClick = useCallback((position: THREE.Vector3) => {
    if (state.mode !== 'draw' || !state.activeRouteId) return;
    
    let finalPosition = position.clone();
    
    // Apply grid snap
    if (state.gridSnap) {
      finalPosition = snapToGrid(finalPosition, state.gridSize);
    }
    
    // Apply object snap
    if (state.snapEnabled) {
      const nearestSnap = findNearestSnapPoint(finalPosition, snapPoints, state.snapRadius);
      if (nearestSnap) {
        finalPosition = nearestSnap.position.clone();
      }
    }
    
    // Add point to drawing
    const newPoints = [...state.drawingPoints, finalPosition];
    
    setState(prev => ({
      ...prev,
      drawingPoints: newPoints,
      isDrawing: true,
    }));
    
    // If we have at least 2 points, create a segment
    if (newPoints.length >= 2) {
      const route = routes.find(r => r.id === state.activeRouteId);
      if (!route) return;
      
      const startPoint = newPoints[newPoints.length - 2];
      const endPoint = newPoints[newPoints.length - 1];
      const config = TRAY_PRESETS[activePreset];
      
      // Create points
      const startPointObj: CablePoint = {
        id: generateId(),
        position: startPoint,
        type: route.points.length === 0 ? 'start' : 'waypoint',
      };
      
      const endPointObj: CablePoint = {
        id: generateId(),
        position: endPoint,
        type: 'waypoint',
      };
      
      // Create segment
      const segment: CableSegment = {
        id: generateId(),
        startPointId: startPointObj.id,
        endPointId: endPointObj.id,
        type: config.type,
        width: config.width,
        height: config.height,
        cableCount: 6,
        cableTypes: config.cableTypes,
        color: config.color,
        locked: false,
        visible: true,
      };
      
      // Calculate length
      const segmentLength = calculateDistance(startPoint, endPoint);
      
      // Update route
      const updatedRoute: CableRoute = {
        ...route,
        points: [...route.points, startPointObj, endPointObj],
        segments: [...route.segments, segment],
        totalLength: route.totalLength + segmentLength,
      };
      
      onRoutesChange(routes.map(r => 
        r.id === state.activeRouteId ? updatedRoute : r
      ));
    }
  }, [state, routes, onRoutesChange, snapPoints, activePreset]);
  
  const finishDrawing = useCallback(() => {
    if (!state.isDrawing || !state.activeRouteId) return;
    
    // Mark last point as end
    const route = routes.find(r => r.id === state.activeRouteId);
    if (route && route.points.length > 0) {
      const lastPoint = route.points[route.points.length - 1];
      const updatedPoints = route.points.map(p => 
        p.id === lastPoint.id ? { ...p, type: 'end' as const } : p
      );
      
      onRoutesChange(routes.map(r =>
        r.id === state.activeRouteId ? { ...r, points: updatedPoints } : r
      ));
    }
    
    setState(prev => ({
      ...prev,
      isDrawing: false,
      drawingPoints: [],
    }));
  }, [state, routes, onRoutesChange]);
  
  const cancelDrawing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDrawing: false,
      drawingPoints: [],
      previewPoint: null,
    }));
  }, []);
  
  const toggleSetting = useCallback((key: keyof CableRoutingState) => {
    setState(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mode shortcuts
      if (e.key === 'v' || e.key === 'V') setMode('select');
      if (e.key === 'p' || e.key === 'P') setMode('draw');
      if (e.key === 'e' || e.key === 'E') setMode('edit');
      if (e.key === 'j' || e.key === 'J') setMode('junction');
      if (e.key === 'Delete' || e.key === 'Backspace') setMode('delete');
      
      // Drawing shortcuts
      if (e.key === 'Escape') cancelDrawing();
      if (e.key === 'Enter') finishDrawing();
      
      // Toggle shortcuts
      if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleSetting('snapEnabled');
      }
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleSetting('gridSnap');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode, cancelDrawing, finishDrawing, toggleSetting]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <div className="absolute right-4 top-20 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40">
      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cable className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold">Câblage Intelligent</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Tracé professionnel • Raccordement automatique
        </p>
      </div>
      
      {/* ═══ TOOLBAR ═══ */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1">
          <ToolButton 
            icon={MousePointer} 
            label="Sélection (V)" 
            active={state.mode === 'select'} 
            onClick={() => setMode('select')} 
          />
          <ToolButton 
            icon={PenTool} 
            label="Tracer (P)" 
            active={state.mode === 'draw'} 
            onClick={() => setMode('draw')} 
          />
          <ToolButton 
            icon={Move} 
            label="Éditer (E)" 
            active={state.mode === 'edit'} 
            onClick={() => setMode('edit')} 
          />
          <ToolButton 
            icon={GitBranch} 
            label="Jonction (J)" 
            active={state.mode === 'junction'} 
            onClick={() => setMode('junction')} 
          />
          <ToolButton 
            icon={Trash2} 
            label="Supprimer (Del)" 
            active={state.mode === 'delete'} 
            onClick={() => setMode('delete')} 
          />
          
          <div className="w-px h-6 bg-slate-300 mx-1" />
          
          <ToolButton 
            icon={Magnet} 
            label="Snap (S)" 
            active={state.snapEnabled} 
            onClick={() => toggleSetting('snapEnabled')} 
          />
          <ToolButton 
            icon={Grid} 
            label="Grille (G)" 
            active={state.gridSnap} 
            onClick={() => toggleSetting('gridSnap')} 
          />
          <ToolButton 
            icon={Ruler} 
            label="Dimensions" 
            active={state.showDimensions} 
            onClick={() => toggleSetting('showDimensions')} 
          />
          
          <div className="w-px h-6 bg-slate-300 mx-1" />
          
          <ToolButton 
            icon={Settings} 
            label="Paramètres" 
            active={showSettings} 
            onClick={() => setShowSettings(!showSettings)} 
          />
        </div>
      </div>
      
      {/* ═══ PRESETS ═══ */}
      <div className="px-3 py-2 border-b border-slate-200">
        <p className="text-xs text-slate-500 font-medium mb-2">TYPE DE CHEMIN</p>
        <div className="flex flex-wrap gap-1.5">
          <PresetButton 
            preset="power-main" 
            label="Principal" 
            active={activePreset === 'power-main'} 
            onClick={() => handlePresetChange('power-main')} 
          />
          <PresetButton 
            preset="power-branch" 
            label="Dérivation" 
            active={activePreset === 'power-branch'} 
            onClick={() => handlePresetChange('power-branch')} 
          />
          <PresetButton 
            preset="data-main" 
            label="Data" 
            active={activePreset === 'data-main'} 
            onClick={() => handlePresetChange('data-main')} 
          />
          <PresetButton 
            preset="control" 
            label="Contrôle" 
            active={activePreset === 'control'} 
            onClick={() => handlePresetChange('control')} 
          />
          <PresetButton 
            preset="busbar" 
            label="Busbar" 
            active={activePreset === 'busbar'} 
            onClick={() => handlePresetChange('busbar')} 
          />
        </div>
      </div>
      
      {/* ═══ SETTINGS PANEL (Collapsible) ═══ */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="text-xs text-slate-500">Rayon Snap</label>
              <div className="flex items-center gap-1 mt-1">
                <input 
                  type="range" 
                  min="0.1" 
                  max="2" 
                  step="0.1"
                  value={state.snapRadius}
                  onChange={(e) => setState(prev => ({ ...prev, snapRadius: parseFloat(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-xs w-8">{state.snapRadius}m</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Grille</label>
              <div className="flex items-center gap-1 mt-1">
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.05"
                  value={state.gridSize}
                  onChange={(e) => setState(prev => ({ ...prev, gridSize: parseFloat(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-xs w-10">{(state.gridSize * 100).toFixed(0)}cm</span>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input 
                  type="checkbox"
                  checked={state.autoFitting}
                  onChange={() => toggleSetting('autoFitting')}
                  className="rounded border-slate-300"
                />
                Raccords automatiques (coudes, T)
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* ═══ DRAWING STATUS ═══ */}
      {state.isDrawing && (
        <div className="px-3 py-2 border-b border-slate-200 bg-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">
                Tracé en cours ({state.drawingPoints.length} points)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={finishDrawing}
                className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-lg hover:bg-emerald-600"
              >
                <Check className="w-3 h-3 inline mr-1" />
                Terminer
              </button>
              <button
                onClick={cancelDrawing}
                className="px-2 py-1 bg-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-300"
              >
                <X className="w-3 h-3 inline mr-1" />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ═══ ROUTES LIST ═══ */}
      <div className="border-b border-slate-200">
        <button
          onClick={() => setShowRouteList(!showRouteList)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">Routes ({routes.length})</span>
          </div>
          {showRouteList ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {showRouteList && (
          <div className="px-2 pb-2">
            {/* Add Route Button */}
            <button
              onClick={createNewRoute}
              className="w-full px-3 py-2 mb-2 flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Route
            </button>
            
            {/* Routes */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {routes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Aucune route. Cliquez sur "Nouvelle Route" pour commencer.
                </p>
              ) : (
                routes.map(route => (
                  <div
                    key={route.id}
                    onClick={() => setState(prev => ({ ...prev, activeRouteId: route.id }))}
                    className={`
                      flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
                      ${state.activeRouteId === route.id 
                        ? 'bg-slate-900 text-white' 
                        : 'hover:bg-slate-100'}
                    `}
                  >
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: route.color }}
                    />
                    <span className="text-xs font-medium flex-1 truncate">
                      {route.name}
                    </span>
                    <span className="text-xs opacity-60">
                      {route.totalLength.toFixed(1)}m
                    </span>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleRouteVisibility(route.id); }}
                        className={`p-1 rounded hover:bg-white/20 ${state.activeRouteId === route.id ? '' : 'hover:bg-slate-200'}`}
                      >
                        {route.visible ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3 opacity-50" />
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicateRoute(route.id); }}
                        className={`p-1 rounded hover:bg-white/20 ${state.activeRouteId === route.id ? '' : 'hover:bg-slate-200'}`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRoute(route.id); }}
                        className={`p-1 rounded hover:bg-red-500 hover:text-white ${state.activeRouteId === route.id ? '' : 'hover:bg-red-100 hover:text-red-600'}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* ═══ STATS ═══ */}
      <div className="px-3 py-2 bg-slate-50">
        <div className="grid grid-cols-4 gap-2">
          <StatDisplay label="Routes" value={totalStats.routeCount} />
          <StatDisplay label="Segments" value={totalStats.segmentCount} />
          <StatDisplay label="Points" value={totalStats.pointCount} />
          <StatDisplay label="Total" value={totalStats.totalLength.toFixed(1)} unit="m" />
        </div>
      </div>
      
      {/* ═══ QUICK TIPS ═══ */}
      <div className="px-3 py-2 bg-slate-100 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          💡 <strong>Raccourcis:</strong> P=Tracer, V=Sélection, S=Snap, G=Grille, Entrée=Terminer, Échap=Annuler
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { TRAY_PRESETS };
export type { CableRoutingToolProps };
