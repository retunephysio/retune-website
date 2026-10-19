# retune-website

The one-page website for **retunephysio.com.au**.

- `index.html`: the whole page (markup only).
- `css/tokens.css`: design tokens (colours, fonts, shadow), light and dark.
- `css/base.css`: layout and component styles.
- `css/features.css`: phone demo states, cue builder, six-week grid, timeline line.
- `css/motion.css`: hover states, press states and the starting state for scroll reveals.
- `js/boot.js`: runs first; only allows content to be hidden for animation when it is safe to.
- `js/motion.js`: GSAP + ScrollTrigger animation.
- `js/main.js`: the cue builder and the "Copy email address" button (both work without animation).
- `vendor/`: self-hosted GSAP (see `vendor/README.md`).
- `netlify.toml`: Netlify settings (no build step, security headers).

## How it goes live
Netlify watches this repository. Every change pushed to `main` is published to retunephysio.com.au automatically.

## Motion rules
- Only opacity and transform are animated. One easing (`power2.out`), one travel distance (24 px).
- With JavaScript off, a failed script, or "reduce motion" switched on, the page shows all content with no animation.
- Hover effects are CSS transitions and only apply on devices with a mouse.

## Rules
- Marketing copy must follow AHPRA advertising rules: no testimonials, no unproven outcome claims, clear terms on any offer.
- Never commit passwords, API keys or any patient data.
