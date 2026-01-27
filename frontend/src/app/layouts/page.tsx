'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { layoutsApi, objectsApi, machinesApi, Layout, InfraObject, Machine } from '@/lib/api';
import {
  LayoutGrid,
  Plus,
  Trash2,
  Copy,
  Save,
  Download,
  Upload,
  FolderOpen,
  Grid3X3,
  Move3D,
  Cpu,
  Box,
  Settings,
  Check,
  AlertCircle,
  X
} from 'lucide-react';

interface PlacedItem {
  id: string;
  objectId: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  color: string;
  dimensions: { width: number; height: number };
}

export default function LayoutsPage() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [objects, setObjects] = useState<Record<string, InfraObject[]>>({});
  const [machines, setMachines] = useState<Machine[]>([]);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedTool, setSelectedTool] = useState<'select' | 'place' | 'delete'>('select');
  const [selectedObjectToPlace, setSelectedObjectToPlace] = useState<(InfraObject | Machine) | null>(null);
  const [objectType, setObjectType] = useState<'machine' | 'infrastructure'>('machine');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Grid settings
  const gridCellSize = 50; // pixels per cell
  const gridCols = 40;
  const gridRows = 25;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [layoutsData, objectsData, machinesData] = await Promise.all([
        layoutsApi.getAll(),
        objectsApi.getAll(),
        machinesApi.getAll()
      ]);
      setLayouts(layoutsData);
      setObjects(objectsData);
      setMachines(machinesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectLayout = (layout: Layout) => {
    setSelectedLayout(layout);
    // Convert placements to placed items
    const items: PlacedItem[] = layout.placements.map((p) => ({
      id: p.placementId,
      objectId: p.objectId,
      name: p.objectType,
      type: p.objectType,
      position: { x: p.position.x, y: p.position.y },
      color: '#8AFD81',
      dimensions: { width: 1, height: 1 }
    }));
    setPlacedItems(items);
  };

  const handleCreateLayout = async () => {
    if (!newLayoutName.trim()) return;

    try {
      const newLayout = await layoutsApi.create({
        name: newLayoutName,
        description: 'New layout',
        dimensions: { width: gridCols * gridCellSize * 20, height: gridRows * gridCellSize * 20 },
        grid: { cellSize: 1000, rows: gridRows, cols: gridCols }
      });
      setLayouts([...layouts, newLayout]);
      setSelectedLayout(newLayout);
      setPlacedItems([]);
      setShowCreateModal(false);
      setNewLayoutName('');
    } catch (error) {
      console.error('Failed to create layout:', error);
    }
  };

  const handleDeleteLayout = async (id: string) => {
    if (!confirm('Delete this layout?')) return;

    try {
      await layoutsApi.delete(id);
      setLayouts(layouts.filter(l => l.id !== id));
      if (selectedLayout?.id === id) {
        setSelectedLayout(null);
        setPlacedItems([]);
      }
    } catch (error) {
      console.error('Failed to delete layout:', error);
    }
  };

  const handleDuplicateLayout = async (id: string) => {
    try {
      const duplicate = await layoutsApi.duplicate(id);
      setLayouts([...layouts, duplicate]);
    } catch (error) {
      console.error('Failed to duplicate layout:', error);
    }
  };

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedLayout || selectedTool !== 'place' || !selectedObjectToPlace) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / gridCellSize);
    const y = Math.floor((e.clientY - rect.top) / gridCellSize);

    const newItem: PlacedItem = {
      id: `item-${Date.now()}`,
      objectId: selectedObjectToPlace.id,
      name: 'name' in selectedObjectToPlace ? selectedObjectToPlace.name : selectedObjectToPlace.model,
      type: objectType,
      position: { x, y },
      color: 'color' in selectedObjectToPlace ? (selectedObjectToPlace.color || '#8AFD81') : '#8AFD81',
      dimensions: { width: 1, height: 1 }
    };

    setPlacedItems([...placedItems, newItem]);
  };

  const handleItemClick = (item: PlacedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (selectedTool === 'delete') {
      setPlacedItems(placedItems.filter(i => i.id !== item.id));
    }
  };

  const handleSaveLayout = async () => {
    if (!selectedLayout) return;

    setSaving(true);
    setSaveStatus('idle');

    try {
      await layoutsApi.update(selectedLayout.id, {
        placements: placedItems.map(item => ({
          placementId: item.id,
          objectId: item.objectId,
          objectType: item.type,
          position: { x: item.position.x, y: item.position.y, z: 0 },
          rotation: 0
        }))
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save layout:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleExportLayout = () => {
    if (!selectedLayout) return;

    const exportData = {
      ...selectedLayout,
      placedItems,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLayout.name.replace(/\s+/g, '-')}-layout.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalStats = {
    items: placedItems.length,
    machines: placedItems.filter(i => i.type === 'machine').length,
    infrastructure: placedItems.filter(i => i.type !== 'machine').length
  };

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-hearst-green" />
            Layout Builder
          </h1>
          <p className="text-slate-600">
            Create and design new mining facility layouts from scratch
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Layout
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Layouts List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Layouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-slate-400">Loading...</div>
              ) : layouts.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  No layouts yet
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {layouts.map((layout) => (
                    <div
                      key={layout.id}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedLayout?.id === layout.id
                          ? 'border-hearst-green bg-hearst-green/10'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div 
                        className="flex items-center gap-2"
                        onClick={() => handleSelectLayout(layout)}
                      >
                        <Grid3X3 className="w-4 h-4 text-slate-400" />
                        <span className="flex-1 truncate text-sm font-medium">{layout.name}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          className="p-1 hover:bg-slate-200 rounded"
                          onClick={() => handleDuplicateLayout(layout.id)}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                          onClick={() => handleDeleteLayout(layout.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setSelectedTool('select')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  selectedTool === 'select'
                    ? 'bg-hearst-green text-slate-900'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Move3D className="w-4 h-4" />
                Select / Move
              </button>
              <button
                onClick={() => setSelectedTool('place')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  selectedTool === 'place'
                    ? 'bg-hearst-green text-slate-900'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                Place Object
              </button>
              <button
                onClick={() => setSelectedTool('delete')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  selectedTool === 'delete'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </CardContent>
          </Card>

          {/* Object Palette */}
          {selectedTool === 'place' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Object Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setObjectType('machine')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      objectType === 'machine'
                        ? 'bg-hearst-green text-slate-900'
                        : 'bg-slate-100'
                    }`}
                  >
                    <Cpu className="w-4 h-4 mx-auto mb-1" />
                    Machines
                  </button>
                  <button
                    onClick={() => setObjectType('infrastructure')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      objectType === 'infrastructure'
                        ? 'bg-hearst-green text-slate-900'
                        : 'bg-slate-100'
                    }`}
                  >
                    <Box className="w-4 h-4 mx-auto mb-1" />
                    Infra
                  </button>
                </div>

                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  {objectType === 'machine' ? (
                    machines.slice(0, 10).map((machine) => (
                      <button
                        key={machine.id}
                        onClick={() => setSelectedObjectToPlace(machine)}
                        className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                          selectedObjectToPlace?.id === machine.id
                            ? 'bg-hearst-green text-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-medium">{machine.model}</div>
                        <div className="text-slate-500">{machine.hashrateTH} TH/s</div>
                      </button>
                    ))
                  ) : (
                    Object.entries(objects).flatMap(([category, items]) =>
                      items.slice(0, 3).map((obj) => (
                        <button
                          key={obj.id}
                          onClick={() => setSelectedObjectToPlace(obj)}
                          className={`w-full p-2 rounded-lg text-left text-xs transition-all ${
                            selectedObjectToPlace?.id === obj.id
                              ? 'bg-hearst-green text-slate-900'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: obj.color || '#6b7280' }}
                            />
                            <span className="font-medium">{obj.name}</span>
                          </div>
                          <div className="text-slate-500 mt-0.5">{category}</div>
                        </button>
                      ))
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {selectedLayout && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Layout Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Items</span>
                  <span className="font-bold">{totalStats.items}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Machines</span>
                  <span className="font-bold text-hearst-green">{totalStats.machines}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Infrastructure</span>
                  <span className="font-bold text-blue-500">{totalStats.infrastructure}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Canvas */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                {selectedLayout ? (
                  <span className="font-medium">{selectedLayout.name}</span>
                ) : (
                  <span className="text-slate-400">Select or create a layout</span>
                )}
              </div>
              {selectedLayout && (
                <div className="flex gap-2">
                  <Button
                    variant={saveStatus === 'success' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={handleSaveLayout}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : saveStatus === 'success' ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Saved!
                      </>
                    ) : saveStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Error
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportLayout}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              )}
            </div>

            {/* Grid Canvas */}
            <div className="w-full h-[600px] bg-slate-50 overflow-auto p-4">
              {selectedLayout ? (
                <div
                  className="relative bg-white border border-slate-200 rounded-lg cursor-crosshair"
                  style={{
                    width: gridCols * gridCellSize,
                    height: gridRows * gridCellSize,
                    backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                    backgroundSize: `${gridCellSize}px ${gridCellSize}px`
                  }}
                  onClick={handleGridClick}
                >
                  {/* Placed Items */}
                  {placedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`absolute rounded cursor-pointer transition-all flex items-center justify-center ${
                        selectedTool === 'delete' ? 'hover:opacity-50' : 'hover:scale-105'
                      }`}
                      style={{
                        left: item.position.x * gridCellSize + 2,
                        top: item.position.y * gridCellSize + 2,
                        width: gridCellSize - 4,
                        height: gridCellSize - 4,
                        backgroundColor: item.type === 'machine' ? '#8AFD81' : item.color
                      }}
                      onClick={(e) => handleItemClick(item, e)}
                      title={item.name}
                    >
                      {item.type === 'machine' ? (
                        <Cpu className="w-4 h-4 text-slate-900" />
                      ) : (
                        <Box className="w-4 h-4 text-white" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select a layout to edit</p>
                    <p className="text-sm mt-2">Or create a new one</p>
                    <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Layout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create New Layout</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <Input
              label="Layout Name"
              placeholder="e.g., Qatar Facility Phase 1"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateLayout}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
