# Feature: snapshot and restore

The app can be killed mid-load. The session must come back on the same
ingredient with the same credited pounds, then continue crediting from the
scale — not from a second copy of the persisted amount.

Kata task 2 is done for the **same-frame** case: the scale keeps running
across an app restart, so the original ingredient anchor is still valid.
Lost-zero / re-anchor is a later product discussion; see
[the restore plan](../plans/restore-lastgross-frame-check.md).

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
include `lastGross`, settle-counter state, or options.

## Restore API

```ts
LoadingSession.restore(snapshot, recipe, head, options?)
```

- Throws `snapshot does not belong to this recipe` if ids differ.
- Constructs a new session (so empty-recipe validation still runs).
- Copies `index`, `anchorGross`, `loadedLbs`, `complete`.

`loadedLbs` is only a UI stand-in until the next scale tick. After that,
loaded is again `gross − restoredAnchor`. Restore does **not** add persisted
loaded on top of that delta.

## Same-frame restore (implemented)

The scale never stops, so the original ingredient start is still the
baseline.

```text
live:     readings 800, 1300     → loaded 500, index 0, anchor 800
restore:  snapshot
then:     readings 1300, 1500    → loaded 700 (1500 − 800), still index 0
```

A dump that happened while the app was dead is credited too: first reading
`1600` after that snapshot is loaded `800`.

Until the first post-restore tick, `loaded` still returns the snapshotted
500 so the tablet does not flash 0.

There is no `carriedLbs`. That field only made sense for re-anchoring a new
process (`persisted loaded + (gross − newAnchor)`). Combining it with the
old anchor was the double-count bug:

```text
loaded = 500 + (1300 − 800) = 1000   // same 500 twice, then auto-advance
```

## What restore does not restore

| State | Effect |
| --- | --- |
| `lastGross` | Starts null. Manual advance before a reading anchors the next line at null. See the [restore plan](../plans/restore-lastgross-frame-check.md). |
| Settle counter | Would start at 0 (once implemented). Conservative. |
| Options | Caller must pass them again; they are not in the snapshot. |
| Head | No command sent at restore time. |
| Lost scale zero | If the scale re-tared while both were down, the old anchor is in the wrong frame. Not handled yet. |

## App-level contract

Whoever wires this to a real app should:

1. Persist `snapshot()` often (after readings and after advances).
2. Persist the recipe (or a recipe id that still resolves to the same
   ingredient list). Changing targets under a snapshot is undefined.
3. Call `restore`, then keep pumping the live scale into `onReading`.
4. Refresh the head explicitly after restore (the session currently may not).
