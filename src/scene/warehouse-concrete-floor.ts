import { RepeatWrapping } from 'three';
import { createPs1Material } from '../toolkit/components/core/parts/ps1-material';
import { createCanvasTexture } from '../toolkit/components/core/views/screens';
import { seeded } from '../toolkit/components/core/views/worn-paint';

/** Concrete artwork adapted from the Encabulator warehouse's floor surface. */
export function createWarehouseConcreteFloor(span: number) {
  const random = seeded(1992);
  const n = 2048;
  const art = createCanvasTexture(n, n);
  const c = art.context;
  c.fillStyle = '#96968f';
  c.fillRect(0, 0, n, n);
  for (let i = 0; i < 130; i++) {
    const x = random() * n;
    const y = random() * n;
    const radius = 50 + random() * 280;
    const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(
      0,
      i % 2 ? 'rgba(211,207,190,0.12)' : 'rgba(66,70,66,0.09)',
    );
    gradient.addColorStop(1, 'rgba(128,128,128,0)');
    c.fillStyle = gradient;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 80000; i++) {
    c.fillStyle = i % 2 ? 'rgba(35,37,33,0.045)' : 'rgba(235,231,215,0.06)';
    c.fillRect(random() * n, random() * n, 1, 1);
  }
  for (let i = 0; i < 180; i++) {
    c.strokeStyle = 'rgba(210,207,193,0.09)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(random() * n, random() * n, 18 + random() * 55, 0, Math.PI * 1.4);
    c.stroke();
  }
  for (let i = 1; i < 5; i++) {
    const at = (i * n) / 5;
    c.fillStyle = '#686b65';
    c.fillRect(at, 0, 1.5, n);
    c.fillRect(0, at, n, 1.5);
    c.fillStyle = '#b0afa4';
    c.fillRect(at + 2, 0, 0.8, n);
    c.fillRect(0, at + 2, n, 0.8);
  }
  c.strokeStyle = 'rgba(53,56,53,0.07)';
  c.lineWidth = 5;
  for (const y of [n * 0.48, n * 0.53]) {
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(150, y, 250, y + 30, 370, y + 10);
    c.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = ((1 + Math.floor(random() * 4)) * n) / 5;
    const y = random() * n;
    c.fillStyle = 'rgba(119,120,112,0.6)';
    c.fillRect(x - 3, y, 6, 7 + random() * 12);
  }
  art.texture.wrapS = art.texture.wrapT = RepeatWrapping;
  art.texture.repeat.set(span / 30, span / 30);
  art.texture.needsUpdate = true;
  return createPs1Material({
    map: art.texture,
    roughness: 0.62,
    metalness: 0.02,
  });
}
