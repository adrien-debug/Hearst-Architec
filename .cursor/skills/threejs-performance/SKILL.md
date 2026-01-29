---
name: threejs-performance
description: Optimize Three.js and React Three Fiber 3D scenes for maximum performance. Use when working on 3D components, fixing performance issues, reducing FPS drops, optimizing render loops, or when the user mentions slow 3D, laggy scene, or performance problems.
---

# Three.js Performance Optimization

This skill provides patterns for optimizing Three.js/React Three Fiber scenes. Apply these patterns to achieve 40-60% performance improvements.

## Quick Reference

| Technique | Impact | When to Use |
|-----------|--------|-------------|
| Shared Geometries | 🔴 High | Multiple identical shapes |
| Shared Materials | 🔴 High | Same visual appearance |
| React.memo() | 🔴 High | All 3D components |
| useMemo arrays | 🟡 Medium | Dynamic arrays in render |
| InstancedMesh | 🔴 High | 10+ identical objects |
| useFrame optimization | 🟡 Medium | Animations |
| Frustum culling | 🟡 Medium | Large scenes |

---

## 1. Shared Geometries Pattern

**Problem**: Creating geometry in component body = new geometry every render.

**Solution**: Create geometries once at module level.

```typescript
// ✅ GOOD - Created once, reused everywhere
const sharedGeometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 32, 32),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  plane: new THREE.PlaneGeometry(10, 10),
};

function MyComponent() {
  return (
    <mesh>
      <primitive object={sharedGeometries.box} attach="geometry" />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
```

```typescript
// ❌ BAD - New geometry every render
function MyComponent() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />  {/* Creates new geometry! */}
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
```

### When to Use Shared vs Inline Geometries

| Scenario | Use |
|----------|-----|
| Same geometry used 3+ times | Shared |
| Geometry with dynamic args | Inline (memoized) |
| One-off unique geometry | Inline |
| Performance-critical scene | Always Shared |

---

## 2. Shared Materials Pattern

**Problem**: Materials are expensive. Creating new materials = GPU memory waste.

**Solution**: Create materials once, reuse via primitive.

```typescript
// ✅ GOOD - Shared materials
const sharedMaterials = {
  metal: new THREE.MeshStandardMaterial({ 
    color: '#888', 
    metalness: 0.8, 
    roughness: 0.2 
  }),
  plastic: new THREE.MeshStandardMaterial({ 
    color: '#fff', 
    metalness: 0.1, 
    roughness: 0.7 
  }),
  glass: new THREE.MeshPhysicalMaterial({ 
    color: '#fff', 
    transmission: 0.9, 
    roughness: 0.1 
  }),
};

function Machine() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={sharedMaterials.metal} attach="material" />
    </mesh>
  );
}
```

### Material Cloning for Variations

If you need slight variations (e.g., different colors):

```typescript
// Clone material for color variations
const redMetal = sharedMaterials.metal.clone();
redMetal.color.set('#ff0000');
```

---

## 3. React.memo() for 3D Components

**Problem**: Parent re-renders cause all children to re-render.

**Solution**: Wrap 3D components with memo().

```typescript
// ✅ GOOD - Memoized component
const Machine = memo(function Machine({ 
  position, 
  color 
}: { 
  position: [number, number, number]; 
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1, 0.5, 0.8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});

// Component only re-renders when position or color changes
```

### memo() Checklist

- [ ] All 3D components wrapped in memo()
- [ ] Props are primitive values or stable references
- [ ] No inline objects in props (`position={[0,0,0]}` is OK)
- [ ] No inline functions in props (use useCallback)

---

## 4. useMemo for Arrays and Positions

**Problem**: Array.from() or map() in JSX = new array every render.

**Solution**: Pre-calculate arrays with useMemo.

```typescript
// ✅ GOOD - Pre-calculated array
const MyGrid = memo(function MyGrid({ count }: { count: number }) {
  const positions = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (i % 10) * 2,
      z: Math.floor(i / 10) * 2,
      key: `item-${i}`
    }));
  }, [count]);

  return (
    <group>
      {positions.map(({ x, z, key }) => (
        <mesh key={key} position={[x, 0, z]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
    </group>
  );
});
```

```typescript
// ❌ BAD - Array created every render
function MyGrid({ count }) {
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[(i % 10) * 2, 0, Math.floor(i / 10) * 2]}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
    </group>
  );
}
```

---

## 5. InstancedMesh for Repeated Objects

**Problem**: 100 meshes = 100 draw calls = slow.

**Solution**: InstancedMesh = 1 draw call for 100+ objects.

