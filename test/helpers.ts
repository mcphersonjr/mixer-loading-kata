import type { HeadCommand, HeadTransport, Recipe, ScaleReading } from '../src/types';

export const recipe: Recipe = {
  id: 'r1',
  ingredients: [
    { name: 'Silage', targetLbs: 1000, toleranceLbs: 20 },
    { name: 'Hay', targetLbs: 500, toleranceLbs: 10 },
    { name: 'Mineral', targetLbs: 50, toleranceLbs: 2 },
  ],
};

export class FakeHead implements HeadTransport {
  sent: HeadCommand[] = [];
  send(cmd: HeadCommand) {
    this.sent.push(cmd);
  }
  get last(): HeadCommand | undefined {
    return this.sent[this.sent.length - 1];
  }
}

/** Turn a list of gross weights into readings 250 ms apart. */
export function readings(gross: number[], startAt = 0): ScaleReading[] {
  return gross.map((g, i) => ({ gross: g, at: startAt + i * 250 }));
}
