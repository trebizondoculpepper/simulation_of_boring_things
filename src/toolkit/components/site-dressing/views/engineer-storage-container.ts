import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';

export type StorageContainerKind =
  | 'drawer'
  | 'parts-bin'
  | 'archive-box'
  | 'tool-chest'
  | 'instrument-case'
  | 'carton';

/** An individually identifiable, labelable storage component. */
export interface EngineerStorageContainer {
  readonly id: string;
  readonly kind: StorageContainerKind;
  readonly group: Group;
  readonly items: Object3D[];
  label: string;
  setLabel(text: string): void;
  addItem(item: Object3D): void;
  removeItem(item: Object3D): void;
}

export function createEngineerStorageContainer(
  kit: PanelKit,
  id: string,
  kind: StorageContainerKind,
  label: string,
  labelWidth: number,
  labelHeight: number,
  labelAt: readonly [number, number, number],
  showCount = false,
): EngineerStorageContainer {
  const group = new Group();
  group.name = `${id} · ${kind}`;
  group.userData.storageContainerId = id;
  group.userData.storageContainerKind = kind;
  const items: Object3D[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  kit.textures.push(texture);
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  material.userData.unpowered = true;
  kit.materials.push(material);
  const plate = new Mesh(new PlaneGeometry(labelWidth, labelHeight), material);
  plate.name = `${id} label`;
  plate.position.set(...labelAt);
  group.add(plate);
  const component: EngineerStorageContainer = {
    id,
    kind,
    group,
    items,
    label,
    setLabel(text) {
      this.label = text;
      group.userData.storageLabel = text;
      draw();
    },
    addItem(item) {
      if (items.includes(item)) return;
      items.push(item);
      item.userData.storageContainerId = id;
      group.add(item);
      draw();
    },
    removeItem(item) {
      const index = items.indexOf(item);
      if (index < 0) return;
      items.splice(index, 1);
      draw();
    },
  };
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#e9ebe5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#8d9694';
    context.lineWidth = 3;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = '#1c2526';
    context.font = 'bold 46px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const caption = showCount
      ? `${component.label}  ×${items.length}`
      : component.label;
    context.fillText(
      caption,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width - 20,
    );
    texture.needsUpdate = true;
  };
  component.setLabel(label);
  return component;
}
