# Mixer loading kata

A small, self-contained slice of the kind of problem we work on every day.
Budget about 60 to 90 minutes. Unfinished is fine. We care far more about
how you approach it than whether every test is green.

## The domain, in one minute

On a dairy, a feed truck pulls a mixer wagon. A loader operator dumps
ingredients into the mixer one at a time following a recipe: so much corn
silage, then so much hay, then a little mineral mix. The mixer sits on load
cells, so the app gets a stream of **gross weight** readings from the scale.

The app tells the driver what to load next and how much is left. It also
pushes that target to a small **head display** mounted in the cab, so the
driver does not need to look at the tablet.

Two things matter a lot to us:

1. **The scale is the source of truth.** The app never predicts, smooths, or
   fudges a weight. The amount loaded is the gross reading minus the gross
   that was on the mixer when the ingredient started.
2. **Real scales are noisy.** The truck's PTO shakes the mixer even when
   nothing is happening, and a bucket landing in the mixer makes the reading
   bounce for a second before it settles.

## The code

| File | What it is |
| --- | --- |
| `src/session.ts` | The loading session. All the logic lives here. |
| `src/types.ts` | Recipe, reading, head command, snapshot types. |
| `src/simulator.ts` | A deterministic noisy scale, used by the demo. |
| `src/demo.ts` | `npm run demo` prints a recipe being loaded. |
| `test/session.test.ts` | The spec. Some tests fail on purpose. |

```sh
npm install
npm test
npm run demo
```

## Your tasks

Each task has failing tests in `test/session.test.ts` with a short field
report above it. Read the report, then the test, then the code.

1. **Stale manual advance.** A driver double-taps Next on a laggy tablet and
   skips an ingredient. Make the session ignore a confirmation for an
   ingredient that is no longer current.
2. **Restore double-counts.** After the app restarts mid-ingredient, the
   loaded amount jumps ahead of what is actually in the mixer. Find out why
   and fix it.
3. **Settle before auto-advance.** Auto-advance currently fires the first
   time a reading lands within tolerance, so a bouncing bucket advances the
   ingredient early. Implement the `stableTicks` and `settleLbs` options
   described in `src/types.ts`: advance only after `stableTicks` consecutive
   readings that are within tolerance and that each moved no more than
   `settleLbs` from the previous reading.

If you finish early, there are a couple of things in the code we would not
ship as is. Note anything you spot in `NOTES.md`.

## Ground rules

- Work the way you actually work. Use whatever editor, AI assistant, or
  search you would use on the job.
- Keep `NOTES.md` as you go: assumptions, questions you would have asked,
  what you asked an AI tool and what you did with the answer.
- Commit as you go, small commits are great. Push to a fork or a branch and
  send us the link, or just zip the folder.
- Do not spend more than two hours. Stop and write down where you got to.

## What we will talk about

- How you found the cause of each bug, and how you convinced yourself the fix
  was right.
- The choices inside task 3. There is more than one reasonable reading of
  "settled". Which one did you pick, and what would you want to ask the
  people who drive these trucks?
- What happens in this design when the scale disconnects mid-ingredient, or
  the driver dumps some feed back out.
- How you would wire this session into a React Native screen and keep it
  testable.
