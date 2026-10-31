import { describe, expect, it, vi } from 'vite-plus/test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
} from 'three';
import type { Object3D } from 'three';
import { createPortableBoard } from '../logic/portable-board';
import type { Attachment } from '../logic/drop-profile';
import { createObjectHandling } from './object-handling';
import type { PortableObject, TargetFeedback } from './object-handling';
import type { PlacementTarget } from './placement-target';

/**
 * The hands' resolver (mission 116): what a use would do, asked by the
 * crosshair's cue and run by the click, so they cannot disagree.
 */
function fixture(
  hooks: {
    attachment?: Attachment;
    heldAction?: () => boolean | 'refuse';
    allowPickup?: () => boolean;
    targetFeedback?: () => TargetFeedback;
    nearby?: () => 'accept' | 'reject' | null;
    divert?: () => boolean;
  } = {},
) {
  const scene = new Scene();
  const parent = new Group();
  parent.scale.setScalar(2);
  scene.add(parent);
  const object = new Mesh(
    new BoxGeometry(0.03, 0.25, 0.17),
    new MeshBasicMaterial(),
  );
  object.position.y = 0.6;
  parent.add(object);
  const component = createPortableBoard(
    undefined,
    undefined,
    hooks.attachment ?? 'detachable',
  );
  object.userData.portable = { component, flat: 'side', detach() {} };
  const camera = new PerspectiveCamera(52, 1, 0.05, 40);
  camera.position.set(0, 1.2, 2);
  camera.lookAt(0, 1.2, 0);
  const spies = {
    heldAction: vi.fn(hooks.heldAction ?? (() => false)),
    allowPickup: vi.fn(hooks.allowPickup ?? (() => true)),
    targetFeedback: vi.fn(hooks.targetFeedback ?? (() => null)),
    nearby: vi.fn(hooks.nearby ?? (() => null)),
    divert: vi.fn(hooks.divert ?? (() => false)),
    onPickUp: vi.fn((_object: Object3D, _portable: PortableObject) => {}),
  };
  const handling = createObjectHandling(
    scene,
    camera,
    2,
    0,
    undefined,
    spies.divert,
    undefined,
    undefined,
    spies.heldAction,
    spies.allowPickup,
    spies.targetFeedback,
    spies.nearby,
    spies.onPickUp,
  );
  /** A thing in front, at z (world), seen past the held object. */
  const ahead = (z = -1) => {
    const mesh = new Mesh(
      new BoxGeometry(0.4, 0.4, 0.05),
      new MeshBasicMaterial(),
    );
    mesh.position.set(0, 1.2, z);
    scene.add(mesh);
    return mesh;
  };
  return { scene, object, component, camera, handling, spies, ahead };
}

const target = (accepts: boolean, cue?: PlacementTarget['cue']) => {
  const place = vi.fn<PlacementTarget['place']>();
  const made: PlacementTarget = {
    accepts: () => accepts,
    place,
    ...(cue ? { cue } : {}),
  };
  return Object.assign(made, { place });
};

describe('the hands, not carrying', () => {
  it('lifts a detachable part in reach, green, and the click picks it up', () => {
    const f = fixture();
    const { answer } = f.handling.resolve(0, 0);
    expect(answer).toEqual({ gesture: 'pick-up', possible: true });
    expect(f.spies.onPickUp).not.toHaveBeenCalled();
    expect(f.handling.use(0, 0)).toBe(true);
    expect(f.component.phase.value).toBe('held');
    expect(f.spies.onPickUp).toHaveBeenCalledTimes(1);
  });

  it('shows a red lift where it is locked or the room refuses, and the click does nothing', () => {
    const f = fixture();
    f.component.setLocked(true);
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'pick-up',
      possible: false,
    });
    expect(f.handling.use(0, 0)).toBe(false);
    const g = fixture({ allowPickup: () => false });
    expect(g.handling.resolve(0, 0).answer).toEqual({
      gesture: 'pick-up',
      possible: false,
    });
    expect(g.handling.use(0, 0)).toBe(false);
    expect(g.component.phase.value).toBe('installed');
    expect(g.spies.onPickUp).not.toHaveBeenCalled();
  });

  it('is not the hands for a fixed part, one out of reach, hidden or behind something', () => {
    expect(fixture({ attachment: 'fixed' }).handling.resolve(0, 0).answer).toBe(
      'use',
    );
    const far = fixture();
    far.camera.position.z = 8;
    expect(far.handling.resolve(0, 0).answer).toBe('use');
    const hidden = fixture();
    hidden.object.visible = false;
    expect(hidden.handling.resolve(0, 0).answer).toBe('use');
    const behind = fixture();
    behind.ahead(1);
    expect(behind.handling.resolve(0, 0).answer).toBe('use');
    expect(behind.handling.use(0, 0)).toBe(false);
  });
});

