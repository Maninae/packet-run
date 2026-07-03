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
   any rebuild. This is Gate P1. **Act-1 mock PASSED 2026-07-03** (two
   fresh-context reviewers, game-feel + kid-UX lenses, TUNE→PASS round 2;
   what the gate added: arcs rejoin at the destination, arc breadth = hop
   count, sweeping hazards stain their road amber, no warm sky competing
   with hazard amber, shadows + eyes). mocks/road-act1.html is the bar;
   acts 2–5 mocks derive from it.
2. Landscape two-pane layout for the CURRENT top-down view (independent,
   ships first — desktop players get a real layout while the chase-cam
   develops). **SHIPPED 2026-07-02**: map pane west (journey flows
   west→east, transposed from the portrait layout in js/map-layout.js),
   rail east (meters/prompt/party/belt, css/landscape.css); portrait
   untouched; breakpoint min-width 900px + landscape orientation.
3. Perspective renderer for one act (Act 1 neighborhood) behind a `?view=road`
   flag; full-motion E2E from day one (testing lore: reduced-motion hides
   animation crashes). **SHIPPED 2026-07-03** (js/road/: projection math
   unit-tested, signposts = the chips 1:1 incl. data-road-chip handles,
   DNS mystery house, dock-fill win beat, Road ⇄ Map toggle, hop surge
   with the map's impact fates; Act 1 + landscape only — portrait, later
   acts, and the duel fall back to the classic map).
4. Kid playtest the two views head-to-head (PLAYTEST.md session) before
   making perspective the default.
5. Remaining biomes, environment set-pieces (router interior, seabed
   descent), impact-at-depth choreography.

## Build spec (2026-07-03, Owen's go: "gorgeous, colorful, like Mario Kart, 2.5D")

**Projection** (js/road/projection.js, pure math, unit-tested): single
vanishing point on a ground plane. `horizonY ≈ 0.36·H`; a world point at
depth `z` (0 = camera plane) projects to
`y = horizonY + K/(z + z0)`, `x = cx + worldX·K/((z + z0)·s)` — one `K`
shared so verticals and lanes agree. The hop is a camera dolly: scenery
depth decreases with progress; the impact cloud on your road grows from
the horizon as you approach (telegraphs get scarier AND more legible).

**Layers, back→front** (SVG for scenery/signposts, canvas for the party —
same split as design/08): sky gradient (per-act family, saturated
"golden-dusk meadow" for Act 1) → celestial + far silhouettes (slowest
parallax) → mid silhouettes (hills, rooftops, trees) → road ribbons
(chunky, rounded, edge-lit) → roadside props receding → hazard-at-depth →
signposts over each fork → party formation ahead of the camera (canvas,
existing wiggle/race animations re-projected).

**Non-negotiables carried over:** signposts ARE the glyph chips — same
forecast data at the same decision moment, same `data-road-chip` handles
(tests and tap flow unchanged). The top-down map survives as a
stage-corner toggle (Road ⇄ Map); the classic renderer stays the tactical
read. Reduced motion = static composition, hop = cut. Accuracy law: pure
presentation, zero mechanic changes.

**Scope:** renderer ships for Act 1 behind `?view=road`; other acts fall
back to the map view until their environments land. Gate P1 mocks
(mocks/road-act*.html, no engine hookup) set the art bar per biome first.

**Color register update (both views):** push the biome palettes from muted
dark → saturated and playful (Mario-Kart register): gradient skies, vivid
surfaces, glow. Invariant (color-is-pedagogy): hazards stay ONE amber
family everywhere; fragments stay cyan; Pip stays gold; per-act ENVIRONMENT
hues shift, character/hazard hues never do. The classic top-down view also
gains per-act layered scenery backdrops behind the map so it reads 2.5D,
not flat.

**DNS beat fix (Owen, 2026-07-03):** looking up an address while the dock
sits labeled on the map read as pointless. The map shows the PLACE; the
network needs the NUMBER — so before the lookup the dock renders dim with
a "?" plate and withholds its name; the lookup lights it up and hangs the
address plate (203.0.113.7, TEST-NET) under the label. View-side only
(engine already emits `dns-lookup`); copy stays ≤2 short sentences.
