---
name: threejs-interaction
description: Three.js interaction patterns for React Three Fiber. Use when implementing click, hover, drag, selection, transform controls, or when the user mentions select, click, drag, move objects, or interaction.
---

# Three.js Interaction

This skill covers interaction patterns for React Three Fiber applications.

## Quick Reference

| Interaction | Drei Helper | Native |
|-------------|-------------|--------|
| Click | - | onClick |
| Hover | - | onPointerOver/Out |
| Drag | useDrag | Custom |
| Transform | TransformControls | - |
| Select | Select | Custom |
| Measure | - | Custom |

---

## 1. Basic Click Handling

### Simple Click

```typescript
function ClickableBox() {
  const [clicked, setClicked] = useState(false);
  
  return (
    <mesh onClick={() => setClicked(!clicked)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={clicked ? 'green' : 'blue'} />
    </mesh>
  );
}
```

### Stop Propagation

```typescript
function NestedClickable() {
  return (
    <group onClick={(e) => {
      e.stopPropagation();
      console.log('Group clicked');
    }}>
      <mesh onClick={(e) => {
        e.stopPropagation();  // Prevent group click
        console.log('Mesh clicked');
      }}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  );
}
```

### Event Data

```typescript
import { ThreeEvent } from '@react-three/fiber';

function EventDetails() {
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    
    console.log('Point:', e.point);           // World position
    console.log('Distance:', e.distance);     // From camera
    console.log('Face:', e.face);             // Hit face
    console.log('Object:', e.object);         // Hit mesh
    console.log('UV:', e.uv);                 // UV coordinates
  };

  return <mesh onClick={handleClick}>...</mesh>;
}
```

---

## 2. Hover Effects

### Basic Hover

```typescript
function HoverableBox() {
  const [hovered, setHovered] = useState(false);
  
  return (
    <mesh
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  );
}
```

### Cursor Change

```typescript
function CursorChange() {
  return (
    <mesh
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
}
```

### Optimized Hover

```typescript
const HoverableMesh = memo(function HoverableMesh({
  onClick,
}: {
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);
  
  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);
  
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  return (
    <mesh
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  );
});
```

---

## 3. Selection System

### Single Selection

```typescript
function SelectableScene() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const objects = [
    { id: 'a', position: [0, 0, 0] },
    { id: 'b', position: [3, 0, 0] },
    { id: 'c', position: [6, 0, 0] },
  ];

  return (
    <group onClick={() => setSelectedId(null)}>
      {/* Floor for deselection */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="gray" />
      </mesh>
      
      {/* Selectable objects */}
      {objects.map(obj => (
        <SelectableObject
          key={obj.id}
          id={obj.id}
          position={obj.position as [number, number, number]}
          isSelected={selectedId === obj.id}
          onSelect={() => setSelectedId(obj.id)}
        />
      ))}
    </group>
  );
}

const SelectableObject = memo(function SelectableObject({
  id,
  position,
  isSelected,
  onSelect,
}: {
  id: string;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  return (
    <group position={position}>
      <mesh onClick={handleClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={isSelected ? 'yellow' : 'blue'} />
      </mesh>
      
      {/* Selection outline */}
      {isSelected && (
        <mesh scale={1.05}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="lime" wireframe />
        </mesh>
      )}
    </group>
  );
});
```

### Multi Selection

```typescript
function MultiSelectScene() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const handleSelect = useCallback((id: string, event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      
      if (event.nativeEvent.shiftKey) {
        // Shift-click: toggle selection
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      } else {
        // Normal click: single select
        next.clear();
        next.add(id);
      }
      
      return next;
    });
  }, []);
  
  const handleDeselect = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <group onClick={handleDeselect}>
      {objects.map(obj => (
        <SelectableObject
          key={obj.id}
          isSelected={selectedIds.has(obj.id)}
          onSelect={(e) => handleSelect(obj.id, e)}
        />
      ))}
    </group>
  );
}
```

---

## 4. Transform Controls

