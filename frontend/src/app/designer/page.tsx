'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { objectsApi, layoutsApi, InfraObject, Layout } from '@/lib/api';
import { 
  LayoutGrid, 
  Box, 
  Move3D,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  FolderOpen,
  Grid3X3,
  Cpu,
  Check,
  AlertCircle,
  Package,
  Wind,
  Zap,
  Server,
  Network,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  RefreshCw,
  Eye,
  Maximize2
} from 'lucide-react';

// Dynamically import 3D editor to avoid SSR issues
const Object3DEditor = dynamic(() => import('@/components/designer/object-3d-editor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-hearst-green border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-slate-600">Loading 3D Designer...</p>
      </div>
    </div>
  ),
});

// Types
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

interface SavedProject {
  id: string;
  name: string;
  objects: Object3DFormat[];
  savedAt: string;
}

type ObjectCategory = 'containers' | 'cooling' | 'pdu' | 'racks' | 'networking' | 'transformers' | 'modules';

const categoryIcons: Record<ObjectCategory, React.ReactNode> = {
  containers: <Package className="w-4 h-4" />,
  cooling: <Wind className="w-4 h-4" />,
  pdu: <Zap className="w-4 h-4" />,
  racks: <Server className="w-4 h-4" />,
  networking: <Network className="w-4 h-4" />,
  transformers: <Box className="w-4 h-4" />,
  modules: <Layers className="w-4 h-4" />
};

const categoryLabels: Record<ObjectCategory, string> = {
  containers: 'Containers',
  cooling: 'Cooling',
  pdu: 'PDU',
  racks: 'Racks',
  networking: 'Networking',
  transformers: 'Transformers',
  modules: 'Modules'
};

