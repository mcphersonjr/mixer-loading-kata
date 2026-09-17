# Feature: head display

The head is a small display in the cab. The session pushes targets to it so
the driver can load without looking at the tablet.

## Types

```ts
type HeadCommand =
  | { kind: 'SET_TARGET'; ingredient: string; remainingLbs: number }
  | { kind: 'RECIPE_COMPLETE' };

interface HeadTransport {
  send(cmd: HeadCommand): void;
}
```

The session depends only on `HeadTransport`. Production would wrap whatever
radio, serial, or BLE link talks to the hardware. Tests use `FakeHead`, which
records `sent` and exposes `last`.

## Intended behavior

- When an ingredient becomes current and the session has an anchor (so
  remaining is meaningful), send `SET_TARGET` with that ingredient's `name`
  and `remainingLbs`.
- When the recipe is finished, send `RECIPE_COMPLETE`.
- The head is a one-way sink. The session does not read back display state
  and does not retry.

The root README says the app tells the driver how much is left **and** pushes
that target to the head. A natural reading is that remaining on the head
should track remaining as the scale moves. The current session does **not**
do that (see below).

## Current implementation

`sendTarget()` runs from:

1. The first reading that sets an ingredient's anchor.
2. `advance()`, when moving to a **non-final** ingredient.

It does **not** run on every later reading. During a dump, the tablet-facing
getters (`loaded`, `remainingLbs`) update, but the head keeps the remaining
value from the start of the ingredient (target, or target minus carried after
a correct restore).

On completion, `advance()` sends `RECIPE_COMPLETE` and does not send a
trailing `SET_TARGET`.

Construct and `restore` do not send anything. After restore, the head stays
blank until the next `onReading` that takes the first-reading path, or until
an advance. With the current restore bug the first-reading path usually does
not run (anchor is already set), so a restored session may never refresh the
head until the ingredient auto-advances or the driver taps Next.

## Commands observed in tests

First silage reading at gross 800, target 1000:

```json
{ "kind": "SET_TARGET", "ingredient": "Silage", "remainingLbs": 1000 }
```

After auto-advance onto hay:

```json
{ "kind": "SET_TARGET", "ingredient": "Hay", "remainingLbs": 500 }
```

After the last ingredient:

```json
{ "kind": "RECIPE_COMPLETE" }
```

## Implementation notes for a future UI

- Treat `HeadTransport` as fire-and-forget; do not block `onReading` on I/O.
- If live remaining on the head is required, send `SET_TARGET` when
  `remainingLbs` changes, and decide whether vibration jitter should be
  debounced **only for the display**, never for credited `loaded`.
- After restore, send a `SET_TARGET` (or `RECIPE_COMPLETE`) immediately so
  the cab matches the rebuilt session even before the next scale tick.
