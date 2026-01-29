---
name: threejs-lighting
description: Three.js lighting setup for realistic industrial scenes. Use when setting up lights, configuring shadows, using environment maps, HDR backgrounds, or when the user mentions lighting, shadows, dark scene, or PBR materials.
---

# Three.js Lighting

This skill covers lighting techniques for realistic industrial 3D scenes.

## Quick Reference

| Light Type | Use Case | Shadow | Cost |
|------------|----------|--------|------|
| AmbientLight | Base illumination | No | Low |
| DirectionalLight | Sun/main light | Yes | Medium |
| PointLight | Local spots | Yes | High |
| SpotLight | Focused beam | Yes | High |
| HemisphereLight | Sky/ground | No | Low |
| RectAreaLight | Soft panels | No | Medium |

---

## 1. Basic Lighting Setup

### Minimal Setup

```tsx
function BasicLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
    </>
  );
}
```

### Industrial/Warehouse Setup

```tsx
function IndustrialLighting() {
  return (
    <>
      {/* Base ambient - prevents pure black shadows */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Main sun light with shadows */}
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      
      {/* Fill light from opposite side */}
      <directionalLight
        position={[-15, 20, -15]}
        intensity={0.5}
        color="#ffffff"
      />
      
      {/* Sky/ground gradient */}
      <hemisphereLight
        intensity={0.5}
        color="#ffffff"    // Sky color
        groundColor="#444444"  // Ground color
      />
    </>
  );
}
```

---

## 2. Shadow Configuration

### DirectionalLight Shadows

```tsx
<directionalLight
  position={[10, 20, 10]}
  intensity={1}
  castShadow
  
  // Shadow map resolution (higher = sharper, more expensive)
  shadow-mapSize={[2048, 2048]}  // 512, 1024, 2048, 4096
  
  // Shadow camera bounds (orthographic)
  shadow-camera-far={100}
  shadow-camera-near={0.1}
  shadow-camera-left={-30}
  shadow-camera-right={30}
  shadow-camera-top={30}
  shadow-camera-bottom={-30}
  
  // Shadow properties
  shadow-bias={-0.0001}  // Reduce shadow acne
  shadow-normalBias={0.02}
/>
```

### Shadow Quality Presets

| Quality | mapSize | Camera bounds | Use case |
|---------|---------|---------------|----------|
| Low | 512 | Tight | Mobile/preview |
| Medium | 1024 | Moderate | Default |
| High | 2048 | Large | Desktop |
| Ultra | 4096 | Very large | High-end |

### Enable Shadows on Meshes

```tsx
// Cast shadow (object creates shadow)
<mesh castShadow>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial />
</mesh>

// Receive shadow (object shows shadow)
<mesh receiveShadow>
  <planeGeometry args={[100, 100]} />
  <meshStandardMaterial />
</mesh>

// Both
<mesh castShadow receiveShadow>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial />
</mesh>
```

### Canvas Shadow Config

```tsx
<Canvas
  shadows           // Enable shadows
  shadows="soft"    // Soft shadows (PCFSoft)
  shadows="basic"   // Basic shadows
  shadows="variance" // Variance shadow map
>
```

---

## 3. Environment Maps

### Using Drei Environment

```tsx
import { Environment } from '@react-three/drei';

// Preset environments
<Environment preset="warehouse" />
<Environment preset="city" />
<Environment preset="sunset" />
<Environment preset="dawn" />
<Environment preset="night" />
<Environment preset="forest" />
<Environment preset="apartment" />
<Environment preset="studio" />
<Environment preset="park" />

// Custom HDR
<Environment files="/hdri/industrial.hdr" />

// With background
<Environment preset="warehouse" background />

// Blur background
<Environment preset="city" background blur={0.5} />
```

### Environment for PBR

Environment maps enable realistic reflections on metallic materials:

