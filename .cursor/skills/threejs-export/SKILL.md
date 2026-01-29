---
name: threejs-export
description: Three.js export patterns for saving and sharing 3D scenes. Use when exporting to GLTF, generating DXF files, taking screenshots, saving scene state, or when the user mentions export, save, download, screenshot, or serialize.
---

# Three.js Export

This skill covers exporting 3D scenes and data from React Three Fiber applications.

## Quick Reference

| Export Type | Format | Use Case |
|-------------|--------|----------|
| Scene State | JSON | Save/Load projects |
| Screenshot | PNG/JPG | Documentation |
| 3D Model | GLTF/GLB | 3D viewers |
| CAD | DXF | AutoCAD |
| Data | CSV | Spreadsheets |

---

## 1. JSON Scene Export

### Basic Scene Serialization

```typescript
interface ExportedObject {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  color: string;
}

interface ExportedScene {
  name: string;
  version: string;
  exportedAt: string;
  objects: ExportedObject[];
  camera?: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

function exportScene(objects: Object3D[], name: string): ExportedScene {
  return {
    name,
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    objects: objects.map(obj => ({
      id: obj.id,
      name: obj.name,
      type: obj.type,
      position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
      scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
      dimensions: obj.dimensions,
      color: obj.color,
    })),
  };
}
```

### Download JSON

```typescript
function downloadJSON(data: object, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Usage
const handleExport = () => {
  const sceneData = exportScene(objects, projectName);
  const filename = `${projectName.replace(/\s+/g, '-').toLowerCase()}-${
    new Date().toISOString().split('T')[0]
  }.json`;
  downloadJSON(sceneData, filename);
};
```

### Import JSON

```typescript
function importScene(file: File): Promise<ExportedScene> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// React component
function ImportButton({ onImport }: { onImport: (data: ExportedScene) => void }) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await importScene(file);
      onImport(data);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <input
      type="file"
      accept=".json"
      onChange={handleFileChange}
      className="hidden"
    />
  );
}
```

---

## 2. Canvas Screenshot

### Basic Screenshot

```typescript
import { useThree } from '@react-three/fiber';

function ScreenshotButton() {
  const { gl, scene, camera } = useThree();
  
  const takeScreenshot = () => {
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL('image/png');
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `screenshot-${Date.now()}.png`;
    a.click();
  };

  return (
    <Html>
      <button onClick={takeScreenshot}>📷 Screenshot</button>
    </Html>
  );
}
```

### High-Resolution Screenshot

```typescript
function takeHiResScreenshot(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  scale: number = 2
) {
  // Save original size
  const originalSize = gl.getSize(new THREE.Vector2());
  const originalPixelRatio = gl.getPixelRatio();
  
  // Set high resolution
  const width = originalSize.x * scale;
  const height = originalSize.y * scale;
  
  gl.setSize(width, height);
  gl.setPixelRatio(1);
  
  // Render
  gl.render(scene, camera);
  
  // Get image
  const dataUrl = gl.domElement.toDataURL('image/png');
  
  // Restore original size
  gl.setSize(originalSize.x, originalSize.y);
  gl.setPixelRatio(originalPixelRatio);
  
  return dataUrl;
}
```

### Screenshot with Transparent Background

```typescript
function takeTransparentScreenshot(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
) {
  // Enable alpha
  const originalClearAlpha = gl.getClearAlpha();
  gl.setClearAlpha(0);
  
  // Render
  gl.render(scene, camera);
  const dataUrl = gl.domElement.toDataURL('image/png');
  
  // Restore
  gl.setClearAlpha(originalClearAlpha);
  
  return dataUrl;
}
```

---

## 3. GLTF Export

### Export Scene to GLTF

