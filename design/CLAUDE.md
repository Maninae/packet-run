# CLAUDE.md — follow-the-packet design dir

This directory is the **modular game design** for Packet Run (browser roguelite RPG teaching networking foundations to ages 9–12). It is a design workspace, not code. Start with `README.md` (module map + decision log), then read only the module you need.

## Rules for working here

- **Locked vision decisions live in README.md's decision log.** Don't overturn them in a module edit — propose the change, get Owen's call, then update the log AND the module together.
- **[07-accuracy.md](07-accuracy.md) is law.** Any new mechanic must pass its falsehood checklist and the intrinsic-integration test in [01-vision.md](01-vision.md). Calibration: never teach a falsehood ≠ teach everything true — this is a foundations game, keep nuance in optional popups.
- **Numbers in [02-core-loop.md](02-core-loop.md) are v0** — written so a builder never guesses, expected to change in Phase 1a playtesting. Change them freely with playtest data; don't change them from the armchair.
- **No monoliths:** if a module outgrows ~300 lines, split it and update README's module map.
- Cross-reference modules with relative links; define a concept in exactly one module and link to it elsewhere (no re-explaining).

## Review process

Design is iterated via fresh-context expert subagent reviews (roguelite designer + ed-game specialist lens) until a cold read returns CONVERGED. Log each round in README.md. Reviewers get the audience calibration explicitly so they don't ratchet technical depth upward.
