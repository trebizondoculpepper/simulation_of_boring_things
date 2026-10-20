import { replaceableFuse } from './replaceable-fuse';
import { MACHINE_DROP_PROFILES } from '../logic/machine-drop-profiles';
import type {
  Attachment,
  DropProfile,
} from '../../../controls/logic/drop-profile';
import {
  makeBoardPortable,
  makeDevicePortable,
} from '../../core/parts/portable-board';
import { createCardEdgeSlot, createPcbBackplane } from '../views/pcb-backplane';
import { computed, signal } from '@preact/signals-core';
import type { ReadonlySignal, Signal } from '@preact/signals-core';
import type { PortableObject } from '../../../controls/input/object-handling';
import {
  MACHINE_COMPONENTS,
  BETAFORM_BOARD,
  EXPANSION_CARD_KINDS,
  cardDesignation,
  createCircuitBreaker,
  createServiceComponent,
} from '../logic/machine-components';
import type {
  MachineComponentKind,
  ServiceKind,
} from '../logic/machine-components';
import {
  createOperatingHandle,
  createContactor,
} from '../../core/logic/world/components';
import type { Readable } from '../../core/logic/world/components';
import { createMachineDeviceView } from '../views/machine-components';
import { createRackStatusIndicator } from '../views/rack-equipment';
import type { RackStatus, RackUnitOptions } from '../views/rack-equipment';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  beginPart,
  createPartSet,
  capacitorBoard,
  electrolyticCapacitor,
  contactor,
  motor,
  motorControlUnit,
  overloadRelay,
  rackUnit,
} from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { MACHINE_REFERENCES } from '../logic/machine-references';
import { click } from '../../core/audio/part-audio';

export interface MachineDevice extends Part {
  kind: MachineComponentKind;
  dropProfile: DropProfile;
  attachment: Attachment;
  active: Readable<boolean>;
  faulted: Readable<boolean>;
  value: Readable<number>;
  testLabel: string;
  test(): void;
  repair(): void;
  cards?: readonly MachineDevice[];
  /** A card assembly's slots, each with the card now seated in it. */
  slots?: readonly {
    kind: MachineComponentKind;
    occupant: ReadonlySignal<MachineDevice | null>;
  }[];
  /**
   * A healthy spare card for one of its slots, wired to work in the slot
   * once seated there; the room places it and adds it to its parts.
   */
  cartridges?: readonly MachineDevice[];
  spareCartridge?(): MachineDevice;
  spare?(kind: (typeof EXPANSION_CARD_KINDS)[number]): MachineDevice;
  /**
   * Seat a card in an empty slot of its kind, whichever backplane made it
   * (it is wired through this one from then on); whether it went in.
   */
  insert?(card: MachineDevice, slot: number): boolean;
  service?: ReturnType<typeof createServiceComponent>;
  handle?: ReturnType<typeof createOperatingHandle>;
  breaker?: ReturnType<typeof createCircuitBreaker>;
}

/**
 * The backplane an expansion card is wired through: whichever it is
 * seated in, so a card moved from one backplane to another works there.
 */
interface CardHost {
  seats: Signal<MachineDevice | null>[];
  running: Readable<boolean>;
  rackFeed: ReadonlySignal<boolean>;
  processor: ReadonlySignal<boolean>;
  known: MachineDevice[];
}
const cardHosts = new WeakMap<MachineDevice, Signal<CardHost>>();

