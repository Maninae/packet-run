# 06 — Experience: fun, retention, kid usability

## Game-feel levers

- **Juice on everything that matters:** fragments whoosh along wires; a click + chime as each slots into the dock; a sad blip + tiny shake on a loss; the render blooming at the end. Nicky Case-grade emotional feedback — juice is what makes broccoli taste like dessert. `prefers-reduced-motion` respected throughout.
- **Meaningful risk/reward:** every fork is a real networking tradeoff kept honest by the tension rule and hint glyphs ([02-core-loop.md](02-core-loop.md)).
- **Low floor, high ceiling:** Act 1 wins on intuition; late biomes reward optimization; adults get the Ascension ladder ([03-toolbelt.md](03-toolbelt.md)).
- **Named stakes, authored by the player:** before a run — *"Who are you sending this to?"* (mom / grandma / best friend / custom). Drives the render and the end card; costs nothing. Wins land with **concrete geography**: *"Your message reached Sapporo — 5,000 miles under the Pacific."*
- **The "you are the network" reveal (campaign finale):** the payload shrinks to a single fragment and the map explodes to ~40 nodes — one visual that sells "the internet is HUGE."

## The one-more-run stack

- **Seeded procedural maps, seed shown** (*"Seed 2A9F"*) — the fairness signal, and a shareable challenge hash.
- **Daily run** — same seed for everyone (seedable PRNG + date; trivial to build).
- **Near-miss memory:** *"You fell with 2/5 fragments and 3 ticks on the clock — retry that seed?"* — stronger pull than raw stats.
- **Shareables:** post-run end card (*"Grandma's birthday message — 4/5 delivered, 2 rescues, storm dodged, seed #147"*); speedrun timer + share button (an afternoon of work); achievements tied to real feats (*win a call run at 30% loss → "Frame-Skipper"*); end-of-campaign *"I ran the internet"* recap page for a parent/teacher.

## Loss is a teaching beat — the autopsy

For 9–12, unexplained roguelike loss is the #1 rage-quit driver — and the moment a kid loses to a concept is the moment they *want* to understand it.

On failure, one compact screen: **what killed the run → which real concept that was → which tool/upgrade might have saved you → one sentence of "on the real internet…"** — then **"Try again with a hint"** (eases difficulty one tick) or "Fresh run." Narrative reframe included: *"The message didn't arrive — this happens millions of times a day on the real internet. That's why we build in redundancy."*

**v0 data model** (logged every run from Phase 1b, win or lose):

```json
{
  "seed": "2A9F", "payload": "tcp-file", "outcome": "fail",
  "killerNode": "storm-3", "killerConcept": "packet-loss",
  "state": {"fragments": 2, "bw": 0, "deadline": 3},
  "suggestion": "duplicate-before-storm",
  "conceptLine": "Real senders insure important data with redundancy.",
  "path": ["src","junction-1","storm-3"], "toolsUsed": ["retransmit","retransmit"]
}
```

Same log powers balance tuning and the headless simulator ([09-build-plan.md](09-build-plan.md)).

## Protected first session

The first three runs **cannot hard-fail** (auto-easy until the first win — the Balatro easy-deck move). A hard failure at minute 3 of run 1 = a closed tab. **Onboarding without a tutorial wall:** the first run is a hand-authored map, one concept per node; the opening 30 seconds have zero chrome to learn — *one fragment, one storm, one glowing Retransmit button, win.* (The toolbelt makes this possible — no hand/deck UI to explain.) No modal tutorials, ever.

## Easy mode (~9-and-under / newcomers) — ships early, not last

Built in **Phase 2** ([09-build-plan.md](09-build-plan.md)), not saved for polish: the full system stack (3 resources + party + belt + hazard windows + glyph reads + fog) is fine at 11–12 but heavy at 9–10, and easy mode is what carries the younger half. A difficulty toggle, not a separate game: generous resources, hazards telegraphed a node ahead, retry a failed node instead of run-death, corrupted fragments auto-highlighted, timed beats slowed or optional. Same concepts, gentler stakes.

## Kid usability guardrails (9–12)

- **Reading budget:** tooltips ≤ 2 short sentences, ≤ 6th-grade reading level. Kid-name first; the real term appears in parens only where it earns its place: **Auto-Repair (FEC)**. **Sample tooltips written to spec** (the budget is a rule, not an aspiration — all kid-facing copy matches these):
  - *Retransmit:* "A fragment got lost? Ask home to send it again. Costs 2 energy and a tick of the clock."
  - *Duplicate:* "Send a spare copy of one fragment, just in case. The dock only keeps one of each number."
  - *Skip:* "Wave goodbye to a late fragment. A live call can't wait for stragglers."
  - *Checksum:* "Check your fragments to find the scrambled one."
  - *Bandwidth:* "Your sending energy. Every tool uses some."
  - *Deadline:* "Grandma's waiting! Every hop and every wait ticks the clock."
  - *Encryption Cloak:* "Seals your fragments so the Sniffer can't read or change them. It still sees them pass."
- **Icon-first vocabulary:** tools and glyphs are icons first, text on hover/tap — never text-only. The toolbelt is drawn as a *belt*, not a menu. A persistent, tappable **glyph legend chip** lives on the map — glyphs are a second vocabulary, and looking one up must never require a modal.
- **Vocabulary schedule** — the rule, stated precisely: **≤1 new named term per run, ≤3 per act** (an act ≈ 3–4 runs/levels); tools are *played before they're named* ([03-toolbelt.md](03-toolbelt.md)). ~18 novel terms total across the campaign:

| Act | New named terms |
|---|---|
| 1 | packet, address, router |
| 2 | bandwidth, reorder (order numbers), congestion |
| 3 | cable, retransmit-as-word (used long before named), checksum |
| 4 | satellite, cache, lag (a word kids already own — the clock is just "the Deadline"; TTL never named outside an optional popup) |
| 5 | encryption, sniffer; TCP & UDP named **only at the payload-select screen**, after both have been *played* |

- **Mobile-portrait first:** design the map for a 6" portrait screen before desktop — the map + party + belt + resources on one small screen is architecturally the hardest layout in the game; **sketch it before Phase 1a code** ([08-art.md](08-art.md)). 44px minimum touch targets; nothing requires rapid drags.
- **"Was this real?" popups** on concept moments — one first-principles sentence + an external link in a new tab. Optional, rewards the curious (house popup style). This is where all the real nuance lives ([07-accuracy.md](07-accuracy.md)).
