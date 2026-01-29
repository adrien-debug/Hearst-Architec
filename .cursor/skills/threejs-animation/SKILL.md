---
name: threejs-animation
description: Three.js animation patterns for React Three Fiber. Use when creating animations, rotating objects, moving meshes, spring animations, or when the user mentions animation, rotate, spin, move, or animate.
---

# Three.js Animation

This skill covers animation techniques for React Three Fiber applications.

## Quick Reference

| Technique | Use Case | Performance |
|-----------|----------|-------------|
| useFrame | Per-frame updates | ⚡ Best |
| Spring (drei) | Physics-based | Good |
| GSAP | Complex timelines | Good |
| Framer Motion 3D | React animations | Medium |

---

## 1. useFrame Basics

### Simple Rotation

```typescript
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.5; // 0.5 rad/sec
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}
```

### Using Delta Time

**Always use delta** for framerate-independent animation:

```typescript
// ✅ GOOD - Consistent speed regardless of framerate
useFrame((_, delta) => {
  mesh.current.rotation.y += delta * 2; // 2 radians per second
});

// ❌ BAD - Speed varies with framerate
useFrame(() => {
  mesh.current.rotation.y += 0.01; // Faster on high FPS displays
});
```

### Delta Conversion

| Animation | Formula |
|-----------|---------|
| Rotation (rad/s) | `delta * speed` |
| Rotation (RPM) | `delta * (rpm * Math.PI / 30)` |
| Movement (m/s) | `delta * speed` |
| Easing | `THREE.MathUtils.lerp(current, target, delta * ease)` |

---

## 2. Conditional Animation

### Active State