/** Same component, view, operator actions and sound in the MCC and gallery. */
export function machineComponent(
  kit: PanelKit,
  kind: MachineComponentKind,
  props: {
    name?: string;
    /** Gallery exhibits can be removed as whole devices. */
    attachment?: Attachment;
    dropProfile?: DropProfile;
    rack?: Pick<RackUnitOptions, 'u' | 'style' | 'depth' | 'label'>;
    breaker?: ReturnType<typeof createCircuitBreaker>;
    /** Main disconnect may use a quieter handle than ordinary bucket breakers. */
    handleSoundLevel?: number;
    /** An interlock that holds a breaker's handle where it is (a Kirk key). */
    latch?: Readable<boolean>;
    power?: Readable<boolean>;
    indicatorPower?: Readable<boolean>;
    running?: Readable<boolean>;
    current?: Readable<number>;
    voltage?: Readable<number>;
    input?: Readable<number>;
    /** Optional three-colour status lamp on an instrument rack unit. */
    status?: Readable<RackStatus>;
  } = {},
): MachineDevice {
  const label = MACHINE_COMPONENTS.find(([key]) => key === kind)![1];
  const name = props.name ?? label;
  const attachment =
    props.attachment ??
    (kind.startsWith('plc-') || ['capacitors'].includes(kind)
      ? 'detachable'
      : 'fixed');
  const dropProfile = props.dropProfile ?? MACHINE_DROP_PROFILES[kind];
  const physicallyConnected = signal(true);
  const power = computed(
    () => physicallyConnected.value && (props.power?.value ?? true),
  );
  const running = computed(() => power.value && (props.running?.value ?? true));
  const stress = signal(false);
  const current = computed(() =>
    power.value ? (stress.value ? 12 : (props.current?.value ?? 1)) : 0,
  );
  let part: Part;
  let fuseCartridges: readonly MachineDevice[] | undefined;
  let spareCartridge: (() => MachineDevice) | undefined;
  let cards: MachineDevice[] | undefined;
  let service: ReturnType<typeof createServiceComponent> | undefined;
  let active: Readable<boolean> = running;
  let faulted: Readable<boolean> = stress;
  let value: Readable<number> = computed(() => (active.value ? 1 : 0));
  let testLabel = 'FAULT';
  let test = () => {
    stress.value = true;
  };
  let repair = () => {
    stress.value = false;
  };
  let slots: MachineDevice['slots'];
  let spare: MachineDevice['spare'];
  let insert: MachineDevice['insert'];
  let handle: ReturnType<typeof createOperatingHandle> | undefined;
  let breaker: ReturnType<typeof createCircuitBreaker> | undefined;
  switch (kind) {
    case 'backplane': {
      const a = beginPart(kit, name);
      const children = createPartSet();
      const board = createPcbBackplane(kit, 0.48, 0.42, 1771, 'PCB BACKPLANE');
      a.object.add(board);
      const bus = createServiceComponent('backplane', { power });
      service = bus;
      a.voice(bus.connected, {
        on: click({ band: 2400, q: 2, decay: 0.025, level: 0.15 }),
        off: click({ band: 1600, q: 2, decay: 0.035, level: 0.15 }),
      });
      board.traverse((o) => {
        if (o.name === 'Backplane supply connector')
          a.uses.set(o, bus.connected.flip);
      });
      const portable = makeBoardPortable(
        a,
        () => {
          if (bus.connected.state.value) bus.connected.flip();
        },
        'face',
        dropProfile,
        () => {
          physicallyConnected.value = true;
          if (!bus.connected.state.value) bus.connected.flip();
        },
        attachment,
      );
      a.disposers.push(bus.dispose);
      // Each slot is wired to whichever card is seated in it, so a card
      // put back, or a spare of the same kind, takes up the slot's work:
      // the power card feeds the rest of the rack, the processor enables
      // the output card.
      const seats = EXPANSION_CARD_KINDS.map(() =>
        signal<MachineDevice | null>(null),
      );
      const powerSlot = EXPANSION_CARD_KINDS.indexOf('plc-power');
      const cpuSlot = EXPANSION_CARD_KINDS.indexOf('plc-cpu');
      const rackFeed = computed(
        () => seats[powerSlot].value?.active.value ?? false,
      );
      const processor = computed(
        () => seats[cpuSlot].value?.active.value ?? false,
      );
      let slot = 0;
      const slotCount = EXPANSION_CARD_KINDS.reduce(
        (sum, kind) => sum + (kind === 'plc-cpu' ? 2 : 1),
        0,
      );
      const centres = EXPANSION_CARD_KINDS.map((cardKind) => {
        const slots = cardKind === 'plc-cpu' ? 2 : 1;
        const centre = (slot + slots / 2 - slotCount / 2) * 0.03175;
        slot += slots;
        return centre + 0.04;
      });
      const known: MachineDevice[] = [];
      const here: CardHost = {
        seats,
        running: bus.running,
        rackFeed,
        processor,
        known,
      };
      const makeCard = (
        cardKind: (typeof EXPANSION_CARD_KINDS)[number],
        cardName: string,
      ) => {
        const self: { card: MachineDevice | null } = { card: null };
        const host = signal(here);
        // Every seat is read, so this follows a card going in or out.
        const seated = computed(() =>
          host.value.seats.map((seat) => seat.value).includes(self.card),
        );
        const card = machineComponent(kit, cardKind, {
          name: cardName,
          power: computed(
            () =>
              seated.value &&
              (cardKind === 'plc-power'
                ? host.value.running.value
                : host.value.rackFeed.value),
          ),
          indicatorPower: props.indicatorPower,
          running:
            cardKind === 'plc-output'
              ? computed(() => host.value.processor.value)
              : props.running,
          input: props.input,
        });
        self.card = card;
        cardHosts.set(card, host);
        known.push(card);
        return card;
      };
      let spares = 0;
      cards = EXPANSION_CARD_KINDS.map((cardKind, index) => {
        const socket = createCardEdgeSlot(kit, index);
        socket.position.x = centres[index];
        board.add(socket);
        const card = children.add(
          makeCard(
            cardKind,
            `${name}: card ${index + 1} ${cardDesignation(cardKind)!.name}`,
          ),
        );
        card.object.position.set(centres[index], 0, 0.004);
        card.object.userData.slot = index;
        a.object.add(card.object);
        seats[index].value = card;
        return card;
      });
      // A card is in its slot while it is installed in this assembly.
      a.updates.push(() => {
        for (const card of known) {
          const at = card.object.userData.slot as number | undefined;
          const phase = (
            card.object.userData.portable as PortableObject
          )?.component.phase.peek();
          const inPlace =
            at !== undefined &&
            phase === 'installed' &&
            card.object.parent === a.object;
          if (inPlace && seats[at].peek() === null) seats[at].value = card;
          if (!inPlace)
            for (const seat of seats)
              if (seat.peek() === card) seat.value = null;
        }
      });
      slots = EXPANSION_CARD_KINDS.map((cardKind, index) => ({
        kind: cardKind,
        occupant: seats[index],
      }));
      spare = (cardKind) => {
        const card = makeCard(
          cardKind,
          `${name}: spare ${++spares} ${cardDesignation(cardKind)!.name}`,
        );
        card.object.userData.slot = undefined;
        return card;
      };
      insert = (card, index) => {
        const portable = card.object.userData.portable as
          | PortableObject
          | undefined;
        // A card is still in the slot only while it is installed there.
        const current = seats[index].peek();
        const occupied =
          current !== null &&
          (
            current.object.userData.portable as PortableObject | undefined
          )?.component.phase.peek() === 'installed' &&
          current.object.parent === a.object;
        const host = cardHosts.get(card);
        if (
          !host ||
          !portable ||
          EXPANSION_CARD_KINDS[index] !== card.kind ||
          occupied
        )
          return false;
        // A card from another backplane is wired through this one now.
        if (host.value !== here) {
          const away = host.value.known;
          if (away.includes(card)) away.splice(away.indexOf(card), 1);
          known.push(card);
          host.value = here;
        }
        a.object.add(card.object);
        card.object.position.set(centres[index], 0, 0.004);
        card.object.quaternion.identity();
        card.object.scale.setScalar(1);
        card.object.userData.slot = index;
        portable.component.reset();
        seats[index].value = card;
        return true;
      };
      children.add(a.part());
      part = { object: a.object, ...children };
      active = computed(() => bus.running.value && processor.value);
      faulted = computed(
        () =>
          bus.failed.value ||
          !bus.connected.state.value ||
          seats.some((seat) => !seat.value || seat.value.faulted.value),
      );
      value = bus.output;
      test = bus.fail;
      repair = () => {
        bus.repair();
        if (portable.phase.value === 'installed' && !bus.connected.state.value)
          bus.connected.flip();
      };
      testLabel = 'BUS FAULT';
      break;
    }
    case 'breaker': {
      breaker = props.breaker ?? createCircuitBreaker();
      handle = createOperatingHandle({
        bound: breaker.position,
        latch: props.latch,
      });
      const a = beginPart(kit, name);
      const view = createMachineDeviceView(kit, kind, label);
      a.object.add(view.group);
      const level = props.handleSoundLevel ?? 0.3;
      a.voice(handle, {
        on: click({
          band: 480,
          q: 0.8,
          decay: 0.08,
          level,
          thump: [135, 0.075],
        }),
        off: click({
          band: 420,
          q: 0.8,
          decay: 0.065,
          level,
          thump: [145, 0.065],
        }),
        trip: click({ band: 1700, q: 2, decay: 0.1, level: 0.4 }),
      });
      a.uses.set(view.group, handle.operate);
      a.updates.push(() =>
        view.set(
          handle!.on.value,
          breaker!.position.value === 'tripped',
          true,
          [],
          0,
          false,
          power.value,
        ),
      );
      a.disposers.push(handle.dispose);
      part = a.part();
      active = computed(() => power.value && breaker!.closed.value);
      faulted = computed(() => breaker!.position.value === 'tripped');
      test = breaker.trip;
      repair = () => {
        if (breaker!.position.value === 'tripped') breaker!.operate();
      };
      testLabel = 'TRIP';
      break;
    }
    case 'contactor': {
      const device = contactor(kit, { name, coil: running });
      part = device;
      active = device.component.closed;
      faulted = device.component.welded;
      test = device.component.weld;
      repair = device.component.repair;
      testLabel = 'WELD';
      break;
    }
    case 'relay': {
      const a = beginPart(kit, name);
      const view = createMachineDeviceView(kit, kind, label);
      const device = createContactor({ coil: running });
      a.object.add(view.group);
      a.voice(device, {
        'pull-in': click({ band: 2200, q: 2, decay: 0.02, level: 0.12 }),
        'drop-out': click({ band: 2600, q: 2, decay: 0.015, level: 0.1 }),
      });
      a.updates.push(() =>
        view.set(device.closed.value, device.welded.value, true),
      );
      a.disposers.push(device.dispose);
      part = a.part();
      active = device.closed;
      faulted = device.welded;
      test = device.weld;
      repair = device.repair;
      testLabel = 'WELD';
      break;
    }
    case 'overload': {
      const device = overloadRelay(kit, {
        name,
        current,
        settings: [2.5, 2.75, 3, 3.25, 3.5, 3.75, 4],
      });
      part = device;
      active = computed(
        () => power.value && device.component.contactClosed.value,
      );
      faulted = device.component.tripped;
      value = device.component.heat;
      test = device.component.test;
      repair = () => {
        device.component.reset();
      };
      testLabel = 'TRIP';
      break;
    }
    case 'fuse': {
      const device = replaceableFuse(kit, { name, power, current });
      part = device;
      active = device.active;
      faulted = device.faulted;
      value = device.value;
      test = device.test;
      repair = device.repair;
      testLabel = device.testLabel;
      slots = device.slots;
      insert = device.insert;
      fuseCartridges = device.cartridges;
      spareCartridge = device.spareCartridge;
      break;
    }
    case 'capacitor': {
      const device = electrolyticCapacitor(kit, {
        name,
        voltage: computed(() =>
          power.value ? (props.voltage?.value ?? 325) : 0,
        ),
        rated: 400,
        attachment,
      });
      part = device;
      active = computed(() => power.value && device.component.working.value);
      faulted = computed(() => device.component.health.value === 'vented');
      value = computed(() => (device.component.working.value ? 680 : 0));
      test = device.component.fail;
      repair = () => {
        device.component.replace();
      };
      testLabel = 'FAIL';
      break;
    }
    case 'capacitors': {
      const voltage = computed(() =>
        power.value ? (stress.value ? 800 : (props.voltage?.value ?? 325)) : 0,
      );
      const device = capacitorBoard(kit, { name, voltage, rated: 400 });
      const a = beginPart(kit, name);
      a.object.add(device.object);
      const children = createPartSet();
      children.add(device);
      makeBoardPortable(
        a,
        () => {
          physicallyConnected.value = false;
        },
        'face',
        dropProfile,
        () => {
          physicallyConnected.value = true;
        },
        attachment,
      );
      children.add(a.part());
      part = { object: a.object, ...children };
      active = computed(
        () => power.value && device.capacitors.every((c) => c.working.value),
      );
      faulted = computed(() =>
        device.capacitors.some((c) => c.health.value !== 'good'),
      );
      value = voltage;
      test = () => {
        stress.value = true;
        device.capacitors.forEach((c) => c.step(1));
        stress.value = false;
      };
      repair = () => {
        device.capacitors.forEach((c) => c.replace());
      };
      testLabel = 'OVERVOLT';
      break;
    }
    case 'rack-unit': {
      const device = rackUnit(kit, {
        name,
        label: 'SERVICE CHASSIS',
        u: 2,
        style: 'vented',
        depth: 0.3302,
        ...props.rack,
      });
      if (props.status) {
        const indicator = createRackStatusIndicator(kit);
        indicator.group.position.set(0.12, 0, 0.002);
        device.view.face.add(indicator.group);
        let seconds = 0;
        part = {
          ...device,
          update(delta) {
            device.update(delta);
            seconds += delta;
            indicator.set(
              !power.value
                ? 'off'
                : device.pulled.value
                  ? 'fault'
                  : props.status!.value,
              seconds,
            );
          },
        };
      } else part = device;
      active = computed(() => !device.pulled.value);
      faulted = device.pulled;
      const operate = [...device.uses.values()][0];
      test = () => {
        if (!device.pulled.value) operate();
      };
      repair = () => {
        if (device.pulled.value) operate();
      };
      testLabel = 'WITHDRAW';
      break;
    }
    case 'motor-unit': {
      const device = motorControlUnit(kit, { name });
      part = device;
      active = device.on;
      test = () => {
        stress.value = true;
        device.trip();
      };
      repair = () => {
        stress.value = false;
      };
      testLabel = 'TRIP';
      break;
    }
    case 'motor': {
      part = motor(kit, {
        name,
        running: computed(() => running.value && !stress.value),
        speed: computed(() => (props.input?.value ?? 1) * 1750),
      });
      active = computed(() => running.value && !stress.value);
      testLabel = 'STOP';
      break;
    }
    default: {
      const module = createServiceComponent(kind as ServiceKind, {
        power,
        enabled: props.running,
        input: props.input,
      });
      const a = beginPart(kit, name);
      const view = createMachineDeviceView(kit, kind, label);
      a.object.add(view.group);
      a.voice(module.connected, {
        on: click({ band: 2400, q: 2, decay: 0.025, level: 0.15 }),
        off: click({ band: 1600, q: 2, decay: 0.035, level: 0.15 }),
      });
      service = module;
      const portable = kind.startsWith('plc-')
        ? makeBoardPortable(
            a,
            () => {
              if (module.connected.state.value) module.connected.flip();
            },
            'side',
            dropProfile,
            () => {
              physicallyConnected.value = true;
              if (!module.connected.state.value) module.connected.flip();
            },
            attachment,
          )
        : null;
      a.uses.set(view.group, () => {
        if (!portable || portable.phase.value === 'installed')
          module.connected.flip();
      });
      // Its lever or screw turns (`service`), not the device itself.
      view.group.userData.still = true;
      a.updates.push((dt) => {
        module.tick(dt);
        view.set(
          module.running.value && (props.indicatorPower?.value ?? true),
          module.failed.value &&
            power.value &&
            (props.indicatorPower?.value ?? true),
          module.connected.state.value,
          module.channels.value,
          dt,
          portable != null && portable.phase.value !== 'installed',
        );
      });
      a.disposers.push(module.dispose);
      part = a.part();
      active = module.running;
      faulted = computed(
        () => module.failed.value || !module.connected.state.value,
      );
      value = module.output;
      test = module.fail;
      repair = () => {
        module.repair();
        if (
          (!portable || portable.phase.value === 'installed') &&
          !module.connected.state.value
        )
          module.connected.flip();
      };
      break;
    }
  }
  if (attachment === 'detachable' && !part.object.userData.portable)
    part = makeDevicePortable(
      kit,
      part,
      dropProfile,
      () => {
        physicallyConnected.value = false;
        if (service?.connected.state.value) service.connected.flip();
      },
      () => {
        physicallyConnected.value = true;
        if (service && !service.connected.state.value) service.connected.flip();
      },
    );
  part.object.userData.dropProfile = dropProfile;
  part.object.userData.attachment = attachment;
  if (kind.startsWith('plc-'))
    part.object.userData.boardDesignation = {
      ...BETAFORM_BOARD,
      type: cardDesignation(kind)!.name,
    };
  part.object.userData.machineComponentKind = kind;
  part.object.userData.machineReference = MACHINE_REFERENCES[kind];
  return {
    ...part,
    kind,
    dropProfile,
    attachment,
    active: computed(() => physicallyConnected.value && active.value),
    faulted,
    value,
    testLabel,
    test,
    repair,
    handle,
    breaker,
    cards,
    cartridges: fuseCartridges,
    spareCartridge,
    slots,
    spare,
    insert,
    service,
  };
}
