# Packet Run

You're a message trying to get home. You shatter into packets, journey across the physical internet — storms, corruption, congestion, sniffers, oceans — and if enough of you arrives, in one piece and in order, the message *renders*.

A browser roguelite RPG for curious kids (~9–12) that teaches how the internet actually works through its mechanics: every tool is a real networking verb, every hazard a real phenomenon, every route a real tradeoff. No lectures, no quizzes — you don't read about retransmission, you lose a fragment to a storm and re-send it to win.

**Status:** playable end to end — five acts, two payloads, ten encounter kinds, a final boss, and the TCP/UDP reveal that names what you've been doing all along. In kid-playtest phase (see [PLAYTEST.md](PLAYTEST.md)); not yet published.

Vanilla HTML/CSS/JS, no framework, no build step. Art drawn in code (SVG + Canvas).

```
python3 -m http.server   # then open http://localhost:8000
```

Portrait phone is the primary target; desktop derives from it.

## The shape of the game

- **5 acts**, each a place with its own hazards, palette, sky, and someone waiting — Home & Neighborhood, Backbone City, the Ocean Crossing, the Far Reaches, the Hostile Zone. The act ladder is the curriculum: congestion enters with the city, the ocean brings the deep-sea cables, the finale is the Static itself.
- **2 payloads**: the birthday message (every piece matters) and the live call (keep it moving; skip what's stale). Opposite winning tempos — that contrast *is* TCP vs UDP, unnamed until the end.
- **Seeded, verified runs**: every map is reproducible from its seed, and every served map is beaten by a scripted policy inside the generator before a kid ever sees it. No one ever gets an unwinnable map.
- **Share cards**: a win becomes a text card with an emoji journey and a challenge link — same map, your moves.
- **Losses teach**: every failure ends in an honest autopsy — what struck, which idea beat you, which tool answers it, and how the real internet handles the same problem.

The full game-term → real-concept table lives on [the grown-ups page](teachers.html). The design law is **never teach a falsehood** ([design/07](design/07-accuracy.md)).

## Development

```
node --test tests/unit/*.test.js    # engine, Monte-Carlo economy, balance
node --test tests/e2e/*.test.js     # Playwright, portrait + desktop
```

The engine is headless (`createRun` / `legalActions` / `act`); the UI, the unit tests, the economy suites, and the generator's verify-loop all drive the same API. Numbers live in `js/config.js` and mirror [design/02](design/02-core-loop.md); architecture notes in `CLAUDE.md`.

## Privacy

No accounts, no tracking, no analytics, no ads. Progress lives in the browser's local storage only.
