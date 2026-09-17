/** One line of a feed recipe. All weights are in pounds. */
export interface Ingredient {
  name: string;
  /** How much of this ingredient the driver should load. */
  targetLbs: number;
  /** Loading within this many lbs of target counts as done. */
  toleranceLbs: number;
}

export interface Recipe {
  id: string;
  ingredients: Ingredient[];
}

/** A single gross-weight sample from the mixer scale. */
export interface ScaleReading {
  /** Total weight currently on the mixer, in lbs. */
  gross: number;
  /** Milliseconds since the session started. */
  at: number;
}

/**
 * Commands the app sends to the in-cab head display so the driver can see
 * what to load without looking at the tablet.
 */
export type HeadCommand =
  | { kind: 'SET_TARGET'; ingredient: string; remainingLbs: number }
  | { kind: 'RECIPE_COMPLETE' };

export interface HeadTransport {
  send(cmd: HeadCommand): void;
}

/** Everything needed to rebuild a session after the app is killed. */
export interface SessionSnapshot {
  recipeId: string;
  index: number;
  anchorGross: number | null;
  loadedLbs: number;
  complete: boolean;
}

export interface SessionOptions {
  /**
   * Number of consecutive readings that must stay settled and within
   * tolerance before the session auto-advances. See README, task 3.
   */
  stableTicks: number;
  /** Max lbs the gross may move between two readings and still count as settled. */
  settleLbs: number;
}
