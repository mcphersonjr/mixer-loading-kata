import type { ScaleReading } from './types';

/**
 * A crude stand-in for a real mixer scale. It is deterministic (seeded) so
 * runs are repeatable.
 *
 * Real scales are noisy: the truck's PTO shakes the mixer even when nothing
 * is being loaded, and a bucket dumped from a loader makes the reading bounce
 * for a second or two before it settles.
 */
export class ScaleSimulator {
  private gross: number;
  private t = 0;
  private seed: number;

  constructor(opts: { initialGross?: number; seed?: number } = {}) {
    this.gross = opts.initialGross ?? 0;
    this.seed = opts.seed ?? 1;
  }

  /** Physically add feed to the mixer. */
  addFeed(lbs: number): void {
    this.gross += lbs;
  }

  /** Next sample, with +-jitter lbs of vibration noise. */
  read(jitterLbs = 3): ScaleReading {
    this.t += 250;
    const noise = (this.random() * 2 - 1) * jitterLbs;
    return { gross: Math.round(this.gross + noise), at: this.t };
  }

  /**
   * A bucket landing in the mixer: the reading overshoots, dips, then settles
   * on the true weight.
   */
  dumpBucket(lbs: number): ScaleReading[] {
    this.gross += lbs;
    const bounce = [0.18, -0.12, 0.06, -0.02, 0];
    return bounce.map((f) => {
      this.t += 250;
      return { gross: Math.round(this.gross + lbs * f), at: this.t };
    });
  }

  private random(): number {
    // mulberry32
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let x = this.seed;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
}