```typescript
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

async function exportToGLTF(scene: THREE.Scene, filename: string) {
  const exporter = new GLTFExporter();
  
  return new Promise<void>((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        const blob = new Blob(
          [JSON.stringify(gltf)],
          { type: 'application/json' }
        );
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.gltf`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      },
      (error) => reject(error),
      { binary: false }
    );
  });
}
```

### Export to GLB (Binary)

```typescript
async function exportToGLB(scene: THREE.Scene, filename: string) {
  const exporter = new GLTFExporter();
  
  return new Promise<void>((resolve, reject) => {
    exporter.parse(
      scene,
      (glb) => {
        const blob = new Blob([glb as ArrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.glb`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}
```

---

## 4. DXF Export (CAD)

### Basic DXF Generator

```typescript
interface DXFObject {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  name: string;
}

function generateDXF(objects: DXFObject[], title: string): string {
  let dxf = '';
  
  // Header
  dxf += '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1015\n';  // AutoCAD 2000
  dxf += '0\nENDSEC\n';
  
  // Tables
  dxf += '0\nSECTION\n2\nTABLES\n';
  
  // Layer table
  dxf += '0\nTABLE\n2\nLAYER\n70\n3\n';
  dxf += generateLayer('0', 7);           // Default
  dxf += generateLayer('CONTAINERS', 3);  // Green
  dxf += generateLayer('TRANSFORMERS', 1); // Red
  dxf += '0\nENDTAB\n';
  
  dxf += '0\nENDSEC\n';
  
  // Entities
  dxf += '0\nSECTION\n2\nENTITIES\n';
  
  objects.forEach(obj => {
    dxf += generateRectangle(obj);
    dxf += generateText(obj.name, obj.x, obj.y + obj.height / 2 + 0.3);
  });
  
  dxf += '0\nENDSEC\n';
  
  // EOF
  dxf += '0\nEOF\n';
  
  return dxf;
}

function generateLayer(name: string, color: number): string {
  return `0\nLAYER\n2\n${name}\n70\n0\n62\n${color}\n6\nCONTINUOUS\n`;
}

function generateRectangle(obj: DXFObject): string {
  const { x, y, width, height, type } = obj;
  const hw = width / 2;
  const hh = height / 2;
  
  // Corners
  const corners = [
    [x - hw, y - hh],
    [x + hw, y - hh],
    [x + hw, y + hh],
    [x - hw, y + hh],
    [x - hw, y - hh], // Close
  ];
  
  let dxf = '0\nLWPOLYLINE\n';
  dxf += '8\n' + (type === 'container' ? 'CONTAINERS' : 'TRANSFORMERS') + '\n';
  dxf += '90\n5\n70\n1\n';
  
  corners.forEach(([px, py]) => {
    dxf += `10\n${px.toFixed(4)}\n20\n${py.toFixed(4)}\n`;
  });
  
  return dxf;
}

function generateText(text: string, x: number, y: number): string {
  return `0\nTEXT\n8\n0\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n40\n0.2\n1\n${text}\n`;
}
```

### Download DXF

```typescript
function downloadDXF(objects: Object3D[], projectName: string) {
  const dxfObjects: DXFObject[] = objects.map(obj => ({
    type: obj.type,
    x: obj.position.x,
    y: obj.position.z,  // Top-down view: Z becomes Y in 2D
    width: obj.dimensions.width / 1000,
    height: obj.dimensions.depth / 1000,
    rotation: obj.rotation.y,
    name: obj.name,
  }));
  
  const dxf = generateDXF(dxfObjects, projectName);
  const blob = new Blob([dxf], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, '-')}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 5. CSV Export

### Objects to CSV

```typescript
function exportToCSV(objects: Object3D[], filename: string) {
  const headers = [
    'ID', 'Name', 'Type', 
    'Position X (m)', 'Position Y (m)', 'Position Z (m)',
    'Width (mm)', 'Height (mm)', 'Depth (mm)',
    'Rotation (deg)'
  ];
  
  const rows = objects.map(obj => [
    obj.id,
    obj.name,
    obj.type,
    obj.position.x.toFixed(3),
    obj.position.y.toFixed(3),
    obj.position.z.toFixed(3),
    obj.dimensions.width,
    obj.dimensions.height,
    obj.dimensions.depth,
    ((obj.rotation.y * 180) / Math.PI).toFixed(1),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Bill of Materials (BOM)

```typescript
interface BOMItem {
  category: string;
  model: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

function generateBOM(objects: Object3D[]): BOMItem[] {
  const grouped = objects.reduce((acc, obj) => {
    const key = `${obj.type}-${obj.name}`;
    if (!acc[key]) {
      acc[key] = {
        category: obj.type,
        model: obj.name,
        quantity: 0,
        unitPrice: getUnitPrice(obj.type, obj.name),
        totalPrice: 0,
      };
    }
    acc[key].quantity++;
    acc[key].totalPrice = acc[key].quantity * acc[key].unitPrice;
    return acc;
  }, {} as Record<string, BOMItem>);
  
  return Object.values(grouped);
}

function exportBOMToCSV(bom: BOMItem[], filename: string) {
  const headers = ['Category', 'Model', 'Quantity', 'Unit Price (USD)', 'Total (USD)'];
  
  const rows = bom.map(item => [
    item.category,
    item.model,
    item.quantity,
    item.unitPrice.toFixed(2),
    item.totalPrice.toFixed(2),
  ]);
  
  // Add total row
  const total = bom.reduce((sum, item) => sum + item.totalPrice, 0);
  rows.push(['', '', '', 'TOTAL:', total.toFixed(2)]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 6. LocalStorage Persistence

### Auto-Save

```typescript
const STORAGE_KEY = 'hearst-designer-autosave';

function autoSave(objects: Object3D[], projectName: string) {
  const data = {
    name: projectName,
    objects: objects.map(serializeObject),
    savedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadAutoSave(): { name: string; objects: Object3D[] } | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// React hook
function useAutoSave(objects: Object3D[], projectName: string) {
  useEffect(() => {
    const timer = setInterval(() => {
      autoSave(objects, projectName);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(timer);
  }, [objects, projectName]);
}
```

### Project Management

```typescript
interface SavedProject {
  id: string;
  name: string;
  objects: SerializedObject[];
  savedAt: string;
}

const PROJECTS_KEY = 'hearst-designer-projects';

function getSavedProjects(): SavedProject[] {
  const saved = localStorage.getItem(PROJECTS_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveProject(project: SavedProject) {
  const projects = getSavedProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function deleteProject(id: string) {
  const projects = getSavedProjects().filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}
```

---

## 7. Export Component

```tsx
function ExportPanel({
  objects,
  projectName,
  gl,
  scene,
  camera,
}: {
  objects: Object3D[];
  projectName: string;
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
}) {
  const handleExportJSON = () => {
    const data = exportScene(objects, projectName);
    downloadJSON(data, `${projectName}.json`);
  };
  
  const handleExportDXF = () => {
    downloadDXF(objects, projectName);
  };
  
  const handleExportCSV = () => {
    exportToCSV(objects, `${projectName}-objects.csv`);
  };
  
  const handleExportBOM = () => {
    const bom = generateBOM(objects);
    exportBOMToCSV(bom, `${projectName}-bom.csv`);
  };
  
  const handleScreenshot = () => {
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL('image/png');
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${projectName}-screenshot.png`;
    a.click();
  };
  
  const handleExportGLTF = async () => {
    await exportToGLTF(scene, projectName);
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow">
      <h3 className="font-bold">Export</h3>
      
      <button onClick={handleExportJSON} className="btn">
        📄 JSON (Project)
      </button>
      
      <button onClick={handleExportDXF} className="btn">
        📐 DXF (CAD)
      </button>
      
      <button onClick={handleExportCSV} className="btn">
        📊 CSV (Objects)
      </button>
      
      <button onClick={handleExportBOM} className="btn">
        📋 BOM (Bill of Materials)
      </button>
      
      <button onClick={handleScreenshot} className="btn">
        📷 Screenshot (PNG)
      </button>
      
      <button onClick={handleExportGLTF} className="btn">
        🎮 GLTF (3D Model)
      </button>
    </div>
  );
}
```

---

## Export Checklist

- [ ] JSON includes all object properties
- [ ] JSON includes version for migration
- [ ] Screenshots at appropriate resolution
- [ ] DXF uses correct coordinate system
- [ ] CSV includes all relevant data
- [ ] BOM groups identical items
- [ ] Auto-save enabled
- [ ] Error handling for all exports

---

## Additional Resources

- For R3F patterns, see [r3f-components skill](../r3f-components/SKILL.md)
- For interaction, see [threejs-interaction skill](../threejs-interaction/SKILL.md)
- For models, see [threejs-models skill](../threejs-models/SKILL.md)
