# Architecture

The kata is a small TypeScript library plus a CLI demo. There is no
framework, database, or Netlify surface area. Session logic is deliberately
isolated from I/O so it can be unit-tested with fake scale readings and a
fake head.

## Layout

```text
src/types.ts        Shared types: recipe, reading, head, snapshot, options
src/session.ts      LoadingSession — all product logic
src/simulator.ts    ScaleSimulator — deterministic noisy scale for the demo
src/demo.ts         npm run demo — prints one recipe being loaded
test/helpers.ts     Shared recipe, FakeHead, readings() factory
test/session.test.ts Executable spec (includes three intentionally failing tasks)
```

Config: `package.json`, `tsconfig.json` (strict, ES2022), `vitest.config.ts`
(globals, `test/**/*.test.ts`).

## Data flow

```text
Recipe ──┐
         │  construct
Head ────┼──► LoadingSession
Options ─┘         ▲
                   │ onReading(ScaleReading)
         Scale ────┘
                   │
                   ├──► getters (index, ingredient, loaded, remaining, complete)
                   ├──► head.send(SET_TARGET | RECIPE_COMPLETE)
                   └──► snapshot() / LoadingSession.restore(...)
```

The driver tablet is not modeled as a type. It calls `manualAdvance(confirmedIndex)`
on the same session object.

## Public session API

| Member | Role |
| --- | --- |
| `constructor(recipe, head, options?)` | Rejects an empty recipe. Merges options onto `{ stableTicks: 3, settleLbs: 5 }`. |
| `currentIndex` | Zero-based ingredient index. |
| `currentIngredient` | Current line, or `null` when complete. |
| `loaded` | Lbs credited to the current ingredient. |
| `remainingLbs` | `max(0, target − loaded)`, or `0` when complete. |
| `isComplete` | True after the last ingredient advances. |
| `onReading(reading)` | Ordered scale samples. |
| `manualAdvance(confirmedIndex)` | Driver confirmed "Next" for that index. |
| `snapshot()` | Persistence payload. |
| `LoadingSession.restore(...)` | Rebuild after process death. |

Internals that matter when reading the code:

| Field | Role |
| --- | --- |
| `anchorGross` | Gross when the current ingredient started. `null` until the first reading of that ingredient. Restore copies the original anchor so the scale can keep crediting from it. |
| `lastGross` | Most recent reading. Used to re-anchor the next ingredient on advance. **Not snapshotted.** |
| `loadedLbs` | What `loaded` returns. |
| `complete` | Latch; further readings and manual advances are no-ops. |

## Ownership

- **Session owns product rules.** Simulator, demo, and tests must not
  duplicate advance or remaining math.
- **Head is a sink.** `HeadTransport.send` has no return value and no
  back-channel. The session does not wait for the display.
- **Scale is a source.** The session never writes to a scale. `ScaleSimulator`
  exists only for the demo (and as a model of noise). Tests inject readings
  directly.

## Design constraints to preserve

1. Keep weight math a function of gross and anchor. Do not introduce a
   parallel "estimated loaded" path.
2. Keep the session free of timers. Settling is counted in **readings**, not
   wall clock.
3. Keep `HeadTransport` a one-method interface so a React Native screen can
   pass a fake in tests and a BLE/serial adapter in production.
