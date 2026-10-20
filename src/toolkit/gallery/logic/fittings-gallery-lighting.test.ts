import { describe, expect, it } from 'vite-plus/test';
import { checkEmergencyLighting } from '../../components/general-safety/logic/emergency-lighting';
import {
  GALLERY_EMERGENCY,
  GALLERY_EMPHASIS,
  GALLERY_FLOOR,
} from './fittings-gallery-lighting';

describe("dev18's emergency lighting", () => {
  it('meets BS 5266-1: the open area, and a light by every way out', () => {
    const check = checkEmergencyLighting(
      GALLERY_EMERGENCY,
      GALLERY_FLOOR,
      GALLERY_EMPHASIS,
    );
    expect(check.problems).toEqual([]);
  });
});
