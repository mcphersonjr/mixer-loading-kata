# Feature: manual advance

The driver can tap **Next** on the tablet, confirm a dialog, and skip the
rest of the current ingredient. The mixer keeps whatever weight is already
on it; the session re-anchors the next line from `lastGross`.

## Intended behavior

```ts
manualAdvance(confirmedIndex: number): void
```

`confirmedIndex` is the ingredient index **the dialog was showing when the
driver confirmed**, not "whatever is current now."

Rules:

1. If the session is already complete, ignore.
2. If `confirmedIndex !== currentIndex`, ignore. The confirmation is stale
   or from the future.
3. Otherwise call the same `advance()` path auto-advance uses: move index,
   clear loaded/carried, re-anchor from `lastGross`, `SET_TARGET` or
   `RECIPE_COMPLETE`.

Stale confirmations are the laggy-tablet case (kata task 1). A driver
double-taps Next. The first tap advances silage → hay. The second tap is
still a confirmation for silage (`confirmedIndex === 0`) and must **not**
advance hay → mineral.

## Current implementation

```ts
manualAdvance(confirmedIndex: number): void {
  if (this.complete) return;
  if (confirmedIndex > this.index) return;
  this.advance();
}
```

Future confirmations (`confirmedIndex > index`) are ignored. **Past**
confirmations (`confirmedIndex < index`) still advance. That is the stale
double-tap bug.

The passing test (`manualAdvance(0)` while still on silage) works. The
failing test calls `manualAdvance(0)` twice and expects to remain on hay
with only two `SET_TARGET` commands (initial silage + hay). Today the second
call skips hay, a third `SET_TARGET` for Mineral is sent, and `currentIndex`
is 2.

## Why the argument exists

If the API were `manualAdvance()` with no index, the session could not tell
a late confirm from a real one. The tablet must stamp the dialog with the
index it showed. That is the contract for any future React Native screen:

1. Show "Done with {currentIngredient.name}?"
2. On confirm, call `session.manualAdvance(indexAtOpen)`.
3. Do not call with `session.currentIndex` at confirm time if that index
   might already have changed (auto-advance racing a slow dialog).

## Other gaps

- No reading since construct or restore ⇒ `lastGross` is `null` ⇒ advance
  sets the next `anchorGross` to `null`. The next `onReading` will take the
  first-reading path, which is acceptable, but remaining/head may be wrong
  until that reading arrives.
- Manual advance while `loaded` is far below target is allowed. That is
  intentional (driver override). There is no "are you sure you are 800 lb
  short?" policy in the session.
- There is no manual **back**. Wrong-ingredient skips are not undoable here.
