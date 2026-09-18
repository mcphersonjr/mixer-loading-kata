# Mixer loading documentation

This folder is the working spec for the mixer-loading kata. Read it before
changing session logic, tests, or the demo.

The product is a **loading session**: a driver follows a recipe, dumping one
ingredient at a time into a mixer wagon. The mixer sits on load cells. The
session consumes a stream of **gross weight** readings and tells the driver
(and an in-cab head display) what to load next and how much is left.

## How to use these docs

- Start with [domain and principles](./01-domain-and-principles.md) if you
  are new to the problem.
- Use [architecture](./02-architecture.md) to find the code that owns a
  behavior.
- Open a feature doc when you are about to change that behavior. Each feature
  file states intended behavior, current implementation, and open gaps.
- Use [spec vs implementation](./spec-vs-implementation.md) as a punch list
  of known bugs and unfinished work.

Intended behavior comes from `README.md`, type comments in `src/types.ts`,
and the tests in `test/session.test.ts`. Where the running code disagrees
with those sources, the docs say so.

## Document map

| Doc | Covers |
| --- | --- |
| [01-domain-and-principles.md](./01-domain-and-principles.md) | Dairy / mixer domain, the two product rules |
| [02-architecture.md](./02-architecture.md) | Files, data flow, public API |
| [features/recipe.md](./features/recipe.md) | Recipe and ingredient lines |
| [features/scale-readings.md](./features/scale-readings.md) | Gross-weight samples |
| [features/loading-session.md](./features/loading-session.md) | Session lifecycle and read model |
| [features/weight-accounting.md](./features/weight-accounting.md) | Anchor, loaded, remaining |
| [features/head-display.md](./features/head-display.md) | In-cab head commands |
| [features/auto-advance.md](./features/auto-advance.md) | Tolerance, settling, auto-advance |
| [features/manual-advance.md](./features/manual-advance.md) | Driver "Next" confirmation |
| [features/persistence.md](./features/persistence.md) | Snapshot and restore |
| [features/scale-simulator.md](./features/scale-simulator.md) | Deterministic noisy scale |
| [features/demo.md](./features/demo.md) | `npm run demo` walkthrough |
| [spec-vs-implementation.md](./spec-vs-implementation.md) | Known bugs, kata tasks, ship gaps |
| [plans/restore-lastgross-frame-check.md](./plans/restore-lastgross-frame-check.md) | Task 2 plan: restore, lastGross, lost-zero re-anchor |

## Run the project

```sh
npm install
npm test
npm run demo
npm run typecheck
```

All session logic lives in `src/session.ts`. Tests in `test/session.test.ts`
are the executable spec. Tasks 1–3 are done. Lost-zero restore and
persisting `lastGross` are still open product follow-ups.
