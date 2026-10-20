import { Points, Sprite } from 'three';
import type { BufferGeometry, PointsMaterial, SpriteMaterial } from 'three';

/** Visual effects never participate in picking, even when hidden or transparent. */
export class ParticleSprite extends Sprite {
  constructor(material?: SpriteMaterial) {
    super(material);
    this.userData.noCollision = true;
  }
  override raycast() {}
}

/** Flames, sprays and clouds follow the same non-interactive rule as sprites. */
export class ParticlePoints extends Points {
  constructor(geometry?: BufferGeometry, material?: PointsMaterial) {
    super(geometry, material);
    this.userData.noCollision = true;
  }
  override raycast() {}
}
