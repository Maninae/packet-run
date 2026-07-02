# 02 — Core loop, resources, numbers

## A run = one delivery mission

Target length: 10–15 min desktop, 8–10 mobile (Phase 1a fun-proof: ~90 seconds). You're handed a **payload** (a birthday message, a webpage, a video call) with a named recipient. It shatters into **N numbered fragments** — Pip leads them as a party. Traverse a region map from source to destination and get *enough of the right fragments there, uncorrupted and re-orderable, before the clock runs out*. Reach the dock → fragments slot in by number (auto-sorted, with a satisfying animation — the *lesson* is that numbering makes reassembly possible, not that you sort by hand) → the payload **renders**.

```
   [SOURCE: payload -> Pip + fragments #1..#5]
                |
          (DNS: find the address)       <- interactive only for NEW destinations
                |
        .-------+-------.
     (junction)      (junction)          <- YOU choose the road (hint glyphs)
        |                 |
    (ocean trench)     (storm)           <- terrain + weather = encounters
        |                 |
     (The Static)     (rapids)
         \               /
          '---> (last mile) <---'
                    |
          [DESTINATION: dock -> render!]
```

## Embodiment on screen

Pip and the fragments are visible bodies. **On the road** between nodes, fragments scatter onto different wires and race independently, regrouping shuffled at the next node — the visual itself teaches out-of-order, independent travel ([07-accuracy.md](07-accuracy.md)). **Integrity = who's still with you**, countable at a glance. A lost fragment is visibly *missing from the party* — and getting it back (Retransmit) feels like a rescue, not a stat fix.

## The map: shape visible, fog on details

The region's node-and-road skeleton is visible from the start (you can plan). Hazard/weather **glyphs appear only ~1 hop ahead** (you must adapt). Each branch at a junction shows **one free hint glyph** (weather icon, link-type tag, distance dots) — routing is a probabilistic *read*, never a blind coin flip and never a solved lookup. **Threat glyphs telegraph *which fragment numbers* are at risk** (*"the storm is eyeing #2 and #4"*) — this is what turns insurance into a targeted read instead of a lottery (see numbers below). Framed diegetically as a **forecast** — the sender's read of the segment, like a weather report — never prophecy; real senders can't foresee which packet drops ([07-accuracy.md](07-accuracy.md)). The Scanner passive deepens the read; the Weather Report consumable reveals glyphs 2 hops out. Junction caption owns the abstraction: *"You're deciding for the router — real routers pick the next hop from a table you don't see."*

A persistent, tappable **glyph legend chip** sits on the map UI — glyphs are a second vocabulary and kids need a place to look one up without a modal ([06-experience.md](06-experience.md)).

## Encounter rhythm (turn-based beats)

Two encounter shapes — every encounter in [04-encounters.md](04-encounters.md) is marked as one or the other:

- **Single-shot** (junctions, DNS, events): one presented choice, resolve, move on.
- **Hazard window** (storms, corruption, rapids, congestion, sniffers): 2–3 beats of **approach → impact → response**. Approach: the threat telegraphs (glyph names the at-risk fragments); you may act preemptively (Duplicate). Impact: the world acts. Response: you answer with tools (Retransmit, Checksum + Repair, Skip). Then move on.

The rhythm is: *road (watch the party race) → node (decide) → road → node…* — a journey with decision beats, not a menu.

## Resources — and the tension rule

| Resource | Real concept | Spent on |
|---|---|---|
| **Bandwidth** (energy) | link capacity | using tools: re-sending, duplicating, repairing, scanning |
| **Deadline** (the clock) | latency — the recipient is waiting | every hop; waiting at rapids; a recalled fragment catching up; handshakes take a beat |
| **Integrity** (the party) | how many of N fragments are alive & valid | drop below the payload's threshold → the render fails |

**Deadline is diegetic time, not TTL.** The named recipient is waiting (*"before bedtime"*), so a clock that ticks on hops *and* waits is simply true — no protocol claims made. Real packets' hop counters get one optional popup line; we never call the clock TTL, because spending "TTL" on waiting would teach the classic TTL-is-time misconception ([07-accuracy.md](07-accuracy.md)).

**The tension rule: the three axes must fight, never co-align.** Every mechanic trades one axis for another, and **no road is free — you are always pricing risk** (see below). Nothing is pure upside (belt slots make even passives cost their slot — [03-toolbelt.md](03-toolbelt.md)).

## v0 numbers (Phase 1a) — so a builder never guesses

All values are starting points for playtest tuning, not sacred. Round-4 review EV-checked the previous set and found a dominant line; this set is designed so **no line strictly dominates** — verify again on paper before building ([09-build-plan.md](09-build-plan.md) has the full Phase 1a build card).

