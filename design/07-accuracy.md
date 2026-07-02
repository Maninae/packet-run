# 07 — The accuracy spine (dev-facing law)

**Calibration (Owen, 2026-07-01): this is a foundations game for 9–12, not a networking course.** Accuracy means *never teach a falsehood* — it does **not** mean maximal technical depth. The mechanics carry the big basics (messages split into packets; routing hop by hop; loss & retransmission; ordering; congestion; why encryption exists) and that alone is real educational value. Finer truths live in the optional "Was this real?" popups — never as required reading. When in doubt: **simpler-and-true beats complete.** This file is a dev checklist, not kid-facing copy.

## Naming rules

- **Name** (define once, reuse): *packet, address, router, cache* + the vocabulary schedule in [06-experience.md](06-experience.md): ≤1 new named term per run, ≤3 per act; played-before-named.
- **Describe, don't name:** TCP handshake → "the packets check in first"; TLS → "a seal only the destination can open"; ports/BGP/OSI → skip or gesture.

## Never teach these falsehoods

The internet is wireless magic (it's mostly physical cable, incl. seabed) · a message travels as one piece (it's split) · a router knows the whole path (only the next hop) · packets must arrive in order (they usually don't) · there's a control center (it's decentralized) · the internet is the same everywhere (infrastructure is unevenly distributed — Act 4's whole point). Cross-check kid-facing technical lines against MDN/Cloudflare.

## Mechanics-level rules (each blocks a wrong model the game could quietly teach)

- Fragments in flight are drawn **racing independently on different wires, regrouping shuffled** — never an in-order train.
- **The clock is "Deadline" — never TTL.** It's diegetic time (the recipient is waiting), so ticking on hops *and* waits is simply true. Real TTL is a **hop counter**, and spending a resource named TTL on waiting would teach the classic TTL-is-time misconception; the hop counter gets one optional popup line, nothing more. (Hence the villain is **Lord Lag**, not Lord TTL.)
- **Packets never travel backwards.** The Re-route tool is a *sender reissue* — the party fades and re-materializes at the prior junction with a caption (*"you told home to try a different road"*); it is never animated as walking back down the wire.
- Junctions show **next-hop options only**; the caption owns the abstraction (*"you're deciding for the router"*) so we don't teach source routing.
- **Randomness lives in the world, never in your kit** — real senders always have their whole toolkit; the network is the unpredictable part. (This is why the toolbelt beat the deck.)
- Retransmission and reassembly graduate **manual → automatic** (Auto-Resend Rig, Reorder Engine) with diegetic captions — real protocols do these invisibly; the manual phase is scaffolding and the game *says so*. The rig is named "TCP" only at the Act-5 reveal, per the vocabulary schedule.
- Congestion is beaten by **backing off and ramping up** — never by hand-directing traffic (popup names slow start/AIMD for the curious).
- UDP-payload runs **render with missing fragments**; loss tolerance belongs to the app on top of UDP, and the popup says so.
- Encrypted fragments are **visible on the wire but unreadable** — never invisible, and never claimed to hide the destination (addresses must stay readable for routing; route-hiding is Tor, out of scope).
- Duplicates are **discarded at the dock by number** — caption it, so "spam never wins" lands as receiver-side dedup.
- DNS answers are **cached** — repeat destinations skip the lookup (*"your device remembers the address for a while"*).
- **CDNs are services the destination signs up with** — the world reacts to popularity; the player never "builds" a CDN ([03-toolbelt.md](03-toolbelt.md)).
- **Multi-path adds capacity** — never frame splitting as halving throughput; its cost is complexity (two encounter streams), which is true.
- Undersea cable and satellite have **distinct mechanics** (bandwidth, cut events, only-available-route), not "slow link" reskins.
- The Great Firewall elite (deep inspection) plays **mechanically differently** from the tag-check firewall — so the game never teaches "firewall = tag check."
- **Far Reaches (Act 4):** the challenge is distance, terrain, and underinvestment — never the people, who appear as ingenious builders (community mesh networks are real). Popup links to real community-network projects.
- **Threat glyphs are forecasts, not prophecy.** Naming at-risk fragment numbers is a game affordance (like the Scanner) framed as the sender's read of a segment — real senders can't foresee which packet drops. Keep the forecast fiction in every caption.
- **Duplicate's popup is honest:** real senders usually just retransmit; sending spares ahead belongs to FEC/high-loss/real-time contexts. Foundations-fine as a tool; the popup keeps it true.
- **The Hostile Zone is "the open internet's rough neighborhood"** — never styled or named as the dark net, which is a specific different thing.
- **"You ARE the message"** is a POV device, not physics — one early caption owns it (*"you're playing as the message itself, like a movie POV"*).
