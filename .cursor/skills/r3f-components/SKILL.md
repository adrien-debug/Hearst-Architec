---
name: r3f-components
description: React Three Fiber component patterns, hooks, and best practices. Use when creating 3D React components, using R3F hooks (useFrame, useThree, useLoader), handling 3D events, or when the user asks about React Three Fiber, drei, or fiber components.
---

# React Three Fiber Components

This skill covers React Three Fiber (R3F) patterns for building performant, maintainable 3D components.

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| useFrame | Per-frame animations |
| useThree | Access renderer, camera, scene |
| useLoader | Load textures, models |
| Html | 2D overlays in 3D space |
| Suspense | Loading states |

---

## 1. Component Structure

### Basic R3F Component

```typescript
'use client'; // Required for Next.js

import { useRef, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MyObjectProps {
  position?: [number, number, number];
  color?: string;
  onClick?: () => void;
}

const MyObject = memo(function MyObject({
  position = [0, 0, 0],
  color = '#8AFD81',
  onClick
}: MyObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <mesh 
      ref={meshRef} 
      position={position}
      onClick={onClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});

export default MyObject;
```

### Component Checklist

- [ ] `'use client'` directive (Next.js)
- [ ] TypeScript interface for props
- [ ] Wrapped in `memo()`
- [ ] Named function (for debugging)
- [ ] useRef for mesh access
- [ ] Default prop values

---

## 2. Canvas Setup

### Basic Canvas

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';

function App() {
  return (
    <div className="w-full h-screen">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
        <OrbitControls enableDamping dampingFactor={0.05} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        
        {/* Environment */}
        <Environment preset="warehouse" />
        
        {/* Scene content */}
        <MyScene />
      </Canvas>
    </div>
  );
}
```

### Performance Canvas

```tsx
<Canvas
  shadows="soft"
  dpr={[1, 2]}
  performance={{ min: 0.5, max: 1 }}
  gl={{
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  }}
  camera={{ position: [10, 10, 10], fov: 50 }}
