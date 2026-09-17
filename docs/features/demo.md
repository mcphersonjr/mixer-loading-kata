# Feature: demo

`npm run demo` runs `src/demo.ts` via `tsx`. It is a readable trace of one
recipe against a noisy scale, not a test.

## Setup

- Recipe `pen-12-lactating`:
  - Corn silage 4000 ± 50
  - Alfalfa hay 1500 ± 30
  - Mineral mix 120 ± 5
- Head adapter logs every command as `head <- {json}`.
- Scale starts at 850 lb true gross, seed 7.
- Session uses default options (`stableTicks: 3`, `settleLbs: 5`). Until
  task 3 is implemented, auto-advance still fires on the first in-tolerance
  tick, so the demo can skip ahead on a bounce.

## Sequence

1. Three idle `read(2)` samples (small jitter, no dump). The first of these
   anchors silage and sends `SET_TARGET`.
2. Loader dumps buckets `[1200, 1200, 1200, 400, 700, 800, 120]` lb. Each
   dump is `dumpBucket` (bounce) then four `read(2)` settle samples.
3. Stops dumping early if `session.isComplete`.
4. If buckets run out first, prints which ingredient is current and how many
   pounds remain.

Each reading is logged:

```text
t=   250ms gross=  848  Corn silage loaded=    0 remaining=4000
```

or `COMPLETE` once the session has finished.

## How to use it while developing

- After changing auto-advance or restore, run the demo and check that
  `SET_TARGET` / `RECIPE_COMPLETE` line up with index changes, and that a
  bounce does not jump an ingredient.
- The bucket list is tuned for this recipe and seed; it is not a guarantee
  the demo completes. That is expected.
- Do not treat demo output as the spec. Green or red `npm test` is.