describe('the hands, carrying', () => {
  it("gives the room's own answer first, ahead of a control aimed at", () => {
    const f = fixture({
      targetFeedback: () => ({ gesture: 'put-back', possible: true }),
      heldAction: () => true,
    });
    f.handling.use(0, 0);
    f.ahead().userData.useWhileCarrying = true;
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'put-back',
      possible: true,
    });
    expect(f.handling.use(0, 0)).toBe(true);
    expect(f.spies.heldAction).toHaveBeenCalledTimes(1);
    expect(f.handling.holding()).toBe(false);
  });

  it("keeps 'accept' and 'reject' as a socket's fit and refusal", () => {
    let feedback: TargetFeedback = 'accept';
    const f = fixture({ targetFeedback: () => feedback });
    f.handling.use(0, 0);
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'fit',
      possible: true,
    });
    expect(f.handling.targetFeedback(0, 0)).toBe('accept');
    feedback = 'reject';
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'fit',
      possible: false,
      refused: true,
    });
    expect(f.handling.targetFeedback(0, 0)).toBe('reject');
  });

  it('leaves a control aimed at to the room when the room says nothing', () => {
    const f = fixture();
    f.handling.use(0, 0);
    const latch = f.ahead();
    latch.userData.useWhileCarrying = true;
    latch.userData.placementTarget = target(true);
    expect(f.handling.resolve(0, 0).answer).toBe('use');
    expect(f.handling.use(0, 0)).toBe(false);
    expect(f.handling.holding()).toBe(true);
  });

  it('names an aimed place by its kind, ahead of a bin near enough', () => {
    const f = fixture({ nearby: () => 'accept', divert: () => true });
    f.handling.use(0, 0);
    const place = target(true, 'put-back');
    f.ahead().userData.placementTarget = place;
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'put-back',
      possible: true,
    });
    f.handling.use(0, 0);
    expect(place.place).toHaveBeenCalledTimes(1);
    expect(f.spies.divert).not.toHaveBeenCalled();
  });

  it('refuses at an aimed bin that will not take it, though another is near', () => {
    const f = fixture({ nearby: () => 'accept', divert: () => true });
    f.handling.use(0, 0);
    const skip = target(false, 'put-in');
    f.ahead().userData.placementTarget = skip;
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'put-in',
      possible: false,
      refused: true,
    });
    expect(f.handling.use(0, 0)).toBe(true);
    expect(f.handling.holding()).toBe(true);
    expect(skip.place).not.toHaveBeenCalled();
    expect(f.spies.divert).not.toHaveBeenCalled();
  });

  it('calls an unnamed target a fit, and a surface a put-down', () => {
    const f = fixture();
    f.handling.use(0, 0);
    const socket = f.ahead();
    socket.userData.placementTarget = target(true);
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'fit',
      possible: true,
    });
    delete socket.userData.placementTarget;
    const plinth = new Group();
    const deck = f.ahead(-2);
    plinth.add(deck);
    f.scene.add(plinth);
    socket.removeFromParent();
    plinth.userData.placementSurface = deck;
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'put-down',
      possible: true,
    });
  });

  it('puts into a bin near enough, and otherwise drops', () => {
    let near = true;
    const f = fixture({
      nearby: () => (near ? 'accept' : null),
      divert: () => near,
    });
    f.handling.use(0, 0);
    expect(f.handling.resolve(0, 0).answer).toEqual({
      gesture: 'put-in',
      possible: true,
    });
    near = false;
    expect(f.handling.resolve(0, 0).answer).toBeNull();
    expect(f.handling.use(0, 0)).toBe(true);
    expect(f.component.phase.value).toBe('falling');
  });
});

describe('asking', () => {
  it('changes nothing, however often, and calls no acting hook', () => {
    const f = fixture({ nearby: () => 'accept', divert: () => true });
    const place = target(true, 'put-in');
    f.ahead().userData.placementTarget = place;
    for (let i = 0; i < 1000; i++) f.handling.resolve(0, 0);
    expect(f.component.phase.value).toBe('installed');
    expect(f.spies.onPickUp).not.toHaveBeenCalled();
    f.handling.use(0, 0);
    const pose = {
      parent: f.object.parent,
      position: f.object.position.clone(),
      quaternion: f.object.quaternion.clone(),
    };
    for (let i = 0; i < 1000; i++) {
      f.handling.resolve(0, 0);
      f.handling.resolve(0.5, -0.5);
    }
    expect(f.handling.holding()).toBe(true);
    expect(f.component.phase.value).toBe('held');
    expect(f.object.parent).toBe(pose.parent);
    expect(f.object.position.equals(pose.position)).toBe(true);
    expect(f.object.quaternion.equals(pose.quaternion)).toBe(true);
    expect(f.spies.heldAction).not.toHaveBeenCalled();
    expect(f.spies.divert).not.toHaveBeenCalled();
    expect(place.place).not.toHaveBeenCalled();
    expect(f.spies.onPickUp).toHaveBeenCalledTimes(1);
  });
});
