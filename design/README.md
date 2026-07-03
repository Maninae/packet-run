# Packet Run — modular game design

**One-liner:** You're a message trying to get home. You shatter into packets, journey across the physical internet — storms, corruption, congestion, sniffers, oceans — and if enough of you arrives, in one piece and in order, the message *renders*.

A browser roguelite RPG for ages 9–12 (easy mode younger, depth for adults). You play **Pip**, the spirit of the message, leading your packet-fragments like a party across dungeon-style maps of the real world's network terrain. Static vanilla HTML/CSS/JS, GitHub Pages, art drawn in code. Standalone — not a fork of Follow the Drop.

## Module map

| Doc | Contents |
|---|---|
| [01-vision.md](01-vision.md) | Concept, audience, north star (intrinsic integration), locked vision decisions |
| [02-core-loop.md](02-core-loop.md) | Run structure, embodiment, map & routing, encounter rhythm, resources, **v0 numbers + Phase 1a run trace** |
| [03-toolbelt.md](03-toolbelt.md) | The toolbelt system: active tools, passives, pouch, upgrades, archetypes, meta-progression |
| [04-encounters.md](04-encounters.md) | Encounter library, **world regions (biomes)**, weather, events, elites & bosses |
| [05-payloads.md](05-payloads.md) | Payload types as strategic identity (TCP vs UDP kits), render payoffs |
| [06-experience.md](06-experience.md) | Fun levers, retention stack, loss autopsy, kid usability, vocabulary budget |
| [07-accuracy.md](07-accuracy.md) | The accuracy spine — calibration, falsehood list, mechanics-level rules (dev-facing law) |
| [08-art.md](08-art.md) | Drawn-in-code art system, Pip's visual language, biome palettes |
| [09-build-plan.md](09-build-plan.md) | Phases with honest sizing, playtest cadence, post-v1 list, risks |
| [10-bosses.md](10-bosses.md) | Paper specs (1b deliverable): The Static 4-beat duel, DDoS Swarm siege — built Phases 3–5 |
| [11-perspective-view.md](11-perspective-view.md) | Chase-cam art direction (Owen, 2026-07-02): landscape-first layout + third-person perspective view over the same headless engine — next major milestone, Gate P1 = static mock |

## Status

**Design CONVERGED (2026-07-01, seven review rounds)** — round 7 returned zero high-impact findings, zero accuracy flags, and a Phase 1a greenlight: *"a builder can start without asking a question."* Next step when Owen's ready: the mobile-portrait layout sketch ([08-art.md](08-art.md)), then the Phase 1a fun-proof ([09-build-plan.md](09-build-plan.md)). Remaining tunables (star-band width, five-line non-dominance) are playtest work, scheduled in-doc.

## Decision log

- **2026-07-01 — game, not explainer.** Roguelike delivery-run; mastery by playing.
- **2026-07-01 — audience 9–12** primary; easy mode for younger; foundations-level teaching (calibration in [07-accuracy.md](07-accuracy.md)).
- **2026-07-01 — turn/step-based** with juicy animation (real-time congestion beat cut; replaced by turn-based send-rate puzzle).
- **2026-07-01 — toolbelt RPG, not a card deck** (Owen). You're the packet with persistent tools; randomness lives in the world, not your hand. *"The network holds the deck; you hold the tools."* Rationale in [01-vision.md](01-vision.md).
- **2026-07-01 — embodiment: message-spirit + party** (Owen). Pip leads visible fragments; Integrity = bodies, not a bar.
- **2026-07-01 — map: shape visible, fog on details** (Owen). Node skeleton shown; hazard glyphs only ~1 hop ahead.
- **2026-07-01 — world regions / dungeon-style levels** (Owen). Campaign acts = parts of the world with different weather and **infrastructure density** — including an underconnected region where scarcity is the challenge (digital divide, taught respectfully).
- **2026-07-01 — name: Packet Run** (working title — rename freely).

## Review-round log

