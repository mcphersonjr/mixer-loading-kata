# Feature: loading session

`LoadingSession` is the whole product in this repo. It tracks one driver
loading one recipe until every ingredient is accepted.

## Construction

```ts
new LoadingSession(recipe, head, options?)
```

- Throws if `recipe.ingredients.length === 0`.
- Options default to `{ stableTicks: 3, settleLbs: 5 }` and are merged with
  the partial the caller passed.
- Initial state: `index = 0`, `anchorGross = null`,
  `loadedLbs = 0`, `complete = false`, `lastGross = null`.
- The head is **not** notified at construct. The first `SET_TARGET` is sent
  on the first scale reading (once the anchor exists and remaining can be
  computed from a real gross).

## Read model

| Getter | Meaning |
| --- | --- |
| `currentIndex` | Index of the ingredient being loaded. After completion it is `ingredients.length` (the increment that tripped complete). |
| `currentIngredient` | `recipe.ingredients[index]`, or `null` if complete. |
| `loaded` | Lbs credited to the **current** ingredient only. Resets to 0 on advance. |
| `remainingLbs` | `max(0, current.targetLbs - loaded)`, or `0` if complete. |
| `isComplete` | Latch. Stays true. |

`remainingLbs` hides overshoot (negative remaining becomes 0). `loaded` itself
is **not** clamped: if gross falls below the anchor, `loaded` can be negative
and remaining can exceed target.

## Lifecycle

```text
construct
  → first onReading: set anchor, SET_TARGET for ingredient 0
  → more readings: update loaded; auto-advance only after settled in-tolerance ticks
  → optional manualAdvance: skip remaining of current line
    (stale confirmations for a previous index are ignored)
  → on advance: next ingredient, re-anchor from lastGross, SET_TARGET
  → advance past last ingredient: complete, RECIPE_COMPLETE
  → further readings / Next taps: no-ops (aside from lastGross updates)
```

A session can also be rebuilt via `restore`; see
[persistence](./persistence.md).

## Completion

The session completes only through `advance()`, which runs when:

- auto-advance decides the current line is done, or
- `manualAdvance` accepts a confirmation.

Completion sets `complete = true`, `anchorGross = null`, and sends
`RECIPE_COMPLETE`. It does not reset `index`; tests assert `currentIngredient`
is `null` via the complete flag, not via index.

## What the session does not do

- It does not start a clock or sample the scale itself.
- It does not persist snapshots; the app would call `snapshot()` and write
  the result somewhere.
- It does not talk to a tablet UI beyond `manualAdvance`.
- It does not handle scale disconnect, out-of-order readings, or the driver
  scooping feed back out of the mixer as first-class events.

Those last items are called out as interview / ship questions in the root
`README.md` and in [spec vs implementation](../spec-vs-implementation.md).
