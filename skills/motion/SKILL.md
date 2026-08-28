---
name: motion
description: Motion (formerly Framer Motion) is a production-ready motion library for React and vanilla JavaScript, used for standard component animations, layout changes, and UI transitions.
version: 1.0.0
owner: rabto
status: active
categories: ["animation", "motion", "ui"]
triggers: ["animate UI components", "layout transition", "Framer Motion", "smooth transitions"]
related_skills: ["gsap-motion-direction", "accessibility-for-motion"]
conflicting_skills: []
primary_tools: ["framer-motion", "react"]
minimum_inputs: ["react components to animate"]
verification_required: false
last_reviewed: "2026-08-28"
---

# Motion (Framer Motion) Skill

Motion (now simply imported via `motion` or `framer-motion`) is a declarative animation library for React and Vanilla JS.

## Core Principles

- **Declarative Animations:** Define the `animate`, `initial`, and `exit` states on `<motion.*>` components.
- **Spring Physics by Default:** Motion uses physically-based spring animations for natural movement.
- **Layout Animations:** Automatically animate components to their new positions when layout changes using the `layout` prop.
- **Use Cases in the Stack:** According to global rules, use Motion specifically for "smaller UI transitions, layout changes, hover states, and standard component animations." For heavy full-page transitions, Barba.js is preferred, and for complex master timelines/scrolling, GSAP is preferred.

## Common Code Patterns

### Basic Animation in React
```tsx
import { motion } from "framer-motion";

export const FadeInComponent = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    Hello, World!
  </motion.div>
);
```

### Gestures
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Click Me
</motion.button>
```

### Shared Layout Animations
To animate elements seamlessly between different DOM nodes or layouts.
```tsx
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export const SharedLayout = () => {
  const [selected, setSelected] = useState(false);

  return (
    <div onClick={() => setSelected(!selected)}>
      <motion.div layout>
        {selected ? "Expanded State" : "Collapsed"}
      </motion.div>
    </div>
  );
};
```

## Best Practices

- **Performance:** For heavy animations, always use the `layoutId` wisely and avoid animating non-transform properties (like `width` or `top`). Animate `x`, `y`, `scale`, and `opacity` as they are hardware-accelerated.
- **AnimatePresence:** Wrap components in `<AnimatePresence>` to enable `exit` animations when components are unmounted.
- **Reduce Motion:** Respect user preferences for reduced motion using the `useReducedMotion` hook.