export default function DesignerPage() {
  // Library state
  const [libraryObjects, setLibraryObjects] = useState<Record<string, InfraObject[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['containers', 'modules']));
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // Scene state
  const [sceneObjects, setSceneObjects] = useState<Object3DFormat[]>([]);
  
  // Project state
  const [projectName, setProjectName] = useState('Untitled Project');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);

  // Load library objects
  const loadLibrary = useCallback(async () => {
    try {
      setLoadingLibrary(true);
      const data = await objectsApi.getAll();
      setLibraryObjects(data);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  // Load saved projects from localStorage
  const loadProjects = useCallback(() => {
    const saved = localStorage.getItem('hearst-designer-projects');
    if (saved) {
      setSavedProjects(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    loadLibrary();
    loadProjects();
  }, [loadLibrary, loadProjects]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Add object from library to scene
  const addObjectToScene = (obj: InfraObject) => {
    const newObject: Object3DFormat = {
      id: `${obj.id}-${Date.now()}`,
      name: obj.name,
      type: obj.type,
      position: { 
        x: sceneObjects.length * 3, 
        y: (obj.dimensions?.height || 1000) / 2000, 
        z: 0 
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: obj.color || '#8AFD81',
      dimensions: obj.dimensions || { width: 1000, height: 1000, depth: 1000 },
      locked: false,
      visible: true
    };
    setSceneObjects(prev => [...prev, newObject]);
  };

  // Handle scene changes from 3D editor
  const handleSceneChange = useCallback((objects: Object3DFormat[]) => {
    setSceneObjects(objects);
  }, []);

  // Save project
  const handleSaveProject = useCallback(() => {
    if (!projectName.trim()) return;

    setIsSaving(true);
    try {
      const project: SavedProject = {
        id: `project-${Date.now()}`,
        name: projectName,
        objects: sceneObjects,
        savedAt: new Date().toISOString()
      };

      const existingIndex = savedProjects.findIndex(p => p.name === projectName);
      let updated: SavedProject[];
      
      if (existingIndex >= 0) {
        updated = [...savedProjects];
        updated[existingIndex] = project;
      } else {
        updated = [...savedProjects, project];
      }

      localStorage.setItem('hearst-designer-projects', JSON.stringify(updated));
      setSavedProjects(updated);
      setSaveStatus('success');
      setShowSaveModal(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [projectName, sceneObjects, savedProjects]);

  // Load project
  const handleLoadProject = (project: SavedProject) => {
    setProjectName(project.name);
    setSceneObjects(project.objects);
    setShowProjectsModal(false);
  };

  // Delete project
  const handleDeleteProject = (projectId: string) => {
    const updated = savedProjects.filter(p => p.id !== projectId);
    localStorage.setItem('hearst-designer-projects', JSON.stringify(updated));
    setSavedProjects(updated);
  };

  // Export project as JSON
  const handleExport = useCallback(() => {
    const data = {
      name: projectName,
      objects: sceneObjects,
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
  }, [projectName, sceneObjects]);

  // New project
  const handleNewProject = () => {
    setProjectName('Untitled Project');
    setSceneObjects([]);
  };

  // Get total objects count in library
  const totalLibraryObjects = Object.values(libraryObjects).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'min-h-screen'}`}>
      {/* Compact Header */}
      <div className="bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Left: Project Info */}
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-5 h-5 text-hearst-green" />
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="text-sm font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 w-40"
            />
            <span className="text-xs text-slate-400">
              {sceneObjects.length} objects
            </span>
          </div>

          {/* Center: Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleNewProject} className="h-7 px-2">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowProjectsModal(true)} className="h-7 px-2">
              <FolderOpen className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSaveModal(true)}
              className={`h-7 px-2 ${saveStatus === 'success' ? 'text-green-600' : ''}`}
            >
              {saveStatus === 'success' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 px-2">
              <Download className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowLibrary(!showLibrary)}
              className={`h-7 px-2 ${showLibrary ? 'bg-slate-100' : ''}`}
            >
              <Layers className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 px-2"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Full Height */}
      <div className={`flex ${isFullscreen ? 'h-[calc(100vh-44px)]' : 'h-[calc(100vh-108px)]'}`}>
        {/* Library Sidebar - Collapsible */}
        {showLibrary && (
          <div className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
            libraryCollapsed ? 'w-16' : 'w-72'
          }`}>
            {/* Library Header - Compact */}
            <div className={`border-b border-slate-200 ${libraryCollapsed ? 'p-1.5' : 'px-3 py-2'}`}>
              <div className={`flex items-center ${libraryCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!libraryCollapsed && (
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Library ({totalLibraryObjects})
                  </span>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLibraryCollapsed(!libraryCollapsed)}
                  title={libraryCollapsed ? 'Expand' : 'Collapse'}
                  className="p-1 h-6 w-6"
                >
                  {libraryCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Library Content */}
            <div className={`flex-1 overflow-y-auto ${libraryCollapsed ? 'p-1' : 'p-2'}`}>
              {loadingLibrary ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-6 h-6 border-2 border-hearst-green border-t-transparent rounded-full" />
                </div>
              ) : libraryCollapsed ? (
                /* Collapsed Mode - Icons Only */
                <div className="space-y-1">
                  {(Object.keys(categoryLabels) as ObjectCategory[]).map((category) => {
                    const objects = libraryObjects[category] || [];
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          setLibraryCollapsed(false);
                          setExpandedCategories(new Set([category]));
                        }}
                        className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-hearst-green/10 transition-colors group relative"
                        title={`${categoryLabels[category]} (${objects.length})`}
                      >
                        <div className="text-slate-500 group-hover:text-hearst-green">
                          {categoryIcons[category]}
                        </div>
                        {objects.length > 0 && (
                          <span className="absolute top-0 right-1 min-w-[16px] h-4 bg-hearst-green text-[10px] font-bold text-slate-900 rounded-full flex items-center justify-center px-1">
                            {objects.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Expanded Mode - Full List */
                <div className="space-y-1">
                  {(Object.keys(categoryLabels) as ObjectCategory[]).map((category) => {
                    const objects = libraryObjects[category] || [];
                    const isExpanded = expandedCategories.has(category);
                    
                    return (
                      <div key={category}>
                        {/* Category Header */}
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          {categoryIcons[category]}
                          <span className="flex-1 text-left text-sm font-medium text-slate-700">
                            {categoryLabels[category]}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {objects.length}
                          </span>
                        </button>

                        {/* Category Objects */}
                        {isExpanded && objects.length > 0 && (
                          <div className="ml-6 space-y-1 mt-1">
                            {objects.map((obj) => (
                              <button
                                key={obj.id}
                                onClick={() => addObjectToScene(obj)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-hearst-green/10 border border-transparent hover:border-hearst-green/30 transition-all group"
                              >
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: obj.color || '#8AFD81' }}
                                />
                                <span className="flex-1 text-left text-sm text-slate-600 group-hover:text-slate-900 truncate">
                                  {obj.name}
                                </span>
                                <Plus className="w-4 h-4 text-slate-300 group-hover:text-hearst-green" />
                              </button>
                            ))}
                          </div>
                        )}

                        {isExpanded && objects.length === 0 && (
                          <div className="ml-6 px-3 py-2 text-xs text-slate-400">
                            Empty
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3D Editor */}
        <div className="flex-1 bg-slate-100">
          <Object3DEditor
            objects={sceneObjects}
            onObjectsChange={handleSceneChange}
            onSave={() => setShowSaveModal(true)}
          />
        </div>
      </div>

      {/* Projects Modal */}
      {showProjectsModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg">Open Project</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowProjectsModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {savedProjects.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No saved projects yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-hearst-green/50 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{project.name}</h4>
                        <p className="text-xs text-slate-500">
                          {project.objects.length} objects • Saved {new Date(project.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleLoadProject(project)}>
                        Open
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg">Save Project</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSaveModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <Input
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Mining Farm"
              />
              <div className="text-sm text-slate-500">
                {sceneObjects.length} objects will be saved
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSaveProject}
                  disabled={isSaving || !projectName.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save Project'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
