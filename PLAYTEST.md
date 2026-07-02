# Kid playtest kit (for Owen)

The design commits to ~3 kids (ages 9–12), monthly. This is the session
script. One session ≈ 30 minutes per kid; run them one-on-one if possible —
kids perform for each other in groups.

## Setup (2 minutes)

1. `python3 -m http.server` in this repo; open `http://<your-LAN-IP>:8000`
   on a phone. Portrait. Sound on.
2. Hand them the phone and say ONLY: *"This is a game about getting a
   message to Grandma. See how it goes."* — then stop talking.
3. If they ask a question, answer with *"what do you think it does?"* first.

## What to watch (don't ask, observe)

The four signals worth a month of tuning each:

- **Where do they smile or lean in?** (delight beats — note the exact moment)
- **Where do they stall for >10 seconds?** (confusion — note what's on screen)
- **What do they re-read?** (copy that's working too hard)
- **When do they hand the phone back?** (session length truth)

Milestones to time (rough targets from the design):
- First road choice without help — target < 60s
- First loss understood ("what got you?" answered correctly) — this is the
  fun-gate: if the autopsy doesn't land, nothing else matters
- Voluntary second run — the single most important yes/no of the session

## Five questions, at the end, in this order

1. "What was your favorite bit?" (open)
2. "What got you that last time?" (tests the autopsy — they should have a
   causal story, right or wrong)
3. "Why do you skip pieces on the call but never for the message?" (the
   TCP/UDP feel — any answer about 'the call keeps going' is a pass)
4. "Would you show this to a friend? What would you tell them?" (the share
   test — listen for THEIR pitch words; those are the store description)
5. "What would you add?" (kids design in wishes; wishes reveal gaps)

## Notes discipline

One file per kid per session: `playtests/YYYY-MM-DD-<initials>.md` (this
folder is gitignored if it contains anything identifying — initials only,
no names, no ages tied to initials, no photos). Log: device, minutes
played, runs, wins/losses, the four signals with timestamps, answers to
the five questions verbatim where possible.

## Consent basics

Parent/guardian present or explicitly OK'd. No recordings. Kid can stop
any time — a kid who quits early is DATA (note where), never a problem.

## What feeds back into the game

After each round: file findings as a review-log entry in design/README
(same format as the agent gate reviews: finding → severity → change).
Kid findings outrank agent findings wherever they conflict.
