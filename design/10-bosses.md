# 10 — Boss & elite paper specs (1b deliverable; built Phases 3–5)

Round-3 review flagged bosses as the plan's biggest hidden debt: they shape act
pacing, so the mechanics are specced NOW, on paper, against the real engine's
verbs — built later ([09-build-plan.md](09-build-plan.md)). Both specs use only
systems that already exist (corruption/reveal/repair, rate of movement, pouch,
Deadline) plus one bespoke arena rule each. Numbers are v0 for the simulator.

## The Static — Act 5 boss (spec first; it closes the detect→repair curriculum)

**Fiction.** Every corruption zone in the world is its haunt; Act 5 is the
entity itself ([04-encounters.md](04-encounters.md): one entity, many haunts).
The arena: the final stretch before the Act-5 dock — a tunnel of noise.

**Shape.** A 4-beat duel (a hazard *window* stretched into a fight). No map
movement during the duel; the party stands in the tunnel. Each beat:

1. **The Static acts** (beats 1–3: corrupts ONE hidden fragment; beat 4: TWO at
   once — the escalation kids must budget for).
2. **You answer** with up to TWO actions per beat from: Checksum (1 BW,
   reveals all), Repair (2 BW, fixes one revealed), pouch item, or **Brace**
   (pass — bank the action).
3. **Deadline ticks 1** at the beat's end (the recipient is still waiting —
   the duel is never free).

**Win / lose.** Survive all 4 beats and cross to the dock: standard render
rules apply — any corrupted fragment at the dock fails it. So the REAL enemy
is the running arithmetic: total scrambles = 5; full counter-kit cost =
5 Checksum-reveals worth of info + up to 5 Repairs. A perfect duel needs
~2 Checksums (reveals batch!) + timely Repairs ≈ 2 + 10 BW. The boss is
beatable while behind — leave with 4/5 clean + one Repair short and the
render still fails honestly.

**The teach.** Batching detection (one Checksum reveals everything scrambled
so far) vs paying per-fix — kids discover "scan less often, repair in bulk,"
which is real engineering rhythm. Beat 4's double-corruption punishes
zero-slack plans, echoing the fog lesson.

**Telegraphs.** Before the duel: *"The Static is here. Four surges are
coming — the last is the worst."* Each beat opens with a visual surge; no
hidden rules beyond WHICH fragment (that's the whole game).

**Autopsy lines.** killerConcept `corruption`; suggestion `checksum-then-repair`
(exists); extra boss line: *"The Static wins when scrambled data reaches the
dock. Real receivers checksum everything — that's why."*

**Feel bar (build-time gate).** It must feel like fighting entropy — surges,
noise crawling on the UI edges, the glitch chips flickering — never a math
quiz. Budget honestly: villain art + arena ≈ 1 week ([08-art.md](08-art.md)).

## DDoS Swarm — elite (Act 4–5 roads)

**Fiction.** A horde floods the pipe; everyone's bandwidth starves — including
yours. (Teaches: floods starve *shared* capacity; nobody's packets are special.)

**Shape.** A 3-beat siege replacing a road's hazard window:

1. While it rages, **Bandwidth income and pickups are dead** (relays on this
   road pay 0) and **every action's BW cost +1** (the pipe is jammed).
2. Each beat, only **N of your fragments may advance** (N = 2, the rate limit);
   the rest hold at the previous node. You CHOOSE which move — priority is
   the player's verb (rate-limiting = triage, the real defense posture).
3. Fragments holding in the flood are safe (the swarm clogs, it doesn't eat) —
   the price is pure Deadline: the siege costs 3 beats ≈ 3 ticks minimum.

**Win / lose.** No fail state inside the siege itself — it's an economy vice:
BW frozen + inflated costs + forced slow-march. Deadline does the killing if
you entered fat-and-slow. Pouch items (Signal Boost) are the release valve —
the elite is where hoarded consumables earn their keep.

**The teach.** *"A flood doesn't break the wire — it starves everyone using
it."* Popup: real DDoS defenses rate-limit and filter upstream; kids just did
the rate-limiting part.

**Autopsy.** killerConcept `latency`; new suggestion key `travel-light-past-floods`:
*"A flooded pipe slows everyone. Slack in the clock is the only armor."*

## Build order (unchanged from 09)

DDoS Swarm first (Phase 3 — reuses road UI), The Static with Act 5 (Phase 4–5).
Both go through the headless simulator before UI work: policies must show the
duel is winnable at ≤ moderate skill and the siege kills only low-slack lines.