>
```

---

## 3. useFrame Hook

### Basic Animation

```typescript
import { useFrame } from '@react-three/fiber';

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.5;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}
```

### Conditional Animation

```typescript
function ConditionalAnimation({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    // Early return if not active
    if (!active || !meshRef.current) return;
    
    meshRef.current.rotation.y += delta;
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

### Access State

```typescript
useFrame((state) => {
  const { clock, camera, mouse, viewport, scene, gl } = state;
  
  // Clock - elapsed time
  const elapsed = clock.elapsedTime;
  
  // Camera position
  const camPos = camera.position;
  
  // Mouse position (-1 to 1)
  const mouseX = mouse.x;
  const mouseY = mouse.y;
  
  // Viewport size
  const { width, height } = viewport;
});
```

### useFrame Rules

| Do | Don't |
|----|----|
| Direct mutation of refs | setState calls |
| Use delta for timing | Create new objects |
| Early return when inactive | Heavy computations |
| Check refs before access | Access DOM |

---

## 4. useThree Hook

### Access Three.js Internals

```typescript
import { useThree } from '@react-three/fiber';

function CameraController() {
  const { camera, gl, scene, size, viewport } = useThree();
  
  // Camera manipulation
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);
  
  // Renderer access
  console.log('Renderer size:', gl.domElement.width, gl.domElement.height);
  
  // Scene traversal
  scene.traverse((obj) => {
    if (obj.type === 'Mesh') {
      console.log('Found mesh:', obj.name);
    }
  });
  
  return null;
}
```

### Responsive Design

```typescript
function ResponsiveObject() {
  const { viewport } = useThree();
  
  // Scale based on viewport
  const scale = Math.min(viewport.width, viewport.height) / 10;
  
  return (
    <mesh scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
}
```

---

## 5. useLoader Hook

### Load Texture

```typescript
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';

function TexturedMesh() {
  const texture = useLoader(TextureLoader, '/textures/wood.jpg');
  
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
```

### Load GLTF Model

```typescript
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function Model({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  
  return <primitive object={gltf.scene} />;
}
```

### With Suspense

```tsx
import { Suspense } from 'react';

function Scene() {
  return (
    <Suspense fallback={<LoadingBox />}>
      <Model url="/models/machine.gltf" />
    </Suspense>
  );
}

function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" wireframe />
    </mesh>
  );
}
```

---

## 6. Event Handling

### Basic Events

```typescript
function InteractiveMesh() {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation();
        setClicked(!clicked);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      scale={clicked ? 1.5 : 1}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  );
}
```

### Event Types

```typescript
import { ThreeEvent } from '@react-three/fiber';

interface MeshProps {
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onDoubleClick?: (e: ThreeEvent<MouseEvent>) => void;
  onWheel?: (e: ThreeEvent<WheelEvent>) => void;
}
```

### Optimized Handlers

```typescript
const InteractiveMesh = memo(function InteractiveMesh({
  id,
  onSelect
}: {
  id: string;
  onSelect: (id: string) => void;
}) {
  // Stable handler reference
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  }, [id, onSelect]);

  return (
    <mesh onClick={handleClick}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
});
```

---

## 7. Drei Helpers

### Common Components

```tsx
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Grid,
  Text,
  Html,
  TransformControls,
  Line,
  Float,
  useGLTF,
  useTexture,
} from '@react-three/drei';
```

### OrbitControls

```tsx
<OrbitControls
  makeDefault
  enableDamping
  dampingFactor={0.05}
  minDistance={5}
  maxDistance={100}
  maxPolarAngle={Math.PI / 2.1}
  minPolarAngle={0.1}
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
/>
```

### TransformControls

```tsx
import { TransformControls } from '@react-three/drei';

function TransformableObject({ selected }: { selected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const transformRef = useRef<any>(null);
  
  return (
    <group>
      {selected && (
        <TransformControls
          ref={transformRef}
          object={meshRef.current || undefined}
          mode="translate" // 'translate' | 'rotate' | 'scale'
          size={0.5}
        />
      )}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  );
}
```

### Grid

```tsx
<Grid
  position={[0, 0, 0]}
  args={[100, 100]}
  cellSize={1}
  cellThickness={0.5}
  cellColor="#6b7280"
  sectionSize={5}
  sectionThickness={1}
  sectionColor="#374151"
  fadeDistance={50}
  fadeStrength={1}
/>
```

### Text

```tsx
import { Text } from '@react-three/drei';

<Text
  position={[0, 2, 0]}
  fontSize={0.5}
  color="white"
  anchorX="center"
  anchorY="middle"
  outlineWidth={0.02}
  outlineColor="black"
>
  Hello World
</Text>
```

### Html (2D in 3D)

```tsx
import { Html } from '@react-three/drei';

function LabeledMesh() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <Html
        position={[0, 1.5, 0]}
        center
        distanceFactor={10}
        occlude
      >
        <div className="bg-white px-2 py-1 rounded shadow">
          Machine #1
        </div>
      </Html>
    </group>
  );
}
```

---

## 8. Scene Organization

### Group Pattern

```tsx
function Scene() {
  return (
    <group>
      {/* Lighting group */}
      <group name="lights">
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} />
      </group>
      
      {/* Environment group */}
      <group name="environment">
        <Floor />
        <Grid />
      </group>
      
      {/* Objects group */}
      <group name="objects">
        <Machine position={[0, 0, 0]} />
        <Machine position={[5, 0, 0]} />
      </group>
      
      {/* UI group */}
      <group name="ui">
        <Labels />
      </group>
    </group>
  );
}
```

### Separation of Concerns

```
components/
├── scene/
│   ├── Scene.tsx           # Main scene component
│   ├── SceneLighting.tsx   # All lights
│   ├── SceneEnvironment.tsx # Floor, grid, sky
│   └── SceneControls.tsx   # Camera controls
├── objects/
│   ├── Machine.tsx
│   ├── Container.tsx
│   └── Transformer.tsx
└── ui/
    ├── Labels.tsx
    └── Tooltips.tsx
```

---

## 9. State Management

### Local State (Simple)

```tsx
function ClickCounter() {
  const [count, setCount] = useState(0);
  
  return (
    <mesh onClick={() => setCount(c => c + 1)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={count > 5 ? 'red' : 'green'} />
    </mesh>
  );
}
```

### Zustand (Complex)

```typescript
// store.ts
import { create } from 'zustand';

interface SceneStore {
  selectedId: string | null;
  objects: Object3D[];
  setSelected: (id: string | null) => void;
  addObject: (obj: Object3D) => void;
  updateObject: (id: string, updates: Partial<Object3D>) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  selectedId: null,
  objects: [],
  setSelected: (id) => set({ selectedId: id }),
  addObject: (obj) => set((s) => ({ objects: [...s.objects, obj] })),
  updateObject: (id, updates) => set((s) => ({
    objects: s.objects.map(o => o.id === id ? { ...o, ...updates } : o)
  })),
}));
```

```tsx
// Component usage
function SelectableMesh({ id }: { id: string }) {
  const { selectedId, setSelected } = useSceneStore();
  const isSelected = selectedId === id;
  
  return (
    <mesh onClick={() => setSelected(id)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={isSelected ? 'yellow' : 'gray'} />
    </mesh>
  );
}
```

---

## 10. Error Boundaries

### 3D Error Boundary

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function Fallback3D() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="red" wireframe />
    </mesh>
  );
}

function Scene() {
  return (
    <Canvas>
      <ErrorBoundary fallback={<Fallback3D />}>
        <RiskyComponent />
      </ErrorBoundary>
    </Canvas>
  );
}
```

---

## Component Template

```typescript
'use client';

import { useRef, useState, useCallback, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Types
interface MyComponentProps {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

// Shared resources (outside component)
const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
const sharedMaterial = new THREE.MeshStandardMaterial({ color: '#888' });

// Component
const MyComponent = memo(function MyComponent({
  position = [0, 0, 0],
  scale = 1,
  color = '#888',
  active = false,
  onClick,
}: MyComponentProps) {
  // Refs
  const meshRef = useRef<THREE.Mesh>(null);
  
  // State
  const [hovered, setHovered] = useState(false);
  
  // Memoized values
  const finalColor = useMemo(() => 
    hovered ? '#ff0' : color, 
    [hovered, color]
  );
  
  // Callbacks
  const handleClick = useCallback((e: THREE.Event) => {
    e.stopPropagation();
    onClick?.();
  }, [onClick]);
  
  const handlePointerOver = useCallback(() => setHovered(true), []);
  const handlePointerOut = useCallback(() => setHovered(false), []);
  
  // Animation
  useFrame((_, delta) => {
    if (!active || !meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.5;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      castShadow
      receiveShadow
    >
      <primitive object={sharedGeometry} attach="geometry" />
      <meshStandardMaterial color={finalColor} />
    </mesh>
  );
});

export default MyComponent;
```

---

## Additional Resources

- For performance optimization, see [threejs-performance skill](../threejs-performance/SKILL.md)
- For 3D models, see [threejs-models skill](../threejs-models/SKILL.md)
- For lighting, see [threejs-lighting skill](../threejs-lighting/SKILL.md)
