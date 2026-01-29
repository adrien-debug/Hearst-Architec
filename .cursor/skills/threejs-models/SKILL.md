---
name: threejs-models
description: Create realistic procedural 3D models for industrial equipment (containers, cooling systems, transformers, racks, machines). Use when building 3D objects, creating equipment models, designing mining infrastructure, or when the user asks about container, transformer, cooling, ASIC, or industrial equipment models.
---

# Three.js Procedural Models

This skill provides patterns for creating realistic industrial equipment models in Three.js/React Three Fiber without external 3D files.

## Quick Reference

| Equipment Type | Complexity | Key Features |
|----------------|------------|--------------|
| ISO Container | Medium | Corrugations, doors, frame |
| Cooling System | High | Fans (animated), panels, pipes |
| Transformer | Medium | Radiator fins, insulators |
| Server Rack | Low | Frame, posts, slots |
| ASIC Miner | Low | Box, fans, LEDs |

---

## 1. Dimension Standards

### Real-World to Three.js Conversion

Industrial equipment uses millimeters. Three.js uses arbitrary units (typically 1 unit = 1 meter).

```typescript
// Standard conversion function
function mmToM(mm: number): number {
  return mm / 1000;
}

// Example: ISO 40ft container
const containerDims = {
  width: 12192,  // mm (length in X)
  height: 2896,  // mm (height in Y)
  depth: 2438,   // mm (width in Z)
};

// In Three.js
const w = containerDims.width / 1000;  // 12.192m
const h = containerDims.height / 1000; // 2.896m
const d = containerDims.depth / 1000;  // 2.438m
```

### Common Equipment Dimensions (mm)

| Equipment | Width | Height | Depth |
|-----------|-------|--------|-------|
| ISO 40ft Container | 12192 | 2896 | 2438 |
| ISO 20ft Container | 6058 | 2896 | 2438 |
| EC2-DT Cooling | 12192 | 2896 | 2438 |
| Transformer 4MW | 2500 | 3000 | 2000 |
| Server Rack 42U | 600 | 2000 | 1000 |
| ASIC Miner | 400 | 200 | 200 |

---

## 2. ISO Container Model

### Structure Overview

```
Container Components:
├── Main body (box)
├── Corrugated walls (repeated boxes)
├── Frame (corner posts, top/bottom rails)
├── Corner castings (8x blocks)
├── Doors (2x panels + handles)
└── Forklift pockets
```

### Implementation

```typescript
const ISOContainer = memo(function ISOContainer({ 
  dimensions,
  position = [0, 0, 0] 
}: { 
  dimensions: { width: number; height: number; depth: number };
  position?: [number, number, number];
}) {
  const w = dimensions.width / 1000;
  const h = dimensions.height / 1000;
  const d = dimensions.depth / 1000;
  
  // Pre-calculate corrugation count
  const corrugationCount = Math.floor(w / 0.12);
  const corrugations = useMemo(() => 
    Array.from({ length: corrugationCount }, (_, i) => i),
    [corrugationCount]
  );
  
  // Corner positions (memoized)
  const cornerPositions = useMemo(() => [
    [-w/2, 0, -d/2], [w/2, 0, -d/2],
    [-w/2, 0, d/2], [w/2, 0, d/2],
  ] as [number, number, number][], [w, d]);

  return (
    <group position={position}>
      {/* Main body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.6} roughness={0.35} />
      </mesh>
      
      {/* Corrugated walls - front side */}
      {corrugations.map(i => (
        <mesh key={`front-${i}`} position={[-w/2 + 0.06 + i * 0.12, 0, -d/2 - 0.012]} castShadow>
          <boxGeometry args={[0.06, h * 0.92, 0.025]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* Corrugated walls - back side */}
      {corrugations.map(i => (
        <mesh key={`back-${i}`} position={[-w/2 + 0.06 + i * 0.12, 0, d/2 + 0.012]} castShadow>
          <boxGeometry args={[0.06, h * 0.92, 0.025]} />
          <meshStandardMaterial color="#e8e8e8" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* Corner posts */}
      {cornerPositions.map((pos, i) => (
        <mesh key={`post-${i}`} position={pos} castShadow>
          <boxGeometry args={[0.12, h + 0.1, 0.12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      
      {/* Frame - bottom */}
      <mesh position={[0, -h/2, -d/2]} castShadow>
        <boxGeometry args={[w, 0.15, 0.1]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -h/2, d/2]} castShadow>
        <boxGeometry args={[w, 0.15, 0.1]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Double doors on right side */}
      <group position={[w/2 + 0.03, 0, 0]}>
        {/* Left door */}
        <mesh position={[0, 0, -d/4]} castShadow>
          <boxGeometry args={[0.05, h * 0.9, d/2 * 0.85]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.55} roughness={0.45} />
        </mesh>
        {/* Right door */}
        <mesh position={[0, 0, d/4]} castShadow>
          <boxGeometry args={[0.05, h * 0.9, d/2 * 0.85]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.55} roughness={0.45} />
        </mesh>
        {/* Lock bars */}
        <mesh position={[0.03, 0, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, h * 0.75, 8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
});
```

