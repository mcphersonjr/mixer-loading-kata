import { LoadingSession } from '../src/session';
import { FakeHead, readings, recipe } from './helpers';

describe('LoadingSession', () => {
  it('credits the first ingredient from the gross delta off the anchor', () => {
    const head = new FakeHead();
    const s = new LoadingSession(recipe, head);
    for (const r of readings([800, 800, 1200, 1500])) s.onReading(r);

    expect(s.currentIndex).toBe(0);
    expect(s.loaded).toBe(700);
    expect(s.remainingLbs).toBe(300);
    expect(head.sent[0]).toEqual({ kind: 'SET_TARGET', ingredient: 'Silage', remainingLbs: 1000 });
  });

  it('auto-advances once the ingredient is within tolerance and re-anchors', () => {
    const head = new FakeHead();
    const s = new LoadingSession(recipe, head, { stableTicks: 1 });
    for (const r of readings([800, 1785, 1785, 1785])) s.onReading(r);

    expect(s.currentIndex).toBe(1);
    expect(s.loaded).toBe(0);
    expect(head.last).toEqual({ kind: 'SET_TARGET', ingredient: 'Hay', remainingLbs: 500 });
  });

  it('completes the recipe and tells the head', () => {
    const head = new FakeHead();
    const s = new LoadingSession(recipe, head, { stableTicks: 1 });
    for (const r of readings([0, 1000, 1000, 1500, 1500, 1550, 1550])) s.onReading(r);

    expect(s.isComplete).toBe(true);
    expect(s.currentIngredient).toBeNull();
    expect(head.last).toEqual({ kind: 'RECIPE_COMPLETE' });
  });

  describe('manual advance', () => {
    it('advances when the driver confirms the current ingredient', () => {
      const head = new FakeHead();
      const s = new LoadingSession(recipe, head);
      for (const r of readings([800, 1000])) s.onReading(r);

      s.manualAdvance(0);

      expect(s.currentIndex).toBe(1);
      expect(head.last).toEqual({ kind: 'SET_TARGET', ingredient: 'Hay', remainingLbs: 500 });
    });

    // Task 1. Field report: a driver double-taps "Next" on a laggy tablet. The
    // first tap closes the confirm dialog and advances; the second tap lands
    // on the (already stale) dialog and advances AGAIN, skipping Hay entirely.
    it('ignores a stale confirmation for an ingredient that is no longer current', () => {
      const head = new FakeHead();
      const s = new LoadingSession(recipe, head);
      for (const r of readings([800, 1000])) s.onReading(r);

      s.manualAdvance(0);
      s.manualAdvance(0); // stale tap

      expect(s.currentIndex).toBe(1);
      expect(head.sent.filter((c) => c.kind === 'SET_TARGET')).toHaveLength(2);
    });
  });

  describe('kill and restore', () => {
    it('picks up where it left off without changing what was loaded', () => {
      const head = new FakeHead();
      const s = new LoadingSession(recipe, head);
      for (const r of readings([800, 1300])) s.onReading(r);
      expect(s.loaded).toBe(500);

      const restored = LoadingSession.restore(s.snapshot(), recipe, new FakeHead());
      expect(restored.currentIndex).toBe(0);
      expect(restored.loaded).toBe(500);
    });

    // Task 2. Field report: after the app restarts mid-ingredient, the loaded
    // amount jumps and the head shows the driver is done when they are not.
    it('keeps crediting from the scale after restore, not from the persisted amount', () => {
      const head = new FakeHead();
      const s = new LoadingSession(recipe, head);
      for (const r of readings([800, 1300])) s.onReading(r);

      const restored = LoadingSession.restore(s.snapshot(), recipe, new FakeHead());
      for (const r of readings([1300, 1500], 500)) restored.onReading(r);

      expect(restored.loaded).toBe(700);
      expect(restored.currentIndex).toBe(0);
    });
  });

  // Task 3. Auto-advance must wait for the scale to settle. A bucket landing
  // in the mixer bounces the reading through tolerance for a tick before it
  // settles well short of target. Today that bounce advances the ingredient.
  describe('settling before auto-advance', () => {
    it('does not auto-advance on a single bounce through tolerance', () => {
      const head = new FakeHead();
      const s = new LoadingSession(recipe, head, { stableTicks: 3, settleLbs: 5 });
      // Anchor at 800. Target 1000 +-20, so gross 1780 is in tolerance.
      // Bucket lands: 1790 (bounce), 1700, 1720, 1720.
      for (const r of readings([800, 1790, 1700, 1720, 1720])) s.onReading(r);

      expect(s.currentIndex).toBe(0);
      expect(s.loaded).toBe(920);
    });

    it('auto-advances after stableTicks settled readings within tolerance', () => {
      const head = new FakeHead();
      const s = new LoadingSession(recipe, head, { stableTicks: 3, settleLbs: 5 });
      for (const r of readings([800, 1790, 1792, 1791])) s.onReading(r);
      expect(s.currentIndex).toBe(0);

      s.onReading({ gross: 1791, at: 1000 });
      expect(s.currentIndex).toBe(1);
    });

    it('restarts the settle count when the gross moves', () => {
      const head = new FakeHead();
      const s = new LoadingSession(recipe, head, { stableTicks: 3, settleLbs: 5 });
      for (const r of readings([800, 1790, 1792, 1810, 1812, 1811])) s.onReading(r);
      expect(s.currentIndex).toBe(0);

      s.onReading({ gross: 1811, at: 1500 });
      expect(s.currentIndex).toBe(1);
    });
  });
});
