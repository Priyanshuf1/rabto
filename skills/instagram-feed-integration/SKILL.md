---
name: instagram-feed-integration
status: EXPERIMENTAL
version: 0.1.0
categories: ["creative-web"]
description: Integrates dynamic Instagram feeds using high-performance Elfsight platform endpoints, avoiding custom script bloat or heavy client-side API polling.
triggers:
  - "add instagram-feed-integration"
  - "integrate instagram feed"
  - "embed instagram photo grid"
related_skills: []
conflicting_skills: []
primary_tools:
  - "write_to_file"
minimum_inputs:
  - "User provides their Elfsight widget or account link"
verification_required: true
last_reviewed: "2026-08-30"
---

# instagram-feed-integration

## Purpose
Embeds real-time, responsive Instagram photo grids, user profile bios, and follower counts using a lightweight, cached CDN script (Elfsight) rather than writing custom Facebook/Instagram Graph API hooks.

## When to activate
Use when the client requests live social feed showcases or galleries on their site.

## When not to activate
Do not use if the user requires a fully custom styled design that cannot be customized within the platform dashboard.

## Required inputs
- The Elfsight widget ID (e.g. `8b61b60e-8e55-4ffb-925d-eb7e70005a40`).

## Implementation workflow

### 1. Script Inclusion
Add the official platform script to the `<head>` or before the closing `</body>` tag. Always use `defer` to ensure non-blocking page load speeds:
```html
<script src="https://static.elfsight.com/platform/platform.js" data-use-service-core defer></script>
```

### 2. Container markup
Add the corresponding class wrapper matching the widget identifier:
```html
<div class="elfsight-app-[WIDGET_ID]" data-elfsight-app-lazy></div>
```

### 3. Dynamic initialization and refresh
In single-page applications or sites using client-side dynamic rendering (such as React hydration or dynamic sections loaded via script), ensure the widget resets or checks for the Elfsight global handler:
```javascript
if (window.ElfsightPlatform) {
  window.ElfsightPlatform.init();
}
```

## Performance requirements
- Apply `data-elfsight-app-lazy` to enforce image lazy loading.
- Ensure the external platform script is deferred to prevent render blocking.
