---
name: cursor-spotlight-reveal
description: Build dual-layer cursor spotlight and torch mask reveal interactions where hovering or touch reveals an alternate registered scene or interior X-ray.
version: 1.0.0
owner: rabto
status: active
categories: ["creative-web", "cursor-fx", "cinematic-ui", "interactive-mask"]
triggers: ["spotlight reveal", "cursor flashlight", "dual layer image reveal", "x-ray hover effect", "mask-image reveal"]
related_skills: ["vanilla-creative-web", "global-logic-media-builder", "resq-one-parallax-website-builder", "single-viewport-scroll-storytelling"]
conflicting_skills: []
primary_tools: ["css-mask-image", "vanilla-js", "radial-gradient", "image-generation"]
minimum_inputs: ["base image", "reveal image"]
verification_required: false
last_reviewed: "2026-09-05"
---

# Cursor Spotlight Reveal & Dual-Layer Torch Effect

## 1. What Is This Effect?

This interactive technique is known across high-end creative web design by several names:
- **Spotlight Reveal** / **Cursor Flashlight Effect**
- **Dual-Layer CSS Mask Reveal**
- **X-Ray / Dimension Peek Interaction**
- **Torchlight Masking**

### The Core Concept
Two visually registered visual layers sit stacked directly on top of each other at identical dimensions:
1. **The Base Layer (`z-index: 1`)**: The default, resting state of the scene (e.g. Day, Exterior, Solid Armor, Normal Reality, Finished Architecture).
2. **The Reveal Layer (`z-index: 2`)**: The alternate, secret, or interior state (e.g. Night, Under-the-hood Mechanics, Cybernetic Wireframe, Thermal Vision, Blueprint).
3. **The Dynamic Spotlight Mask**: The Reveal Layer has a CSS `mask-image` / `-webkit-mask-image` radial gradient whose center `(X, Y)` tracks the user's cursor or touch position in real-time, allowing the viewer to "shine a torch" through the top surface to see what lies beneath.

---

## 2. What Assets Are Needed? (Asset Generation Guide)

To reproduce this effect for any project, you need **two perfectly registered images**:

### A. The Pair Architecture
- **Layer 1 (Base State)**: The initial visual seen by the visitor.
- **Layer 2 (Reveal State)**: The alternate visual revealed inside the spotlight.
- **Registration Rule**: Both images **MUST have identical dimensions, aspect ratios, perspective, camera focal length, and silhouette registration**. If the subject shifts by even a few pixels between Layer 1 and Layer 2, the reveal will feel disjointed rather than looking like an internal layer of the same object.

### B. Common Thematic Pairs
| Base Layer | Reveal Layer | Industry / Use Case |
| :--- | :--- | :--- |
| **Normal Jacket / Helmet** | **Cybernetic Exo-Skeleton & Neon Wiring** | Gaming, Cyberpunk, Fashion |
| **Luxury Car Exterior** | **Internal Engine, Battery & Chassis Mechanics** | Automotive, EV, Engineering |
| **Daytime City Skyline** | **Cyberpunk Neon Night Scene** | Real Estate, Architecture, Travel |
| **Human Portrait** | **Anatomical Muscle / Neural Network Map** | MedTech, Biotech, AI Agents |
| **Clean Consumer Hardware** | **Exploded Circuit Board & Heat Pipes** | Consumer Electronics, Gadgets |
| **Classical Oil Painting** | **Modern Glitch / Abstract Graffiti** | Art Galleries, Creative Portfolios |

### C. How to Generate Registered Pairs with AI
1. **Higgsfield / Flux / Midjourney Inpainting (Vary Region)**:
   - Generate your hero base image first (e.g. `futuristic warrior wearing sleek matte jacket`).
   - Select the jacket/helmet region using Inpainting / Vary Region.
   - Prompt the interior replacement: `exposed glowing orange cybernetic armor, high-tech carbon fiber chassis, internal wiring and pulse cores, perfect structural continuity`.
   - Keep the background, pose, and non-selected regions 100% frozen.
2. **ControlNet (Depth / Canny / Lineart)** in Stable Diffusion:
   - Use the base image's depth map or edge detection as the ControlNet input.
   - Keep seed, camera angle, and guidance fixed.
   - Swap the prompt from `exterior carbon fiber shell` to `see-through x-ray internal circuits, glowing orange neon conduits`.
