# Domain and principles

## The job on the dairy

A feed truck pulls a mixer wagon. A loader operator dumps ingredients into
the mixer **one at a time**, following a recipe: so much corn silage, then so
much hay, then a little mineral mix.

The mixer sits on load cells. The app receives a stream of **gross weight**
readings: the total pounds currently on the mixer, not the pounds of the
current ingredient.

The app has two jobs while that happens:

1. Tell the driver **what to load next** and **how much is left**.
2. Push that target to a small **head display** in the cab so the driver does
   not need to look at the tablet.

A loading session is one recipe, from the first scale reading until every
ingredient has been accepted (automatically or by the driver tapping Next).

## Two product rules

These are non-negotiable. New code that violates them is wrong even if tests
can be made to pass.

### 1. The scale is the source of truth

The session never predicts, smooths, or fudges a weight.

The amount loaded for the current ingredient is always:

```text
loaded = credit already given this process + (current gross − anchor gross)
```

The **anchor** is the gross that was on the mixer when the ingredient
started. A bucket of silage is "loaded" only because the scale went up, not
because the session assumed a dump size.

Consequences:

- Do not estimate remaining from time, dump count, or recipe rate.
- Do not average or filter readings to produce the credited weight. Filtering
  is allowed only as a **gate** on auto-advance (has the scale settled?),
  never as a substitute for the latest gross.
- If the scale later says less is on the mixer, loaded must drop. The session
  does not currently special-case that (see [spec vs implementation](./spec-vs-implementation.md)).

### 2. Real scales are noisy

Two kinds of noise show up in the field:

| Source | What the reading does |
| --- | --- |
| PTO / truck vibration | Small jitter around the true gross even when nothing is being dumped |
| Bucket landing | Overshoot, dip, then settle over about a second |

A single reading inside tolerance is **not** proof the ingredient is done.
Auto-advance must wait until the scale has both reached target (within
tolerance) **and** stopped bouncing. That is the `stableTicks` / `settleLbs`
feature; see [auto-advance](./features/auto-advance.md).

## Units and timing

- All weights are **pounds**.
- Scale readings include `at`, milliseconds since the session started. The
  session currently ignores `at` and treats readings as an ordered stream.
- The demo and test helper space readings 250 ms apart. That interval is a
  convenience, not a session requirement.

## What this codebase is not

This kata is the session core only. There is no UI, no React Native screen,
no real scale driver, and no durable store. The session is a class you would
later wire to those things. The README interview prompts include how you
would do that and keep it testable.