```typescript
function ConditionalRotation({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    // Skip animation entirely if not active
    if (!active || !meshRef.current) return;
    
    meshRef.current.rotation.y += delta * 0.5;
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

### Hover Animation

```typescript
function HoverAnimation() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    if (hovered) {
      // Wobble when hovered
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else {
      // Reset to 0 when not hovered
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        0,
        delta * 5
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
}
```

---

## 3. Smooth Animations with Lerp

### Position Lerp

```typescript
function SmoothFollow({ target }: { target: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    // Smooth follow with lerp
    meshRef.current.position.lerp(target, delta * 3);
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

### Rotation Lerp

```typescript
function SmoothRotate({ targetRotation }: { targetRotation: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      targetRotation,
      delta * 5
    );
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

### Scale Lerp

```typescript
function PulsingObject() {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetScale = useRef(1);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Pulse between 1 and 1.2
    targetScale.current = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    
    const s = THREE.MathUtils.lerp(
      meshRef.current.scale.x,
      targetScale.current,
      delta * 5
    );
    meshRef.current.scale.set(s, s, s);
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

---

## 4. Clock-Based Animation

### Oscillation

```typescript
function Oscillating() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const t = state.clock.elapsedTime;
    
    // Sine wave oscillation
    meshRef.current.position.y = Math.sin(t * 2) * 0.5;
    
    // Cosine for horizontal
    meshRef.current.position.x = Math.cos(t) * 2;
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

### Orbiting

```typescript
function OrbitingObject({ radius = 5, speed = 1 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const t = state.clock.elapsedTime * speed;
    
    meshRef.current.position.x = Math.cos(t) * radius;
    meshRef.current.position.z = Math.sin(t) * radius;
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

---

## 5. Fan Animation (Industrial)

### Rotating Fan Blades

```typescript
function AnimatedFan() {
  const fanRef = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (!fanRef.current) return;
    fanRef.current.rotation.y += delta * 12; // 12 rad/s = ~115 RPM
  });

  const bladeAngles = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => (i * Math.PI * 2) / 7),
    []
  );

  return (
    <group ref={fanRef}>
      {bladeAngles.map((angle, i) => (
        <mesh key={i} rotation={[0, angle, Math.PI / 10]}>
          <boxGeometry args={[0.25, 0.012, 0.07]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      ))}
      {/* Hub */}
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}
```

### Multiple Fans with Refs

```typescript
function MultipleFans({ count }: { count: number }) {
  const fanRefs = useRef<THREE.Group[]>([]);
  
  useFrame((_, delta) => {
    const speed = delta * 12;
    fanRefs.current.forEach(ref => {
      if (ref) ref.rotation.y += speed;
    });
  });

  const positions = useMemo(() => 
    Array.from({ length: count }, (_, i) => [i * 2 - (count - 1), 0, 0]),
    [count]
  );

  return (
    <group>
      {positions.map((pos, i) => (
        <group 
          key={i} 
          position={pos as [number, number, number]}
          ref={el => { if (el) fanRefs.current[i] = el; }}
        >
          {/* Fan blades here */}
        </group>
      ))}
    </group>
  );
}
```

---

## 6. Spring Animations (Drei)

### Basic Spring

```typescript
import { useSpring, animated } from '@react-spring/three';

function SpringBox() {
  const [active, setActive] = useState(false);
  
  const { scale } = useSpring({
    scale: active ? 1.5 : 1,
    config: { mass: 1, tension: 170, friction: 26 },
  });

  return (
    <animated.mesh
      scale={scale}
      onClick={() => setActive(!active)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </animated.mesh>
  );
}
```

### Spring Position

```typescript
function SpringPosition() {
  const [target, setTarget] = useState([0, 0, 0]);
  
  const { position } = useSpring({
    position: target,
    config: { mass: 1, tension: 120, friction: 14 },
  });

  return (
    <animated.mesh
      position={position as any}
      onClick={() => setTarget([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ])}
    >
      <boxGeometry args={[1, 1, 1]} />
    </animated.mesh>
  );
}
```

### Spring Configs

```typescript
// Preset configs
import { config } from '@react-spring/three';

// Available presets:
config.default   // { mass: 1, tension: 170, friction: 26 }
config.gentle    // { mass: 1, tension: 120, friction: 14 }
config.wobbly    // { mass: 1, tension: 180, friction: 12 }
config.stiff     // { mass: 1, tension: 210, friction: 20 }
config.slow      // { mass: 1, tension: 280, friction: 60 }
config.molasses  // { mass: 1, tension: 280, friction: 120 }
```

---

## 7. Float Animation (Drei)

```typescript
import { Float } from '@react-three/drei';

function FloatingObject() {
  return (
    <Float
      speed={2}           // Animation speed
      rotationIntensity={0.5}  // Rotation intensity
      floatIntensity={1}  // Float up/down intensity
      floatingRange={[-0.1, 0.1]}  // Range of float
    >
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="purple" />
      </mesh>
    </Float>
  );
}
```

---

## 8. Animation Sequences

### Chained Animation

```typescript
function ChainedAnimation() {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useRef(0);
  const progress = useRef(0);
  
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    progress.current += delta;
    
    switch (phase.current) {
      case 0: // Move up
        meshRef.current.position.y = THREE.MathUtils.lerp(0, 2, progress.current);
        if (progress.current >= 1) {
          phase.current = 1;
          progress.current = 0;
        }
        break;
        
      case 1: // Rotate
        meshRef.current.rotation.y = progress.current * Math.PI * 2;
        if (progress.current >= 1) {
          phase.current = 2;
          progress.current = 0;
        }
        break;
        
      case 2: // Move down
        meshRef.current.position.y = THREE.MathUtils.lerp(2, 0, progress.current);
        if (progress.current >= 1) {
          phase.current = 0;
          progress.current = 0;
        }
        break;
    }
  });

  return <mesh ref={meshRef}>...</mesh>;
}
```

---

## 9. GSAP Integration

### Basic GSAP Animation

```typescript
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function GSAPAnimation() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useGSAP(() => {
    if (!meshRef.current) return;
    
    gsap.to(meshRef.current.position, {
      x: 5,
      duration: 2,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: -1,
    });
    
    gsap.to(meshRef.current.rotation, {
      y: Math.PI * 2,
      duration: 4,
      ease: 'none',
      repeat: -1,
    });
  }, []);

  return <mesh ref={meshRef}>...</mesh>;
}
```

### GSAP Timeline

```typescript
function GSAPTimeline() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useGSAP(() => {
    if (!meshRef.current) return;
    
    const tl = gsap.timeline({ repeat: -1 });
    
    tl.to(meshRef.current.position, { y: 2, duration: 1 })
      .to(meshRef.current.rotation, { y: Math.PI, duration: 0.5 })
      .to(meshRef.current.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.5 })
      .to(meshRef.current.position, { y: 0, duration: 1 })
      .to(meshRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
  }, []);

  return <mesh ref={meshRef}>...</mesh>;
}
```

---

## 10. Performance Tips

### Avoid Object Creation

```typescript
// ❌ BAD - Creates new Vector3 every frame
useFrame(() => {
  mesh.current.position.copy(new THREE.Vector3(x, y, z));
});

// ✅ GOOD - Reuse vector
const tempVec = useMemo(() => new THREE.Vector3(), []);
useFrame(() => {
  mesh.current.position.copy(tempVec.set(x, y, z));
});
```

### Suspend When Not Visible

```typescript
function ConditionalAnimation({ visible }: { visible: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    // Skip entirely when not visible
    if (!visible) return;
    if (!meshRef.current) return;
    
    meshRef.current.rotation.y += delta;
  });

  if (!visible) return null;
  
  return <mesh ref={meshRef}>...</mesh>;
}
```

### Batch Similar Animations

```typescript
// ✅ GOOD - Single useFrame for all fans
function FanArray({ fans }: { fans: FanData[] }) {
  const refs = useRef<THREE.Group[]>([]);
  
  useFrame((_, delta) => {
    const speed = delta * 12;
    for (let i = 0; i < refs.current.length; i++) {
      if (refs.current[i]) {
        refs.current[i].rotation.y += speed;
      }
    }
  });

  return (
    <>
      {fans.map((fan, i) => (
        <group 
          key={fan.id}
          ref={el => { if (el) refs.current[i] = el; }}
        >
          {/* Fan content */}
        </group>
      ))}
    </>
  );
}
```

---

## Animation Checklist

- [ ] Always use delta for framerate independence
- [ ] Check refs before accessing
- [ ] Early return when animation not needed
- [ ] Avoid creating objects in useFrame
- [ ] Use lerp for smooth transitions
- [ ] Batch similar animations
- [ ] Consider visibility before animating

---

## Additional Resources

- For performance optimization, see [threejs-performance skill](../threejs-performance/SKILL.md)
- For R3F patterns, see [r3f-components skill](../r3f-components/SKILL.md)
- For industrial models, see [threejs-models skill](../threejs-models/SKILL.md)
