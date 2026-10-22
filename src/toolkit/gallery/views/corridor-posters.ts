import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  A3_POSTER,
  POSTER_COPY,
  corridorPosterPlacements,
} from '../logic/corridor-posters';
import { corridorWalls } from '../logic/main-corridor';

/** Thirty original pool campaigns, framed on the corridor's wall faces. */
export function createCorridorPosters(kit: PanelKit): Group {
  const group = new Group();
  group.name = 'A3 swimming poster gallery';
  const frame = new MeshStandardMaterial({
    color: '#1c2628',
    roughness: 0.43,
    metalness: 0.6,
  });
  const mount = new MeshStandardMaterial({ color: '#f3f0e8', roughness: 0.9 });
  kit.materials.push(frame, mount);
  const loader = new TextureLoader();
  const walls = corridorWalls();

  corridorPosterPlacements().forEach(({ wall, at, poster }) => {
    const { line, into, alongX } = walls[wall];
    const framed = new Group();
    framed.name = `A3 poster ${String(poster + 1).padStart(2, '0')}: ${POSTER_COPY[poster][0]}`;
    framed.position.set(
      alongX ? at : line + into[0] * 0.035,
      A3_POSTER.centreY,
      alongX ? line + into[1] * 0.035 : at,
    );
    framed.rotation.y = Math.atan2(into[0], into[1]);

    const rim = new Mesh(new BoxGeometry(0.345, 0.468, 0.032), frame);
    rim.position.z = 0.012;
    framed.add(rim);
    const paperMount = new Mesh(new BoxGeometry(0.313, 0.436, 0.004), mount);
    paperMount.position.z = 0.03;
    framed.add(paperMount);

    const photo =
      typeof Image === 'undefined'
        ? new Texture()
        : loader.load(`/posters/${String(poster + 1).padStart(2, '0')}.jpg`);
    photo.colorSpace = SRGBColorSpace;
    photo.anisotropy = 4;
    kit.textures.push(photo);
    const photoMaterial = new MeshBasicMaterial({
      map: photo,
      toneMapped: false,
    });
    kit.materials.push(photoMaterial);
    const image = new Mesh(
      new PlaneGeometry(A3_POSTER.width, A3_POSTER.height),
      photoMaterial,
    );
    image.position.z = 0.033;
    framed.add(image);

    if (typeof document !== 'undefined') {
      const words = lettering(POSTER_COPY[poster][0], POSTER_COPY[poster][1]);
      kit.textures.push(words);
      const ink = new MeshBasicMaterial({
        map: words,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      kit.materials.push(ink);
      const overlay = new Mesh(
        new PlaneGeometry(A3_POSTER.width, A3_POSTER.height),
        ink,
      );
      overlay.position.z = 0.034;
      framed.add(overlay);
    }
    group.add(framed);
  });
  return group;
}

function lettering(title: string, subtitle: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1018;
  const c = canvas.getContext('2d');
  if (c) {
    const bottom = c.createLinearGradient(0, 575, 0, 1018);
    bottom.addColorStop(0, 'rgba(0, 23, 37, 0)');
    bottom.addColorStop(0.5, 'rgba(0, 23, 37, 0.5)');
    bottom.addColorStop(1, 'rgba(0, 12, 24, 0.84)');
    c.fillStyle = bottom;
    c.fillRect(0, 575, 720, 443);
    c.fillStyle = 'rgba(4, 24, 35, 0.45)';
    c.fillRect(0, 0, 720, 112);
    c.fillStyle = '#ffffff';
    c.textBaseline = 'middle';
    c.font = 'bold 52px Arial, Helvetica, sans-serif';
    c.fillText('POOL PEOPLE', 40, 62, 630);
    c.font = 'bold 18px Arial, Helvetica, sans-serif';
    c.textAlign = 'right';
    c.fillText('VOL. 01', 680, 62);
    c.textAlign = 'left';
    c.font = 'bold 60px Arial, Helvetica, sans-serif';
    const lines = titleLines(c, title, 630);
    lines.forEach((line, index) => c.fillText(line, 40, 784 + index * 62, 640));
    c.font = '25px Arial, Helvetica, sans-serif';
    c.fillText(subtitle, 42, 942, 635);
    c.fillStyle = '#80e3e4';
    c.fillRect(42, 986, 75, 5);
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
}

function titleLines(c: CanvasRenderingContext2D, title: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of title.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}