```typescript
import { useRef, useMemo } from 'react';
import { InstancedMesh, Object3D, Matrix4 } from 'three';

const Instances = memo(function Instances({ 
  count, 
  positions 
}: { 
  count: number; 
  positions: [number, number, number][];
}) {
  const meshRef = useRef<InstancedMesh>(null);
  
  // Set instance matrices
  useMemo(() => {
    if (!meshRef.current) return;
    
    const dummy = new Object3D();
    positions.forEach((pos, i) => {
      dummy.position.set(...pos);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#888" />
    </instancedMesh>
  );
});
```

### InstancedMesh vs Individual Meshes

| Objects | Individual Meshes | InstancedMesh |
|---------|-------------------|---------------|
| 10 | OK | Overkill |
| 50 | Slow | ✅ Use |
| 100+ | Very slow | ✅ Required |
| 1000+ | Unplayable | ✅ Essential |

---

## 6. useFrame Optimization

**Problem**: useFrame runs every frame. Heavy operations kill FPS.

**Solution**: Minimize work, use refs, conditional execution.

```typescript
// ✅ GOOD - Optimized useFrame
const RotatingMachine = memo(function RotatingMachine({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    // Skip if not active
    if (!active || !meshRef.current) return;
    
    // Direct mutation (no setState!)
    meshRef.current.rotation.y += delta * 0.5;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
});
```

### useFrame Rules

1. **Never call setState** in useFrame
2. **Always check refs** before accessing
3. **Use delta** for framerate-independent animation
4. **Early return** when animation not needed
5. **Avoid creating objects** (vectors, matrices)

```typescript
// ❌ BAD - Creates vector every frame
useFrame(() => {
  mesh.current.position.copy(new THREE.Vector3(x, y, z));
});

// ✅ GOOD - Reuse vector
const tempVec = useMemo(() => new THREE.Vector3(), []);
useFrame(() => {
  mesh.current.position.copy(tempVec.set(x, y, z));
});
```

---

## 7. Event Handler Optimization

**Problem**: Inline handlers create new functions every render.

**Solution**: useCallback for stable references.

```typescript
// ✅ GOOD - Stable handlers
const Machine = memo(function Machine({ 
  id, 
  onSelect 
}: { 
  id: string; 
  onSelect: (id: string) => void;
}) {
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  }, [id, onSelect]);

  const handlePointerOver = useCallback(() => {
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'auto';
  }, []);

  return (
    <mesh 
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
});
```

---

## 8. Scene-Level Optimizations

### Canvas Configuration

```tsx
<Canvas
  shadows="soft"           // or false for perf
  dpr={[1, 2]}             // Device pixel ratio range
  performance={{
    min: 0.5,              // Min DPR when lagging
    max: 1,                // Max DPR
    debounce: 200,         // Debounce time
  }}
  gl={{
    antialias: false,      // Disable if not needed
    alpha: false,          // Disable if not needed
    powerPreference: 'high-performance',
  }}
>
```

### Shadow Optimization

```tsx
<directionalLight
  castShadow
  shadow-mapSize={[1024, 1024]}  // Lower = faster (512, 1024, 2048)
  shadow-camera-far={50}
  shadow-camera-left={-10}
  shadow-camera-right={10}
  shadow-camera-top={10}
  shadow-camera-bottom={-10}
/>
```

---

## 9. Performance Debugging

### R3F Performance Monitor

```tsx
import { Perf } from 'r3f-perf';

<Canvas>
  <Perf position="top-left" />
  {/* ... scene */}
</Canvas>
```

### Key Metrics

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| FPS | 55-60 | 30-55 | <30 |
| Draw calls | <50 | 50-100 | >100 |
| Triangles | <100k | 100-500k | >500k |
| GPU memory | <256MB | 256-512MB | >512MB |

---

## Performance Checklist

Before deploying a 3D scene:

### Critical (Do First)
- [ ] All repeated geometries use shared instances
- [ ] All repeated materials use shared instances  
- [ ] All 3D components wrapped in memo()
- [ ] No Array.from() or map() in JSX without useMemo

### Important
- [ ] useFrame uses delta and early returns
- [ ] Event handlers use useCallback
- [ ] Shadow map sizes are appropriate
- [ ] DPR is capped appropriately

### Nice to Have
- [ ] InstancedMesh for 10+ identical objects
- [ ] LOD for complex objects
- [ ] Frustum culling enabled
- [ ] Texture compression applied

---

## Additional Resources

- For R3F patterns, see [r3f-components skill](../r3f-components/SKILL.md)
- For lighting optimization, see [threejs-lighting skill](../threejs-lighting/SKILL.md)
- For animation patterns, see [threejs-animation skill](../threejs-animation/SKILL.md)
