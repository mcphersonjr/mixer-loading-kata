import { LoadingSession } from './session';
import { ScaleSimulator } from './simulator';
import type { HeadCommand, Recipe } from './types';

/** Run `npm run demo` to watch a recipe load with a noisy scale. */
const recipe: Recipe = {
  id: 'pen-12-lactating',
  ingredients: [
    { name: 'Corn silage', targetLbs: 4000, toleranceLbs: 50 },
    { name: 'Alfalfa hay', targetLbs: 1500, toleranceLbs: 30 },
    { name: 'Mineral mix', targetLbs: 120, toleranceLbs: 5 },
  ],
};

const head = {
  send(cmd: HeadCommand) {
    console.log(`  head <- ${JSON.stringify(cmd)}`);
  },
};

const scale = new ScaleSimulator({ initialGross: 850, seed: 7 });
const session = new LoadingSession(recipe, head);

function feed(reading: { gross: number; at: number }) {
  session.onReading(reading);
  const ing = session.currentIngredient;
  console.log(
    `t=${String(reading.at).padStart(6)}ms gross=${String(reading.gross).padStart(5)}` +
      (ing
        ? `  ${ing.name.padEnd(12)} loaded=${String(session.loaded).padStart(5)} remaining=${session.remainingLbs}`
        : '  COMPLETE'),
  );
}

// Idle on the scale for a moment.
for (let i = 0; i < 3; i++) feed(scale.read(2));

// Loader dumps buckets until the head says we are done.
const bucketLbs = [1200, 1200, 1200, 400, 700, 800, 120];
for (const lbs of bucketLbs) {
  if (session.isComplete) break;
  console.log(`--- loader dumps ${lbs} lb bucket`);
  for (const r of scale.dumpBucket(lbs)) feed(r);
  for (let i = 0; i < 4; i++) feed(scale.read(2));
}

if (!session.isComplete) {
  console.log(`\nRan out of buckets on ${session.currentIngredient?.name} with ${session.remainingLbs} lb remaining.`);
}
