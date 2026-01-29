'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Package, Wind, Zap, Server, Network, Box, Layers, Search, Plus, RefreshCw, Sun, Shield, Route } from 'lucide-react';
import { objectsApi, InfraObject } from '@/lib/api';
import ObjectCard from './object-card';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddObject: (object: InfraObject) => void;
  onEditObject?: (object: InfraObject) => void;
}

type ObjectCategory = 'containers' | 'cooling' | 'transformers' | 'pdu' | 'racks' | 'networking' | 'modules' | 'solar' | 'security' | 'infrastructure';

const categories: { id: ObjectCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'containers', label: 'Containers', icon: <Package className="w-5 h-5" />, color: 'bg-slate-100 text-slate-700' },
  { id: 'cooling', label: 'Cooling', icon: <Wind className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700' },
  { id: 'transformers', label: 'Transformers', icon: <Zap className="w-5 h-5" />, color: 'bg-amber-100 text-amber-700' },
  { id: 'pdu', label: 'PDU', icon: <Box className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700' },
  { id: 'security', label: 'Sécurité', icon: <Shield className="w-5 h-5" />, color: 'bg-red-100 text-red-700' },
  { id: 'solar', label: 'Solaire', icon: <Sun className="w-5 h-5" />, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'infrastructure', label: 'Voirie', icon: <Route className="w-5 h-5" />, color: 'bg-gray-100 text-gray-700' },
  { id: 'racks', label: 'Racks', icon: <Server className="w-5 h-5" />, color: 'bg-green-100 text-green-700' },
  { id: 'networking', label: 'Networking', icon: <Network className="w-5 h-5" />, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'modules', label: 'Modules', icon: <Layers className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-700' },
];

export default function LibraryDrawer({ isOpen, onClose, onAddObject, onEditObject }: LibraryDrawerProps) {
  const [objects, setObjects] = useState<Record<string, InfraObject[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<ObjectCategory>('containers');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadObjects = useCallback(async () => {
    try {
      setLoading(true);
      // Use getTemplates to get default objects from controller
      const data = await objectsApi.getTemplates();
      setObjects(data);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadObjects();
    }
  }, [isOpen, loadObjects]);

  const currentObjects = objects[selectedCategory] || [];
  const filteredObjects = searchQuery
    ? currentObjects.filter(obj => 
        obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentObjects;

  const totalCount = Object.values(objects).reduce((sum, arr) => sum + arr.length, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-hearst-green" />
              Object Library
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{totalCount} objects available</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadObjects}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search objects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-hearst-green focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const count = objects[cat.id]?.length || 0;
              const isSelected = selectedCategory === cat.id;
              
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-hearst-green text-slate-900 shadow-md'
                      : `${cat.color} hover:scale-105`
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isSelected ? 'bg-white/30' : 'bg-white/60'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Objects Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="animate-spin w-10 h-10 border-4 border-hearst-green border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-slate-500">Loading library...</p>
              </div>
            </div>
          ) : filteredObjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Package className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No objects in this category</p>
              <p className="text-sm text-slate-400 mt-1">
                {searchQuery ? 'Try a different search term' : 'Create your first object'}
              </p>
              {!searchQuery && selectedCategory !== 'modules' && (
                <button className="mt-4 px-4 py-2 bg-hearst-green text-slate-900 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-hearst-green/80 transition-colors">
                  <Plus className="w-4 h-4" />
                  Create New
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredObjects.map((obj) => (
                <ObjectCard
                  key={obj.id}
                  object={obj}
                  onAdd={() => {
                    onAddObject(obj);
                    onClose();
                  }}
                  onEdit={onEditObject ? () => onEditObject(obj) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            Click an object to add it to your scene • Drag to position • Use tools to measure
          </p>
        </div>
      </div>
    </>
  );
}
