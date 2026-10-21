import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';

/**
 * Large open-face pool pace clock, inspired by commercial pace clocks. Face
 * is +z; its case's back is 0.04 × `diameter` behind its origin.
 */
export function createPaceClock(diameter = 1) {
  const object = new Group();
  object.name = `Poolguard pace clock (${diameter} m)`;
  object.scale.setScalar(diameter);
  const face = document.createElement('canvas');
  face.width = face.height = 1024;
  const ctx = face.getContext('2d');
  if (!ctx) throw new Error('Pace clock needs a canvas');
  const centre = 512;
  ctx.fillStyle = '#f7f7f2';
  ctx.beginPath();
  ctx.arc(centre, centre, 510, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#16191a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let second = 0; second < 60; second++) {
    const a = (second * Math.PI) / 30 - Math.PI / 2;
    const major = second % 5 === 0;
    const inner = major ? 416 : 435;
    const outer = 459;
    ctx.lineWidth = major ? 7 : 3;
    ctx.beginPath();
    ctx.moveTo(centre + Math.cos(a) * inner, centre + Math.sin(a) * inner);
    ctx.lineTo(centre + Math.cos(a) * outer, centre + Math.sin(a) * outer);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#101315';
      ctx.font = 'bold 63px Arial, sans-serif';
      ctx.fillText(
        String(second || 60),
        centre + Math.cos(a) * 345,
        centre + Math.sin(a) * 345,
      );
    }
  }
  ctx.fillStyle = '#d72229';
  ctx.font = 'italic bold 89px Arial, sans-serif';
  ctx.fillText('POOLGUARD', centre, 665);
  const texture = new CanvasTexture(face);
  texture.colorSpace = SRGBColorSpace;
  const white = new MeshBasicMaterial({ map: texture });
  const edge = new MeshStandardMaterial({
    color: '#d2d5d4',
    roughness: 0.45,
    metalness: 0.35,
  });
  const red = new MeshBasicMaterial({ color: '#df242a' });
  const black = new MeshBasicMaterial({ color: '#111719' });
  // A case 40 mm deep behind the face, its back on the wall at z = −0.04,
  // and each layer in front clear of the last: seen from across a big
  // hall, layers closer than this fight for the same pixels.
  const back = new Mesh(new CylinderGeometry(0.5, 0.5, 0.04, 96), edge);
  back.rotation.x = Math.PI / 2;
  back.position.z = -0.02;
  object.add(back);
  const dial = new Mesh(new CircleGeometry(0.498, 96), white);
  dial.position.z = 0.004;
  object.add(dial);
  const minute = new Group();
  minute.position.z = 0.012;
  const minuteHand = new Mesh(new BoxGeometry(0.017, 0.31, 0.004), black);
  minuteHand.position.y = 0.12;
  minute.add(minuteHand);
  object.add(minute);
  const sweep = new Group();
  sweep.position.z = 0.02;
  const sweepHand = new Mesh(new BoxGeometry(0.011, 0.39, 0.004), red);
  sweepHand.position.y = 0.15;
  sweep.add(sweepHand);
  const tail = new Mesh(new BoxGeometry(0.015, 0.09, 0.004), red);
  tail.position.y = -0.055;
  sweep.add(tail);
  object.add(sweep);
  const boss = new Mesh(new CylinderGeometry(0.021, 0.021, 0.008, 16), black);
  boss.rotation.x = Math.PI / 2;
  boss.position.z = 0.026;
  object.add(boss);
  return {
    object,
    update() {
      const now = Date.now() / 1000;
      sweep.rotation.z = (-(now % 60) * Math.PI) / 30;
      minute.rotation.z = (-((now / 60) % 60) * Math.PI) / 30;
    },
    dispose() {
      object.traverse((child) => {
        if (child instanceof Mesh) child.geometry.dispose();
      });
      texture.dispose();
      white.dispose();
      edge.dispose();
      red.dispose();
      black.dispose();
    },
  };
}
