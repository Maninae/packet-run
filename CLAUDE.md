# CLAUDE.md — Packet Run

Browser roguelite RPG teaching networking foundations to ages 9–12. You play **Pip**, the spirit of a message, leading your 5 packet-fragments across world-region maps with a toolbelt of real networking verbs. Static vanilla HTML/CSS/JS, no framework, no build step; will ship on GitHub Pages from `main`.

## Status & next step

- **The design is CONVERGED** (2026-07-01, seven review rounds) and lives in [`design/`](design/README.md) — **read `design/README.md` first** (module map + decision log + review/gate log). `design/CLAUDE.md` has the rules for editing design docs.
- **Gate 1 PASSED** (2026-07-01): portrait-first layout proven at 390×844; desktop derives from it.
- **Phase 1a PLAYABLE, Gate 2 PASSED** (2026-07-01): fun review PASS; accuracy audit 0 violations.
- **Phase 1b BUILT and GATED** (2026-07-02): multi-segment seeded maps (generator v1), corruption + Checksum/Repair, reorder rapids + Buffer, 4-slot belt + pick-1-of-3 rewards + Re-route, loss autopsy + hint retries + protected first session, boss paper specs (design/10). 1b gate: fun TUNE→applied, accuracy 2+1→fixed (log in design/README). ~91 tests green (`npm test`, `node --test tests/e2e/*.test.js`).
- **Phase 2 core BUILT** (2026-07-02): UDP live-call payload (born-expired freshness + stutter bleed + free Skip; contrast proven by simulation — design/05 synced), payload picker after first win, gentle-mode toggle, daily seeded run. The "headless batch simulator" deliverable lives as the executable economy suites (tests/unit/economy*.test.js).
- **Current phase: Phase 3** ([design/09-build-plan.md](design/09-build-plan.md)). Done: **DNS + caching**, **the congestion bottleneck** (send-rate ladder, pipe on the LONG slot, ≤1/run), and **sniffer + Encryption Cloak** (tamper = corruption caught by checksums; cloak = visible-but-unreadable, handshake 1 tick; 5-tool pool vs 4 slots). main.js split done (prompts/notices). Trench + satellite done. **Acts 1–3 biomes DONE**: palette families (meadow/neon-dusk/deep-blue via body class), per-act template pools = the curriculum gating (congestion/static Act 2+, ocean systems Act 3+), wins climb an act every 3 (Phase 4's spine replaces the proxy). **PHASE 3 COMPLETE** (2026-07-02): DNS+caching, congestion, sniffer/Cloak, trench+satellite, Acts 1–3 biomes (curriculum gating), Events, DDoS Swarm elite, weather states (seeded per-run sky; rain/storm widen gusts + thicken fog; flare forces satellite flakiness; gentle runs stay clear). **Current phase: Phase 4.** Done: Uptime+shop+pouch (boost/spare/stamp); **Acts 4–5** (Far Reaches: ochre palette, startBandwidth 14 scarcity, offline power-cycling nodes, flare skies, respect rule in all copy; Hostile Zone: violet palette, sniffer×2/swarm/storm pools) + act-up win-screen celebration — the full 5-act world ladder is playable (wins/3 proxy still stands in for the spine). **The Static duel DONE** (Act-5 dock boss: 4 beats, Brace banking proven by sim at the spec's exact 11 BW line, arena static-crawl, full-fight E2E). Phase 5 core narrative DONE: per-act RECIPIENTS (Grandma/Ava/Kenji/Auntie-Rosa/Grandma-again, 5-line messages + win lines, dock/DNS/screens recipient-aware) + the one-time Act-5 TCP/UDP naming ceremony + traveler's-cache event (pouch drop, space-gated). **Balanced generator DONE** (generate→simulate→adjust in-generator: 2-policy verify, +2/+2 visible bumps, reroll stream, verifySeed on map; kit guarantee for corruption maps — solvability structural, 750/750). **Share cards DONE** (Wordle-style card + challenge URL pinning seed/payload/act — friends replay the same map; ?act= param). **Grown-ups page DONE** (teachers.html: concept table, accuracy promise, co-play guidance, privacy). **Villain art DONE** (Static looms over the duel, stage overlay). **Launch kit DONE**: README current, PLAYTEST.md (3-kid session script), pre-publish audit CLEAN, playtests/ gitignored. **Everything buildable solo is BUILT.** Remaining items are Owen-gated: (1) kid playtests (PLAYTEST.md is the script), (2) rename decision, (3) publish go-ahead (then prepare-for-public-sharing + GitHub Pages). Optional post-playtest: rarity tiers, tuning vs logged runs. Method that works: TDD the engine mechanic → extend the economy sims → UI beat → E2E incl. one full-motion test → screenshot review → commit. **Kid playtests are non-negotiable from here** (Owen recruits ~3 kids, monthly).
- **Landscape two-pane layout SHIPPED** (2026-07-02, design/11 build-order step 2): desktop (≥900px + landscape) gets the map pane west with the journey flowing west→east (portrait geometry transposed in the new js/map-layout.js; fog/clouds/chips/labels orientation-aware in js/map.js) and a rail east (meters/prompt/party/belt, css/landscape.css — media query kept in sync with LANDSCAPE_MQ). Portrait untouched and still primary. 13 layout unit tests + tests/e2e/landscape.test.js (two-pane bounds, west→east flow, long-label clamp, breakpoint flip mid-run, full-motion desktop run, 44px rail, landscape duel/villain). Next design/11 step: Gate P1 static biome mocks (Owen-judged), then the `?view=road` chase-cam renderer.
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
js/map-layout.js    map geometry, no DOM: node placement, orientation (portrait ⇄ landscape), viewTransform
js/map.js           SVG map drawing: roads, nodes, glyphs, fog — renders either orientation
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
- PUBLIC since 2026-07-02: github.com/maninae/packet-run, live at maninae.github.io/packet-run (Owen's go; prepare-for-public-sharing pass clean). Iterating live — next milestone is design/11 (landscape layout + chase-cam perspective view).
