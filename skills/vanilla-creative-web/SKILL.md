---
name: vanilla-creative-web
description: Production guide for building high-performance creative web experiences using pure Vanilla JavaScript, GSAP, Three.js, Canvas 2D, and modern CSS.
version: 1.0.0
owner: rabto
status: active
categories: ["creative-web", "vanilla-js", "animation", "threejs", "canvas"]
triggers: ["vanilla js", "pure javascript", "no framework", "vanilla threejs", "vanilla gsap", "standalone html"]
related_skills: ["threejs-foundations", "gsap-motion-direction", "lenis-smooth-scrolling", "visual-browser-qa"]
conflicting_skills: []
primary_tools: ["vanilla-js", "gsap", "threejs", "lenis", "canvas"]
minimum_inputs: ["project description or interactive requirements"]
verification_required: false
last_reviewed: "2026-09-04"
---

# Vanilla Creative Web Development

This skill provides an authoritative, production-grade guide for building high-end interactive websites, smooth-scroll narratives, 3D WebGL scenes, and 2D canvas effects using **pure Vanilla JavaScript, modern CSS, and lightweight libraries**—completely free of heavy frontend frameworks like React, Next.js, or Vue.

---

## 1. Core Architecture: The Component Lifecycle

When writing vanilla JavaScript for creative websites, structure every interactive module as an encapsulated unit with an explicit lifecycle to eliminate memory leaks, orphaned event listeners, and runaway render loops.

### Component Pattern with AbortController

```javascript
export class InteractiveModule {
  constructor(element, options = {}) {
    this.el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!this.el) return;

    this.options = { ...options };
    this.abortController = new AbortController();
    this.rafId = null;
    
    this.init();
  }

  init() {
    this.setupDOM();
    this.bindEvents();
    this.setupObserver();
  }

  bindEvents() {
    const { signal } = this.abortController;

    window.addEventListener('resize', this.onResize.bind(this), { signal, passive: true });
    window.addEventListener('pointermove', this.onPointerMove.bind(this), { signal, passive: true });
    
    // Pause CPU/GPU intensive loops when tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    }, { signal });
  }

  setupObserver() {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.resume();
        } else {
          this.pause();
        }
      });
    }, { threshold: 0.1 });

    this.intersectionObserver.observe(this.el);
  }

  onResize() {
    // Throttled or debounced layout refresh
  }

  onPointerMove(e) {
    // Pointer math
  }

  pause() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume() {
    if (!this.rafId) {
      this.tick();
    }
  }

  tick() {
    // Render step
    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  destroy() {
    this.pause();
    this.abortController.abort(); // Cleans up all event listeners automatically
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // Clean up DOM or third-party instances
  }
}
```

---

## 2. Vanilla GSAP + ScrollTrigger + Lenis Synchronization

Synchronizing smooth scrolling with GSAP in vanilla JavaScript requires precise binding to the browser's requestAnimationFrame ticker.

### Standard Setup

```javascript
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// 1. Initialize smooth scroll
export const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  syncTouch: false,
});

// 2. Synchronize Lenis scroll position with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// 3. Connect GSAP's internal ticker to drive Lenis RAF
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

// 4. Turn off lag smoothing to prevent stutter after heavy calculations
gsap.ticker.lagSmoothing(0);
```

### Scoped Animations with `gsap.context()`

Always encapsulate page or section animations within a `gsap.context()` for instantaneous, bug-free teardown:

```javascript
export function initHeroAnimation(container) {
  const ctx = gsap.context(() => {
    // Reduced motion check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 1,
      }
    });

    tl.to('.hero-title', { y: -50, opacity: 0, ease: 'none' })
      .to('.hero-media', { scale: 1.1, ease: 'none' }, 0);
  }, container);

  return () => ctx.revert(); // Returns cleanup function
}
```

---

## 3. Vanilla Three.js WebGL Pipeline

When building 3D experiences without React Three Fiber, manage the canvas sizing, device pixel ratio, and memory disposal directly.

### Robust Three.js Boilerplate

```javascript
import * as THREE from 'three';

export class VanillaThreeScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    // Clamp device pixel ratio to 2 to safeguard mobile and retina displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);

    this.addObjects();
    this.bindEvents();
    this.render();
  }

  addObjects() {
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.3 });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 3, 4);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  }

  bindEvents() {
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  onResize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render() {
    this.rafId = requestAnimationFrame(this.render.bind(this));
    this.mesh.rotation.x += 0.005;
    this.mesh.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);

    // Recursively dispose geometries, materials, and textures
    this.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });

    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  disposeMaterial(material) {
    material.dispose();
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (value && typeof value.dispose === 'function') {
        value.dispose();
      }
    }
  }
}
```

---

## 4. High-Performance Canvas 2D & Particle Engines

When animating hundreds of 2D elements (particles, cursor trails, sound waves), bypass DOM elements entirely and paint directly to a DPI-scaled `<canvas>`.

### Retina-Safe Canvas 2D Setup

```javascript
export class ParticleCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.dpr = Math.min(window.devicePixelRatio, 2);
    
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    // Scale canvas buffer for high-DPI clarity
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    // Draw particles in logical pixel coordinates
  }
}
```

---

## 5. Modern Vanilla CSS & DOM Techniques

### Dynamic CSS Custom Properties via JS

Keep animation logic in JavaScript and styling in CSS by updating custom properties:

```javascript
// Track mouse coordinates normalized between -1 and 1
window.addEventListener('pointermove', (e) => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = (e.clientY / window.innerHeight) * 2 - 1;

  document.documentElement.style.setProperty('--mouse-x', x.toFixed(3));
  document.documentElement.style.setProperty('--mouse-y', y.toFixed(3));
}, { passive: true });
```

In CSS:
```css
.card {
  transform: perspective(1000px) rotateY(calc(var(--mouse-x) * 10deg)) rotateX(calc(var(--mouse-y) * -10deg));
  transition: transform 0.1s ease-out;
}
```

### View Transitions API

For fluid transitions between states or pages in vanilla JS:

```javascript
function updateUI(newContent) {
  if (!document.startViewTransition) {
    // Fallback for browsers without View Transitions
    container.innerHTML = newContent;
    return;
  }

  document.startViewTransition(() => {
    container.innerHTML = newContent;
  });
}
```

---

## 6. Accessibility and Performance Checklist

1. **`prefers-reduced-motion`**: Always wrap animations in a check. If reduced motion is requested, jump immediately to final states or disable parallax/rotation.
2. **Device Pixel Ratio (DPR)**: Never allow `renderer.setPixelRatio(window.devicePixelRatio)` uncapped; mobile devices with DPR 3+ will drop frames. Always clamp with `Math.min(window.devicePixelRatio, 2)`.
3. **Passive Event Listeners**: Always pass `{ passive: true }` to `scroll`, `wheel`, and `touch` listeners unless calling `e.preventDefault()`.
4. **Observer Cleanup**: Disconnect all `IntersectionObserver` and `ResizeObserver` instances when components are removed or unmounted.
