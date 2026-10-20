import { ParticleSprite } from '../../core/views/particles';
import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  PointLight,
  SphereGeometry,
  SpriteMaterial,
} from 'three';
import { createMicroLabel, kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import type { CapacitorHealth } from '../../core/logic/world/components';
import { createSmokeEmitter } from '../../core/views/smoke-emitter';
import { createShortSpark } from '../../core/views/button-effects';
import { discharge } from '../../core/views/dazzle';

/** A 35 mm snap-in can, based on the Chemi-Con KMQ format; origin at its base. */
export function createElectrolyticCapacitorView(kit: PanelKit, height = 0.045) {
  const group = new Group();
  group.name = 'Electrolytic capacitor';
  const radius = 0.0175;
  const normal = new Group(),
    failed = new Group();
  normal.name = 'Healthy shiny capacitor';
  failed.name = 'Blackened bulging capacitor';
  group.add(normal, failed);
  failed.visible = false;
  const finish = (colour: string, metalness: number, roughness: number) =>
    Object.assign(kitPaint(kit, colour, metalness), { roughness });
  const shell = finish('#234b7c', 0.35, 0.22);
  const scorched = finish('#211d19', 0.1, 0.85);
  const metal = finish('#d7dade', 0.85, 0.18);
  const charredMetal = finish('#665143', 0.5, 0.65);
  const body = new Mesh(
    new CylinderGeometry(radius, radius, height, 32, 1, true),
    shell,
  );
  body.position.y = height / 2;
  normal.add(body);
  const swollen = new CylinderGeometry(radius, radius, height, 32, 6, true);
  const vertices = swollen.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const t = (vertices.getY(i) + height / 2) / height;
    const swell = 1 + 0.16 * Math.sin(Math.PI * t);
    vertices.setX(i, vertices.getX(i) * swell);
    vertices.setZ(i, vertices.getZ(i) * swell);
  }
  swollen.computeVertexNormals();
  const damagedBody = new Mesh(swollen, scorched);
  damagedBody.position.y = height / 2;
  failed.add(damagedBody);
  const top = new Mesh(
    new CylinderGeometry(radius * 0.98, radius * 0.98, 0.001, 32),
    metal,
  );
  top.position.y = height;
  normal.add(top);
  for (const yaw of [0, Math.PI / 2]) {
    const score = new Mesh(
      new BoxGeometry(0.026, 0.0003, 0.0005),
      kitPaint(kit, '#6d747a'),
    );
    score.position.y = height + 0.0007;
    score.rotation.y = yaw;
    normal.add(score);
  }
  const darkVent = new Mesh(
    new CylinderGeometry(radius * 0.97, radius * 0.97, 0.001, 32),
    scorched,
  );
  darkVent.position.y = height - 0.001;
  failed.add(darkVent);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const petal = new Mesh(
      new SphereGeometry(
        radius * 0.96,
        10,
        5,
        angle + 0.065,
        Math.PI / 2 - 0.13,
        0,
        Math.PI / 2,
      ),
      charredMetal,
    );
    petal.scale.y = 0.3;
    petal.position.set(
      Math.sin(angle + Math.PI / 4) * 0.001,
      height + 0.001,
      Math.cos(angle + Math.PI / 4) * 0.001,
    );
    failed.add(petal);
  }
  const base = new Mesh(
    new CylinderGeometry(radius * 0.94, radius * 0.94, 0.002, 24),
    kitPaint(kit, '#25272a'),
  );
  base.position.y = 0.001;
  group.add(base);
  for (const x of [-0.005, 0.005]) {
    const pin = new Mesh(
      new CylinderGeometry(0.0007, 0.0007, 0.0063, 8),
      metal,
    );
    pin.position.set(x, -0.00315, 0);
    group.add(pin);
  }
  const label = createMicroLabel(kit, 'PEPPERDYNE\n680µF  400V\n−  −  −', {
    height: 0.0015,
    maxWidth: 0.026,
    ink: '#e7edf1',
  });
  label.position.set(0, height * 0.5, radius + 0.0003);
  normal.add(label);
  const effects = new Group();
  effects.userData.noCollision = true;
  effects.position.y = height + 0.006;
  group.add(effects);
  const flash = new ParticleSprite(
    new SpriteMaterial({
      color: '#d1ecff',
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  flash.scale.setScalar(0.045);
  flash.visible = false;
  effects.add(flash);
  const light = new PointLight('#badfff', 0, 0.35);
  effects.add(light);
  const embers = Array.from({ length: 5 }, () => {
    const spark = new ParticleSprite(
      new SpriteMaterial({
        color: '#ffad41',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    spark.scale.setScalar(0.003);
    spark.visible = false;
    effects.add(spark);
    return spark;
  });
  // As it vents: a spray of sparks from its burst top, and a pop that
  // dazzles whoever sees it (`discharge`), with its bang.
  const burst = createShortSpark(kit, 14);
  burst.group.rotation.x = -Math.PI / 2;
  // Nor may it enlarge the exhibit's bounding box until it fires.
  for (const sprite of burst.group.children) sprite.scale.setScalar(0);
  effects.add(burst.group);
  let wasBlown = false;
  let lastAge = Infinity;
  const smoke = createSmokeEmitter(10, '100, 94, 86');
  smoke.group.scale.setScalar(0.16);
  smoke.group.visible = false;
  // An inactive effect must not enlarge the exhibit's initial bounding box.
  for (const puff of smoke.group.children) puff.scale.setScalar(0);
  effects.add(smoke.group);
  return {
    group,
    set(
      health: CapacitorHealth,
      smokeLevel: number,
      age: number,
      count: number,
      reducedMotion = false,
    ) {
      const blown = health === 'vented';
      if (blown && !wasBlown && age < 0.5) {
        burst.fire();
        discharge(group);
      }
      burst.update(
        blown && Number.isFinite(lastAge) && Number.isFinite(age)
          ? Math.max(0, age - lastAge)
          : 0,
        reducedMotion,
      );
      wasBlown = blown;
      lastAge = age;
      normal.visible = !blown;
      failed.visible = blown;
      top.scale.y = health === 'bulging' ? 2.5 : 1;
      flash.visible = blown && age < 0.065;
      flash.material.opacity = flash.visible ? 1 - age / 0.065 : 0;
      light.intensity = flash.visible ? 0.04 * (1 - age / 0.065) : 0;
      embers.forEach((spark, i) => {
        const lifetime = 0.48 + i * 0.065;
        spark.visible = blown && i < count && age < lifetime;
        if (!spark.visible) return;
        const a = reducedMotion ? 0.12 : age;
        const heading = i * 2.399;
        spark.position.set(
          Math.cos(heading) * a * 0.055,
          a * (0.2 + i * 0.018) - 0.35 * a * a,
          Math.sin(heading) * a * 0.055,
        );
        spark.material.opacity = 1 - age / lifetime;
      });
      smoke.group.visible = smokeLevel > 0;
      if (smokeLevel > 0) smoke.update(age, smokeLevel, reducedMotion);
    },
    dispose() {
      flash.material.dispose();
      for (const spark of embers) spark.material.dispose();
      smoke.dispose();
    },
  };
}
