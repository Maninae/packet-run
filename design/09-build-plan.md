# 09 — Build plan (fun-proof first, honest sizing)

Solo dev, vanilla JS, no build step; `python3 -m http.server` dev loop; GitHub Pages from `main`.

## Phases

1. **Phase 1a — the 90-second fun-proof (days).** Exactly the build card below — [02-core-loop.md](02-core-loop.md)'s numbers made playable. Gate: does the pricing table feel like *choices*? **If not fun at any tuning, stop and redesign — nothing downstream can save it.** Prerequisite: the mobile-portrait layout sketch ([08-art.md](08-art.md)).
2. **Phase 1b — MVP (2–3 weeks).** Corruption + reorder encounters (adds Checksum, Repair, Buffer, Re-route); belt slots (3) with pick-1-of-3 rewards; Compression (second archetype); seeded procedural maps; every run logged (autopsy JSON, [06-experience.md](06-experience.md)); the **loss autopsy screen**; protected first session. **Paper-spec The Static + one elite now** (mechanics only — they shape act pacing). **Kid playtesting starts here: 3 real 9–12-year-olds, monthly, non-negotiable** (budget the recruiting/scheduling honestly: ~2–3 hrs/week from here on) — solo-dev "playable but is it fun?" blindness is this plan's biggest real-world risk.
3. **Phase 2 — teaching core + instrumentation (3–4 weeks).** UDP live-call payload (freshness kit, Skip — [05-payloads.md](05-payloads.md)); **headless batch simulator** (1–2 weeks solo, before systems get built on top of dominant strategies); onboarding map; **easy mode** (moved up from polish — it carries the 9–10 half of the audience); daily seeded run.
4. **Phase 3 — encounters + first biomes (6–10 weeks).** DNS + caching; congestion puzzle; sniffer/encryption; undersea trench + satellite pass; Acts 1–3 as distinct biomes; **the weather-state system (a real 1–2 week feature, not a tint)**; first Events; first elite built. Sniffer UX and the congestion puzzle need real iteration — hence the range.
5. **Phase 4 — meta-progression (the biggest chunk: 2–3 months).** Uptime shop, rarity tiers + drop rates + pricing (specced here), archetype synergies, campaign spine → endless, Acts 4–5 (Far Reaches + Hostile Zone), act bosses, **a procedural generator that produces *balanced* runs (2–3 weeks on its own — without it, dominant strategies never die)**.
6. **Phase 5 — narrative & polish (3–4 weeks).** Villain art (1–2 weeks alone, [08-art.md](08-art.md)), named-recipient stakes, geographic win lines, the "you are the network" finale, **per-payload render moments (a real feature: ~2 weeks total, not polish — it's the game's emotional payoff)**, accessibility pass.
7. **Phase 6 — balance & ship (3–4 weeks).** Tune against logged runs + simulator + kid playtests; speedrun timer + share cards; **teacher/parent landing page** (5th–6th-grade CS standards alignment — near-zero effort, big distribution multiplier); verify mobile + desktop (`verifying-web-ui`); add to the maninae sitemap; ship.

**Honest total to v1: 6–10 months of focused solo work** (round 4 audited 3–4 months as 30–60% light; round 5 called 5 months optimistic — the balanced procedural generator alone can eat months on games like this). The fun-proof answer still arrives in **days** — that's the point of Phase 1a.

**First things cut if it runs long** (genre polish, not the teaching spine): Ascension ladder → endless mode → achievements → share cards. **Never cut:** the autopsy, easy mode, kid playtests, the accuracy spine.

## Phase 1a build card — zero guesses

Everything a builder needs beyond [02-core-loop.md](02-core-loop.md)'s numbers table:

| # | Question | Answer |
|---|---|---|
| 1 | Clock in 1a? | **Yes — Deadline** (8, −1/hop). The old "no TTL in 1a" note described a resource that no longer exists |
| 2 | Toolset | **Retransmit + Duplicate only.** No Checksum/Repair (no corruption in 1a), no Re-route |
| 3 | Costs | Retransmit 2 BW + 1 Deadline; Duplicate 3 BW |
| 4 | Storm targeting | telegraphed, deterministic: the approach glyph names **#2 and #4**; both swept on impact unless protected |
| 5 | Storm shape | full 3-beat window: approach (telegraph, may Duplicate) → impact → response |
| 6 | Duplicate limits | one copy per fragment; can't copy a copy; preemptive only |
| 7 | Road glyphs | short road 🌩️ + threat numbers; long road 🌦️ (drizzle, one threat number) + distance dots |
| 8 | BW pickup | automatic on arriving at the node, +2, chime |
| 9 | Junction UI | inline on the map — tap a road, it highlights with its glyphs, tap again to commit; no modal |
| 10 | Fragment rendering | parallel lanes on the wire, racing dots that regroup shuffled at nodes |
| 11 | Belt UI | persistent bottom icon bar (mobile-portrait), greyed when unaffordable; no slot management in 1a |
| 12 | The render | real but simple: the birthday message unfurls as the 5 dock slots fill; placeholder recipient reaction |
| 13 | Loss in 1a | one line (*"The storm got #4 — the message couldn't finish. This happens on the real internet all the time."*) + retry-seed button; full autopsy is 1b |
| 14 | Threat glyphs name fragments? | **Yes — core to the design** ([02-core-loop.md](02-core-loop.md)); it's what makes Duplicate a read instead of a lottery |
| 15 | Fog reveal | at the **penultimate node**: 40% nothing / 40% slow link (−1 Deadline) / 20% bad stretch (−2). Caption + juice only — a consequence, not a decision |
| 16 | BW +2 pickup location | node 3 on the short road; node 4 on the long road (mid-map on both); framed as a "well-connected relay" tops you up |
| 17 | Tool order in a storm window | approach beat: Duplicate only; response beat: Retransmit only; both usable in the same window (insure one, recover another) |
| 18 | Party-size fallback | if 9-year-old playtesters smoke on 5 fragments, drop 1a to 4 (storm eyes #2 and #3) — pre-agreed, not a redesign |

## Explicitly post-v1

Firewall encounter (tag-matching) · progressive-image & game-move payloads · two-player hot-seat (one kid Sender, one Router — classroom + sibling appeal; turn-based already supports it) · "trace the real internet" mode (~30 pre-baked traceroutes of real sites as runnable maps, no backend) · replay GIFs (rabbit hole — stretch) · end-of-campaign shareable artifact.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Loop isn't fun | Phase 1a gate before any further investment |
| Economy has a dominant line | EV-check the pricing table on paper each time numbers change (round-4 method); simulator from Phase 2 |
| Solo-dev fun-blindness | monthly kid playtests from 1b |
| Dominant strategy warps meta | run logging day 1; balanced-generator work sized honestly in Phase 4 |
| Boss/elite retrofit | paper-specs in 1b |
| Mobile layout collapse | portrait-first sketch gate before 1a code |
| Scope creep | post-v1 list is a fence; the cut ladder above is pre-agreed |
