# Spec vs implementation

A punch list of where the running code disagrees with the intended product,
plus gaps the kata asks you to notice even though they are not failing tests.

Intended behavior is defined by the root `README.md`, comments on
`SessionOptions` / `manualAdvance` / `carriedLbs`, and `test/session.test.ts`.

## Kata tasks (tests fail on purpose)

### 1. Stale manual advance

- **Spec:** Ignore `manualAdvance(confirmedIndex)` unless that index is still
  the current ingredient.
- **Code:** Only ignores `confirmedIndex > index`. A late confirm for a
  **previous** index still calls `advance()`.
- **Fix shape:** `if (confirmedIndex !== this.index) return;` (and keep the
  complete guard).
- **Doc:** [manual advance](./features/manual-advance.md)

### 2. Restore double-counts

- **Spec:** After restore, keep crediting from the scale. Persisted loaded
  is a starting credit, not something to add on top of the old
  `gross − anchor` delta.
- **Code:** Restore sets `carriedLbs = snapshot.loadedLbs` **and** restores
  the old `anchorGross`. The next reading computes
  `carried + (gross − oldAnchor)`.
- **Fix shape (matches `carriedLbs` comments):** do not keep the old live
  anchor after restore (`anchorGross = null`) so the first new reading
  re-anchors and `loaded` stays at the carried amount.
- **Doc:** [persistence](./features/persistence.md)

### 3. Settle before auto-advance

- **Spec:** Advance only after `stableTicks` consecutive readings that are
  each in tolerance **and** moved at most `settleLbs` from the previous
  gross. Reset the count when either condition fails. Do not advance on the
  anchor reading itself.
- **Code:** `advance()` on the first in-tolerance reading. Options are
  merged and ignored.
- **Doc:** [auto-advance](./features/auto-advance.md)

## Working today (keep these green)

- First-ingredient credit is `gross − anchor`.
- Auto-advance (without settling) re-anchors the next ingredient from
  `lastGross` and sends `SET_TARGET`.
- Completing the last ingredient sends `RECIPE_COMPLETE` and clears
  `currentIngredient`.
- Fresh `manualAdvance` of the **current** index advances.
- Restore without further readings preserves index and loaded.
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
| Demo uses default settle options against unimplemented settle | Demo can still skip on bounce until task 3 is done. |

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
