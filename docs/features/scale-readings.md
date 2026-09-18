# Feature: scale readings

The mixer scale is the only input that changes credited weight.

## Type

```ts
interface ScaleReading {
  gross: number;  // total lbs currently on the mixer
  at: number;     // ms since the session started
}
```

`gross` is **gross**, not net of the current ingredient. A mixer that already
held 800 lb of leftover feed, then received 400 lb of silage, reads 1200.

## Intended behavior

- Callers feed readings **in time order** via `LoadingSession.onReading`.
- The session treats the stream as authoritative. It does not drop, smooth,
  or replace `gross` when computing `loaded`.
- The first reading of an ingredient **sets the anchor** and credits nothing
  new (`loaded = 0`).
- Later readings set `loaded = gross - anchorGross`.
- Readings after `isComplete` update `lastGross` internally but do not
  change index, loaded, or the head.
- Noise is real. Callers should keep sending readings during vibration and
  bucket bounce; the session decides when the stream is stable enough to
  auto-advance.

## Current implementation

`onReading` in `src/session.ts`:

1. Always stores `lastGross = reading.gross`.
2. Returns immediately if the session is complete.
3. If `anchorGross === null`, sets the anchor, sets `loadedLbs = 0`,
   sends `SET_TARGET`, and returns. No auto-advance on this reading.
4. Otherwise updates `loadedLbs` from `gross − anchor` and auto-advances if
   `withinTolerance()` — **without** waiting for settle (see
   [auto-advance](./auto-advance.md)).

`reading.at` is unused. There is no check that `at` increases, that `gross`
is finite, or that readings were not dropped.

## Test helper

`readings(gross[], startAt = 0)` in `test/helpers.ts` turns a list of gross
values into readings 250 ms apart. The second restore test uses
`readings([1300, 1500], 500)` so timestamps continue after the pre-kill
stream; the session does not care.

## Related

The [scale simulator](./scale-simulator.md) produces these readings with
jitter and bucket bounce for the demo. Production would replace it with a
real scale driver that calls the same `onReading`.
