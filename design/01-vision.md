# 01 — Vision

**Working title:** Packet Run *(rename freely later; it signals both the topic and the roguelike "run" loop)*
**One-liner:** You're a message trying to get home. You shatter into packets, journey across the physical internet, and if enough of you arrives — in one piece and in order — the message *renders*.
**Audience:** curious kids ~ages 9–12 primary (a real strategy roguelite skews a touch older than an 8–10 explainer), easy mode for younger, depth for adults.
**Format:** static vanilla HTML/CSS/JS, no framework; GitHub Pages; art **drawn in code** ([08-art.md](08-art.md)).

## Focus: comprehension → mastery

An explainer teaches the mental model by guided reading; a game teaches it by **mastery**: you don't read how retransmission works, you *lose a packet to a storm and re-send it to win*. Better retention — if we hold one line:

## The north star: intrinsic integration (no chocolate-covered broccoli)

The #1 failure of educational games is bolting a fun game onto unrelated learning — it teaches kids that *learning is the boring tax on fun* and reduces intrinsic motivation. The fix, per the research: **the central mechanic must communicate the concept by itself.** ([Nicky Case](https://blog.ncase.me/curse-of-the-chocolate-covered-broccoli-or-emotion-in-learning/), [KQED](https://www.kqed.org/mindshift/20765/whats-the-secret-sauce-to-a-great-educational-game))

**The test for every mechanic:** *"If a kid gets good at this, have they necessarily understood real networking (at a foundations level)?"* Yes → keep. Metaphor stapled on → cut. The roguelite fits because the raw phenomena of networking — loss, corruption, routing, congestion — are *already* the stuff of good game encounters.

## The locked vision (2026-07-01, Owen)

**You are the message, on a journey — an RPG, not a card game.**

- **Toolbelt RPG, not a deck.** Early reviews prescribed a Slay-the-Spire-style Actions deck to create microdecisions. Rejected at vision level: a deck turns you into a *manager of* packets instead of *being* the message, adds deckbuilding vocabulary on top of networking vocabulary, and puts randomness on the wrong side (real senders always have their whole toolkit; the *network* is the random one). Instead: persistent **tools** always available, gated by resource costs and limited belt slots. **"The network holds the deck; you hold the tools"** — the world plays a card at you (storm! static!), you answer with your kit. The fiction fix is also an accuracy fix. Genre anchors: **FTL** (you are the ship; equipment + world events) and **Into the Breach** (turn-based, world-side RNG, deep) — not STS.
- **Embodiment: message-spirit + party.** You're **Pip**, the spark of the whole message, leading your N packet-fragments like a small party. **Integrity is bodies, not a bar** — you see who's still with you. At hops the fragments scatter onto different wires and race, regrouping shuffled at the next node (which quietly teaches independent, out-of-order travel).
- **Map: shape visible, fog on details.** You see the region's node-and-road skeleton, but hazard glyphs only ~1 hop ahead. You can plan a route but must adapt — and it literally embodies "no one knows the whole path."
- **World regions, dungeon-style.** Levels are parts of the real world with different weather, terrain, and **infrastructure density** — a friendly home network, backbone highways, the ocean floor, and an underconnected region where scarce infrastructure *is* the challenge (the digital divide, taught respectfully — see [04-encounters.md](04-encounters.md)).

## Where the strategic depth lives (without draw RNG)

| Depth source | Where it lives |
|---|---|
| Loadout | limited belt slots, chosen before you know the map |
| Economics | every tool use costs Bandwidth or Deadline — "worth it *now*?" push-your-luck |
| World RNG + partial info | fog, hint glyphs, weather, combined hazards |
| Payload rules | the same tool is great on a TCP run, dead weight on a UDP run ([05-payloads.md](05-payloads.md)) |
| Terrain | biome modifiers change the whole resource economy ([04-encounters.md](04-encounters.md)) |

Named tradeoff accepted with the toolbelt: decks give cheap per-encounter novelty; a toolbelt game needs the **world** to carry variety. The biome system is how we pay that bill.

## Emotional core

You weren't moving abstract data — you were getting *Grandma's birthday message* home, across real oceans and real wires. The render at the destination is the payoff; concrete geography ("5,000 miles under the Pacific") is the feeling.
