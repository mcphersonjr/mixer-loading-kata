# Feature: auto-advance and settling

When the scale says the current ingredient is close enough to target **and**
the reading has stopped bouncing, the session should advance to the next
line (or complete the recipe) without a driver tap.

This is kata task 3. Options exist on the type and constructor; the session
does **not** yet honor them.

## Options

```ts
interface SessionOptions {
  stableTicks: number;  // consecutive settled, in-tolerance readings required
  settleLbs: number;    // max gross movement between two readings to count as settled
}
```

Defaults: `stableTicks: 3`, `settleLbs: 5`. Tests that want "advance as soon
as a settled in-tolerance reading exists" pass `{ stableTicks: 1 }`.

## Intended behavior

On every reading after the anchor is set:

1. Update `loaded` from the scale (do not use a smoothed weight).
2. Ask: is `loaded >= targetLbs - toleranceLbs`? (`withinTolerance()`)
3. Ask: did `|thisGross − previousGross| <= settleLbs`?
4. If **both** are true, increment a consecutive-settle counter.
5. If either is false, reset that counter to 0.
6. Advance only when the counter reaches `stableTicks`.

The first reading of an ingredient only sets the anchor. It must not count
toward `stableTicks` and must not auto-advance, even if leftover weight
already sits inside the next line's tolerance band.

`previousGross` is the prior reading's gross (including the anchor reading).
A bucket that jumps from 800 to 1790 is in tolerance for silage 1000±20, but
it moved 990 lb, which is not settled.

### Bounce must not advance (task 3, test 1)

Anchor 800. Target 1000 ± 20 ⇒ in band when gross ≥ 1780.

```text
800 → 1790 (in band, moved 990, not settled)
    → 1700 (out of band, counter resets)
    → 1720
    → 1720
```

Stay on index 0. `loaded` is 920 (honest to 1720 − 800).

### Advance after stableTicks settled in-band readings (test 2)

```text
800 → 1790 (in band, big move, not settled)
    → 1792 (in band, moved 2 ≤ 5, count = 1)
    → 1791 (moved 1, count = 2)
    → 1791 (moved 0, count = 3)  → advance
```

After the third settled tick, index is 1.

### Motion restarts the count (test 3)

```text
800 → 1790 (not settled)
    → 1792 (count = 1)
    → 1810 (moved 18 > 5, count = 0)
    → 1812 (count = 1)
    → 1811 (count = 2)
    → 1811 (count = 3)  → advance
```

## Current implementation

`onReading` calls `advance()` on the **first** in-tolerance reading after
the anchor exists. `this.options` is stored and never read. There is no
settle counter.

That is why a bounce through 1790 would skip silage even though the mixer
then settles at 1720, 80 lb short of the 980 lb band.

Existing tests that are not about settling pass `{ stableTicks: 1 }` so that
once settling is implemented they still advance on the first **settled**
in-band reading. They also repeat the in-band gross so the first post-anchor
tick can fail the `settleLbs` check (big jump) and the next tick can pass it
(zero movement).

## Design choices to keep explicit

"Settled" has more than one reasonable reading. This spec uses **consecutive
readings** and **gross-to-gross movement**, because that is what
`stableTicks` / `settleLbs` and the three tests describe.

Questions still worth asking truck operators (from the root README):

- Is 3 ticks at 250 ms (~750 ms) long enough after a bucket slam?
- Should settle also require loaded to stay inside tolerance, or is gross
  movement enough once the last tick is in band? (Tests require both.)
- After restore, the settle counter is not in the snapshot; it would start
  at 0. That is the conservative choice.

## Interaction with manual advance

Manual Next does **not** wait for settle. The driver is allowed to accept a
short load. Auto-advance is the path that must be conservative.
