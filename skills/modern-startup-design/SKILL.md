---
name: modern-startup-design
description: Complete playbook for replicating the modern B2B/SaaS startup landing page aesthetic and structure.
version: 1.0.0
owner: rabto
status: active
categories: ["ui", "design", "startup"]
triggers: ["build a SaaS landing page", "modern startup design", "b2b saas website"]
related_skills: ["creative-web-art-direction", "cinematic-web-typography"]
conflicting_skills: []
primary_tools: ["html", "css", "javascript"]
minimum_inputs: ["project description", "target audience"]
verification_required: false
last_reviewed: "2026-08-17"
---

# Modern Startup Design Playbook

This skill outlines the strict design system, visual language, and structural tropes required to build a highly recognizable, modern B2B SaaS or startup landing page. When generating web UIs, apply these rules aggressively.

## 1. Color Palette & Backgrounds
* **Pure White Background**: The base background of the page must be `#FFFFFF`. Avoid off-whites or light grays for the main body.
* **Purple and Black**: Use deep black (`#000000` or `#111111`) for primary text and high-contrast elements. Use vibrant purple (e.g., `#7C3AED` or `#6366F1`) as a primary accent color for buttons, highlights, or badges.
* **Harsh Gradients**: Use sharp, high-contrast linear or radial gradients (e.g., transitioning rapidly from neon pink to deep purple to bright blue) for text masking (gradient text) or glowing backgrounds.
* **Rainbow Coloring**: Apply subtle rainbow gradient borders or text fills to premium/pro features to signify value.
* **Neon & Pastel Colors**: Use neon colors against dark elements for contrast. Use basic pastel colors for subtle backgrounds behind cards or tags (e.g., a very light pastel blue background for an informational badge).

## 2. Typography & Icons
* **Typefaces**: You **must** use modern, geometric, or grotesque fonts. Preferred stacks: `Inter`, `Geist`, or `Space Grotesk`. Never use system default serifs or generic sans-serifs like Arial.
* **Em Dashes**: Use em dashes (`—`) heavily in typography for dramatic pauses or attributions (e.g., "The ultimate tool — built for speed").
* **Lucide Icons**: Standardize all UI icons using the `lucide-react` or `lucide` library. They are clean, scalable, and match the modern aesthetic.
* **Sparkle Icons**: Use the sparkle icon (`✨`) frequently next to AI features, "new" badges, or magical/automated actions.
* **Emojis**: Sprinkle emojis in section headers, bullet points, or empty states to add a touch of personality and approachability (e.g., "⚡ Fast", "🔒 Secure").

## 3. Layout & Structure
* **Bento Grids**: Use "Bento Box" style grids (asymmetric, interlocking cards of varying spans) to showcase features, integrations, or capabilities in a visually dense but organized way.
* **3 Feature Cards in a Row**: When listing core benefits, always default to exactly 3 equally sized cards in a horizontal row on desktop.
* **3 Pricing Tiers**: Pricing sections must have exactly 3 tiers (e.g., Hobby, Pro, Enterprise). Highlight the middle tier.
* **Colored Left Stripe**: Use a vibrant 2px-4px colored border on the left side of cards, alerts, or testimonials to ground the element and add a pop of brand color.

## 4. UI Elements & Styling
* **Liquid Glass / Glassmorphism**: Use heavy blur backdrops (`backdrop-filter: blur(12px)`) with semi-transparent white/black backgrounds and subtle 1px translucent borders to create glass-like elements (especially for sticky navbars or floating modals).
* **Drop Shadows**: Use layered, smooth, and diffused drop shadows on interactive elements. (e.g., `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`).
* **Soft Corner Radius**: All cards, buttons, and containers should have a soft, friendly border radius (e.g., `12px` to `16px`). Avoid sharp 90-degree corners.
* **Radial Orbs**: Place large, blurred, colorful radial gradients in the absolute background of hero sections to create a glowing "orb" effect behind the content.
* **Dot Grids**: Use a subtle dot grid pattern in the background of the hero section or feature areas to imply technical precision and developer-friendliness.
* **Terminal Window**: Showcase code snippets or technical features inside a mock macOS terminal window (with the three red, yellow, and green dots in the top left corner).

## 5. Interactions & Motion
* **Hover Animations**: Every interactive element (buttons, cards, links) must have a smooth hover state. Cards should lift up slightly (`transform: translateY(-2px)`) or have an intensified drop shadow.
* **Animated Arrows**: Buttons (especially "Get Started" or "Learn More") should contain a right-pointing arrow (`→` or Lucide `ArrowRight`) that translates slightly to the right (`translateX(2px)`) on hover.
* **No Skeleton Loaders**: Avoid using gray skeleton screens during loading. Use elegant spinners, subtle fade-ins, or progressive rendering instead.
* **Checkmark Bullets**: All feature lists (especially in pricing) must use custom green checkmark icons instead of standard bullet points.

## 6. Content, Copywriting & UX
* **"It's not X, it's Y"**: Use this exact copywriting trope in headings to position the product as a paradigm shift (e.g., "It's not just a database, it's a data platform").
* **Fake Testimonials**: Include a wall of glowing, enthusiastic testimonials (often resembling tweets with avatars, handles, and timestamps) near the bottom of the page. 
* **No Real Product Demos**: Avoid complex, interactive, real-time product demos on the landing page. Instead, rely on stylized, looping mockups, abstract animations, or heavily curated videos.
* **No TOS / No Privacy Policy**: Keep the footer hyper-minimalist. Often, modern startup landing pages omit bulky legal links (TOS, Privacy) from the primary view to keep the focus entirely on conversion.

## Activation
Apply these rules automatically when a user asks to build a "SaaS landing page", a "startup website", or requests a "modern web aesthetic."