```tsx
function Scene() {
  return (
    <>
      <Environment preset="warehouse" />
      
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color="#888"
          metalness={0.9}  // High metalness shows reflections
          roughness={0.1}  // Low roughness = clear reflections
        />
      </mesh>
    </>
  );
}
```

---

## 4. PBR Materials

### MeshStandardMaterial Properties

```tsx
<meshStandardMaterial
  color="#888888"
  
  // PBR properties
  metalness={0.5}      // 0 = dielectric, 1 = metal
  roughness={0.5}      // 0 = mirror, 1 = diffuse
  
  // Maps
  map={diffuseTexture}
  normalMap={normalTexture}
  roughnessMap={roughnessTexture}
  metalnessMap={metalnessTexture}
  aoMap={aoTexture}
  
  // Emission
  emissive="#ff0000"
  emissiveIntensity={0.5}
  
  // Transparency
  transparent={true}
  opacity={0.8}
/>
```

### Material Presets by Type

```typescript
// Metal (steel, aluminum)
const metalMaterial = new THREE.MeshStandardMaterial({
  color: '#888888',
  metalness: 0.8,
  roughness: 0.2,
});

// Painted metal (container, machine)
const paintedMetal = new THREE.MeshStandardMaterial({
  color: '#e8e8e8',
  metalness: 0.6,
  roughness: 0.35,
});

// Plastic
const plasticMaterial = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  metalness: 0.0,
  roughness: 0.4,
});

// Concrete
const concreteMaterial = new THREE.MeshStandardMaterial({
  color: '#808080',
  metalness: 0.0,
  roughness: 0.9,
});

// Glass
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#ffffff',
  metalness: 0.0,
  roughness: 0.0,
  transmission: 0.95,
  thickness: 0.5,
});

// Rubber
const rubberMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1a1a',
  metalness: 0.0,
  roughness: 0.8,
});
```

---

## 5. Emissive Materials

### LED Indicators

```tsx
// Green LED - on
<mesh>
  <sphereGeometry args={[0.03, 16, 16]} />
  <meshStandardMaterial 
    color="#00ff00"
    emissive="#00ff00"
    emissiveIntensity={2}
  />
</mesh>

// Red LED - warning
<mesh>
  <sphereGeometry args={[0.03, 16, 16]} />
  <meshStandardMaterial 
    color="#ff0000"
    emissive="#ff0000"
    emissiveIntensity={2}
  />
</mesh>
```

### Glowing Panels

```tsx
// Status screen
<mesh>
  <planeGeometry args={[1, 0.5]} />
  <meshStandardMaterial
    color="#00ff00"
    emissive="#00ff00"
    emissiveIntensity={0.3}
  />
</mesh>

// Logo plate
<mesh>
  <boxGeometry args={[1.2, 0.1, 0.01]} />
  <meshStandardMaterial
    color="#48bb78"
    emissive="#48bb78"
    emissiveIntensity={0.25}
  />
</mesh>
```

---

## 6. Advanced Lighting

### Three-Point Lighting

Classic photography/film lighting:

```tsx
function ThreePointLighting() {
  return (
    <>
      {/* Key light - main light, creates shadows */}
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Fill light - softer, opposite side, no shadows */}
      <directionalLight
        position={[-10, 10, -5]}
        intensity={0.5}
      />
      
      {/* Back/rim light - highlights edges */}
      <directionalLight
        position={[0, 10, -15]}
        intensity={0.3}
      />
      
      {/* Ambient - prevents pure black */}
      <ambientLight intensity={0.2} />
    </>
  );
}
```

### Area Lights (Soft Illumination)

```tsx
import { RectAreaLight } from 'three';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';

function SoftLight() {
  const lightRef = useRef<RectAreaLight>(null);
  
  return (
    <rectAreaLight
      ref={lightRef}
      position={[0, 5, 0]}
      width={10}
      height={10}
      intensity={2}
      color="#ffffff"
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}
```

### Contact Shadows

