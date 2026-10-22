import {
  CanvasTexture,
  Group,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
  MeshStandardMaterial,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { doorWarningStickers } from '../logic/door-warnings';
import type {
  DoorStickerId,
  DoorWarningSelection,
} from '../logic/door-warnings';

const WORDS: Record<DoorStickerId, readonly [string, string]> = {
  authorised: ['AUTHORIZED PERSONNEL', 'ONLY'],
  'moving-machinery': ['MOVING MACHINERY', 'KEEP CLEAR'],
  'hot-surfaces': ['HOT SURFACES', 'DO NOT TOUCH'],
  'gas-equipment': ['GAS EQUIPMENT', 'ISOLATE BEFORE SERVICE'],
  'corrosive-chemicals': ['CORROSIVE CHEMICALS', 'WEAR PROTECTION'],
  'keep-chemicals-apart': ['ACID + HYPOCHLORITE', 'KEEP APART'],
  'live-electrical': ['LIVE ELECTRICAL', 'EQUIPMENT'],
  'shoe-coverings': ['WEAR SHOE COVERINGS', 'BEFORE ENTERING POOL'],
};

/** Separate, selectable vinyl stickers, facing +z, centred at their mounting point. */
export function createDoorWarningStickers(
  kit: PanelKit,
  selection: DoorWarningSelection,
  width = 0.34,
) {
  const group = new Group();
  group.name = 'door warning stickers';
  const ids = doorWarningStickers(selection);
  const height = 0.105;
  const gap = 0.014;
  ids.forEach((id, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 192;
    const c = canvas.getContext('2d');
    if (c) {
      const access = id === 'authorised';
      c.fillStyle = access ? '#ffffff' : '#f3cb21';
      c.fillRect(0, 0, 640, 192);
      c.strokeStyle = '#16191a';
      c.lineWidth = 9;
      c.strokeRect(5, 5, 630, 182);
      if (access) {
        c.strokeStyle = '#c8242b';
        c.lineWidth = 15;
        c.beginPath();
        c.arc(88, 95, 59, 0, Math.PI * 2);
        c.moveTo(45, 52);
        c.lineTo(131, 138);
        c.stroke();
      } else {
        c.strokeStyle = '#16191a';
        c.lineWidth = 12;
        c.beginPath();
        c.moveTo(88, 27);
        c.lineTo(150, 151);
        c.lineTo(26, 151);
        c.closePath();
        c.stroke();
        c.fillStyle = '#16191a';
        c.font = 'bold 92px Arial, Helvetica, sans-serif';
        c.textAlign = 'center';
        c.fillText('!', 88, 135);
      }
      c.fillStyle = '#16191a';
      c.textAlign = 'left';
      c.font = 'bold 43px Arial, Helvetica, sans-serif';
      c.fillText(WORDS[id][0], 175, 83, 440);
      c.font = 'bold 39px Arial, Helvetica, sans-serif';
      c.fillText(WORDS[id][1], 175, 139, 440);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    kit.textures.push(map);
    // Printed: lit as any surface is, dark in the dark.
    const material = new MeshStandardMaterial({ map, roughness: 0.7 });
    kit.materials.push(material);
    const sticker = new Mesh(new PlaneGeometry(width, height), material);
    sticker.name = `warning sticker: ${id}`;
    sticker.position.y = ((ids.length - 1) / 2 - i) * (height + gap);
    group.add(sticker);
  });
  return group;
}
