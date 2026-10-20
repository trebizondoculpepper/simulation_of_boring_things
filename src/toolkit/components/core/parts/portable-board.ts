import { computed } from '@preact/signals-core';
import { createDropProfile } from '../../../controls/logic/drop-profile';
import type {
  Attachment,
  DropProfile,
} from '../../../controls/logic/drop-profile';
import { objectImpact, objectRoll } from '../audio/object-impact';
import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createPortableBoard } from '../../../controls/logic/portable-board';
import { click, partAudio } from '../audio/part-audio';
import { boardScrape } from '../audio/board-impact';
import { createSmokeEmitter } from '../views/smoke-emitter';
import { beginPart, createPartSet } from './parts';
import type { Part } from './parts';
import type { PanelKit } from '../views/eighties-controls';
import type { PortableObject } from '../../../controls/input/object-handling';

/** The part owns its pickup/impact sounds and dust; input is shared first-person use. */
export function makeBoardPortable(
  a: ReturnType<typeof beginPart>,
  detach: () => void,
  flat: PortableObject['flat'] = 'side',
  settings?: DropProfile,
  restore: () => void = () => {},
  attachment: Attachment = 'detachable',
) {
  // Capture metre-sized geometry before room transforms and removable cards
  // are attached, so carrying/rotating it cannot change its acoustic size.
  const size = new Box3().setFromObject(a.object).getSize(new Vector3());
  const span = Math.max(size.x, size.y, size.z, 0.05);
  const profile = settings ?? createDropProfile('flat', span, 'board');
  const component = createPortableBoard(profile, restore, attachment);
  if (profile.shape === 'round')
    a.holdWhile(
      computed(
        () =>
          component.phase.value === 'falling' &&
          component.grounded.value &&
          component.groundSpeed.value > 0.035,
      ),
      objectRoll(profile, component.groundSpeed),
    );
  const dust = createSmokeEmitter(2, '157, 148, 127');
  dust.group.visible = false;
  let puffAge = 1;
  let dustParent: Object3D | null = null;
  const position = new Vector3(),
    scale = new Vector3();
  a.voice(component, {
    'pick-up': click({ band: 1600, q: 1.5, decay: 0.04, level: 0.14 }),
  });
  component.onEvent((event) => {
    if (event !== 'impact') return;
    const sound = objectImpact(
      profile,
      component.impactSpeed.value,
      component.impacts.value,
    );
    if (sound) partAudio.play(sound, a.object);
    if (
      profile.shape === 'flat' &&
      component.impacts.value === 1 &&
      component.slipSpeed.value > 0.05
    )
      partAudio.play(
        boardScrape(component.slipSpeed.value, profile.span),
        a.object,
      );
    a.object.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(a.object);
    bounds.getCenter(position);
    position.y = bounds.min.y + 0.008;
    a.object.getWorldScale(scale);
    dustParent = a.object.parent;
    if (dustParent) {
      dustParent.add(dust.group);
      dust.group.position.copy(position);
      dust.group.scale.copy(scale);
      dust.group.visible = true;
      puffAge = 0;
    }
  });
  a.updates.push((dt) => {
    puffAge += dt;
    dust.group.visible = puffAge < 0.5;
    if (dust.group.visible)
      dust.update(
        puffAge * 2,
        (1 - puffAge / 0.5) * 0.8,
        typeof window !== 'undefined' &&
          (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
            false),
      );
  });
  a.disposers.push(() => {
    component.dispose();
    dust.group.removeFromParent();
    dust.dispose();
  });
  if (profile.sound.material === 'board')
    a.object.userData.manufacturer = 'Pepperdyne';
  if (attachment === 'detachable')
    a.object.userData.portable = {
      component,
      flat,
      detach,
    } satisfies PortableObject;
  return component;
}

/** Add pickup behaviour without replacing the device's existing state or controls. */
export function makeDevicePortable(
  kit: PanelKit,
  part: Part,
  profile: DropProfile,
  detach: () => void,
  restore: () => void,
): Part {
  const a = beginPart(kit, `${part.object.name} handling`);
  a.object.add(part.object);
  const size = new Box3().setFromObject(a.object).getSize(new Vector3());
  const flat =
    profile.shape !== 'flat'
      ? 'upright'
      : size.z <= Math.min(size.x, size.y)
        ? 'face'
        : size.x <= size.y
          ? 'side'
          : 'upright';
  makeBoardPortable(a, detach, flat, profile, restore);
  const parts = createPartSet();
  parts.add(part);
  parts.add(a.part());
  return { object: a.object, ...parts };
}
