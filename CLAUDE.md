# CLAUDE.md — Packet Run

Browser roguelite RPG teaching networking foundations to ages 9–12. You play **Pip**, the spirit of a message, leading your 5 packet-fragments across world-region maps with a toolbelt of real networking verbs. Static vanilla HTML/CSS/JS, no framework, no build step.

**PUBLIC & LIVE**: [github.com/Maninae/packet-run](https://github.com/Maninae/packet-run) → [maninae.github.io/packet-run](https://maninae.github.io/packet-run) (GitHub Pages auto-deploys from `main` — pushing ships).

## Where things stand (parked 2026-07-04)

The game is **feature-complete for v1 and shipped**: the full 5-act campaign (biomes = curriculum gating), both payloads (TCP-file vs UDP-call tempo contrast), all encounters + elites + the Static duel, balanced generator (every served map proven winnable in-generator), share cards, autopsies, shop/pouch, recipients + naming ceremony, teachers page. **217 tests green** (`npm test` unit incl. Monte-Carlo economy sims; `npm run test:e2e` Playwright).

On top of that, the **aesthetic overhaul** (2026-07-03, design/11): a 2.5D chase-cam **road view** for Act 1 behind `?view=road` (desktop/landscape; Road ⇄ Map toggle), Gate-P1 art mocks for all five biomes in `mocks/`, per-act sky gradients + horizon silhouettes behind the classic map, brightened wire tokens, and the DNS beat fixed (dock is a dim "?" until the lookup hangs the address plate). All gates logged in [design/README.md](design/README.md).

## Resume here

Priority order when the project wakes up:

1. **Kid playtests** (Owen-gated, non-negotiable — PLAYTEST.md is the session script; ~3 kids, monthly). Includes design/11 step 4: road view vs map view head-to-head before perspective becomes a default.
2. **Remaining-biome road renderers** (design/11 step 5): extend `js/road/` per act using the `mocks/road-act2..5.html` art bars; impact-at-depth choreography for the non-storm encounter types.
3. **Road view on portrait** — currently desktop-only by scope; the 1280×800 composition needs a phone-shaped variant (the `xMidYMax slice` crop cuts the signposts on narrow stages).
4. Post-playtest options: rarity tiers, tuning vs logged runs (localStorage autopsy log), campaign spine replacing the wins/3 act proxy.
5. Manual TODO for Owen: upload `media/og.png` as the repo social preview (GitHub Settings, web-only).

Deep history (phases 1a→5, seven design review rounds, every gate + tune): [design/README.md](design/README.md) review log and `git log` — both are complete; don't reconstruct history from memory.

## Architecture

```
index.html            shell (ES modules); portrait column recomposed by css/landscape.css on desktop
css/base.css          design tokens + per-act palette/sky/scenery families (source of truth for look)
css/components.css    reusable UI pieces (belt, meters, chips, stage backdrop)
css/landscape.css     desktop two-pane recomposition (breakpoint synced with js/map-layout.js)
css/road.css          road-view ambient animations + Road⇄Map toggle
js/config.js          ALL v0 numbers + map schema v2 — mirrors design/02; change BOTH together
js/rng.js             seeded PRNG (runs reproducible from their seed string)
js/engine.js          run state machine: createRun/legalActions/act — headless by design
js/generator.js       seeded maps, verified winnable in-generator before serving
js/tools.js           toolbelt: costs, effects, per-tool legality
js/encounters.js      world-side resolution: impacts, gust tail, fog
js/autopsy.js         loss-as-teaching: autopsy JSON + localStorage run log
js/map-layout.js      map geometry, no DOM: node placement, portrait ⇄ landscape orientation, viewTransform
js/map.js             top-down SVG map drawing: roads, nodes, glyph chips, fog, DNS dock plate
js/road/projection.js road-view geometry, pure math: fork arcs (breadth = hops), ribbons, dots
js/road/scenery.js    road-view Act-1 backdrop layers as SVG templates
js/road/road-scene.js road-view SVG composer: signposts (= the chips 1:1), hazards at depth, house
js/road/road-view.js  road-view canvas party + hop surge + activation logic + toggle
js/party.js           canvas characters (drawFragment/drawPip — shared by both views) + DOM party row
js/hud.js             meters, prompt strip, belt, legend, mute
js/screens.js         start / win / loss overlays;  js/prompts.js + js/notices.js  beat copy
js/sound.js           WebAudio-synthesized sfx;  js/icons.js  code-drawn SVG icons
js/main.js            bootstrap + beat sequencing wiring only — no game rules
mocks/road-act*.html  Gate-P1 art bars, one per biome (hand-composed, no engine)
```

- **The engine is headless** — tests, economy sims, the generator's verifier, and agent playtesters drive the same createRun/legalActions/act API the UI does. Never put game rules in view code (either view).
- **No monoliths:** split any file approaching ~300 lines. One nameable responsibility per module.
- **SVG for scenery/map/characters, Canvas for motion** (design/08). `prefers-reduced-motion` respected everywhere.

## Non-negotiables (from the design)

- **[design/07-accuracy.md](design/07-accuracy.md) is law.** Every mechanic passes its falsehood checklist. Never teach a falsehood ≠ teach everything true.
- **Color is pedagogy:** hazards are ONE amber family everywhere; fragments cyan; Pip gold. Per-act ENVIRONMENT hues shift; character/hazard hues never do. (The road view's road-stain and the danger-pink "#?" follow the same rule.)
- The clock is **"Deadline," never TTL**. Fragments race independently, never an in-order train. Junctions show next hops only. Threat glyphs are *forecasts*. The forecast-before-commit read must survive any view change (signposts = chips, 1:1).
- Kid-facing copy: ≤2 short sentences, ≤6th-grade, icon-first.
- **Numbers:** `js/config.js` and design/02 stay in sync; EV-check the pricing table whenever a number changes (rounds 4–6 each broke a version of it).
- The top-down map survives as the tactical read wherever the road view goes.

## Method that works (learned, don't relearn)

- TDD the mechanic → extend the economy sims → UI beat → E2E **incl. one full-motion test** → screenshot-review both orientations yourself → commit granularly.
- **Testing lore:** reduced-motion E2E misses animation-path crashes — keep at least one full-motion E2E per encounter type and per view.
- **Art direction changes go through Gate P1:** hand-composed static mock first, judged by fresh-context reviewer subagents (game-feel + kid-UX lenses) against the current view, TUNE→PASS before renderer code. Then a fresh reviewer *plays* the built result. This caught real bugs both times.
- CSS transforms override SVG `transform` attributes — animation classes go on inner groups, positioning on outer.
- E2E drivers select `[data-road-chip]`, `#go`, `.fragment-chip[data-fragment]` — both views keep these handles; new views must too.

## Dev loop

- `python3 -m http.server` from repo root → localhost:8000. `?seed=X` pins a run, `&map=act1` the tutorial region, `&view=road` the chase-cam, `&act=N` a biome.
- `npm test` (unit) and `npm run test:e2e` (Playwright, pinned 1.58.2) must be green before any push — pushing deploys the live site.
- Screenshots: `node tests/e2e/shot.js <outdir> ['/path']` captures both canonical viewports. Verify portrait AND desktop before calling visual work done.
- E2E must skip the protected first session: `localStorage packet-run-wins='1'`, `packet-run-dns='8'` (or `'0'` to force the DNS beat).

## Repo rules

- No AI-attribution lines or co-author trailers in commits or files.
- No PII. (LICENSE/footer "Owen Wang" is approved by Owen and stays.)
- `playtests/` is gitignored — session notes never ship.
- Design docs have their own rules: [design/CLAUDE.md](design/CLAUDE.md). Locked decisions live in design/README's decision log — don't overturn them in a module edit.
