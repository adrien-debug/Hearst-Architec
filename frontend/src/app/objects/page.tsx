'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { objectsApi, InfraObject, ObjectSubtype } from '@/lib/api';
import {
  Box,
  Settings,
  Plus,
  Trash2,
  Copy,
  Save,
  X,
  Edit3,
  Ruler,
  Zap,
  Wind,
  Network,
  Package,
  Server,
  RefreshCw,
  Layers,
  CheckCircle,
  ChevronDown,
  Maximize2,
  Move3D
} from 'lucide-react';

// Dynamically import 3D components to avoid SSR issues
const Object3DEditor = dynamic(() => import('@/components/designer/object-3d-editor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[700px] bg-slate-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-hearst-green border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-slate-600">Loading 3D Editor...</p>
      </div>
    </div>
  ),
});

const Object3DPreview = dynamic(() => import('@/components/designer/object-3d-preview'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-slate-100 rounded-xl flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-hearst-green border-t-transparent rounded-full" />
    </div>
  ),
});

type ObjectCategory = 'racks' | 'pdu' | 'cooling' | 'networking' | 'containers' | 'transformers' | 'modules';

const categoryIcons: Record<ObjectCategory, React.ReactNode> = {
  racks: <Server className="w-5 h-5" />,
  pdu: <Zap className="w-5 h-5" />,
  cooling: <Wind className="w-5 h-5" />,
  networking: <Network className="w-5 h-5" />,
  containers: <Package className="w-5 h-5" />,
  transformers: <Box className="w-5 h-5" />,
  modules: <Layers className="w-5 h-5" />
};

const categoryLabels: Record<ObjectCategory, string> = {
  racks: 'Racks',
  pdu: 'PDU',
  cooling: 'Cooling',
  networking: 'Networking',
  containers: 'Containers',
  transformers: 'Transformers',
  modules: 'Assembled Modules'
};

interface EditingObject extends InfraObject {
  category: ObjectCategory;
}

// Convert InfraObject to 3D Object format
interface Object3DFormat {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  dimensions: { width: number; height: number; depth: number };
  locked: boolean;
  visible: boolean;
  groupId?: string;
}

