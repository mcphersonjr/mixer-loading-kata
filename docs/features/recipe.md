# Feature: recipe and ingredients

A recipe is the ordered list of things to dump into the mixer for one load.

## Types

Defined in `src/types.ts`.

```ts
interface Ingredient {
  name: string;
  targetLbs: number;      // how much the driver should load
  toleranceLbs: number;   // within this many lbs of target counts as done
}

interface Recipe {
  id: string;
  ingredients: Ingredient[];
}
```

All weights are pounds. `Recipe.id` is the persistence key: a snapshot may
only be restored onto a recipe with the same id.

## Intended behavior

- Ingredients load **in array order**. The session index is the position in
  `recipe.ingredients`.
- `targetLbs` is the desired dump for that line, not a running total. Each
  line is independently anchored (see [weight accounting](./weight-accounting.md)).
- `toleranceLbs` is a band **below** target that still counts as done:
  `loaded >= targetLbs - toleranceLbs`. There is no documented upper band;
  overshoot is accepted as done as soon as the lower bound is met and (once
  implemented) the scale has settled.
- An empty `ingredients` array is invalid. The constructor throws
  `recipe has no ingredients`.
- The session does not mutate the recipe.

## Current implementation

Matches the intended behavior above. The constructor is the only validation.
There is no check that `targetLbs` / `toleranceLbs` are positive, that names
are unique, or that `toleranceLbs <= targetLbs`.

## Fixtures

| Source | Recipe |
| --- | --- |
| `test/helpers.ts` | `r1`: Silage 1000±20, Hay 500±10, Mineral 50±2 |
| `src/demo.ts` | `pen-12-lactating`: Corn silage 4000±50, Alfalfa hay 1500±30, Mineral mix 120±5 |

## Edge cases not specified

- Duplicate ingredient names (head commands would be ambiguous to a human,
  not to the session, which keys off index).
- `toleranceLbs` larger than `targetLbs` (first non-zero settled reading
  could auto-advance).
- Changing the recipe object after construct / mid-restore.
