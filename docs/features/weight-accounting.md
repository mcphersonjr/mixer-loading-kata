# Feature: weight accounting

How the session turns a gross stream into "how much of this ingredient is in
the mixer" and "how much is left."

This is the heart of product rule 1: **the scale is the source of truth**.

## Terms

| Term | Meaning |
| --- | --- |
| Gross | Total pounds on the mixer right now. |
| Anchor (`anchorGross`) | Gross at the start of the current ingredient. |
| Carried (`carriedLbs`) | Pounds already credited to this ingredient in a **previous process** (restore only). |
| Loaded | Pounds of the current ingredient, per the scale. |
| Remaining | Pounds still to dump to hit target, floored at 0. |

Loaded is **not** a running total across the recipe. After advancing from
silage to hay, hay's loaded starts at 0 even though the mixer still holds
all of the silage. That leftover is inside the new anchor.

## Intended formulas

While an ingredient is in progress and an anchor exists:

```text
loaded    = carriedLbs + (gross − anchorGross)
remaining = max(0, targetLbs − loaded)
```

On the **first reading** of an ingredient (`anchorGross` was `null`):

```text
anchorGross = gross
loaded      = carriedLbs    // 0 for a normal start; persisted loaded after restore
```

That first reading does not treat the current gross as newly dumped feed.

On **advance** to the next ingredient:

```text
carriedLbs  = 0
loaded      = 0
anchorGross = lastGross     // whatever is on the mixer right now
```

The next line therefore measures only **new** weight on top of everything
already in the wagon.

## Worked example (from the first unit test)

Recipe line 0: Silage 1000 ± 20. Readings: 800, 800, 1200, 1500.

| Gross | Anchor | Loaded | Remaining |
| --- | --- | --- | --- |
| 800 | 800 (just set) | 0 | 1000 |
| 800 | 800 | 0 | 1000 |
| 1200 | 800 | 400 | 600 |
| 1500 | 800 | 700 | 300 |

The session stays on index 0 because 700 is not yet within 20 lb of 1000.

## Auto-advance example (stableTicks: 1)

Readings: 800, 1785, 1785, 1785. Target 1000 ± 20, so loaded ≥ 980 is in band
(gross ≥ 1780).

After the line is accepted, hay anchors at lastGross (1785) with loaded 0.
That is why the test expects `SET_TARGET` for Hay with `remainingLbs: 500`
even though the mixer already weighs ~1785.

## Current implementation

Matches the formulas above for a live, unrestored session.

Two persistence interactions can break the formula; both are documented in
[persistence](./persistence.md):

1. Restore currently sets **both** `carriedLbs = snapshot.loadedLbs` **and**
   `anchorGross = snapshot.anchorGross`. The next reading then does
   `carried + (gross − oldAnchor)`, which **double-counts**.
2. `lastGross` is not in the snapshot. A restore followed by `manualAdvance`
   with no intervening reading re-anchors the next ingredient at `null`.

## Things the math does not hide

- Vibration: loaded will twitch by a few pounds around the true dump.
- Bucket bounce: loaded can spike through target and fall back.
- Negative dumps: if someone scoops feed out, loaded falls. Remaining can
  go back up. Nothing in the session treats that as an error.

Do not "fix" those by smoothing `loaded`. Gate auto-advance on settle
instead; keep `loaded` honest to the latest gross.