---

## 3. Cooling System Model (EC2-DT Style)

### Structure Overview

```
Cooling System:
├── Main body (white/blue panels)
├── Blue thermal exchange panels
├── Fan array (animated)
│   ├── Housing (cylinder)
│   ├── Blades (rotating)
│   └── Protective grill
├── Corner posts
└── Pipe connections (red inlet, blue outlet)
```

### Implementation with Animated Fans

```typescript
const CoolingSystem = memo(function CoolingSystem({
  dimensions,
  position = [0, 0, 0]
}: {
  dimensions: { width: number; height: number; depth: number };
  position?: [number, number, number];
}) {
  const w = dimensions.width / 1000;
  const h = dimensions.height / 1000;
  const d = dimensions.depth / 1000;
  
  // Fan refs for animation
  const fanRefs = useRef<THREE.Group[]>([]);
  
  // Fan positions (memoized)
  const fansPerRow = 6;
  const fanRows = 2;
  const fanPositions = useMemo(() => {
    const positions: { x: number; z: number; key: string }[] = [];
    const spacingX = w / fansPerRow;
    const spacingZ = d / (fanRows + 1);
    
    for (let row = 0; row < fanRows; row++) {
      for (let col = 0; col < fansPerRow; col++) {
        positions.push({
          x: -w/2 + spacingX/2 + col * spacingX,
          z: -d/2 + spacingZ * (row + 1),
          key: `fan-${row}-${col}`
        });
      }
    }
    return positions;
  }, [w, d, fansPerRow, fanRows]);
  
  // Blade angles (memoized)
  const bladeAngles = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => (i * Math.PI * 2) / 7), 
    []
  );
  
  // Animate fans
  useFrame((_, delta) => {
    const speed = delta * 12;
    fanRefs.current.forEach(ref => {
      if (ref) ref.rotation.y += speed;
    });
  });

  return (
    <group position={position}>
      {/* Main body - white section */}
      <mesh position={[0, h * 0.2, 0]} castShadow>
        <boxGeometry args={[w, h * 0.4, d]} />
        <meshStandardMaterial color="#f5f5f5" metalness={0.35} roughness={0.5} />
      </mesh>
      
      {/* Blue thermal panel base */}
      <mesh position={[0, -h * 0.2, 0]} castShadow>
        <boxGeometry args={[w, h * 0.5, d]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.4} roughness={0.5} />
      </mesh>
      
      {/* Fan platform */}
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <boxGeometry args={[w * 1.01, 0.06, d * 1.01]} />
        <meshStandardMaterial color="#1a202c" metalness={0.65} roughness={0.35} />
      </mesh>
      
      {/* Fans */}
      <group position={[0, h * 0.5, 0]}>
        {fanPositions.map(({ x, z, key }, idx) => (
          <group key={key} position={[x, 0.12, z]}>
            {/* Fan housing */}
            <mesh castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.15, 24]} />
              <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.5} />
            </mesh>
            
            {/* Rotating blades */}
            <group 
              position={[0, 0.1, 0]}
              ref={el => { if (el) fanRefs.current[idx] = el; }}
            >
              {bladeAngles.map((angle, i) => (
                <mesh key={i} rotation={[0, angle, Math.PI / 10]}>
                  <boxGeometry args={[0.25, 0.012, 0.07]} />
                  <meshStandardMaterial color="#3b82f6" metalness={0.5} roughness={0.4} />
                </mesh>
              ))}
              {/* Hub */}
              <mesh>
                <cylinderGeometry args={[0.055, 0.055, 0.05, 16]} />
                <meshStandardMaterial color="#1a202c" metalness={0.75} roughness={0.25} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
      
      {/* Pipe connections */}
      <group position={[w/2 + 0.1, -h * 0.25, -d/4]}>
        <mesh rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.2, 16]} />
          <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
      <group position={[w/2 + 0.1, -h * 0.25, d/4]}>
        <mesh rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.2, 16]} />
          <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
});
```

---

## 4. Oil Transformer Model

### Structure Overview

```
Transformer:
├── Main tank (yellow)
├── Tank lid
├── Conservator (expansion tank)
├── HV bushings (purple insulators)
├── LV bushings (green insulators)
├── Radiator fins (both sides)
├── Wheels/skids
└── Control cabinet
```

### Implementation

