# 03 — The toolbelt: tools, upgrades, meta-progression

The moment-to-moment kit. Design rules: every tool is a **real networking verb** (intrinsic integration), every tool **trades across resource axes** (tension rule), and **randomness never gates your access to your own tools** — the world is random, your kit is deterministic.

## Belt structure

- **Active tools** — always usable, cost Bandwidth and/or Deadline per use.
- **Passive tools** — always-on machinery; they occupy a slot and typically *spend resources automatically* (convenience vs control).
- **Pouch** — up to 3 one-shot consumables. This is where deck-like "make do with what you've got" improvisation lives, without draw unfairness. Pickup while full → one-tap choice: swap for an existing item or leave it.
- **Slots:** Phase 1a: fixed 2-tool kit, no slot UI. From Phase 1b: belt = **3 slots → 5 by late campaign**. You can't bring everything — loadout IS your build, and slot opportunity cost makes "pure upside" impossible by construction. (The deck-thinning insight from reviews survives as *belt curation*.)

## Active tools

| Tool | Cost (v0) | Effect | Real concept / trade |
|---|---|---|---|
| **Retransmit** | 2 BW + 1 Deadline | recall one lost fragment (it catches up next node) | retransmission; reactive — costs time |
| **Duplicate** | 3 BW, preemptive, targeted | protect one *named-at-risk* fragment; one copy per fragment, no copying copies; the dock discards unneeded copies (*"the dock keeps only one of each number"*) | redundancy; receivers discard dupes by number — spam never wins. Popup honesty (**ships with the tool, not later**): real senders usually just retransmit; sending spares ahead shows up where retrying is too slow (live streams, very lossy links) |
| **Checksum** | 1 BW | reveal which fragment is corrupted | error detection |
| **Repair** | 2 BW | fix one *revealed* corrupted fragment | error correction; synergy with Checksum |
| **Re-route** | 1 Deadline | *ask the sender to reissue via the other road*: the party fades and re-materializes at the previous junction (caption: *"You told home to try a different road"*) | senders retry along different routes. Packets never walk backwards — the fiction is a reissue, and the visual (fade + re-materialize, never walking back down the wire) must match ([07-accuracy.md](07-accuracy.md)). Not in Phase 1a |
| **Skip** *(UDP kit only)* | free | wave a straggler/expired fragment goodbye; the dock accepts the gap | loss tolerance — the UDP verb ([05-payloads.md](05-payloads.md)) |

No `Ack` tool: acknowledgments happen at the dock automatically, and the player-facing version lives inside the Auto-Resend Rig passive's fiction. (Review found `Ack` was a dead verb — in the toolbelt model it simply isn't a tool.)

## Passive tools (machinery — the manual→automatic arc)

The arc: early on you do the verb *by hand*; the passive automates it — and that's the lesson: **"the internet has machinery doing what you've been doing manually."** Guardrails so the manual phase never cements a wrong model: a diegetic caption on first manual use (*"Nice — the real internet does that automatically. You'll unlock its machinery later"*), and autopsy callouts (*"you just did by hand what the internet does in a millisecond"*). The word **TCP is never spoken until the Act-5 payload-select reveal** (vocabulary schedule, [06-experience.md](06-experience.md)) — at which point *"that machinery you've been using has a name: TCP"* lands as a payoff, not a lecture.