| Round | Lens | Verdict | Fate of findings |
|---|---|---|---|
| 1 | Roguelite craft + ed-game (fresh) | — | Actions layer, resource tension, turn-based congestion, autopsy, tighter MVP → adopted |
| 2 | Same, cold read | — | Deck spec, hint-glyph routing, UDP freshness, MVP split, fixed round-1's false encryption claim → adopted |
| 3 | Same, cold read (deck version) | MAJOR REVISIONS | Direction-level findings transferred to toolbelt model: **numbers**, UDP kit spec, CDN accuracy fix, boss debt, autopsy data model → adopted; deck-specific findings mooted by toolbelt pivot |
| 4 | Same, cold read (modular dir) | MAJOR REVISIONS | EV-broke the 1a economy (avoid dominated; Duplicate was a lottery) → storms now telegraph targets, both roads priced, new pricing table. TTL contradiction + TTL-is-time risk → clock renamed **Deadline**, Lord TTL → **Lord Lag**. Backtrack → **Re-route** (sender reissue). Scope re-audited to 5–8 months + cut ladder. Phase 1a build card answers all 14 builder-guess items |
| 5 | Same, cold read | **MINOR POLISH — greenlit 1a** with 3 fixes | Flat-exchange pricing table → fog variance (0/−1/−2) + gust tail + delivery stars, so lines have personalities, not a dominant answer. Trace/table hop mismatch fixed. Fog reveal specced (build card #15–18). Multi-path reframed as added capacity. Scanner labeled QoL-not-teaching. Vocab rule restated (≤1/run, ≤3/act). Scope ceiling 6–10 months |
| 6 | Same, cold read | MINOR POLISH — "otherwise converged" | Star-threshold retune (★★ ≥8) + honest tuning-target framing (≥3 distinct viable personalities; rounds 4–6 each EV-broke a table version). TCP Stack → **Auto-Resend Rig** with Act-5 "…its name is TCP" reveal (vocab leak fixed). Threat glyphs pinned as *forecasts, not prophecy* (accuracy spine). The Static = one recurring villain, many haunts. Multi-path base rate defined. Relay fiction on the BW pickup |
| 7 | Same, cold read | **CONVERGED** | Zero high-impact changes, zero accuracy flags; EV table verified within the stated bar; Phase 1a build card "answers all 18 items." Minor tunables (star-band razor, Multi-path prose ambiguity → clarified, payload-assignment copy) noted as scheduled playtest work |
| **Gate 2** (2026-07-01, on the BUILT 1a slice) | Fun gate: roguelite craft, cold read + 5000-seed play | **PASS — fun gate cleared** | Five personalities land; no dominance; junction read parses in ~2s. Fixed: threatened ring now survives tool-arming; win screen surfaces wasted copies. Noted for 1b: short-road determinism (gust 20% is the pre-checked lever if playtests show staleness), gust never re-blocks via an already-spent copy (don't assume otherwise in future edits), deadline meter could sell "time" harder |
| **Gate 2** (same day) | Accuracy + kid-UX audit, cold read | **0 accuracy violations, 2 copy fixes** | Fixed: storm legend line re-framed as forecast ("are at risk"); "Everyone's together" no longer fires while a retransmitted fragment is still catching up (now "#N is catching up"). Deferred knowingly: junction router-caption (when 1b stacks junctions), Duplicate honesty popup (popup phase) |
| **1b Gate** (2026-07-02, on the BUILT 1b) | Fun/balance: cold read + ~2000 headless runs | **TUNE → applied** | MUST-FIX: The Static spec was mathematically unwinnable (Brace banking never defined) → banking rule written in, "~2 Checksums" corrected to 1. Applied: loss caption attributes the LAST impact (matched autopsy); ★★★ 13→14 (guardian's ★★★ fell 46%→~1%); Re-route now 1 BW + 1 DL with straggler carry-along documented; belt-tension deferral noted in design/03; DDoS "advance"/siege-end clarified. Deferred: retransmit-into-threat UX (Phase 2 polish) |
| **1b Gate** (same day) | Accuracy + kid-UX audit, cold read | **2 accuracy, 1 copy → fixed** | Re-route reward card said "Go back" (packets-never-walk-backwards) → "Ask home to try a different road"; corrupted-loss line implied receivers deliver garbled data → "The dock caught a scrambled fragment"; corruption prompts now acknowledge an unkitted belt. Bonus catch: static/rapids impacts crashed the full-motion animation path (invisible to reduced-motion E2E) → fixed + full-motion regression test |
| 2026-07-02 | Final whole-game gate (pre-playtest) | Fun: **TUNE→applied** (relay-station variety, DNS wonder, waste-line reframe — high-frequency lines matched to low-frequency craft). Accuracy: **0 violations**, 4 risks tightened (UDP-is-the-app clarification on reveal+teachers, sniffer→on-path wording, checksum=detection row, DDoS no-loss dropped), 2 defensible notes logged. Game is gate-clean for kid playtests. |
| **Gate P1** (2026-07-03, road-view art direction) | Two fresh reviewers on the Act-1 chase-cam mock: roguelite game-feel + kid-UX/visual (Owen's bar: "gorgeous, colorful, Mario Kart, 2.5D") | Round 1 **TUNE** (both) → round 2 **PASS** (both): "direction is locked, build against this bar" | Applied: arcs rejoin at the destination (same place, two roads), arc breadth = hop count (length telegraphed by geometry), sweeping hazards stain their road amber, sun removed so the storm owns the warm register (sky cerulean→rose→cream), shadows + edge highlights everywhere, fragments got eyes, Pip +20% with backlit rim, hop dots enlarged. Kept deliberately: "quiet" text label (1:1 with the in-game chip). Renderer shipped same day behind ?view=road (Act 1 + landscape; classic map one toggle away). Also shipped with it: per-act sky backdrops for the classic view, and the DNS beat fix (dock is a dim "?" until the lookup — the map shows the place, the network needs the number). |