```typescript
const OilTransformer = memo(function OilTransformer({
  dimensions,
  position = [0, 0, 0],
  capacityMVA = 3.75
}: {
  dimensions: { width: number; height: number; depth: number };
  position?: [number, number, number];
  capacityMVA?: number;
}) {
  const w = dimensions.width / 1000;
  const h = dimensions.height / 1000;
  const d = dimensions.depth / 1000;
  
  // Radiator fin count based on capacity
  const finCount = Math.max(6, Math.floor(capacityMVA * 2));
  const finSpacing = d * 0.8 / finCount;
  const finIndices = useMemo(() => Array.from({ length: finCount }, (_, i) => i), [finCount]);

  return (
    <group position={position}>
      {/* Main tank */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w * 0.7, h * 0.65, d * 0.7]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* Tank lid */}
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <boxGeometry args={[w * 0.75, h * 0.08, d * 0.75]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.55} roughness={0.35} />
      </mesh>
      
      {/* Conservator tank */}
      <mesh position={[0, h * 0.42, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
        <cylinderGeometry args={[d * 0.12, d * 0.12, w * 0.5, 16]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* HV Bushings (purple) */}
      {[-w * 0.2, 0, w * 0.2].map((xPos, i) => (
        <group key={`hv-${i}`} position={[xPos, h * 0.48, -d * 0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.15, 12]} />
            <meshStandardMaterial color="#7c3aed" metalness={0.3} roughness={0.6} />
          </mesh>
          {/* Rings */}
          {[0.08, 0.12, 0.16].map((yOff, j) => (
            <mesh key={j} position={[0, yOff, 0]} rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[0.05, 0.015, 8, 16]} />
              <meshStandardMaterial color="#7c3aed" metalness={0.35} roughness={0.55} />
            </mesh>
          ))}
          {/* Terminal */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      
      {/* Radiator fins - both sides */}
      {[-1, 1].map(side => (
        <group key={`radiator-${side}`} position={[side * w * 0.42, -h * 0.05, 0]}>
          {finIndices.map(i => (
            <mesh key={i} position={[side * 0.08, 0, -d * 0.35 + i * finSpacing]} castShadow>
              <boxGeometry args={[0.12, h * 0.55, 0.015]} />
              <meshStandardMaterial color="#d97706" metalness={0.45} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* Wheels */}
      {[
        [-w * 0.25, -h * 0.35, -d * 0.25],
        [w * 0.25, -h * 0.35, -d * 0.25],
        [-w * 0.25, -h * 0.35, d * 0.25],
        [w * 0.25, -h * 0.35, d * 0.25],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
});
```

---

## 5. Server Rack Model

```typescript
const ServerRack = memo(function ServerRack({
  position = [0, 0, 0],
  units = 42
}: {
  position?: [number, number, number];
  units?: number;
}) {
  const height = (units * 44.45) / 1000; // 1U = 44.45mm
  const width = 0.6;
  const depth = 1;
  
  const postPositions = useMemo(() => [
    [-width/2 + 0.05, 0, depth/2 - 0.05],
    [width/2 - 0.05, 0, depth/2 - 0.05],
    [-width/2 + 0.05, 0, -depth/2 + 0.05],
    [width/2 - 0.05, 0, -depth/2 + 0.05],
  ] as [number, number, number][], [width, depth]);

  return (
    <group position={position}>
      {/* Main frame */}
      <mesh castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.3} transparent opacity={0.3} />
      </mesh>
      
      {/* Vertical posts */}
      {postPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[0.05, height, 0.05]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Base */}
      <mesh position={[0, -height/2, 0]} castShadow>
        <boxGeometry args={[width + 0.02, 0.05, depth + 0.02]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
});
```

---

## 6. ASIC Miner Model

```typescript
const ASICMiner = memo(function ASICMiner({
  position = [0, 0, 0],
  hovered = false
}: {
  position?: [number, number, number];
  hovered?: boolean;
}) {
  return (
    <group position={position}>
      {/* Main body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.2, 0.2]} />
        <meshStandardMaterial 
          color={hovered ? '#6BD563' : '#8AFD81'} 
          metalness={0.3} 
          roughness={0.4} 
        />
      </mesh>
      
      {/* LED indicator */}
      <mesh position={[0.18, 0.05, 0.11]}>
        <sphereGeometry args={[0.01, 16, 16]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
      </mesh>
      
      {/* Fan grilles */}
      <mesh position={[0, 0, 0.11]}>
        <circleGeometry args={[0.06, 32]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.12, 0, 0.11]}>
        <circleGeometry args={[0.04, 32]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
});
```

---

## Material Presets

### Industrial Materials

```typescript
const industrialMaterials = {
  // Container/Metal
  containerWhite: new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 0.6, roughness: 0.35 }),
  containerFrame: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.7, roughness: 0.3 }),
  
  // Transformer
  transformerYellow: new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.4 }),
  radiatorYellow: new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.45, roughness: 0.5 }),
  
  // Insulators
  hvInsulator: new THREE.MeshStandardMaterial({ color: '#7c3aed', metalness: 0.3, roughness: 0.6 }),
  lvInsulator: new THREE.MeshStandardMaterial({ color: '#059669', metalness: 0.3, roughness: 0.6 }),
  
  // Cooling
  panelBlue: new THREE.MeshStandardMaterial({ color: '#1e3a5f', metalness: 0.45, roughness: 0.45 }),
  fanBlue: new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.5, roughness: 0.4 }),
  
  // Pipes
  pipeRed: new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.6, roughness: 0.4 }),
  pipeBlue: new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.6, roughness: 0.4 }),
};
```

---

## Additional Resources

- For performance optimization, see [threejs-performance skill](../threejs-performance/SKILL.md)
- For lighting setup, see [threejs-lighting skill](../threejs-lighting/SKILL.md)
- For animations, see [threejs-animation skill](../threejs-animation/SKILL.md)
