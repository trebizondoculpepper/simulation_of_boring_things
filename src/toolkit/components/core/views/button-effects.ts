import { ParticleSprite } from './particles';
import { AdditiveBlending, Group, PointLight, SpriteMaterial } from 'three';
import type { PanelKit } from './eighties-controls';
import { createCanvasTexture } from './screens';

/**
 * What an illuminated push button gives off, for the button gallery
 * (dev11): the glow of a lit lens, the faint motes of power rising off a
 * new one, and the little spark of a damaged one shorting out. Each is a
 * group to add to the button's object, its lens facing +z: the lens of an
 * XB4-style button (`createPushButton`) is 12 mm in radius, its face 10.5
 * mm in front of the button's origin.
 */
const LENS_RADIUS = 0.0117;
const LENS_FACE = 0.0105;

/** A soft round spot of light, white, for sprites to tint. */
function spot(kit: PanelKit) {
  const { context, texture } = createCanvasTexture(32, 32);
  const g = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = g;
  context.fillRect(0, 0, 32, 32);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  return texture;
}

function glowing(kit: PanelKit, map: ReturnType<typeof spot>, colour: string) {
  const material = new SpriteMaterial({
    map,
    color: colour,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    opacity: 0,
  });
  kit.materials.push(material);
  const sprite = new ParticleSprite(material);
  return sprite;
}

/**
 * A lit lens gleaming: a red halo round it and a little red light it casts
 * on the box. `set(level)`, 0 to 1, follows its lamp. `metre` is the
 * room's scale, for the light.
 */
export function createLampGlow(kit: PanelKit, metre: number) {
  const group = new Group();
  const map = spot(kit);
  const halo = glowing(kit, map, '#ff4a32');
  halo.position.z = LENS_FACE + 0.002;
  halo.scale.setScalar(0.045);
  const core = glowing(kit, map, '#ffd2c4');
  core.position.z = LENS_FACE + 0.0025;
  core.scale.setScalar(0.016);
  const light = new PointLight('#ff3a24', 0, 0.2 * metre, 2);
  light.position.z = LENS_FACE + 0.02;
  group.add(halo, core, light);
  return {
    group,
    set(level: number) {
      halo.material.opacity = 0.4 * level;
      core.material.opacity = 0.55 * level;
      light.intensity = 0.008 * metre * metre * level;
      group.visible = level > 0.001;
    },
  };
}

/**
 * Power here: tiny motes of red light rising off a new button's lens and
 * drifting out a few centimetres before they fade, seen only up close.
 */
export function createPowerMotes(kit: PanelKit, count = 36) {
  const group = new Group();
  const map = spot(kit);
  const motes = Array.from({ length: count }, (_, i) => {
    const sprite = glowing(kit, map, '#ff5a3c');
    group.add(sprite);
    return { sprite, age: (i / count) * 2, life: 2, x: 0, y: 0, vx: 0, vy: 0 };
  });
  const respawn = (m: (typeof motes)[number]) => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * LENS_RADIUS * 0.9;
    m.x = Math.cos(a) * r;
    m.y = Math.sin(a) * r;
    // Out from the middle, a little, and up, as warm air would carry them.
    m.vx = (m.x / LENS_RADIUS) * 0.008;
    m.vy = (m.y / LENS_RADIUS) * 0.008 + 0.011;
    m.life = 1.4 + Math.random() * 1.4;
    m.age = 0;
  };
  for (const m of motes) {
    respawn(m);
    m.age = Math.random() * m.life;
  }
  return {
    group,
    /** In reduced motion the motes hang where they are, glowing. */
    update(time: number, delta: number, reducedMotion: boolean) {
      for (const [i, m] of motes.entries()) {
        if (!reducedMotion) m.age += delta;
        if (m.age >= m.life) respawn(m);
        const k = m.age / m.life;
        const s = m.age;
        m.sprite.position.set(
          m.x + m.vx * s + Math.sin(time * 2.3 + i) * 0.0012 * k,
          m.y + m.vy * s,
          LENS_FACE + 0.001 + 0.01 * k,
        );
        m.sprite.scale.setScalar(0.003 * (1 - 0.5 * k));
        const twinkle = 0.75 + 0.25 * Math.sin(time * 17 + i * 2.1);
        m.sprite.material.opacity = Math.min(1, k * 6) * (1 - k) * twinkle;
        // Red as it leaves the lens, paling as it cools away.
        m.sprite.material.color.setRGB(1, 0.45 + 0.4 * k, 0.32 + 0.45 * k);
      }
    },
  };
}

/**
 * A damaged button shorting out: a blue-white flash at its lens and a few
 * sparks spat from it, yellowing as they fall, gone in a third of a
 * second. `fire()` makes one; `update` plays it.
 */
export function createShortSpark(kit: PanelKit, count = 9) {
  const group = new Group();
  group.visible = false;
  const map = spot(kit);
  const flash = glowing(kit, map, '#cfe0ff');
  group.add(flash);
  const sparks = Array.from({ length: count }, () => {
    const sprite = glowing(kit, map, '#ffffff');
    group.add(sprite);
    return { sprite, life: 0.3, vx: 0, vy: 0, vz: 0 };
  });
  let age = Infinity;
  let at = { x: 0, y: 0 };
  return {
    group,
    /** Whether its flash is still bright, for the lamp to light with it. */
    flashing: () => age < 0.08,
    fire() {
      age = 0;
      group.visible = true;
      // From somewhere on the lens's broken edge.
      const a = Math.random() * Math.PI * 2;
      at = {
        x: Math.cos(a) * LENS_RADIUS * 0.8,
        y: Math.sin(a) * LENS_RADIUS * 0.8,
      };
      for (const s of sparks) {
        const out = Math.random() * Math.PI * 2;
        const speed = 0.25 + Math.random() * 0.45;
        s.vx = Math.cos(out) * speed * 0.5 + Math.cos(a) * 0.15;
        s.vy = Math.sin(out) * speed * 0.5 + 0.2;
        s.vz = speed;
        s.life = 0.12 + Math.random() * 0.22;
      }
    },
    /** In reduced motion only the flash shows. */
    update(delta: number, reducedMotion: boolean) {
      if (age === Infinity) return;
      age += delta;
      flash.position.set(at.x, at.y, LENS_FACE + 0.003);
      flash.scale.setScalar(0.03 + 0.03 * Math.random());
      flash.material.opacity = Math.max(0, 1 - age / 0.08);
      for (const s of sparks) {
        const k = age / s.life;
        s.sprite.visible = !reducedMotion && k < 1;
        if (!s.sprite.visible) continue;
        s.sprite.position.set(
          at.x + s.vx * age,
          at.y + s.vy * age - 2.5 * age * age,
          LENS_FACE + 0.002 + s.vz * age,
        );
        s.sprite.scale.setScalar(0.004 * (1 - 0.6 * k));
        s.sprite.material.opacity = 1 - k * k;
        s.sprite.material.color.setRGB(1, 1 - 0.35 * k, 0.9 - 0.8 * k);
      }
      if (age > 0.4) {
        age = Infinity;
        group.visible = false;
      }
    },
  };
}
