import { expect, it } from 'vite-plus/test';
import { boardClatter, boardScrape } from './board-impact';

function contacts(speed: number, random: () => number) {
  const recipe = boardClatter(speed, 0.18, random);
  if (!('sequence' in recipe)) throw new Error('Expected a contact sequence');
  return recipe.sequence;
}

it('has two to five contacts, with higher drops tending to clatter more', () => {
  const counts = new Set<number>();
  for (const speed of [0.5, 2, 4, 5.5, 7, 12]) {
    for (const value of [0, 0.25, 0.5, 0.999]) {
      const sequence = contacts(speed, () => value);
      counts.add(sequence.length);
      expect(sequence.length).toBeGreaterThanOrEqual(2);
      expect(sequence.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < sequence.length; i++) {
        expect(sequence[i].click.level).toBeLessThan(
          sequence[i - 1].click.level,
        );
        expect(sequence[i].at).toBeGreaterThan(sequence[i - 1].at);
        expect(sequence[i].click.repeat).toBeUndefined();
        if (i > 1)
          expect(sequence[i].at - sequence[i - 1].at).toBeLessThan(
            sequence[i - 1].at - sequence[i - 2].at,
          );
      }
      expect(sequence.at(-1)!.at).toBeLessThan(0.5);
    }
  }
  expect([...counts].sort((a, b) => a - b)).toEqual([2, 3, 4, 5]);
  expect(contacts(7, () => 0.5).length).toBeGreaterThan(
    contacts(1, () => 0.5).length,
  );
});

it('varies timing and timbre, while keeping secondary contacts audible and the scrape quiet', () => {
  const a = contacts(5.5, () => 0);
  const b = contacts(5.5, () => 0.99);
  expect(a[1].at).not.toBe(b[1].at);
  expect(a[1].click.band).not.toBe(b[1].click.band);
  expect(a[1].click.level).toBeGreaterThan(a[0].click.level * 0.5);
  const scrape = boardScrape(0.65);
  if (!('click' in scrape)) throw new Error('Expected a procedural scrape');
  expect(scrape.click.level).toBeLessThan(a[0].click.level * 0.06);
});

it('gives a large motherboard deeper, longer resonances than a daughterboard', () => {
  const small = boardClatter(5, 0.16, () => 0.5);
  const large = boardClatter(5, 0.48, () => 0.5);
  if (!('sequence' in small) || !('sequence' in large))
    throw new Error('Expected contact sequences');
  expect(large.sequence.length).toBe(small.sequence.length);
  for (let i = 0; i < small.sequence.length; i++) {
    const a = small.sequence[i],
      b = large.sequence[i];
    expect(b.at).toBe(a.at);
    expect(b.click.level).toBe(a.click.level);
    expect(b.click.band).toBeLessThan(a.click.band * 0.5);
    expect(b.click.thump![0]).toBeLessThan(a.click.thump![0] * 0.5);
    expect(b.click.decay).toBeGreaterThan(a.click.decay);
  }
  const smallScrape = boardScrape(0.6, 0.16);
  const largeScrape = boardScrape(0.6, 0.48);
  if (!('click' in smallScrape) || !('click' in largeScrape))
    throw new Error('Expected scrapes');
  expect(largeScrape.click.band).toBeLessThan(smallScrape.click.band);
});
