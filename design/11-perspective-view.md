# 11 — The perspective view (chase-cam art direction)

**Status: DIRECTION CAPTURED (2026-07-02, from Owen) — not yet mocked or gated.**
This is the next major art milestone, developed live post-publish. Nothing here
changes the engine, the economy, or the teaching — it is a new VIEW LAYER over
the same `createRun / legalActions / act` API.

## The direction (Owen's words, distilled)

1. **Landscape web-first layout** alongside the portrait one. Desktop players
   get a horizontal composition, not a phone column in a gutter.
2. **Third-person chase camera.** The player hangs behind the five fragments —
   a "driver perspective." The fragments buzz, wiggle, animate as living
   bodies ahead of you. Route options stretch *away into the horizon*: at a
   junction you see the fork in front of you in depth, not from above.
3. **Immersive environments per place.** Entering a router is *entering* it.
   The neighborhood act has streets and trees; the ocean act descends to the
   seabed cable; Backbone City is neon canyons. Real art investment — beyond
   polygon-minimalism — while staying code-drawn where feasible.

## Why the architecture makes this cheap(er) than it sounds

The engine is headless and every UI surface already derives from `scene()` +
the event stream. The perspective view is a rendering swap:

- Roads become **perspective-projected ribbons** converging on a vanishing
  point; hop progress = camera dolly along the ribbon.
- Junction glyph chips become **signposts over each fork** — same forecast
  data, now diegetic. (Forecast legibility is load-bearing for the teaching —
  design/07 — so the glyph language carries over 1:1.)
- The party row stays as the tactile tap-target layer; the fragments' canvas
  bodies move from "cluster at a node" to "formation ahead of the camera,"
  with the existing wiggle/race/scatter animations re-projected.
- Biome palettes (already per-act CSS tokens) become **layered parallax
  backdrops**: sky / far silhouettes / near roadside props, 3–5 layers each.
- Impacts (storm sweep, static, swarm) play *at depth* — the cloud ahead on
  the road you chose, growing as you approach. Telegraphs get scarier and
  MORE legible, not less.

## What must survive the transition (non-negotiables)

- The **forecast-before-commit** read at junctions (glyphs/signposts show the
  same information at the same decision moment).
- The **top-down map** survives as a mini-map / route-planning toggle — the
  tactical overview is how kids reason about multi-segment plans.
- Reduced-motion: the perspective view needs a static-composition fallback.
- Accuracy law: perspective is presentation; no mechanic changes ride along.

## Build order (mirrors the Gate-1 discipline)

1. **Static mock first** (one hand-composed junction scene per act biome,
   HTML/CSS/SVG, no engine hookup) → judged against the current view before
   any rebuild. This is Gate P1.
2. Landscape two-pane layout for the CURRENT top-down view (independent,
   ships first — desktop players get a real layout while the chase-cam
   develops). **SHIPPED 2026-07-02**: map pane west (journey flows
   west→east, transposed from the portrait layout in js/map-layout.js),
   rail east (meters/prompt/party/belt, css/landscape.css); portrait
   untouched; breakpoint min-width 900px + landscape orientation.
3. Perspective renderer for one act (Act 1 neighborhood) behind a `?view=road`
   flag; full-motion E2E from day one (testing lore: reduced-motion hides
   animation crashes).
4. Kid playtest the two views head-to-head (PLAYTEST.md session) before
   making perspective the default.
5. Remaining biomes, environment set-pieces (router interior, seabed
   descent), impact-at-depth choreography.
