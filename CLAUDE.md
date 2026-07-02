# CLAUDE.md — Packet Run

Browser roguelite RPG teaching networking foundations to ages 9–12. You play **Pip**, the spirit of a message, leading your 5 packet-fragments across world-region maps with a toolbelt of real networking verbs. Static vanilla HTML/CSS/JS, no framework, no build step; will ship on GitHub Pages from `main`.

## Status & next step

- **The design is CONVERGED** (2026-07-01, seven independent review rounds) and lives in [`design/`](design/README.md) — **read `design/README.md` first** (module map + locked decision log), then the module you need. `design/CLAUDE.md` has the rules for editing design docs.
- **Current phase: Phase 1a — the 90-second fun-proof** ([design/09-build-plan.md](design/09-build-plan.md), including the 18-item build card that answers every builder question).
- **Gate 1 (before any game code):** a static **mobile-portrait layout mock** of the hardest screen — map + party + belt + two resource meters on a 6" portrait screen ([design/08-art.md](design/08-art.md)). Desktop derives from portrait, never vice versa.
- **Gate 2 (after 1a is playable):** the fun gate — does insure-vs-recover-vs-avoid feel like a real call? If not at any tuning, **stop and redesign; do not proceed to 1b.**

## Architecture

```
index.html          shell (ES modules, type="module")
css/base.css        design tokens: palette, stroke, spacing (source of truth for look)
css/components.css  reusable UI pieces (belt bar, meters, glyph chips)
js/config.js        ALL v0 numbers — mirrors design/02-core-loop.md; change BOTH together
js/state.js         run state — the single coordinator object; helpers stay stateless
js/map.js           SVG region map: nodes, roads, glyphs, fog
js/party.js         Canvas live layer: Pip + fragments racing wires, juice
js/tools.js         toolbelt: costs, effects, affordability
js/encounters.js    hazard windows: approach → impact → response beats
js/main.js          bootstrap + game loop wiring
```

- **No monoliths:** split any file approaching ~300 lines. One nameable responsibility per module. State lives on the coordinator in `state.js`; helpers receive what they need as arguments.
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
