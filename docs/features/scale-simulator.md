# Feature: scale simulator

`ScaleSimulator` (`src/simulator.ts`) is a deterministic stand-in for a
mixer scale. It is used by the demo, not by unit tests (tests pass literal
gross sequences).

It exists so `npm run demo` can show PTO jitter and bucket bounce without
hardware.

## Construction

```ts
new ScaleSimulator({ initialGross?: number; seed?: number })
```

Defaults: `initialGross = 0`, `seed = 1`. The demo uses `{ initialGross: 850, seed: 7 }`.

## API

### `addFeed(lbs)`

Adds `lbs` to the true gross with no bounce and no sample. Unused by the
demo; `dumpBucket` is the physical dump.

### `read(jitterLbs = 3)`

Advances time by 250 ms and returns one reading:

```text
gross = round(trueGross + uniformNoise(-jitterLbs, +jitterLbs))
at    = t
```

Noise is a seeded mulberry32 PRNG, so the same seed plus the same call
sequence always produces the same stream.

### `dumpBucket(lbs)`

Models a loader bucket landing:

1. Adds `lbs` to the true gross immediately.
2. Returns five readings, 250 ms apart, with bounce fractions
   `[0.18, -0.12, 0.06, -0.02, 0]` applied as `trueGross + lbs * fraction`.

The last sample is the true post-dump gross (fraction 0). Earlier samples
overshoot and dip — the pattern that fools naive auto-advance.

## Time

`t` starts at 0. Each `read` / each bounce sample adds 250 ms. The session
ignores `at`; the timestamps are for demo logs.

## What it is not

- Not a physics model (no damping curve, no PTO RPM).
- Not wired to `LoadingSession`. The demo pulls readings and calls
  `onReading` itself.
- Not a substitute for the executable spec. Settling behavior is defined by
  `test/session.test.ts`, not by this bounce array.
