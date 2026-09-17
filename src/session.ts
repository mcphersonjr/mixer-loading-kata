import type {
  HeadTransport,
  Ingredient,
  Recipe,
  ScaleReading,
  SessionOptions,
  SessionSnapshot,
} from './types';

const DEFAULT_OPTIONS: SessionOptions = { stableTicks: 3, settleLbs: 5 };

/**
 * Tracks a driver loading one recipe into a mixer.
 *
 * The scale is the source of truth. The session never predicts or fudges a
 * weight: the amount loaded for the current ingredient is always derived from
 * the gross reading and the gross that was on the mixer when the ingredient
 * started (the "anchor").
 */
export class LoadingSession {
  private index = 0;
  private anchorGross: number | null = null;
  private lastGross: number | null = null;
  /** Lbs credited to the current ingredient before this process started. */
  private carriedLbs = 0;
  private loadedLbs = 0;
  private complete = false;
  private readonly options: SessionOptions;

  constructor(
    private readonly recipe: Recipe,
    private readonly head: HeadTransport,
    options: Partial<SessionOptions> = {},
  ) {
    if (recipe.ingredients.length === 0) {
      throw new Error('recipe has no ingredients');
    }
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ---------------------------------------------------------------- reads

  get currentIndex(): number {
    return this.index;
  }

  get currentIngredient(): Ingredient | null {
    return this.complete ? null : this.recipe.ingredients[this.index];
  }

  /** Lbs loaded so far for the current ingredient, per the scale. */
  get loaded(): number {
    return this.loadedLbs;
  }

  get isComplete(): boolean {
    return this.complete;
  }

  get remainingLbs(): number {
    const ing = this.currentIngredient;
    return ing ? Math.max(0, ing.targetLbs - this.loadedLbs) : 0;
  }

  // -------------------------------------------------------------- inputs

  /** Feed every reading from the scale here, in order. */
  onReading(reading: ScaleReading): void {
    this.lastGross = reading.gross;
    if (this.complete) return;

    if (this.anchorGross === null) {
      // First reading of the ingredient: whatever is on the mixer now is the
      // baseline. Nothing has been loaded yet.
      this.anchorGross = reading.gross;
      this.loadedLbs = this.carriedLbs;
      this.sendTarget();
      return;
    }

    this.loadedLbs = this.carriedLbs + (reading.gross - this.anchorGross);

    if (this.withinTolerance()) {
      this.advance();
    }
  }

  /**
   * The driver tapped "Next" on the tablet and confirmed the dialog.
   * `confirmedIndex` is the ingredient the dialog was showing when they
   * confirmed. A confirmation for an ingredient that is no longer current
   * must be ignored.
   */
  manualAdvance(confirmedIndex: number): void {
    if (this.complete) return;
    if (confirmedIndex > this.index) return;
    this.advance();
  }

  // ---------------------------------------------------------- persistence

  snapshot(): SessionSnapshot {
    return {
      recipeId: this.recipe.id,
      index: this.index,
      anchorGross: this.anchorGross,
      loadedLbs: this.loadedLbs,
      complete: this.complete,
    };
  }

  /** Rebuild a session after the app was killed mid-load. */
  static restore(
    snapshot: SessionSnapshot,
    recipe: Recipe,
    head: HeadTransport,
    options: Partial<SessionOptions> = {},
  ): LoadingSession {
    if (snapshot.recipeId !== recipe.id) {
      throw new Error('snapshot does not belong to this recipe');
    }
    const session = new LoadingSession(recipe, head, options);
    session.index = snapshot.index;
    session.anchorGross = snapshot.anchorGross;
    session.carriedLbs = snapshot.loadedLbs;
    session.loadedLbs = snapshot.loadedLbs;
    session.complete = snapshot.complete;
    return session;
  }

  // ------------------------------------------------------------- internals

  private withinTolerance(): boolean {
    const ing = this.currentIngredient;
    if (!ing) return false;
    return this.loadedLbs >= ing.targetLbs - ing.toleranceLbs;
  }

  private advance(): void {
    this.index += 1;
    this.carriedLbs = 0;
    this.loadedLbs = 0;

    if (this.index >= this.recipe.ingredients.length) {
      this.complete = true;
      this.anchorGross = null;
      this.head.send({ kind: 'RECIPE_COMPLETE' });
      return;
    }

    // The next ingredient starts from whatever is on the mixer right now.
    this.anchorGross = this.lastGross;
    this.sendTarget();
  }

  private sendTarget(): void {
    const ing = this.currentIngredient;
    if (!ing) return;
    this.head.send({
      kind: 'SET_TARGET',
      ingredient: ing.name,
      remainingLbs: this.remainingLbs,
    });
  }
}
