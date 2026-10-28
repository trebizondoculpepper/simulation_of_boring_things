import { effect } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import type { Readable } from '../../components/core/logic/world/components';
import { settings, updateSettings } from '../../settings/settings-store';
import {
  knobIndex,
  knobReadout,
  knobSteps,
  selectorIndex,
  settingFor,
} from '../logic/settings-panel';
import type { PanelZone } from '../logic/settings-panel';
import { moduleTitle } from '../logic/panel-layout';

/**
 * The settings panel's accessible copy (mission 096): the same items, from
 * the same menu model (`settingsPanel`), as real form controls in a
 * visually hidden dialog, so a screen reader or switch access works the
 * panel as it would a web form. Buttons press the panel's own buttons,
 * ranges and the select write the same settings its knobs and selector
 * do, the status line is announced as it changes, and focus is kept in
 * step with the panel's focus ring both ways.
 */

/** Hidden from sight, kept for assistive technology. */
export const VISUALLY_HIDDEN: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  border: '0',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

/** Title case for a legend: "MASTER VOLUME" read as "Master volume". */
const spoken = (legend: string) =>
  legend.charAt(0) + legend.slice(1).toLowerCase();

export interface SettingsMirror {
  root: HTMLElement;
  /** Put the document's focus on the copy of the control `id` (the panel's focus moved). */
  focus(id: string | null): void;
  show(open: boolean): void;
  dispose(): void;
}

export function createSettingsMirror({
  zones,
  work,
  status,
  noclip,
  bindings,
  onFocus,
}: {
  zones: readonly PanelZone[];
  /** Press the panel's control `id` (its own button, so it lights and clicks). */
  work(id: string): void;
  status: ReadonlySignal<string>;
  noclip?: Readable<boolean>;
  bindings: readonly (readonly [string, string, string])[];
  /** The copy's focus moved (a screen reader's, say): ring that control on the panel. */
  onFocus(id: string): void;
}): SettingsMirror {
  const root = document.createElement('div');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Settings panel');
  Object.assign(root.style, VISUALLY_HIDDEN);
  root.hidden = true;
  const stops: (() => void)[] = [];
  const controls = new Map<string, HTMLElement>();
  const track = (id: string, el: HTMLElement) => {
    el.dataset.target = id;
    el.addEventListener('focus', () => onFocus(id));
    controls.set(id, el);
    return el;
  };
  for (const zone of zones) {
    const section = document.createElement('section');
    section.setAttribute('aria-label', spoken(zone.title));
    root.append(section);
    for (const item of zone.items) {
      const id = moduleTitle(item);
      switch (item.kind) {
        case 'push': {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent =
            spoken(item.legend) + (item.confirm ? ' (press twice)' : '');
          b.addEventListener('click', () => work(id));
          section.append(track(id, b));
          break;
        }
        case 'latch':
        case 'key': {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = spoken(item.legend);
          b.addEventListener('click', () => work(id));
          const on = () =>
            item.kind === 'latch'
              ? settings.value.invertY
              : (noclip?.value ?? false);
          stops.push(
            effect(() => b.setAttribute('aria-pressed', String(on()))),
          );
          section.append(track(id, b));
          break;
        }
        case 'pot': {
          const input = document.createElement('input');
          input.type = 'range';
          input.min = '0';
          input.max = String(knobSteps(item.id));
          input.step = '1';
          input.setAttribute('aria-label', spoken(item.legend));
          input.addEventListener('input', () =>
            updateSettings(settingFor(item.id, Number(input.value))),
          );
          stops.push(
            effect(() => {
              const value = settings.value[item.id];
              input.value = String(knobIndex(item.id, value));
              input.setAttribute(
                'aria-valuetext',
                `${knobReadout(item.id, value)} ${item.unit}`,
              );
            }),
          );
          section.append(track(id, input));
          break;
        }
        case 'selector': {
          const select = document.createElement('select');
          select.setAttribute('aria-label', spoken(item.legend));
          item.positions.forEach((name, i) => {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = spoken(name);
            select.append(option);
          });
          select.addEventListener('change', () =>
            updateSettings(
              settingFor('onScreenControls', Number(select.value)),
            ),
          );
          stops.push(
            effect(() => {
              select.value = String(
                selectorIndex(settings.value.onScreenControls),
              );
            }),
          );
          section.append(track(id, select));
          break;
        }
        case 'vfd': {
          const line = document.createElement('p');
          line.setAttribute('role', 'status');
          line.setAttribute('aria-live', 'polite');
          stops.push(
            effect(() => {
              line.textContent = status.value;
            }),
          );
          section.append(line);
          break;
        }
        case 'card': {
          const list = document.createElement('ul');
          list.setAttribute('aria-label', 'Controls card');
          for (const [what, keys, pad] of bindings) {
            const li = document.createElement('li');
            li.textContent = `${what}: ${keys}${pad ? `; gamepad ${pad}` : ''}`;
            list.append(li);
          }
          section.append(list);
          break;
        }
      }
    }
  }
  document.body.append(root);
  let returnFocus: Element | null = null;
  return {
    root,
    focus(id) {
      const el = id ? controls.get(id) : null;
      if (el && document.activeElement !== el)
        el.focus({ preventScroll: true });
    },
    show(open) {
      if (open === !root.hidden) return;
      if (open) returnFocus = document.activeElement;
      root.hidden = !open;
      if (!open && returnFocus instanceof HTMLElement)
        returnFocus.focus({ preventScroll: true });
    },
    dispose() {
      for (const stop of stops) stop();
      root.remove();
    },
  };
}
