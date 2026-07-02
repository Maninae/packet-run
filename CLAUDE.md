# CLAUDE.md — Packet Run

Browser roguelite RPG teaching networking foundations to ages 9–12. You play **Pip**, the spirit of a message, leading your 5 packet-fragments across world-region maps with a toolbelt of real networking verbs. Static vanilla HTML/CSS/JS, no framework, no build step; will ship on GitHub Pages from `main`.

## Status & next step

- **The design is CONVERGED** (2026-07-01, seven review rounds) and lives in [`design/`](design/README.md) — **read `design/README.md` first** (module map + decision log + review/gate log). `design/CLAUDE.md` has the rules for editing design docs.
- **Gate 1 PASSED** (2026-07-01): portrait-first layout proven at 390×844; desktop derives from it.
- **Phase 1a PLAYABLE, Gate 2 PASSED** (2026-07-01): fun review PASS; accuracy audit 0 violations.
- **Phase 1b BUILT and GATED** (2026-07-02): multi-segment seeded maps (generator v1), corruption + Checksum/Repair, reorder rapids + Buffer, 4-slot belt + pick-1-of-3 rewards + Re-route, loss autopsy + hint retries + protected first session, boss paper specs (design/10). 1b gate: fun TUNE→applied, accuracy 2+1→fixed (log in design/README). ~91 tests green (`npm test`, `node --test tests/e2e/*.test.js`).
- **Phase 2 core BUILT** (2026-07-02): UDP live-call payload (born-expired freshness + stutter bleed + free Skip; contrast proven by simulation — design/05 synced), payload picker after first win, gentle-mode toggle, daily seeded run. The "headless batch simulator" deliverable lives as the executable economy suites (tests/unit/economy*.test.js).
- **Current phase: Phase 3** ([design/09-build-plan.md](design/09-build-plan.md)). Done: **DNS + caching**, **the congestion bottleneck** (send-rate ladder, pipe on the LONG slot, ≤1/run), and **sniffer + Encryption Cloak** (tamper = corruption caught by checksums; cloak = visible-but-unreadable, handshake 1 tick; 5-tool pool vs 4 slots). main.js split done (prompts.js + notices.js). Trench (+3 BW, 10% cable cut → forced reissue) and satellite (+1 beat, 20% solar flake) done — 8 encounter kinds live. Remaining, in rough build order: Acts 1–3 as distinct biomes (palette families in design/08), the weather-state system, first Events, first elite (DDoS Swarm — spec in design/10). Method that works: TDD the engine mechanic → extend the economy sims → UI beat → E2E incl. one full-motion test → screenshot review → commit. **Kid playtests are non-negotiable from here** (Owen recruits ~3 kids, monthly).
- Testing lore: reduced-motion E2E misses animation-path crashes — keep at least one full-motion E2E per encounter type.

## Architecture

```
index.html          shell (ES modules, type="module")
css/base.css        design tokens: palette, stroke, spacing (source of truth for look)
css/components.css  reusable UI pieces (belt bar, meters, glyph chips)
js/config.js        ALL v0 numbers + map schema v2 — mirrors design/02; change BOTH together
js/rng.js           seeded PRNG (runs reproducible from their seed string)
js/engine.js        run state machine: createRun/legalActions/act — headless by design
js/generator.js     seeded multi-segment maps (template stitching; own rng stream seed:map)
js/tools.js         toolbelt: costs, effects, per-tool legality
js/encounters.js    world-side resolution: impacts, gust tail, fog
js/autopsy.js       loss-as-teaching: autopsy JSON derivation + localStorage run log
js/map.js           SVG map: layout (hand 1a + generic vertical stack), roads, glyphs, fog
js/party.js         Canvas live layer: party cluster + hop races; DOM party row (tool targets)
js/hud.js           meters, prompt strip, belt, legend popover, mute
js/screens.js       start / win (message unfurl) / loss (autopsy card) overlays
js/sound.js         WebAudio-synthesized sfx, zero assets
js/icons.js         code-drawn inline SVG icons (Pip's spark shared with canvas)
js/main.js          bootstrap + beat sequencing wiring only — no game rules
```

- **No monoliths:** split any file approaching ~300 lines. One nameable responsibility per module. Run state lives on the engine's run object; helpers receive what they need as arguments.
- **The engine is headless** — tests, the economy sims, and agent playtesters drive the same createRun/legalActions/act API the UI does. Never put game rules in main.js.
- **SVG for the map/characters, Canvas for motion** — see design/08. `prefers-reduced-motion` respected.

## Non-negotiables (from the design)

- **[design/07-accuracy.md](design/07-accuracy.md) is law.** Every mechanic must pass its falsehood checklist. Foundations bar: never teach a falsehood ≠ teach everything true.
- The clock is **"Deadline," never TTL**. Fragments race independently, never in an in-order train. Junctions show next hops only. Threat glyphs are *forecasts*.
- Kid-facing copy: ≤2 short sentences, ≤6th-grade level; icon-first (sample tooltips in design/06).
- **Numbers:** `js/config.js` and design/02 must stay in sync; EV-check the pricing table on paper whenever a number changes (rounds 4–6 each broke a version of it).

## Dev loop

- `python3 -m http.server` from repo root, open `http://localhost:8000`.
- Verify **both mobile-portrait and desktop** in a real browser before calling any visual change done (verifying-web-ui).
- Every run auto-logs to localStorage from Phase 1b (autopsy JSON schema in design/06).

## Repo rules

- No AI-attribution lines or Claude co-author trailers in commits or files.
- No PII in the repo. Working title "Packet Run" — rename freely before publishing.
- Not yet on GitHub; do not create a remote or publish without Owen's say-so (run prepare-for-public-sharing first when that day comes).