3. **Photoshop Generative Fill**:
   - Duplicate the layer.
   - Select the target region and generate the alternate state while maintaining identical camera framing.
   - Export both layers at the same resolution (e.g., `1920x1080` or `2560x1440`).

---

## 3. The Mathematics & CSS Mask Formula

### A. Initial CSS State
Initially, the reveal layer is completely hidden by placing the gradient center off-screen:
```css
.hero-reveal-img {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  -webkit-mask-image: radial-gradient(circle 0px at -999px -999px, #fff, transparent);
  mask-image: radial-gradient(circle 0px at -999px -999px, #fff, transparent);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}
```

### B. The 6-Stop Feathering Formula
A harsh circle looks cheap. A realistic torch beam requires a non-linear falloff with soft feathering:
```javascript
const gradient = `radial-gradient(circle ${r}px at ${x}px ${y}px,
  #fff 0%,
  #fff 40%,
  rgba(255, 255, 255, 0.75) 60%,
  rgba(255, 255, 255, 0.4) 75%,
  rgba(255, 255, 255, 0.12) 88%,
  transparent 100%
)`;
```
- `0% - 40%`: Full reveal intensity (the focal core).
- `40% - 88%`: Exponential attenuation (the penumbra).
- `88% - 100%`: Zero opacity falloff into darkness.

### C. Responsive Torch Radius
On mobile screens, a 260px radius would reveal almost the entire width of the device. Radius must scale with viewport width:
```javascript
const w = window.innerWidth;
const r = w < 480 ? 120 : (w < 720 ? 160 : 260);
```

---

## 4. Production Implementation (Vanilla JavaScript)

```html
<main class="hero">
  <!-- Base Background -->
  <div class="hero-base-img" style="background-image: url('base.webp');"></div>
  
  <!-- Dynamic Reveal Layer -->
  <div class="hero-reveal-img" id="reveal-img" style="background-image: url('reveal.webp');"></div>

  <!-- UI Content Overlay (pointer-events decoupled) -->
  <div class="hero-ui">
    <div class="hero-copy">
      <h1>TITAN // PROTOCOL</h1>
      <button class="interactive-btn">Explore Specs</button>
    </div>
  </div>
</main>
```

```javascript
(function () {
  'use strict';
  const revealImg = document.getElementById('reveal-img');
  if (!revealImg) return;

  let ticking = false;

  function updateSpotlight(e) {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const rect = revealImg.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const w = window.innerWidth;
      const r = w < 480 ? 120 : (w < 720 ? 160 : 260);

      const mask = `radial-gradient(circle ${r}px at ${x}px ${y}px, #fff 0%, #fff 40%, rgba(255,255,255,0.75) 60%, rgba(255,255,255,0.4) 75%, rgba(255,255,255,0.12) 88%, transparent 100%)`;

      revealImg.style.webkitMaskImage = mask;
      revealImg.style.maskImage = mask;

      ticking = false;
    });
  }

  window.addEventListener('mousemove', updateSpotlight, { passive: true });
  window.addEventListener('touchmove', updateSpotlight, { passive: true });
})();
```

---

## 5. Critical Rules & Gotchas

1. **Pointer Events Discipline**:
   - The `.hero-reveal-img` MUST have `pointer-events: none`. Otherwise, it intercepts mouse events and prevents interaction with UI buttons beneath or above it.
   - The `.hero-ui` overlay container MUST have `pointer-events: none`, with interactive elements (buttons, links, cards) having `pointer-events: auto`.
2. **Double Vendor Prefixing**:
   - Always set BOTH `revealImg.style.webkitMaskImage` AND `revealImg.style.maskImage`. Chrome, Safari, Edge, and iOS WebKit require `-webkit-mask-image`.
3. **Background Sizing & Position Synchronization**:
   - Both `.hero-base-img` and `.hero-reveal-img` must share identical `background-size`, `background-position`, and `background-repeat`. If responsive media queries shift the base position (e.g. `40% center`), the reveal layer MUST update identically.
4. **Performance & 60fps / 120fps Tracking**:
   - Use `requestAnimationFrame` or `passive: true` on event listeners.
   - Do not trigger layout reflows (`offsetHeight`, `offsetWidth`) on every mousemove. Only read `getBoundingClientRect()` once or when the window resizes.
5. **Accessibility**:
   - Check `prefers-reduced-motion`. On reduced-motion setups or screen readers, ensure all critical content is accessible without requiring cursor movement.
