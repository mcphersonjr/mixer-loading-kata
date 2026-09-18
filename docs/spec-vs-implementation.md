# Spec vs implementation

A punch list of where the running code disagrees with the intended product,
plus gaps the kata asks you to notice even though they are not failing tests.

Intended behavior is defined by the root `README.md`, comments on
`SessionOptions` / `manualAdvance`, and `test/session.test.ts`.

## Kata tasks

### 1. Stale manual advance — done

Ignore `manualAdvance(confirmedIndex)` unless that index is still current
(`confirmedIndex !== this.index`). A laggy double-tap no longer skips the
next ingredient. See [manual advance](./features/manual-advance.md).

### 2. Restore double-counts — done (same-frame)

Restore keeps the original `anchorGross` and does **not** add persisted
`loadedLbs` into the next delta. After `800, 1300` then restore then
`1300, 1500`, loaded is `700` (`1500 − 800`). There is no `carriedLbs`;
that field only belonged to a re-anchor-on-restart model.

Lost scale zero and persisting `lastGross` are still open; see
[the restore plan](./plans/restore-lastgross-frame-check.md) and
[persistence](./features/persistence.md).

### 3. Settle before auto-advance — done

Advance only after `stableTicks` consecutive readings that are each in
tolerance **and** moved at most `settleLbs` from the previous gross. Reset
the count when either condition fails. The anchor reading itself does not
count. See [auto-advance](./features/auto-advance.md).

## Working today (keep these green)

- First-ingredient credit is `gross − anchor`.
- Auto-advance waits for `stableTicks` settled, in-tolerance readings.
- Completing the last ingredient sends `RECIPE_COMPLETE` and clears
  `currentIngredient`.
- Fresh `manualAdvance` of the **current** index advances.
- Stale `manualAdvance` for a previous index is ignored.
- Restore without further readings preserves index and loaded.
- After restore, further readings are `gross − originalAnchor` (no double-count).
- Empty recipe throws. Snapshot / recipe id mismatch throws.

## Gaps that are not tests (would not ship as-is)

These are fair `NOTES.md` material and interview discussion points.

| Gap | Why it matters |
| --- | --- |
| Head remaining is not live | `SET_TARGET` is sent at ingredient start/advance only. Cab can show the full target while the tablet already shows a smaller remaining. |
| No head refresh on restore | Cab can be blank or stale until the next send. |
| `lastGross` not snapshotted | Manual Next immediately after restore re-anchors at `null`. |
| Settle state not snapshotted | Acceptable (restart the count), but should be a conscious choice. |
| Options not snapshotted | Restore can silently change settle policy. |
| `reading.at` unused | Disconnects, stalls, and out-of-order ticks cannot be detected. |
| Scale disconnect | Mid-ingredient dropouts are not a session event. Loaded holds last value; auto-advance cannot settle. |
| Negative dumps | Scooping feed out lowers loaded; no alert, no clamp policy. |
| Overshoot | `remainingLbs` floors at 0; loaded can exceed target; no "stop, you overshot" command to the head. |
| No validation of weights | Negative targets, NaN gross, huge jitter all accepted. |
| Head send is synchronous and unretried | A real transport will fail; the session will not know. |

## Wiring this into a UI later

The README asks how you would put this on a React Native screen and keep it
testable. Constraints that follow from the current design:

1. Keep `LoadingSession` free of React. The screen owns the instance,
   subscribes to a scale callback, and calls `onReading` / `manualAdvance`.
2. Render from the getters after each input. Do not keep a second copy of
   remaining in component state.
3. Stamp the Next dialog with `currentIndex` at open time; pass that stamp
   into `manualAdvance`.
4. Persist `snapshot()` on a debounce after readings, and immediately after
   advance / complete.
5. Fake `HeadTransport` in screen tests; do not require the simulator.

## When you change behavior

1. Update the matching file under `docs/features/`.
2. Move the item out of "kata tasks" or "gaps" in this file if you fixed it.
3. Prefer a test in `test/session.test.ts` over a demo-only check.
