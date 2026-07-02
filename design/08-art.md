# 08 — Art: drawn in code

**Direction unchanged from the explainer draft:** all art is code-drawn (SVG + Canvas), no AI-generated raster — shared primitives give cohesion, full control gives accuracy, objects stay animatable.

## System

- **Token layer:** palette, 2px rounded stroke, corner scale — one source of truth.
- **Primitive library:** `drawFragment`, `drawPip`, `drawRouter`, `drawServer`, `drawCable`, `drawNode`, `drawHazard`, `drawGlyph` — every screen composes from the same parts.
- **SVG** for the region map, nodes, characters, belt UI (flat vector + visible outline; Julia-Evans/Kurzgesagt register — friendly, not babyish).
- **Canvas** for the live layer: fragments racing the wires, signal pulses (`stroke-dashoffset`), the dock filling, renders, juice.
- `@media (prefers-reduced-motion)` throughout.

## Characters

- **Pip:** a bright message-spark with a simple expressive face — readable at 24px, animatable with 3 shapes.
- **Fragments:** numbered little bodies in Pip's palette; corruption visibly *glitches* them (dithered noise); a duplicate is a translucent twin.
- **Villains:** The Static (crackling noise-mass), Congestion Kraken (trench tentacles), Lord Lag (a clockwork pursuer), Sniffer (lurking eavesdropper). Budget honestly: 5+ code-drawn characters ≈ 1–2 weeks even without animation ([09-build-plan.md](09-build-plan.md)).

## Biome palettes

Each act/biome gets a palette family off the shared tokens — meadow greens (Home), neon dusk (Backbone City), deep blues (Ocean), warm ochres + huge skies (Far Reaches), inky violet (Hostile Zone). Weather states tint within the family. Color stays load-bearing (hazard = one hue family everywhere), consistent with the portfolio's color-as-pedagogy rule.

## Layout gate

**Before any Phase 1a code:** a static mobile-portrait mock (even a hand sketch) of the hardest screen — region map + party + belt + two resource meters on a 6" screen. Desktop derives from it, not vice versa ([06-experience.md](06-experience.md)).
