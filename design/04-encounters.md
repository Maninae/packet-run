# 04 — Encounters, world regions, bosses

## Standard encounters

Shape: **S** = single-shot choice, **W** = hazard window (approach → impact → response beats; see [02-core-loop.md](02-core-loop.md)).

| Encounter | Shape | Interaction | Teaches |
|---|---|---|---|
| **DNS crossroads** | S | interactive lookup **only for a new destination** (costs 1 Deadline); known destinations skip it (*"your device remembers the address for a while"*). Visual: pre-lookup the dock is dim with a "?" plate (the map shows the *place*; the network needs the *number*); the lookup lights it and hangs the address plate ([11-perspective-view.md](11-perspective-view.md)) | names → addresses, and caching — kills the every-run opening tax *because caching is real* |
| **Junction** | S | pick a road by hint glyphs; only next-hop options ever shown | routers choose next hop; no one knows the whole path |
| **Storm** | W | **telegraphs which fragment numbers it's eyeing** on approach — insure (Duplicate), recover after (Retransmit), or route around; every option priced ([02-core-loop.md](02-core-loop.md)). Early campaign guarantees one loss so retransmission actually lands | packet loss; weather hits physical links |
| **Undersea trench** | W | huge bandwidth (BW pickups), rare *catastrophic cable cut* (forced reroute) | the internet is physical; >99% is seabed fiber; big pipes fail big |
| **Satellite pass** | W | sometimes the *only* road across a gap; costs extra Deadline, weather-flaky | why satellite exists and why it isn't the default |
| **The Static's domain (corruption)** | W | a fragment's bits flip — Checksum to find it, Repair to fix | error detection & correction |
| **Reorder rapids** | W | party arrives scrambled with straggler(s) behind — **wait (−1 Deadline/beat, max 2) or press on** (straggler lost unless later Retransmit). Varies: *which* fragment lags and *how many* — sometimes waiting is right, sometimes Skip/press-on is (payload-dependent) | out-of-order arrival; buffering tradeoffs |
| **Congestion bottleneck** | W | send-rate puzzle: push 1/2/4/8 fragments per beat through the pipe; a loss halves your rate (floor 2); beat the clock. Kids feel "ramp up, back off" — the names (slow start, AIMD) live in the popup | congestion control |
| **Sniffer (MITM)** | W | tries to read/tamper — Encryption Cloak defeats it; without it, an expensive escape (Re-route + 1 BW) — never free damage, never a wall | why we encrypt (visible-but-unreadable — [07-accuracy.md](07-accuracy.md)) |
| **Firewall** *(post-v1)* | W | fragments carry a protocol tag; the wall admits a whitelist — match or reroute | port/protocol filtering (mechanically true, unlike a "magic door") |

## World regions (biomes) — dungeon-style levels *(Owen, 2026-07-01)*

Campaign acts are **parts of the real world**, each a distinct terrain with its own weather, hazard mix, and — the key axis — **infrastructure density**. Biomes are how a toolbelt game pays the variety bill ([01-vision.md](01-vision.md)) and they carry real teaching: the internet is physical, geographic, and unevenly built.

| Act / biome | Terrain & feel | Infrastructure | Signature mechanics | Concepts introduced |
|---|---|---|---|---|
| 1 — **Home & Neighborhood** | LAN meadow, cozy | dense, generous | tutorial-grade hazards, forgiving economy | packets, addresses, hops |
| 2 — **Backbone City** | fiber highways, rush and glow | dense, fast | reorder rapids; **rush-hour congestion waves** (time-of-day pattern on the map) | ordering, congestion |
| 3 — **The Ocean Crossing** | seabed trench, storms above | few giant pipes | undersea trench, storm chains, cable-cut event; boss: **Congestion Kraken** | physicality, loss, big-pipe failure |
| 4 — **The Far Reaches** | remote highlands & rural expanse | **sparse** — few roads, low BW economy, aging links | satellite passes are often the *only* route; **power-cycling nodes** (a node offline for a beat — wait or reroute); higher base corruption; **community mesh** waystations (locals link houses together — real, and heroic) | the digital divide; engineering with less; caching & patience |
| 5 — **The Hostile Zone** | stormy neon straits — the open internet's rough neighborhood (never framed as "the dark net", which is a specific other thing) | dense but adversarial | sniffers everywhere, elites (below); boss: **The Static** | encryption, integrity |

- **Cognitive-load gating:** the congestion puzzle appears Act 2 at the earliest and the Multi-path Harness Act 3 at the earliest — the two most demanding elements never hit a kid who hasn't mastered the basics.
- **Weather is a biome system**, not a one-off: each region has weather states (clear / rain / storm / solar flare on satellite links) that set the glyphs, shift per run, and make the same map play differently. Weather Report consumable and Scanner read it.
- **Endless mode** procedurally stitches biome segments with escalating modifiers.
- **Far Reaches, handled with respect (non-negotiable):** the challenge is distance, terrain, and underinvestment — **never the people**, who appear as ingenious allies (mesh-network builders, the village cache-keeper). Real lesson, real dignity: most of the world's connectivity gaps are infrastructure economics, and engineers there do heroic things with less. A "Was this real?" popup links to real community-network projects.

## Events ("?" nodes)

Pure text + one choice; cheap to author, big flavor; pay in consumables, Uptime, or a resource swing (not always a tool — reward economy stays in [03-toolbelt.md](03-toolbelt.md)). Example: *"A cache node holds a copy of your payload — take the shortcut? (−2 fragments, −50% remaining distance)"* → teaches CDNs by choice. Events are also where Far Reaches' human stories live.

## Elites & bosses — specced early, built late

Round-3 review flagged these as the plan's biggest hidden debt: they shape act pacing, so **mechanics are specced in Phase 1b (paper only), built in Phases 3–5** ([09-build-plan.md](09-build-plan.md)).

**v0 mechanic sketches** (to be paper-specced fully in Phase 1b):

- **The Static** (Act 5 boss, specced first): a 4-beat duel where it corrupts one *hidden* fragment per beat; you budget Checksums vs Repairs while it escalates (last beat: two at once). Tests the whole detect→repair loop under pressure. Must *feel* like fighting entropy, not a quiz. **Story rule:** The Static is one recurring villain — every corruption zone in the world is its domain (*"The Static's static"*); the Act 5 fight is the entity itself. One entity, many haunts — never two things with one name.
- **DDoS Swarm** (elite): a horde floods the pipe — your BW income drops to 0 while it rages; survive N beats by rate-limiting (choose which fragments move) and spending pouch items. Teaches: floods starve everyone's bandwidth.
- **Great Firewall** (elite): deep inspection — it *opens* fragments (unless Encrypted) and quarantines any it dislikes; mechanically distinct from the tag-check firewall (which only reads labels), so the game never teaches "firewall = tag check."
- **Congestion Kraken** (Act 3 boss): tentacles squeeze the trench — pipe width varies per beat; a send-rate fight where the ceiling *moves*.
- **Lord Lag** (Act 4 boss): the clock personified — a pursuit across the Far Reaches where every beat costs Deadline and the route options are sparse; beat it by economy, caching, and knowing when to Skip. ("Lag" is a word kids already own from games; we don't name TTL — [07-accuracy.md](07-accuracy.md).)
