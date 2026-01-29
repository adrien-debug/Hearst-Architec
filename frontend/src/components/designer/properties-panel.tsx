'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Trash2, Lock, Unlock, Eye, EyeOff, RotateCcw, Settings, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Move, RotateCw } from 'lucide-react';

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

interface PropertiesPanelProps {
  object: Object3D | null;
  onUpdate: (updates: Partial<Object3D>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function PropertiesPanel({ 
  object, 
  onUpdate, 
  onDuplicate, 
  onDelete, 
  onClose 
}: PropertiesPanelProps) {
  const [localPos, setLocalPos] = useState({ x: 0, y: 0, z: 0 });
  const [localRot, setLocalRot] = useState({ x: 0, y: 0, z: 0 });
  const [localColor, setLocalColor] = useState('#8AFD81');
  
  // Text inputs for position/rotation (allows free typing)
  const [posInputs, setPosInputs] = useState({ x: '0', y: '0', z: '0' });
  const [rotInputs, setRotInputs] = useState({ x: '0', y: '0', z: '0' });

  useEffect(() => {
    if (object) {
      setLocalPos(object.position);
      setPosInputs({
        x: object.position.x.toFixed(2),
        y: object.position.y.toFixed(2),
        z: object.position.z.toFixed(2),
      });
      const rotDegrees = {
        x: (object.rotation.x * 180 / Math.PI),
        y: (object.rotation.y * 180 / Math.PI),
        z: (object.rotation.z * 180 / Math.PI),
      };
      setLocalRot(rotDegrees);
      setRotInputs({
        x: rotDegrees.x.toFixed(0),
        y: rotDegrees.y.toFixed(0),
        z: rotDegrees.z.toFixed(0),
      });
      setLocalColor(object.color);
    }
  }, [object?.id]); // Only reset when object ID changes, not on every position update

  if (!object) return null;

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPos = { ...localPos, [axis]: value };
    setLocalPos(newPos);
    setPosInputs(prev => ({ ...prev, [axis]: value.toFixed(2) }));
    onUpdate({ position: newPos });
  };
  
  const handlePositionInputChange = (axis: 'x' | 'y' | 'z', text: string) => {
    setPosInputs(prev => ({ ...prev, [axis]: text }));
    // Update dynamically as user types
    const value = parseFloat(text);
    if (!isNaN(value)) {
      const newPos = { ...localPos, [axis]: value };
      setLocalPos(newPos);
      onUpdate({ position: newPos });
    }
  };
  
  const handlePositionBlur = (axis: 'x' | 'y' | 'z') => {
    const value = parseFloat(posInputs[axis]) || 0;
    setPosInputs(prev => ({ ...prev, [axis]: value.toFixed(2) }));
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', degrees: number) => {
    const newRot = { ...localRot, [axis]: degrees };
    setLocalRot(newRot);
    setRotInputs(prev => ({ ...prev, [axis]: degrees.toFixed(0) }));
    onUpdate({ 
      rotation: {
        x: newRot.x * Math.PI / 180,
        y: newRot.y * Math.PI / 180,
        z: newRot.z * Math.PI / 180,
      }
    });
  };
  
  const handleRotationInputChange = (axis: 'x' | 'y' | 'z', text: string) => {
    setRotInputs(prev => ({ ...prev, [axis]: text }));
    // Update dynamically as user types
    const value = parseFloat(text);
    if (!isNaN(value)) {
      const newRot = { ...localRot, [axis]: value };
      setLocalRot(newRot);
      onUpdate({ 
        rotation: {
          x: newRot.x * Math.PI / 180,
          y: newRot.y * Math.PI / 180,
          z: newRot.z * Math.PI / 180,
        }
      });
    }
  };
  
  const handleRotationBlur = (axis: 'x' | 'y' | 'z') => {
    const value = parseFloat(rotInputs[axis]) || 0;
    setRotInputs(prev => ({ ...prev, [axis]: value.toFixed(0) }));
  };

  const handleColorChange = (color: string) => {
    setLocalColor(color);
    onUpdate({ color });
  };

  const resetRotation = () => {
    setLocalRot({ x: 0, y: 0, z: 0 });
    setRotInputs({ x: '0', y: '0', z: '0' });
    onUpdate({ rotation: { x: 0, y: 0, z: 0 } });
  };

  const presetColors = [
    '#8AFD81', '#6BD563', '#4CAF50', '#2E7D32',
    '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899',
    '#f59e0b', '#ef4444', '#64748b', '#1f2937'
  ];

  return (
    <div className="absolute right-4 top-4 bottom-20 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-hearst-green" />
          <h3 className="font-bold text-slate-900">Properties</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Object Info */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Object
          </label>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="font-semibold text-slate-900">{object.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{object.type}</p>
          </div>
        </div>

        {/* Dimensions (read-only) */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Dimensions (mm)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'W', value: object.dimensions.width },
              { label: 'H', value: object.dimensions.height },
              { label: 'D', value: object.dimensions.depth },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-2 text-center">
                <span className="text-[10px] text-slate-400 block">{label}</span>
                <p className="font-mono font-semibold text-slate-900 text-sm">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Move Controls */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Déplacement rapide
          </label>
          <div className="flex items-center gap-3">
            {/* D-Pad for X/Z movement */}
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button 
                onClick={() => handlePositionChange('z', localPos.z - 1)}
                disabled={object.locked}
                className="p-2 bg-slate-100 hover:bg-hearst-green/30 rounded-lg transition-colors disabled:opacity-50"
                title="Avant (↑)"
              >
                <ChevronUp className="w-4 h-4 text-slate-600 mx-auto" />
              </button>
              <div />
              <button 
                onClick={() => handlePositionChange('x', localPos.x - 1)}
                disabled={object.locked}
                className="p-2 bg-slate-100 hover:bg-hearst-green/30 rounded-lg transition-colors disabled:opacity-50"
                title="Gauche (←)"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 mx-auto" />
              </button>
              <div className="p-2 bg-slate-50 rounded-lg flex items-center justify-center">
                <Move className="w-4 h-4 text-slate-300" />
              </div>
              <button 
                onClick={() => handlePositionChange('x', localPos.x + 1)}
                disabled={object.locked}
                className="p-2 bg-slate-100 hover:bg-hearst-green/30 rounded-lg transition-colors disabled:opacity-50"
                title="Droite (→)"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 mx-auto" />
              </button>
              <div />
              <button 
                onClick={() => handlePositionChange('z', localPos.z + 1)}
                disabled={object.locked}
                className="p-2 bg-slate-100 hover:bg-hearst-green/30 rounded-lg transition-colors disabled:opacity-50"
                title="Arrière (↓)"
              >
                <ChevronDown className="w-4 h-4 text-slate-600 mx-auto" />
              </button>
              <div />
            </div>
            
            {/* Y axis + Rotation */}
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => handlePositionChange('y', localPos.y + 1)}
                disabled={object.locked}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs text-blue-600 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Monter (A)"
              >
                <ChevronUp className="w-3 h-3" /> Y+
              </button>
              <button 
                onClick={() => handlePositionChange('y', Math.max(0, localPos.y - 1))}
                disabled={object.locked}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs text-blue-600 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Descendre (Q)"
              >
                <ChevronDown className="w-3 h-3" /> Y-
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => handleRotationChange('y', localRot.y + 90)}
                disabled={object.locked}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs text-amber-600 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Rotation +90° (S)"
              >
                <RotateCw className="w-3 h-3" /> +90°
              </button>
              <button 
                onClick={() => handleRotationChange('y', localRot.y - 90)}
                disabled={object.locked}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs text-amber-600 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Rotation -90° (E)"
              >
                <RotateCcw className="w-3 h-3" /> -90°
              </button>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">Raccourcis: ↑↓←→ déplacer, A/Q hauteur, S/E rotation</p>
        </div>

        {/* Position */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Position (m)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => {
              const colors = { x: 'bg-red-50 border-red-200 focus:ring-red-500', y: 'bg-green-50 border-green-200 focus:ring-green-500', z: 'bg-blue-50 border-blue-200 focus:ring-blue-500' };
              const textColors = { x: 'text-red-600', y: 'text-green-600', z: 'text-blue-600' };
              return (
                <div key={axis}>
                  <label className={`block text-[10px] font-semibold ${textColors[axis]} uppercase mb-1`}>{axis}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={posInputs[axis]}
                    onChange={(e) => handlePositionInputChange(axis, e.target.value)}
                    onBlur={() => handlePositionBlur(axis)}
                    disabled={object.locked}
                    className={`w-full px-2 py-1.5 rounded-lg border text-sm font-mono text-center focus:ring-2 focus:outline-none ${colors[axis]} ${object.locked ? 'opacity-50' : ''}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Rotation (°)
            </label>
            <button
              onClick={resetRotation}
              disabled={object.locked}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
              title="Reset rotation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <div key={axis}>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">{axis}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rotInputs[axis]}
                  onChange={(e) => handleRotationInputChange(axis, e.target.value)}
                  onBlur={() => handleRotationBlur(axis)}
                  disabled={object.locked}
                  className={`w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono text-center focus:ring-2 focus:ring-hearst-green focus:outline-none ${object.locked ? 'opacity-50' : ''}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Color
          </label>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-xl border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: localColor }}
            />
            <input
              type="text"
              value={localColor}
              onChange={(e) => handleColorChange(e.target.value)}
              disabled={object.locked}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono focus:ring-2 focus:ring-hearst-green focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {presetColors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                disabled={object.locked}
                className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                  localColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
                } ${object.locked ? 'opacity-50' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* State Toggles */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            State
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ locked: !object.locked })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                object.locked 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {object.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {object.locked ? 'Locked' : 'Unlocked'}
            </button>
            <button
              onClick={() => onUpdate({ visible: !object.visible })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                !object.visible 
                  ? 'bg-slate-300 text-slate-600' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {object.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {object.visible ? 'Visible' : 'Hidden'}
            </button>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
        <button
          onClick={onDuplicate}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