| Value | v0 | Note |
|---|---|---|
| Party size | 5 fragments | TCP message payload |
| Starting Bandwidth | 10 | +2 pickup mid-map on both roads (automatic, chime) — framed as a **well-connected relay** topping you up, so "free energy" has a why |
| Starting Deadline | 8 | each hop −1 |
| Map | 8 nodes; **short road 4 hops / long road 7 hops** | hand-authored |
| Render rule | 5/5 at dock, Deadline ≥ 0 | |
| Short road hazard | **Storm** — telegraphs and sweeps **#2 and #4** unless protected | the big, known danger |
| Long road hazard | **Drizzle** — telegraphs and sweeps **one** named fragment | +2 hops AND its own mild risk: no free road |
| Retransmit | 2 BW + 1 Deadline | recall one lost fragment (it takes time to catch up) |
| Duplicate | 3 BW, preemptive, targeted | protect one named fragment; one copy per fragment, no copying copies; unneeded copies discarded at the dock |
| **Fog slow link** (final stretch) | 40% none / 40% −1 / 20% −2 Deadline | revealed at the **penultimate node**; a *consequence, not a decision* (caption + juice, no action possible). This variance is what makes slack worth buying |
| **Gust tail** | each hazard: 15% chance one *extra, unnamed* fragment is swept on impact | recoverable in the response beat; keeps insurance valuable even when the named threats are covered |
| **Delivery stars** | leftover BW at the dock: ★★★ ≥9 · ★★ ≥8 · ★ delivered | pays efficiency, so daring cheap lines score best *when they survive* (★★ was ≥7 until round-6 review showed that let the mixed line dominate both neighbors) |

**The pricing table (the actual Phase 1a game).** Five lines, five *personalities* — priced by variance, not solved by dominance. Fog variance (0/−1/−2) gives slack real value; the gust tail keeps insurance valuable even when named threats are covered; the star meter pays efficiency, so surviving cheap wins big:

| Line | BW spent | Slack at dock | v0 EV sketch |
|---|---|---|---|
| Short road, insure both | 6 | 4 | never fails, no response play needed, ★ — the set-and-forget beginner line |
| Short road, insure one + recover one | 5 | 3 | never fails but you *play the response beat*, ★ — the practice line |
| Short road, recover both | 4 | 2 | fails only gust∧deep-fog (~3%), ★★ — the solid line |
| Long road, insure the one | 3 | 1 | ★★★ when fog is kind, else scramble — the daring line |
| Long road, recover the one | 2 | 0 | ★★★ at ~34% (0.85 × 0.40), fails on any fog — the gambler's line |

Four distinct outcome profiles (★-safe, ★★-solid, ★★★-daring, ★★★-gambling), and **mastery = daring to run leaner**: beginners take the never-fail lines and learn; star-chasers price the fog. The tuning target, stated honestly: **at least three genuinely distinct viable personalities** — exact non-dominance across all five lines is a playtest target, not a paper guarantee (rounds 4–6 each EV-broke a version of this table; re-verify on paper whenever any number changes). Information (Scanner, Weather Report, remembering the map) is what tells you how much slack you actually need — which is why the info tools matter.

### Phase 1a run trace (worked, not lucky)

> Start: 5 fragments, 10 BW, 8 Deadline. **Junction:** left glyph 🌩️ *eyeing #2, #4* (4 hops), right glyph 🌦️ *eyeing #3* (7 hops). Take left. **Approach:** Duplicate #2 (7 BW). **Impact:** storm sweeps #2 and #4 — #2's copy steps in (insurance, targeted). **Response:** Retransmit #4 (5 BW, 1 Deadline — it catches up next node). Mid-map pickup +2 (7 BW). Final stretch fog reveals a slow link: −1 extra Deadline. **Dock:** arrive 5/5 with 2 Deadline slack → the message unfurls, Grandma reacts. ~90 seconds, and every choice was priced.
>
> Fun gate: does the pricing table above feel like *choices* in the hand? If not at these numbers, tune; if not at any numbers, the loop has failed and we stop.

## v0 numbers (Phase 1b) — generated 3-segment maps

Multi-segment runs (map schema v2 in `js/config.js`; generator in `js/generator.js`) keep every 1a principle: each junction re-poses short-risky vs long-mild; deadline **scarcity is the point** (at Deadline 15 the sim proved reactive recovery strictly dominated insurance — the wrong lesson; 13 restores the trade).

| Value | v0 | Note |
|---|---|---|
| Segments per run | 3 | template stitching from 3 archetypes (A storm-read / B tempo / C paid-risk); ≤2 storm segments per map so full insurance stays affordable |
| Starting Bandwidth | 16 | pickups +2 ride template B/C roads; ≥1 guaranteed per map |
| Starting Deadline | 13 | all-short ≈ 7 hops, all-long ≈ 10 — recovery must *cost* |
| Delivery stars | ★★★ ≥14 · ★★ ≥10 | recovery lines can reach ★★/★★★; full insurance must not coin-flip into ★★★ (was ≥13 until 1b review measured the guardian temperament there 46% of the time) |

**Verified temperaments** (tests/unit/economy-gen.test.js, 1500 runs each — the executable EV-check): guardian (insure everything) 95% wins, always ★; daredevil (short + recover) 72%; wanderer (mild roads + recover) 76%, mostly ★★★ — the jackpot line; strategist (adaptive) ~100%, mid pay. No temperament dominates; both failure modes (loss, lag) occur in the wild.

## Loss and run end

A failed render ends the run (permadeath-ish; meta unlocks persist — [03-toolbelt.md](03-toolbelt.md)). Every failure flows into the **loss autopsy** ([06-experience.md](06-experience.md)) — loss is a teaching beat, never a dead end. A lost *fragment* mid-run is content, not punishment: noticing the gap and re-sending IS the retransmission lesson.
