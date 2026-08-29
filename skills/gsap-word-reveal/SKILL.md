---
name: gsap-word-reveal
status: EXPERIMENTAL
version: 0.1.0
categories: ["creative-web"]
description: Implements word-by-word text reveal animations using vanilla JavaScript string-splitting and GSAP ScrollTrigger (without requiring premium SplitText).
triggers:
  - "add gsap-word-reveal"
  - "implement word-by-word text reveal"
  - "split text reveal animations"
related_skills:
  - "gsap-splittext-choreography"
conflicting_skills: []
primary_tools:
  - "write_to_file"
minimum_inputs:
  - "User provides target heading elements (e.g. h2, h1)"
  - "User states the desired scroll trigger position"
verification_required: true
last_reviewed: "2026-08-30"
---

# gsap-word-reveal

## Purpose
Enables premium, high-end text reveal animations (word-by-word sliding) for web projects without requiring a GSAP Club membership for the premium SplitText plugin.

## When to activate
Use for hero titles, section headlines, and prominent callouts.

## When not to activate
Do not use on heavy blocks of body text, paragraphs, or dynamically changing content where layout reflows would impact performance.

## Required inputs
- The target text elements or selector tags (e.g. `h2, h1`).
- CSS classes or rules for `.glm-word-reveal` and `.glm-word-inner`.

## Implementation workflow

### 1. CSS Styles Setup
Add these styles to hide words before reveal:
```css
.glm-word-reveal {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  padding-bottom: 0.15em;
  margin-bottom: -0.15em;
}
.glm-word-inner {
  display: inline-block;
  transform: translateY(100%);
  opacity: 0;
}
```

### 3. JavaScript Dom Splitting & GSAP Trigger
Run a parser script to split the text node into wrap blocks and apply the ScrollTrigger timeline:
```javascript
function initHeadingWordReveals() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const headings = document.querySelectorAll('h2, h1');
  headings.forEach(h => {
    if (h.querySelector('.glm-word-reveal')) return;

    const contents = Array.from(h.childNodes);
    h.innerHTML = '';

    contents.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const words = node.textContent.split(/(\s+)/);
        words.forEach(w => {
          if (w.trim() === '') {
            h.appendChild(document.createTextNode(w));
          } else {
            const wrap = document.createElement('span');
            wrap.className = 'glm-word-reveal';
            const inner = document.createElement('span');
            inner.className = 'glm-word-inner';
            inner.textContent = w;
            wrap.appendChild(inner);
            h.appendChild(wrap);
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName.toLowerCase() === 'br') {
          h.appendChild(node.cloneNode(true));
        } else {
          const wrap = document.createElement('span');
          wrap.className = 'glm-word-reveal';
          const inner = node.cloneNode(true);
          inner.classList.add('glm-word-inner');
          inner.style.display = 'inline-block';
          wrap.appendChild(inner);
          h.appendChild(wrap);
        }
      }
    });

    gsap.to(h.querySelectorAll('.glm-word-inner'), {
      y: '0%',
      opacity: 1,
      duration: 0.8,
      stagger: 0.045,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: h,
        start: 'top 85%',
        toggleActions: 'play reset play reset'
      }
    });
  });
}
```

## Performance requirements
- Avoid layout shifts by checking if children are already split.
- Use `opacity` and `transform` rather than height/width.

## Accessibility requirements (Reduced Motion)
Fallback to standard opacity:
```css
@media (prefers-reduced-motion: reduce) {
  .glm-word-inner { transform: none !important; opacity: 1 !important; }
}
```