export default function ObjectsPage() {
  const [objects, setObjects] = useState<Record<string, InfraObject[]>>({});
  const [subtypes, setSubtypes] = useState<ObjectSubtype[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ObjectCategory>('containers');
  const [selectedObject, setSelectedObject] = useState<InfraObject | null>(null);
  const [editingObject, setEditingObject] = useState<EditingObject | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 3D Editor Mode
  const [show3DEditor, setShow3DEditor] = useState(false);
  const [objects3D, setObjects3D] = useState<Object3DFormat[]>([]);
  
  // Template creation
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ObjectSubtype | null>(null);
  const [templateName, setTemplateName] = useState('');
  
  // Assembly
  const [showAssembly, setShowAssembly] = useState(false);
  const [assemblyName, setAssemblyName] = useState('');
  const [selectedBaseObject, setSelectedBaseObject] = useState<InfraObject | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<Array<{ objectId: string; mountPoint: string }>>([]);

  // Convert all objects to 3D format for editor
  const convertTo3DObjects = useCallback(() => {
    const allObjects: Object3DFormat[] = [];
    let xOffset = 0;
    
    Object.entries(objects).forEach(([category, categoryObjects]) => {
      categoryObjects.forEach((obj, idx) => {
        allObjects.push({
          id: obj.id,
          name: obj.name,
          type: obj.type,
          position: { x: xOffset + idx * 3, y: (obj.dimensions?.height || 1000) / 2000, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: obj.color || '#8AFD81',
          dimensions: obj.dimensions || { width: 1000, height: 1000, depth: 1000 },
          locked: false,
          visible: true
        });
      });
      xOffset += (categoryObjects.length + 1) * 3;
    });
    
    setObjects3D(allObjects);
  }, [objects]);

  // Open 3D Editor
  const open3DEditor = useCallback(() => {
    convertTo3DObjects();
    setShow3DEditor(true);
  }, [convertTo3DObjects]);

  // Handle 3D objects change
  const handle3DObjectsChange = useCallback((newObjects: Object3DFormat[]) => {
    setObjects3D(newObjects);
  }, []);

  // Save from 3D Editor
  const handleSave3D = useCallback(async (objs: Object3DFormat[]) => {
    // Save layout to localStorage for now
    const layoutData = {
      name: `3D Layout ${new Date().toLocaleDateString()}`,
      objects: objs,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('hearst-3d-layout', JSON.stringify(layoutData));
    alert('Layout saved successfully!');
  }, []);

  const loadObjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await objectsApi.getAll();
      setObjects(data);
    } catch (error) {
      console.error('Failed to load objects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubtypes = useCallback(async (category: string) => {
    if (category === 'modules') {
      setSubtypes([]);
      return;
    }
    try {
      const data = await objectsApi.getSubtypes(category);
      setSubtypes(data);
    } catch (error) {
      console.error('Failed to load subtypes:', error);
      setSubtypes([]);
    }
  }, []);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  useEffect(() => {
    loadSubtypes(selectedCategory);
  }, [selectedCategory, loadSubtypes]);

  const handleSelectObject = (obj: InfraObject) => {
    setSelectedObject(obj);
    setEditingObject(null);
    setIsCreating(false);
    setShowTemplates(false);
    setShowAssembly(false);
  };

  const handleEditObject = () => {
    if (selectedObject) {
      setEditingObject({ ...selectedObject, category: selectedCategory });
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !templateName.trim()) return;

    setSaving(true);
    try {
      await objectsApi.createFromTemplate({
        category: selectedCategory,
        subtype: selectedTemplate.id,
        name: templateName,
      });
      await loadObjects();
      setShowTemplates(false);
      setSelectedTemplate(null);
      setTemplateName('');
    } catch (error) {
      console.error('Failed to create from template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAssemble = async () => {
    if (!assemblyName.trim() || !selectedBaseObject) return;

    setSaving(true);
    try {
      await objectsApi.assemble({
        name: assemblyName,
        baseObjectId: selectedBaseObject.id,
        attachments: selectedAttachments,
      });
      await loadObjects();
      setShowAssembly(false);
      setAssemblyName('');
      setSelectedBaseObject(null);
      setSelectedAttachments([]);
    } catch (error) {
      console.error('Failed to assemble module:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveObject = async () => {
    if (!editingObject) return;

    setSaving(true);
    try {
      if (isCreating) {
        const { id, createdAt, updatedAt, category: _cat, ...data } = editingObject;
        await objectsApi.create({ category: selectedCategory, ...data });
      } else {
        const { category: _cat, ...data } = editingObject;
        await objectsApi.update(editingObject.id, data);
      }
      await loadObjects();
      setEditingObject(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to save object:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteObject = async (id: string) => {
    if (!confirm('Delete this object?')) return;

    try {
      await objectsApi.delete(id);
      await loadObjects();
      if (selectedObject?.id === id) {
        setSelectedObject(null);
      }
    } catch (error) {
      console.error('Failed to delete object:', error);
    }
  };

  const handleDuplicateObject = async (id: string) => {
    try {
      await objectsApi.duplicate(id);
      await loadObjects();
    } catch (error) {
      console.error('Failed to duplicate object:', error);
    }
  };

  const updateEditingField = (field: string, value: unknown) => {
    if (!editingObject) return;
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEditingObject({
        ...editingObject,
        [parent]: {
          ...(editingObject[parent] as object),
          [child]: value
        }
      });
    } else {
      setEditingObject({
        ...editingObject,
        [field]: value
      });
    }
  };

  const currentObjects = objects[selectedCategory] || [];
  const coolingObjects = objects['cooling'] || [];
  const containerObjects = objects['containers'] || [];

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 3D Editor Mode - Full Page */}
      {show3DEditor && (
        <div className="fixed inset-0 z-[9999] bg-slate-100">
          {/* Exit Button - Always on top */}
          <div className="absolute top-4 left-4 z-[10000]">
            <Button 
              onClick={() => setShow3DEditor(false)} 
              variant="outline"
              className="bg-white shadow-xl border-2 border-slate-300 hover:border-red-400 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Exit 3D Editor
            </Button>
          </div>
          {/* 3D Editor Container */}
          <div className="w-full h-full">
            <Object3DEditor
              objects={objects3D}
              onObjectsChange={handle3DObjectsChange}
              onSave={handleSave3D}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-hearst-green" />
            Library
          </h1>
          <p className="text-slate-600">
            Create and manage reusable objects: containers, cooling, PDU, racks, and assembled modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={open3DEditor} className="bg-hearst-green text-slate-900 hover:bg-hearst-green/90">
            <Move3D className="w-4 h-4 mr-2" />
            3D Editor
            <Maximize2 className="w-4 h-4 ml-2" />
          </Button>
          <Button onClick={() => setShowAssembly(true)} variant="outline">
            <Layers className="w-4 h-4 mr-2" />
            Assemble Module
          </Button>
          <Button onClick={loadObjects} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar - Categories & Objects */}
        <div className="space-y-6">
          {/* Category Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {(Object.keys(categoryLabels) as ObjectCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedObject(null);
                    setEditingObject(null);
                    setShowTemplates(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                    selectedCategory === cat
                      ? 'bg-hearst-green text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {categoryIcons[cat]}
                  <span className="flex-1">{categoryLabels[cat]}</span>
                  <span className="text-xs opacity-70">
                    {objects[cat]?.length || 0}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Objects List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {categoryLabels[selectedCategory]}
              </CardTitle>
              {selectedCategory !== 'modules' && (
                <Button size="sm" onClick={() => setShowTemplates(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-slate-400">Loading...</div>
              ) : currentObjects.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  <p>No objects yet</p>
                  {selectedCategory !== 'modules' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => setShowTemplates(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create from Template
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {currentObjects.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => handleSelectObject(obj)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedObject?.id === obj.id
                          ? 'border-hearst-green bg-hearst-green/10'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: obj.color || '#6b7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{obj.name}</div>
                          <div className="text-xs text-slate-500">
                            {(obj as InfraObject & { subtype?: string }).subtype && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-2">
                                {(obj as InfraObject & { subtype?: string }).subtype}
                              </span>
                            )}
                            {obj.dimensions?.width}×{obj.dimensions?.height}×{obj.dimensions?.depth} mm
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Template Selection Panel */}
          {showTemplates && (
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Create from Template - {categoryLabels[selectedCategory]}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {subtypes.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-hearst-green bg-hearst-green/10'
                          : 'border-slate-200 hover:border-hearst-green/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {selectedTemplate?.id === template.id && (
                          <CheckCircle className="w-4 h-4 text-hearst-green" />
                        )}
                        <span className="font-bold text-sm">{template.id}</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{template.description}</p>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div>{template.dimensions?.width}×{template.dimensions?.height}×{template.dimensions?.depth} mm</div>
                        {(template as ObjectSubtype & { machineSlots?: number }).machineSlots && (
                          <div>{(template as ObjectSubtype & { machineSlots?: number }).machineSlots} machine slots</div>
                        )}
                        {(template as ObjectSubtype & { powerCapacityMW?: number }).powerCapacityMW && (
                          <div>{(template as ObjectSubtype & { powerCapacityMW?: number }).powerCapacityMW} MW capacity</div>
                        )}
                        {(template as ObjectSubtype & { capacityTons?: number }).capacityTons && (
                          <div>{(template as ObjectSubtype & { capacityTons?: number }).capacityTons} tons cooling</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                {selectedTemplate && (
                  <div className="flex gap-4 items-end border-t pt-4">
                    <div className="flex-1">
                      <Input
                        label="Object Name"
                        placeholder={`My ${selectedTemplate.description}`}
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreateFromTemplate} disabled={saving || !templateName.trim()}>
                      {saving ? 'Creating...' : 'Create Object'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assembly Panel */}
          {showAssembly && (
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Assemble Module (Container + Cooling)
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAssembly(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Base Container Selection */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      1. Select Base Container
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {containerObjects.length === 0 ? (
                        <p className="text-sm text-slate-400">Create containers first</p>
                      ) : (
                        containerObjects.map((obj) => (
                          <button
                            key={obj.id}
                            onClick={() => setSelectedBaseObject(obj)}
                            className={`w-full p-3 rounded-lg border text-left transition-all ${
                              selectedBaseObject?.id === obj.id
                                ? 'border-hearst-green bg-hearst-green/10'
                                : 'border-slate-200 hover:border-hearst-green/50'
                            }`}
                          >
                            <div className="font-medium text-sm">{obj.name}</div>
                            <div className="text-xs text-slate-500">
                              {(obj as InfraObject & { machineSlots?: number }).machineSlots} slots • 
                              {(obj as InfraObject & { powerCapacityMW?: number }).powerCapacityMW} MW
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Cooling Attachment Selection */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Wind className="w-4 h-4" />
                      2. Attach Cooling (Top Mount)
                    </h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {coolingObjects.length === 0 ? (
                        <p className="text-sm text-slate-400">Create cooling units first</p>
                      ) : (
                        coolingObjects.map((obj) => {
                          const isSelected = selectedAttachments.some(a => a.objectId === obj.id);
                          return (
                            <button
                              key={obj.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAttachments(selectedAttachments.filter(a => a.objectId !== obj.id));
                                } else {
                                  setSelectedAttachments([...selectedAttachments, { objectId: obj.id, mountPoint: 'top' }]);
                                }
                              }}
                              className={`w-full p-3 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? 'border-hearst-green bg-hearst-green/10'
                                  : 'border-slate-200 hover:border-hearst-green/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected && <CheckCircle className="w-4 h-4 text-hearst-green" />}
                                <div>
                                  <div className="font-medium text-sm">{obj.name}</div>
                                  <div className="text-xs text-slate-500">
                                    {(obj as InfraObject & { capacityTons?: number }).capacityTons} tons • 
                                    {(obj as InfraObject & { powerKW?: number }).powerKW} kW
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {selectedBaseObject && (
                  <div className="flex gap-4 items-end border-t pt-4 mt-4">
                    <div className="flex-1">
                      <Input
                        label="Assembled Module Name"
                        placeholder={`${selectedBaseObject.name} + Cooling`}
                        value={assemblyName}
                        onChange={(e) => setAssemblyName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAssemble} disabled={saving || !assemblyName.trim()}>
                      {saving ? 'Assembling...' : 'Create Assembled Module'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Object Details Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                {editingObject 
                  ? (isCreating ? 'Create New Object' : 'Edit Object')
                  : selectedObject 
                    ? 'Object Details'
                    : 'Select an Object'
                }
              </CardTitle>
              {selectedObject && !editingObject && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEditObject}>
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDuplicateObject(selectedObject.id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteObject(selectedObject.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {editingObject && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingObject(null);
                      setIsCreating(false);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveObject}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {!selectedObject && !editingObject && !showTemplates && !showAssembly ? (
                <div className="text-center py-16 text-slate-400">
                  <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select an object to view details</p>
                  <p className="text-sm mt-2">Or create from template</p>
                  <Button className="mt-4" onClick={() => setShowTemplates(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create from Template
                  </Button>
                </div>
              ) : editingObject ? (
                /* Edit Form */
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 border-b pb-2">General</h3>
                    <Input
                      label="Name"
                      value={editingObject.name}
                      onChange={(e) => updateEditingField('name', e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingObject.color || '#6b7280'}
                          onChange={(e) => updateEditingField('color', e.target.value)}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={editingObject.color || '#6b7280'}
                          onChange={(e) => updateEditingField('color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 border-b pb-2">Dimensions (mm)</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Width"
                        type="number"
                        value={editingObject.dimensions?.width || 0}
                        onChange={(e) => updateEditingField('dimensions.width', Number(e.target.value))}
                      />
                      <Input
                        label="Height"
                        type="number"
                        value={editingObject.dimensions?.height || 0}
                        onChange={(e) => updateEditingField('dimensions.height', Number(e.target.value))}
                      />
                      <Input
                        label="Depth"
                        type="number"
                        value={editingObject.dimensions?.depth || 0}
                        onChange={(e) => updateEditingField('dimensions.depth', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ) : selectedObject && (
                /* View Mode */
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 border-b pb-2">General</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-slate-500">Name</span>
                        <p className="font-medium">{selectedObject.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-500">Type</span>
                        <p className="font-medium capitalize">{selectedObject.type}</p>
                      </div>
                      {(selectedObject as InfraObject & { subtype?: string }).subtype && (
                        <div>
                          <span className="text-sm text-slate-500">Subtype</span>
                          <p className="font-medium">{(selectedObject as InfraObject & { subtype?: string }).subtype}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-slate-500">Color</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: selectedObject.color || '#6b7280' }}
                          />
                          <span className="font-mono text-sm">{selectedObject.color}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 border-b pb-2">Dimensions</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <span className="text-xs text-slate-500">Width</span>
                        <p className="text-xl font-bold text-slate-900">{selectedObject.dimensions?.width || 0}</p>
                        <span className="text-xs text-slate-400">mm</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <span className="text-xs text-slate-500">Height</span>
                        <p className="text-xl font-bold text-slate-900">{selectedObject.dimensions?.height || 0}</p>
                        <span className="text-xs text-slate-400">mm</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <span className="text-xs text-slate-500">Depth</span>
                        <p className="text-xl font-bold text-slate-900">{selectedObject.dimensions?.depth || 0}</p>
                        <span className="text-xs text-slate-400">mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Specifications */}
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-slate-900 border-b pb-2 mb-4">Technical Specifications</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(selectedObject)
                        .filter(([key]) => !['id', 'name', 'type', 'subtype', 'dimensions', 'color', 'createdAt', 'updatedAt', 'description', 'mountingPoints', 'compatibleCooling'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="p-3 bg-slate-50 rounded-lg">
                            <span className="text-xs text-slate-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <p className="font-bold text-slate-900">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </p>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* 3D Preview */}
                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-slate-900 border-b pb-2 mb-4">3D Preview</h3>
                    <Object3DPreview
                      dimensions={selectedObject.dimensions || { width: 1000, height: 1000, depth: 1000 }}
                      color={selectedObject.color || '#8AFD81'}
                      name={selectedObject.name}
                      autoRotate={true}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