### Basic Transform

```typescript
import { TransformControls } from '@react-three/drei';

function TransformableObject({ selected }: { selected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <>
      {selected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"  // 'translate' | 'rotate' | 'scale'
          size={0.5}
        />
      )}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={selected ? 'yellow' : 'blue'} />
      </mesh>
    </>
  );
}
```

### Transform with Callbacks

```typescript
function TransformWithCallback({
  object,
  mode,
  onTransformEnd,
}: {
  object: Object3D;
  mode: 'translate' | 'rotate' | 'scale';
  onTransformEnd: (position: Vector3, rotation: Euler, scale: Vector3) => void;
}) {
  const transformRef = useRef<any>(null);

  useEffect(() => {
    if (!transformRef.current) return;
    
    const handleChange = () => {
      if (object) {
        onTransformEnd(
          object.position.clone(),
          object.rotation.clone(),
          object.scale.clone()
        );
      }
    };
    
    const controls = transformRef.current;
    controls.addEventListener('objectChange', handleChange);
    
    return () => {
      controls.removeEventListener('objectChange', handleChange);
    };
  }, [object, onTransformEnd]);

  return (
    <TransformControls
      ref={transformRef}
      object={object}
      mode={mode}
      size={0.5}
    />
  );
}
```

### Mode Switching

```typescript
type TransformMode = 'translate' | 'rotate' | 'scale';

function TransformModeSelector() {
  const [mode, setMode] = useState<TransformMode>('translate');
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'g': setMode('translate'); break;
        case 'r': setMode('rotate'); break;
        case 's': setMode('scale'); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <TransformControls mode={mode} />
  );
}
```

---

## 5. Keyboard Controls

### Arrow Key Movement

```typescript
function KeyboardMovement() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!meshRef.current) return;
      
      const step = e.shiftKey ? 1 : 0.5;
      
      switch (e.key) {
        case 'ArrowUp':
          meshRef.current.position.z -= step;
          break;
        case 'ArrowDown':
          meshRef.current.position.z += step;
          break;
        case 'ArrowLeft':
          meshRef.current.position.x -= step;
          break;
        case 'ArrowRight':
          meshRef.current.position.x += step;
          break;
        case 'PageUp':
          meshRef.current.position.y += step;
          break;
        case 'PageDown':
          meshRef.current.position.y -= step;
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <mesh ref={meshRef}>...</mesh>;
}
```

### Rotation Shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!meshRef.current || !selectedId) return;
    
    const rotateStep = Math.PI / 2; // 90 degrees
    
    switch (e.key.toLowerCase()) {
      case 'q':
        meshRef.current.rotation.y -= rotateStep;
        break;
      case 'e':
        meshRef.current.rotation.y += rotateStep;
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedId]);
```

---

## 6. Drag and Drop

### Basic Drag (Drei)

```typescript
import { useDrag } from '@use-gesture/react';
import { useThree } from '@react-three/fiber';

function DraggableMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, viewport } = useThree();
  
  const bind = useDrag(({ offset: [x, y] }) => {
    if (!meshRef.current) return;
    
    // Convert screen to world coordinates
    const factor = viewport.width / size.width;
    meshRef.current.position.x = x * factor;
    meshRef.current.position.y = -y * factor;
  });

  return (
    <mesh ref={meshRef} {...(bind() as any)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
```

### Grid Snapping

```typescript
function DraggableWithSnap({ gridSize = 1 }: { gridSize?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const bind = useDrag(({ offset: [x, y] }) => {
    if (!meshRef.current) return;
    
    // Snap to grid
    const snapX = Math.round(x / gridSize) * gridSize;
    const snapY = Math.round(y / gridSize) * gridSize;
    
    meshRef.current.position.x = snapX;
    meshRef.current.position.y = snapY;
  });

  return <mesh ref={meshRef} {...(bind() as any)}>...</mesh>;
}
```

---

## 7. Floor Click Placement

```typescript
function FloorClickPlacement({
  onPlace,
}: {
  onPlace: (position: [number, number, number]) => void;
}) {
  const handleFloorClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    
    // Get world position from click
    const point = e.point;
    
    // Optional: snap to grid
    const gridSize = 1;
    const snappedX = Math.round(point.x / gridSize) * gridSize;
    const snappedZ = Math.round(point.z / gridSize) * gridSize;
    
    onPlace([snappedX, 0, snappedZ]);
  }, [onPlace]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={handleFloorClick}
      receiveShadow
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#f0f0f0" />
    </mesh>
  );
}
```

---

## 8. Measurement Tool

```typescript
import { Line, Html } from '@react-three/drei';

function MeasurementLine({
  start,
  end,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
}) {
  const distance = start.distanceTo(end);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  return (
    <group>
      <Line
        points={[start, end]}
        color="#ef4444"
        lineWidth={2}
        dashed
        dashSize={0.1}
        gapSize={0.05}
      />
      <Html position={midPoint} center>
        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          {(distance * 1000).toFixed(0)} mm ({distance.toFixed(2)} m)
        </div>
      </Html>
    </group>
  );
}

function MeasureTool() {
  const [points, setPoints] = useState<THREE.Vector3[]>([]);
  
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    
    setPoints(prev => {
      if (prev.length >= 2) {
        return [e.point.clone()];
      }
      return [...prev, e.point.clone()];
    });
  }, []);

  return (
    <>
      <mesh onClick={handleClick} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="gray" />
      </mesh>
      
      {points.length === 2 && (
        <MeasurementLine start={points[0]} end={points[1]} />
      )}
    </>
  );
}
```

---

## 9. Raycasting

### Custom Raycaster

```typescript
import { useThree } from '@react-three/fiber';

function CustomRaycast() {
  const { camera, scene, mouse } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  
  useFrame(() => {
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      console.log('Hit:', hit.object.name, hit.point);
    }
  });

  return null;
}
```

---

## 10. Complete Interactive Object

```typescript
const InteractiveObject = memo(function InteractiveObject({
  id,
  initialPosition,
  isSelected,
  onSelect,
  onPositionChange,
}: {
  id: string;
  initialPosition: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (pos: [number, number, number]) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Event handlers
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);
  
  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);
  
  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  // Keyboard movement when selected
  useEffect(() => {
    if (!isSelected) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!meshRef.current) return;
      
      const step = e.shiftKey ? 1 : 0.5;
      const pos = meshRef.current.position;
      
      switch (e.key) {
        case 'ArrowUp': pos.z -= step; break;
        case 'ArrowDown': pos.z += step; break;
        case 'ArrowLeft': pos.x -= step; break;
        case 'ArrowRight': pos.x += step; break;
        case 'Delete':
        case 'Backspace':
          // Handle delete
          break;
      }
      
      onPositionChange([pos.x, pos.y, pos.z]);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, onPositionChange]);

  return (
    <group position={initialPosition}>
      {/* Transform controls when selected */}
      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode="translate"
          size={0.5}
        />
      )}
      
      {/* Main mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={isSelected ? 'yellow' : hovered ? 'hotpink' : 'blue'} 
        />
      </mesh>
      
      {/* Selection outline */}
      {isSelected && (
        <mesh scale={1.02}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="lime" wireframe />
        </mesh>
      )}
    </group>
  );
});
```

---

## Interaction Checklist

- [ ] Always stopPropagation on clicks
- [ ] Use memo for interactive components
- [ ] Use useCallback for handlers
- [ ] Change cursor on hover
- [ ] Visual feedback for hover/selection
- [ ] Keyboard shortcuts documented
- [ ] Floor click for deselection

---

## Additional Resources

- For R3F patterns, see [r3f-components skill](../r3f-components/SKILL.md)
- For animation, see [threejs-animation skill](../threejs-animation/SKILL.md)
- For performance, see [threejs-performance skill](../threejs-performance/SKILL.md)
