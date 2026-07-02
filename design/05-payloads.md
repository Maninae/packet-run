# 05 — Payloads: strategic identity

Different payloads demand different strategies — the real reason TCP and UDP both exist. **v1 ships exactly two**; the pair *is* the teaching contrast, and every payload multiplies the balance surface.

## The v1 pair — different kits, not different thresholds

If UDP were merely "TCP with a lower bar," kids would win it playing the same careful way and the lesson would never land. The payloads differ in **kit and mechanics**:

| | 📄 **File / message (TCP)** | 🎥 **Live call (UDP)** |
|---|---|---|
| Render rule | **5/5 at the dock**, correct & in order | **≥3/5 fresh** — the call plays with dropped frames |
| Freshness | none — late is fine | a frame **≥2 beats behind is already too old** — born expired at the rapids; a lag-1 frame is worth one wait *(v0 implementation of the "3-beat timer": expiry lands at impact, making wait-vs-skip a per-frame read)* |
| Gap rule | wait or retransmit — patience pays | an unacknowledged gap makes the call **stutter: −1 Deadline every beat** until you **Skip** it *(v0 refinement of "blocks the dock": the bleed is live, so acknowledging early is the winning tempo — verified by simulation: the tempo policy beats imported-TCP clinging, and the clock is what does the punishing)* |
| Kit difference | Retransmit core; Skip absent | **no Retransmit**; **Skip (free)** is the signature verb |
| Corruption | a scrambled fragment at the dock **fails the render** | the dock **drops the bad frame** and the call keeps playing |
| Winning feel | discipline — every fragment matters | tempo — *abandon the straggler, ship the next one* |

Render thresholds are **ratios, not counts** — with Compression (party of 3), the call renders at ≥2/3 — so payload identity survives every party size. Same maps, opposite optimal play. A kid who wins a call run *by deliberately abandoning stragglers* has understood UDP without being lectured. The "Was this real?" popup carries the honest nuance: *the app on top of UDP decides how much loss is OK — video calls tolerate a lot; other uses tolerate none.*

## The render is a design surface, not a victory screen

The render is the emotional payoff of the whole game — each payload's is bespoke (budget: a few days each, [09-build-plan.md](09-build-plan.md)):

- **Message/file:** the letter unfurls line by line as fragments slot in; Grandma reacts.
- **Live call:** the call *plays* — with visible little glitches where you Skipped (your choices are legible in the win).
- Failure renders matter too: the half-painted page, the frozen call — feeding the loss autopsy ([06-experience.md](06-experience.md)).

## Post-v1 payloads

| Payload | Rule | Lesson |
|---|---|---|
| 🖼️ **Progressive image** | partial delivery still renders (blurry → sharp) | graceful degradation |
| 🎮 **Game move** | tiny & ultra-low-latency; one fragment, brutal Deadline | real-time constraints |

Each is added only when its run *feels* different in playtests, not before.