| Passive | Effect | Trade (beyond its slot) |
|---|---|---|
| **Auto-Resend Rig** *(revealed as "TCP" at Act 5)* | lost fragments auto-Retransmit — with a visible **notice-then-send beat** (it detects the miss first; instant precognitive re-sends would teach the protocol wrong) | spends 2 BW + 1 Deadline *without asking* — convenience vs control, which is true to real TCP |
| **Buffer (Reorder Engine)** | rapids stragglers cost half the wait; a straggler you wait for is never lost | auto-waits still burn Deadline |
| **Checksum Chip** | corruption auto-revealed | small BW tax per hazard |
| **Compression** | party of 5 → 3 fragments; **render thresholds are ratios, not counts** (UDP ≥3/5 becomes ≥2/3) so payload identity survives | cheaper, faster ↔ each loss now graver |
| **Encryption Cloak** | Sniffer can't read or tamper | −1 Deadline at run start (the handshake takes a beat); packets stay visible on the wire ([07-accuracy.md](07-accuracy.md)) |
| **Multi-path Harness** *(Act 3+)* | use **both roads at once** through a forked segment. Base model (everywhere else): the whole party advances **one segment per beat** down one road. With the harness, the party **divides across both roads and both groups move at full speed simultaneously** — together they cross the fork in about half the beats (capacity *adds*; nothing slows down or halves — this is what real multipath buys by sending *different* packets down different paths); both roads' hazards apply; rejoin at the merge node | setup 1 Deadline; two hazard streams to track. Framed as *added capacity* (which is what real multipath buys) — never as splitting a fixed flow ([07-accuracy.md](07-accuracy.md)) |
| **Route Scanner** | second hint glyph per branch | 1 BW per peek. **Honesty label: this is a QoL affordance, not a networking verb** — it deliberately fails the intrinsic-integration test, and the belt knowingly admits a couple of these; they're never used to *teach* |

## Pouch consumables (v0 examples)

**Signal Boost** (+3 BW) · **Weather Report** (reveal glyphs 2 hops out) · **Spare Fragment** (re-materialize one lost fragment instantly, no Deadline) · **Priority Stamp** (one fragment immune to the next hazard). Found at nodes and Events; capped at 3. These are game-flavor, not networking verbs — that's fine in the pouch, never on the belt.

## Rewards & meta-progression

- **After encounters: pick 1 of 3** (a tool, a tool upgrade, or pouch/resources). Events may pay in consumables or Uptime instead.
- **Between runs:** wins earn **Uptime** (meta-currency) → shop: unlock tools into the pool, buy starting-pouch options, cosmetics. Rarity tiers (Common/Rare/Legendary); drop rates and pricing are a Phase 4 spec item (flagged, not forgotten).
- **The curriculum sequence — which tools enter the pool per act** (the meta-progression is secretly the syllabus). Tools deliberately precede their *named* terms by up to an act — **played-before-named** is the rule ([06-experience.md](06-experience.md)), so e.g. the Checksum tool enters at Act 2 while the word joins the vocabulary at Act 3; that's intentional, not a mismatch:

| Act ([04-encounters.md](04-encounters.md)) | Tools entering the pool |
|---|---|
| 1 — Home & Neighborhood | Retransmit, Duplicate (starting kit) |
| 2 — Backbone City | Checksum, Repair, Buffer, Re-route |
| 3 — Ocean Crossing | Compression, Route Scanner, Auto-Resend Rig, Multi-path Harness |
| 4 — Far Reaches | CDN unlocks, Spare Fragment tier, Weather Report tier |
| 5 — Hostile Zone | Encryption Cloak, Checksum Chip |

- **CDN Cache (meta, reframed for accuracy):** deliver to the same destination twice and that destination *signs up with an edge-cache service* — future runs there start with a **CDN waystation** mid-map (free-Deadline rest stop, some fragments pre-staged). The *world* reacts to popularity; **you don't build the CDN** (companies like Cloudflare/Akamai run them; "Was this real?" popup says so).

## Build archetypes (loadouts to chase)

| Archetype | Core pieces | Beats |
|---|---|---|
| **Belt-and-Suspenders** | Duplicate + Spare Fragments + Auto-Resend Rig | lossy links, storm biomes |
| **Auto-Repair** | Checksum Chip + Repair upgrades | the corruption belt |
| **Compression Rush** | Compression + Deadline-saving tools | timed gauntlets, long distances |
| **Zero-Trust** | Encryption Cloak + Route Scanner | hostile/sniffer networks |

Post-campaign: an **Ascension-style ladder** for adults/experts — gated well past the average kid session so it's a stretch goal, never a wall a 10-year-old hits ([06-experience.md](06-experience.md)). First on the cut list if scope runs long ([09-build-plan.md](09-build-plan.md)).
