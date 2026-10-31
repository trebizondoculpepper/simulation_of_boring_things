import { describe, expect, it } from 'vite-plus/test';
import {
  BOX_FACES,
  BOX_SIZES,
  SOFTWARE_TITLES,
  boxSizeOf,
  ean13CheckDigit,
  faceCanvasSize,
  faceSize,
  isValidEan13,
} from './software-boxes';

describe('software boxes', () => {
  it('has eight distinct fictional titles', () => {
    expect(SOFTWARE_TITLES).toHaveLength(8);
    expect(new Set(SOFTWARE_TITLES.map((title) => title.id)).size).toBe(8);
    for (const title of SOFTWARE_TITLES) {
      expect(title.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(title.title + title.publisher).not.toMatch(
        /microsoft|windows|sierra|maxis|electronic arts|interplay|lucasarts|gateway|ibm|intel|eidos/i,
      );
    }
  });

  it('prints no real trademark on any face', () => {
    // Every printed word is in the data, so its whole text is what the boxes say.
    const printed = JSON.stringify(SOFTWARE_TITLES);
    for (const mark of [
      /sierra/i,
      /police\s*quest/i,
      /microsoft/i,
      /windows/i,
      /pentium/i,
      /sound\s*blaster/i,
      /ms-dos/i,
      /\bintel\b/i,
      /\bibm\b/i,
      /maxis/i,
      /sim\s*city/i,
      /theme\s*park/i,
      /bullfrog/i,
      /pc\s*zone\b/i,
    ])
      expect(printed).not.toMatch(mark);
  });

  it('uses valid EAN-13 codes and the standard check digit', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1);
    expect(ean13CheckDigit('978020137962')).toBe(4);
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
    expect(isValidEan13('400638133393')).toBe(false);
    for (const title of SOFTWARE_TITLES)
      expect(isValidEan13(title.barcode)).toBe(true);
  });

  it('maps every title to a measured box and all six face dimensions', () => {
    expect(BOX_FACES).toEqual([
      'right',
      'left',
      'top',
      'bottom',
      'front',
      'back',
    ]);
    for (const title of SOFTWARE_TITLES) {
      const size = boxSizeOf(title);
      expect(size).toBe(BOX_SIZES[title.size]);
      expect(faceSize(size, 'front')).toEqual({ w: size.w, h: size.h });
      expect(faceSize(size, 'back')).toEqual({ w: size.w, h: size.h });
      expect(faceSize(size, 'left')).toEqual({ w: size.d, h: size.h });
      expect(faceSize(size, 'right')).toEqual({ w: size.d, h: size.h });
      expect(faceSize(size, 'top')).toEqual({ w: size.w, h: size.d });
      expect(faceSize(size, 'bottom')).toEqual({ w: size.w, h: size.d });
      for (const face of BOX_FACES) {
        const canvas = faceCanvasSize(size, face);
        expect(canvas.w).toBeGreaterThanOrEqual(16);
        expect(canvas.h).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it('sells Beige Accounting’s box as an accounts package for leisure centres, not a simulator', () => {
    const ledger = SOFTWARE_TITLES.find(
      (title) => title.publisher === 'Beige Accounting',
    )!;
    expect(ledger.title).toBe('Beige Accounting: Leisure Centre Ledger 3.1');
    expect(ledger.kind).toBe('business');
    const text = [ledger.title, ledger.blurb, ...ledger.features].join(' ');
    expect(text).not.toMatch(/simulat/i);
    expect(text).toMatch(/takings/i);
    expect(text).toMatch(/membership/i);
    expect(text).toMatch(/VAT/);
  });

  it('prints complete system requirements on every box', () => {
    for (const title of SOFTWARE_TITLES) {
      expect(title.features.length).toBeGreaterThanOrEqual(3);
      expect(title.screenshots.length).toBeGreaterThanOrEqual(2);
      for (const line of Object.values(title.requirements))
        expect(line.trim().length).toBeGreaterThan(0);
    }
  });
});