```tsx
import { ContactShadows } from '@react-three/drei';

<ContactShadows
  position={[0, 0, 0]}
  opacity={0.4}
  scale={20}
  blur={2}
  far={10}
  resolution={256}
  color="#000000"
/>
```

---

## 7. Performance Optimization

### Shadow Performance

```tsx
// Expensive - many shadow casters
{objects.map(obj => (
  <mesh key={obj.id} castShadow>...</mesh>
))}

// Optimized - only important objects cast shadows
{objects.map(obj => (
  <mesh key={obj.id} castShadow={obj.important}>...</mesh>
))}

// Further optimized - reduce shadow map size
<directionalLight
  castShadow
  shadow-mapSize={[1024, 1024]}  // Instead of 2048
/>
```

### Light Count Guidelines

| Scene Size | Ambient | Directional | Point | Spot |
|------------|---------|-------------|-------|------|
| Small | 1 | 1-2 | 0-2 | 0 |
| Medium | 1 | 2 | 2-4 | 0-1 |
| Large | 1 | 2-3 | 4-8 | 0-2 |

### Environment Performance

```tsx
// Full quality
<Environment preset="warehouse" />

// Lower quality (faster)
<Environment 
  preset="warehouse"
  resolution={256}  // Default 256, can go lower
/>
```

---

## 8. Complete Industrial Scene Lighting

```tsx
function IndustrialSceneLighting() {
  return (
    <>
      {/* Environment for reflections */}
      <Environment preset="warehouse" />
      
      {/* Base ambient */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Main sun - creates shadows */}
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
      />
      
      {/* Fill from opposite */}
      <directionalLight
        position={[-18, 18, -18]}
        intensity={0.45}
        color="#ffffff"
      />
      
      {/* Sky/ground gradient */}
      <hemisphereLight
        intensity={0.5}
        color="#ffffff"
        groundColor="#f0f0f0"
      />
      
      {/* Optional: rim light for depth */}
      <pointLight
        position={[0, 20, -30]}
        intensity={0.3}
        color="#ffffff"
      />
    </>
  );
}
```

---

## 9. Debug Helpers

### Light Helpers

```tsx
import { useHelper } from '@react-three/drei';
import { DirectionalLightHelper, PointLightHelper } from 'three';

function DebugLights() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  
  // Show light helpers in development
  useHelper(dirLightRef, DirectionalLightHelper, 5, 'yellow');
  useHelper(pointLightRef, PointLightHelper, 2, 'red');
  
  return (
    <>
      <directionalLight ref={dirLightRef} position={[10, 20, 10]} />
      <pointLight ref={pointLightRef} position={[0, 5, 0]} />
    </>
  );
}
```

### Shadow Camera Helper

```tsx
import { CameraHelper } from 'three';

function DebugShadowCamera() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  
  useEffect(() => {
    if (lightRef.current) {
      const helper = new CameraHelper(lightRef.current.shadow.camera);
      lightRef.current.parent?.add(helper);
      return () => helper.removeFromParent();
    }
  }, []);
  
  return <directionalLight ref={lightRef} castShadow />;
}
```

---

## Lighting Checklist

- [ ] Environment map for PBR reflections
- [ ] Ambient light to prevent pure black shadows
- [ ] Main directional light with shadows
- [ ] Fill light from opposite direction
- [ ] Shadow map size appropriate for scene
- [ ] Shadow camera bounds cover scene
- [ ] Important objects have castShadow
- [ ] Floor/ground has receiveShadow
- [ ] Metallic materials use appropriate metalness/roughness
- [ ] Emissive materials for LEDs/indicators

---

## Additional Resources

- For performance optimization, see [threejs-performance skill](../threejs-performance/SKILL.md)
- For 3D models, see [threejs-models skill](../threejs-models/SKILL.md)
- For animations, see [threejs-animation skill](../threejs-animation/SKILL.md)
