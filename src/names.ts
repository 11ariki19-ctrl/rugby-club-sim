import { SURNAMES, GIVEN } from './data';

/** Create a unique full Japanese name from the national top-300 surname pool. */
export function generateUniqueJapaneseName(usedNames: Set<string>, random: () => number = Math.random): string {
  const choose = <T,>(items: readonly T[]): T => items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
  for (let attempt = 0; attempt < 1200; attempt++) {
    const name = `${choose(SURNAMES)} ${choose(GIVEN)}`;
    if (!usedNames.has(name)) { usedNames.add(name); return name; }
  }
  for (const surname of SURNAMES) {
    for (const given of GIVEN) {
      const name = `${surname} ${given}`;
      if (!usedNames.has(name)) { usedNames.add(name); return name; }
    }
  }
  for (const surname of SURNAMES) {
    for (const first of GIVEN) {
      for (const second of GIVEN) {
        const name = `${surname} ${first}${second}`;
        if (!usedNames.has(name)) { usedNames.add(name); return name; }
      }
    }
  }
  throw new Error('一意な選手名を生成できませんでした');
}
