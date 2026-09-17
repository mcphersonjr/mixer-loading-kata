# Feature: snapshot and restore

The app can be killed mid-load. The session must come back on the same
ingredient with the same credited pounds, then continue crediting from the
scale — not from a second copy of the persisted amount.

This is kata task 2.

## Snapshot payload

```ts
interface SessionSnapshot {
  recipeId: string;
  index: number;
  anchorGross: number | null;
  loadedLbs: number;
  complete: boolean;
}
```

`snapshot()` copies those five fields from the live session. It does **not**
include `lastGross`, `carriedLbs`, settle-counter state, or options.

## Restore API

```ts
LoadingSession.restore(snapshot, recipe, head, options?)
```

- Throws `snapshot does not belong to this recipe` if ids differ.
- Constructs a new session (so empty-recipe validation still runs).
- Copies `index`, `loadedLbs`, `complete`.
- Sets `carriedLbs = snapshot.loadedLbs`.

`carriedLbs` is documented on the field as "lbs credited to the current
ingredient **before this process started**." Restore is the only place a
non-zero value is assigned. Advance zeros it.

## Intended behavior (from tests)

**Immediately after restore**, without new readings:

- `currentIndex` and `loaded` match the snapshot.
- The driver still sees 500 lb of silage if 500 lb had been credited.

**After restore, as the scale keeps talking**, loaded must follow the scale
from that point, **not** add persisted loaded on top of the original
anchor delta.

Field report: after restart mid-ingredient, loaded jumps and the head can
show "done" when the mixer is not.

The failing test:

```text
live:     readings 800, 1300     → loaded 500, index 0, anchor 800
restore:  snapshot
then:     readings 1300, 1500    → loaded must be 700, still index 0
```

700 is `1500 − 800`, i.e. the true silage on the mixer. It is also
`500 + (1500 − 1300)` if the new process re-anchors at the first post-restore
reading of 1300 and then adds the extra 200 lb.

Both of these implementations satisfy the test:

| Approach | How |
| --- | --- |
| A. Keep original anchor, zero carried | `loaded = 0 + (gross − 800)` |
| B. Drop live anchor, keep carried | First reading sets a new anchor; `loaded = 500 + (gross − newAnchor)` |

The `carriedLbs` field and its comment exist for **B**. Approach **A** makes
`carriedLbs` unnecessary. The snapshot still stores `anchorGross` because
the live session has it; **B** should not install that old anchor as the
live baseline, or the first-reading re-anchor path never runs.

Recommended reading of the code: **B**. On restore, set `carriedLbs` from
`loadedLbs` and leave `anchorGross` null so the next `onReading` does:

```text
anchorGross = reading.gross
loadedLbs   = carriedLbs     // unchanged credited amount
sendTarget()
```

Later readings: `loadedLbs = carriedLbs + (gross − newAnchor)`.

## Current bug (double-count)

Restore copies **both** `anchorGross = 800` and `carriedLbs = 500`.

The next reading of 1300 skips the first-reading branch (`anchorGross` is
not null) and computes:

```text
loaded = 500 + (1300 − 800) = 1000
```

Silage target is 1000 ± 20, so the session can auto-advance immediately even
though only 500 lb of silage is actually in the mixer. The following 1500
reading is then applied to **hay**. That is the field report.

## What restore does not restore

| State | Effect |
| --- | --- |
| `lastGross` | Starts null. Manual advance before a reading anchors the next line at null. |
| Settle counter | Would start at 0 (once implemented). Conservative. |
| Options | Caller must pass them again; they are not in the snapshot. |
| Head | No command sent at restore time. |

## App-level contract

Whoever wires this to a real app should:

1. Persist `snapshot()` often (after readings and after advances).
2. Persist the recipe (or a recipe id that still resolves to the same
   ingredient list). Changing targets under a snapshot is undefined.
3. Call `restore`, then keep pumping the live scale into `onReading`.
4. Refresh the head explicitly after restore (the session currently may not).
