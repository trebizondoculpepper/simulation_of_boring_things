import type { BoxFace, SoftwareTitle } from '../logic/software-boxes';
import {
  airbrushSpot,
  glow,
  lensFlare,
  reviewQuote,
} from './software-box-airbrush';

type Paint = CanvasRenderingContext2D;
type Line = readonly number[];
const glyphs: Record<string, readonly Line[]> = {
  A: [
    [1, 15, 4, 1, 8, 1, 11, 15],
    [2, 10, 10, 10],
  ],
  C: [[11, 2, 8, 1, 3, 1, 1, 4, 1, 12, 3, 15, 8, 15, 11, 14]],
  E: [
    [11, 1, 1, 1, 1, 15, 11, 15],
    [1, 8, 9, 8],
  ],
  H: [
    [1, 1, 1, 15],
    [11, 1, 11, 15],
    [1, 8, 11, 8],
  ],
  I: [
    [2, 1, 10, 1],
    [6, 1, 6, 15],
    [2, 15, 10, 15],
  ],
  L: [[1, 1, 1, 15, 11, 15]],
  N: [[1, 15, 1, 1, 11, 15, 11, 1]],
  O: [[3, 1, 9, 1, 11, 3, 11, 13, 9, 15, 3, 15, 1, 13, 1, 3, 3, 1]],
  Q: [
    [3, 1, 9, 1, 11, 3, 11, 13, 9, 15, 3, 15, 1, 13, 1, 3, 3, 1],
    [7, 11, 12, 17],
  ],
  R: [
    [1, 15, 1, 1, 8, 1, 11, 4, 11, 6, 8, 9, 1, 9],
    [6, 9, 11, 15],
  ],
  S: [[11, 2, 8, 1, 3, 1, 1, 4, 3, 7, 9, 9, 11, 12, 9, 15, 3, 15, 1, 14]],
  T: [
    [1, 1, 11, 1],
    [6, 1, 6, 15],
  ],
  U: [[1, 1, 1, 12, 3, 15, 9, 15, 11, 12, 11, 1]],
};

function glyphPath(ctx: Paint, letter: string, x: number): void {
  for (const line of glyphs[letter] ?? []) {
    ctx.beginPath();
    ctx.moveTo(x + line[0], line[1]);
    for (let i = 2; i < line.length; i += 2)
      ctx.lineTo(x + line[i], line[i + 1]);
    ctx.stroke();
  }
}

/** The series masthead is hand-built from path strokes, not a typeface. */
function series(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  const advance = 14;
  const natural = value
    .split('')
    .reduce((sum, letter) => sum + (letter === ' ' ? 7 : advance), 0);
  ctx.scale(width / natural, height / 18);
  ctx.lineCap = 'square';
  ctx.lineJoin = 'bevel';
  let cursor = 0;
  for (const letter of value) {
    if (letter === ' ') {
      cursor += 7;
      continue;
    }
    ctx.save();
    ctx.translate(0, -2 * Math.sin((cursor / natural) * Math.PI));
    ctx.lineWidth = 4.8;
    ctx.strokeStyle = '#071522';
    glyphPath(ctx, letter, cursor + 2.3);
    ctx.lineWidth = 4.3;
    ctx.strokeStyle = '#75402b';
    glyphPath(ctx, letter, cursor + 1.3);
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = '#061322';
    glyphPath(ctx, letter, cursor);
    const enamel = ctx.createLinearGradient(0, 0, 0, 17);
    enamel.addColorStop(0, '#fff6b7');
    enamel.addColorStop(0.35, '#f8c866');
    enamel.addColorStop(0.48, '#fff7d0');
    enamel.addColorStop(0.5, '#9a4b29');
    enamel.addColorStop(1, '#e8863f');
    ctx.lineWidth = 2.7;
    ctx.strokeStyle = enamel;
    glyphPath(ctx, letter, cursor);
    ctx.lineWidth = 0.36;
    ctx.strokeStyle = '#fff9d5';
    glyphPath(ctx, letter, cursor - 0.35);
    ctx.restore();
    cursor += advance;
  }
  ctx.restore();
}

function cascade(ctx: Paint, x: number, y: number, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 40, size / 40);
  ctx.strokeStyle = '#f8e5aa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 1);
  ctx.lineTo(39, 20);
  ctx.lineTo(20, 39);
  ctx.lineTo(1, 20);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#91e6dd';
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(11 + i * 6, 9);
    ctx.lineTo(16 + i * 6, 9);
    ctx.bezierCurveTo(21 + i * 6, 19, 8 + i * 6, 24, 13 + i * 6, 31);
    ctx.lineTo(8 + i * 6, 31);
    ctx.bezierCurveTo(4 + i * 6, 23, 17 + i * 6, 18, 11 + i * 6, 9);
    ctx.fill();
  }
  ctx.restore();
}

function backdrop(ctx: Paint): void {
  const sky = ctx.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#111025');
  sky.addColorStop(0.46, '#463c58');
  sky.addColorStop(1, '#071f32');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 400, 520);
  glow(ctx, 293, 267, 154, '#2af3df88');
  glow(ctx, 363, 151, 78, '#e4bfe055');
  ctx.fillStyle = '#e6e5c2';
  ctx.beginPath();
  ctx.arc(363, 151, 25, 0, Math.PI * 2);
  ctx.fill();
  glow(ctx, 363, 151, 57, '#fff9c688');
  // Rolling cloud banks catch the moonlight along their upper edges.
  for (const [x, y, rx, ry] of [
    [273, 131, 67, 17],
    [386, 161, 75, 22],
    [213, 163, 85, 19],
  ] as const) {
    const cloud = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    cloud.addColorStop(0, '#f5e9d683');
    cloud.addColorStop(0.18, '#8e98a4aa');
    cloud.addColorStop(0.55, '#35384dcc');
    cloud.addColorStop(1, '#111d2bef');
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  glow(ctx, 81, 144, 91, '#aeb8ff77');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = '#d6c9ff';
  ctx.lineWidth = 8;
  ctx.shadowColor = '#a999ff';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(103, 116);
  ctx.lineTo(81, 132);
  ctx.lineTo(95, 127);
  ctx.lineTo(62, 174);
  ctx.lineTo(77, 163);
  ctx.lineTo(51, 207);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.restore();
  // Glazed pool hall behind the figure.
  ctx.fillStyle = '#0b1e2b';
  ctx.beginPath();
  ctx.moveTo(0, 194);
  ctx.lineTo(83, 134);
  ctx.lineTo(400, 159);
  ctx.lineTo(400, 390);
  ctx.lineTo(0, 390);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    const x = 19 + i * 76;
    const pane = ctx.createLinearGradient(x, 176, x, 350);
    pane.addColorStop(0, '#536b7b');
    pane.addColorStop(0.55, '#0e677a');
    pane.addColorStop(1, '#20c5b6');
    ctx.fillStyle = pane;
    ctx.fillRect(x, 183, 65, 161);
    airbrushSpot(ctx, x + 39, 294, 60, '#aaf9e744');
    airbrushSpot(ctx, x + 32, 216, 38, '#e7ffec55');
    ctx.strokeStyle = '#e2f7eb44';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 8, 230);
    ctx.quadraticCurveTo(x + 38, 220, x + 59, 239);
    ctx.stroke();
    ctx.strokeStyle = '#9fe3d866';
    ctx.lineWidth = 2;
    for (let j = 0; j < 3; j += 1) {
      ctx.beginPath();
      ctx.moveTo(x + 3, 304 + j * 11);
      ctx.quadraticCurveTo(x + 31, 300 + j * 11, x + 63, 307 + j * 11);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#0b1b2a';
  for (let i = 0; i < 6; i += 1) ctx.fillRect(i * 76 + 13, 166, 7, 192);
  // A looming cylindrical pressure filter and its alarm gauge.
  const metal = ctx.createLinearGradient(273, 0, 385, 0);
  metal.addColorStop(0, '#122734');
  metal.addColorStop(0.36, '#8499a0');
  metal.addColorStop(0.58, '#293c47');
  metal.addColorStop(1, '#0a1927');
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.ellipse(329, 229, 52, 18, 0, Math.PI, 0);
  ctx.lineTo(381, 387);
  ctx.ellipse(329, 387, 52, 18, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b8d8d1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(326, 249, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e6e2c8';
  ctx.beginPath();
  ctx.arc(326, 249, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b43c30';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(326, 249, 16, -0.6, 0.6);
  ctx.stroke();
  ctx.strokeStyle = '#1d2630';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(326, 249);
  ctx.lineTo(339, 239);
  ctx.stroke();
  lensFlare(ctx, 338, 242, 9);
  ctx.strokeStyle = '#d8f6eeaa';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(375, 287);
  ctx.lineTo(387, 279);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1)
    airbrushSpot(ctx, 383 - i * 8, 280 - i * 9, 23 + i * 3, '#e4fff477');
  // A hint of an observer on the far side of the glass.
  ctx.fillStyle = '#10212dcc';
  ctx.beginPath();
  ctx.arc(72, 252, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(52, 337);
  ctx.lineTo(55, 275);
  ctx.quadraticCurveTo(72, 258, 89, 277);
  ctx.lineTo(95, 337);
  ctx.fill();
}

function poolman(ctx: Paint): void {
  ctx.save();
  // Only the pool-facing edge catches turquoise light; the body has no halo.
  ctx.shadowColor = '#71dacf88';
  ctx.shadowBlur = 11;
  const denim = ctx.createLinearGradient(92, 300, 260, 520);
  denim.addColorStop(0, '#85a9b1');
  denim.addColorStop(0.24, '#3c7193');
  denim.addColorStop(0.65, '#173d61');
  denim.addColorStop(1, '#091c34');
  ctx.fillStyle = denim;
  ctx.beginPath();
  ctx.moveTo(108, 348);
  ctx.bezierCurveTo(130, 334, 223, 333, 253, 350);
  ctx.lineTo(261, 520);
  ctx.lineTo(204, 520);
  ctx.lineTo(182, 431);
  ctx.lineTo(164, 520);
  ctx.lineTo(103, 520);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#75a9ba77';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(126, 397);
  ctx.quadraticCurveTo(123, 448, 120, 511);
  ctx.moveTo(228, 400);
  ctx.quadraticCurveTo(240, 453, 243, 517);
  ctx.stroke();
  // The raised arm is foreshortened, with a sleeve, bare forearm and hand.
  const shirt = ctx.createLinearGradient(99, 258, 266, 385);
  shirt.addColorStop(0, '#fff3d7');
  shirt.addColorStop(0.33, '#f0e8d4');
  shirt.addColorStop(0.69, '#9baeb0');
  shirt.addColorStop(1, '#2b4557');
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(144, 261);
  ctx.quadraticCurveTo(182, 247, 218, 259);
  ctx.quadraticCurveTo(241, 263, 259, 287);
  ctx.lineTo(272, 333);
  ctx.lineTo(245, 347);
  ctx.lineTo(242, 383);
  ctx.lineTo(109, 385);
  ctx.lineTo(105, 317);
  ctx.quadraticCurveTo(111, 277, 144, 261);
  ctx.fill();
  ctx.strokeStyle = '#fff9e288';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(118, 297);
  ctx.quadraticCurveTo(134, 308, 145, 332);
  ctx.moveTo(233, 276);
  ctx.quadraticCurveTo(215, 297, 211, 322);
  ctx.stroke();
  ctx.strokeStyle = '#5c758477';
  ctx.beginPath();
  ctx.moveTo(122, 352);
  ctx.quadraticCurveTo(166, 336, 198, 355);
  ctx.moveTo(188, 365);
  ctx.quadraticCurveTo(222, 350, 243, 368);
  ctx.stroke();
  // Neck, jaw and face use several translucent planes over a warm-to-cool base.
  const neck = ctx.createLinearGradient(160, 249, 213, 281);
  neck.addColorStop(0, '#dfb38c');
  neck.addColorStop(1, '#6a5353');
  ctx.fillStyle = neck;
  ctx.fillRect(163, 246, 48, 33);
  const skin = ctx.createLinearGradient(143, 184, 225, 258);
  skin.addColorStop(0, '#ffe3ab');
  skin.addColorStop(0.28, '#e7b084');
  skin.addColorStop(0.62, '#a87063');
  skin.addColorStop(1, '#36546a');
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(146, 196);
  ctx.quadraticCurveTo(174, 174, 208, 187);
  ctx.quadraticCurveTo(226, 196, 221, 225);
  ctx.lineTo(213, 244);
  ctx.quadraticCurveTo(204, 262, 187, 268);
  ctx.lineTo(168, 258);
  ctx.quadraticCurveTo(151, 250, 147, 230);
  ctx.closePath();
  ctx.fill();
  const cheek = ctx.createRadialGradient(162, 212, 2, 169, 224, 49);
  cheek.addColorStop(0, '#ffe2aa99');
  cheek.addColorStop(0.5, '#e4a07344');
  cheek.addColorStop(1, '#7b4b4b00');
  ctx.fillStyle = cheek;
  ctx.fillRect(144, 189, 74, 77);
  ctx.fillStyle = '#603f48aa';
  ctx.beginPath();
  ctx.moveTo(202, 211);
  ctx.quadraticCurveTo(215, 214, 212, 229);
  ctx.lineTo(201, 238);
  ctx.lineTo(205, 224);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f8c89788';
  ctx.beginPath();
  ctx.moveTo(178, 218);
  ctx.lineTo(180, 235);
  ctx.lineTo(187, 238);
  ctx.lineTo(177, 240);
  ctx.closePath();
  ctx.fill();
  // A broad nose catches warm light on its bridge and cold light at its tip.
  ctx.fillStyle = '#663f49aa';
  ctx.beginPath();
  ctx.moveTo(178, 211);
  ctx.lineTo(173, 235);
  ctx.quadraticCurveTo(180, 243, 190, 238);
  ctx.lineTo(185, 235);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffe4b0';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(180, 214);
  ctx.lineTo(177, 232);
  ctx.quadraticCurveTo(178, 235, 183, 236);
  ctx.stroke();
  ctx.fillStyle = '#92dcd5aa';
  ctx.beginPath();
  ctx.ellipse(190, 237, 3, 2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Stubble follows the jaw rather than reading as a floating moustache.
  ctx.fillStyle = '#293c48a6';
  ctx.beginPath();
  ctx.moveTo(149, 231);
  ctx.quadraticCurveTo(157, 246, 170, 251);
  ctx.quadraticCurveTo(186, 259, 196, 251);
  ctx.quadraticCurveTo(210, 242, 217, 226);
  ctx.lineTo(212, 244);
  ctx.quadraticCurveTo(202, 262, 187, 267);
  ctx.lineTo(168, 258);
  ctx.quadraticCurveTo(151, 250, 149, 231);
  ctx.fill();
  ctx.strokeStyle = '#e4ab83';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(166, 254);
  ctx.quadraticCurveTo(184, 267, 204, 251);
  ctx.stroke();
  // Open eyes are outlined by heavy, inward-sloping brows.
  for (const [eyeX, eyeY, cool] of [
    [162, 220, false],
    [199, 219, true],
  ] as const) {
    ctx.fillStyle = cool ? '#d4f5ee' : '#fff1d3';
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeY, 8, 4.5, cool ? 0.08 : -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#23394b';
    ctx.beginPath();
    ctx.ellipse(eyeX + 1, eyeY, 3.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#071827';
    ctx.beginPath();
    ctx.arc(eyeX + 1, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY - 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#293040';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(153, 210);
  ctx.quadraticCurveTo(162, 207, 173, 213);
  ctx.moveTo(189, 212);
  ctx.quadraticCurveTo(200, 205, 209, 207);
  ctx.stroke();
  ctx.strokeStyle = '#352b35';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(174, 248);
  ctx.quadraticCurveTo(186, 245, 198, 247);
  ctx.stroke();
  ctx.strokeStyle = '#f4c39688';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(158, 237);
  ctx.quadraticCurveTo(166, 246, 171, 249);
  ctx.moveTo(206, 235);
  ctx.quadraticCurveTo(202, 248, 193, 256);
  ctx.stroke();
  // Flat cap: rounded crown, dark band and a projecting, curved peak.
  const cap = ctx.createLinearGradient(139, 175, 222, 209);
  cap.addColorStop(0, '#a0b0a0');
  cap.addColorStop(0.5, '#47657a');
  cap.addColorStop(1, '#152b43');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.moveTo(138, 197);
  ctx.quadraticCurveTo(138, 177, 160, 173);
  ctx.quadraticCurveTo(204, 160, 222, 187);
  ctx.lineTo(218, 201);
  ctx.quadraticCurveTo(178, 193, 138, 202);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#19364c';
  ctx.beginPath();
  ctx.moveTo(140, 196);
  ctx.quadraticCurveTo(182, 190, 220, 197);
  ctx.quadraticCurveTo(199, 206, 170, 205);
  ctx.quadraticCurveTo(149, 207, 133, 202);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a7d8cb99';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(137, 201);
  ctx.quadraticCurveTo(175, 192, 215, 199);
  ctx.stroke();
  // Dungaree straps cross the shirt and join the fitted bib.
  const bib = ctx.createLinearGradient(129, 282, 247, 410);
  bib.addColorStop(0, '#77a6b3');
  bib.addColorStop(0.4, '#2d6487');
  bib.addColorStop(1, '#102b4e');
  ctx.fillStyle = bib;
  ctx.beginPath();
  ctx.moveTo(133, 282);
  ctx.lineTo(156, 286);
  ctx.lineTo(164, 310);
  ctx.lineTo(205, 308);
  ctx.lineTo(215, 282);
  ctx.lineTo(234, 292);
  ctx.lineTo(248, 408);
  ctx.lineTo(116, 410);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#92c4c788';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(141, 291);
  ctx.lineTo(159, 320);
  ctx.lineTo(210, 320);
  ctx.lineTo(223, 291);
  ctx.moveTo(129, 394);
  ctx.quadraticCurveTo(184, 408, 238, 393);
  ctx.stroke();
  ctx.fillStyle = '#f0c777';
  ctx.fillRect(152, 304, 9, 9);
  ctx.fillRect(208, 304, 9, 9);
  ctx.strokeStyle = '#a8cbd0';
  ctx.lineWidth = 2;
  ctx.strokeRect(160, 342, 53, 38);
  ctx.beginPath();
  ctx.moveTo(166, 346);
  ctx.lineTo(166, 373);
  ctx.lineTo(206, 373);
  ctx.stroke();
  // Test-kit case and the hand curved around its handle.
  ctx.fillStyle = '#263846';
  ctx.fillRect(218, 383, 43, 59);
  ctx.strokeStyle = '#c6c7ae';
  ctx.lineWidth = 3;
  ctx.strokeRect(222, 386, 36, 51);
  ctx.strokeRect(230, 378, 19, 9);
  ctx.fillStyle = '#e2ba74';
  ctx.fillRect(230, 397, 7, 23);
  ctx.fillStyle = '#b6e4d5';
  ctx.fillRect(239, 397, 8, 23);
  const leftArm = ctx.createLinearGradient(109, 314, 126, 407);
  leftArm.addColorStop(0, '#f4c995');
  leftArm.addColorStop(1, '#87645b');
  ctx.strokeStyle = leftArm;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(113, 314);
  ctx.quadraticCurveTo(98, 375, 122, 401);
  ctx.quadraticCurveTo(165, 430, 217, 406);
  ctx.stroke();
  ctx.fillStyle = '#d7a77c';
  ctx.beginPath();
  ctx.ellipse(220, 403, 15, 10, -0.4, 0, Math.PI * 2);
  ctx.fill();
  const sleeve = ctx.createLinearGradient(230, 275, 269, 332);
  sleeve.addColorStop(0, '#fff3d8');
  sleeve.addColorStop(1, '#466274');
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(236, 294);
  ctx.quadraticCurveTo(256, 314, 273, 321);
  ctx.stroke();
  ctx.strokeStyle = '#25394b';
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(271, 322);
  ctx.quadraticCurveTo(283, 309, 284, 277);
  ctx.stroke();
  const forearm = ctx.createLinearGradient(284, 264, 307, 297);
  forearm.addColorStop(0, '#f2c394');
  forearm.addColorStop(1, '#8a6461');
  ctx.strokeStyle = forearm;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(284, 280);
  ctx.lineTo(300, 251);
  ctx.stroke();
  // The adjustable spanner has a tapered flat shank, open jaws and a worm.
  ctx.save();
  ctx.translate(300, 253);
  ctx.rotate(0.25);
  const steel = ctx.createLinearGradient(-13, 0, 14, 0);
  steel.addColorStop(0, '#3c5968');
  steel.addColorStop(0.23, '#e9f3ee');
  steel.addColorStop(0.5, '#7f9aa5');
  steel.addColorStop(0.76, '#f8f5db');
  steel.addColorStop(1, '#455969');
  ctx.fillStyle = steel;
  ctx.strokeStyle = '#263b4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 3);
  ctx.quadraticCurveTo(0, 10, 8, 3);
  ctx.lineTo(9, -68);
  ctx.lineTo(16, -79);
  ctx.lineTo(16, -99);
  ctx.lineTo(7, -99);
  ctx.lineTo(6, -87);
  ctx.lineTo(-6, -87);
  ctx.lineTo(-8, -105);
  ctx.lineTo(-15, -105);
  ctx.lineTo(-17, -84);
  ctx.quadraticCurveTo(-13, -72, -9, -68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#263a48';
  ctx.beginPath();
  ctx.ellipse(0, -35, 3.2, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#142c3b';
  ctx.fillRect(-7, -86, 13, 9);
  ctx.fillStyle = '#bbcbd1';
  ctx.fillRect(-6, -85, 11, 6);
  ctx.strokeStyle = '#415666';
  ctx.lineWidth = 1;
  for (let tooth = -5; tooth < 5; tooth += 2) {
    ctx.beginPath();
    ctx.moveTo(tooth, -85);
    ctx.lineTo(tooth + 2, -79);
    ctx.stroke();
  }
  ctx.strokeStyle = '#f6f6df';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-5, -65);
  ctx.lineTo(-5, -16);
  ctx.stroke();
  ctx.restore();
  // Palm and curled fingers sit in front of the metal handle.
  ctx.fillStyle = '#b8876e';
  ctx.beginPath();
  ctx.ellipse(299, 249, 10, 13, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e9b88d';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  for (let finger = 0; finger < 3; finger += 1) {
    ctx.beginPath();
    ctx.moveTo(290 + finger * 3, 243 + finger * 4);
    ctx.quadraticCurveTo(
      299 + finger * 3,
      239 + finger * 4,
      306 + finger * 2,
      245 + finger * 4,
    );
    ctx.stroke();
  }
  ctx.strokeStyle = '#795b59';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(295, 259);
  ctx.quadraticCurveTo(303, 264, 308, 254);
  ctx.stroke();
  ctx.restore();
  airbrushSpot(ctx, 105, 331, 42, '#fff1c354');
}

function adventureLabel(ctx: Paint, value: string, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.13);
  ctx.shadowColor = '#061322aa';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i < 32; i += 1) {
    const a = (i * Math.PI) / 16 - Math.PI / 2;
    const r = i % 2 ? 42 : 52;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const gold = ctx.createRadialGradient(-15, -20, 0, 0, 0, 57);
  gold.addColorStop(0, '#fff3b9');
  gold.addColorStop(1, '#c68638');
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#4d2d23';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#192c3d';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = value.split(' ');
  ctx.fillText(words.slice(0, 2).join(' '), 0, -10, 78);
  ctx.fillText(words.slice(2).join(' '), 0, 7, 78);
  ctx.restore();
}

function colourSticker(ctx: Paint, value: string): void {
  ctx.save();
  ctx.translate(291, 404);
  ctx.rotate(0.075);
  ctx.shadowColor = '#04131acc';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#eee8ca';
  ctx.fillRect(-92, -19, 184, 48);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#273e4b';
  ctx.lineWidth = 2;
  ctx.strokeRect(-92, -19, 184, 48);
  ega.forEach((colour, i) => {
    ctx.fillStyle = colour;
    ctx.fillRect(-86 + i * 11, -13, 10, 13);
  });
  ctx.fillStyle = '#142a3c';
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillText(value, 0, 20, 171);
  ctx.restore();
}

function front(ctx: Paint, title: SoftwareTitle): void {
  const art = title.questArt!;
  backdrop(ctx);
  poolman(ctx);
  const shade = ctx.createLinearGradient(0, 0, 0, 520);
  shade.addColorStop(0, '#070f21ee');
  shade.addColorStop(0.23, '#08132966');
  shade.addColorStop(0.72, '#08132900');
  shade.addColorStop(1, '#081329dd');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 400, 520);
  ctx.fillStyle = '#d9a454';
  ctx.fillRect(0, 0, 400, 6);
  cascade(ctx, 15, 15, 26);
  ctx.fillStyle = '#f1e6ce';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(title.publisher, 48, 34, 162);
  series(ctx, art.series, 22, 54, 350, 58);
  ctx.fillStyle = '#09182b';
  ctx.beginPath();
  ctx.moveTo(143, 115);
  ctx.lineTo(257, 115);
  ctx.lineTo(243, 165);
  ctx.lineTo(157, 165);
  ctx.closePath();
  ctx.fill();
  series(ctx, art.volume, 170, 115, 60, 45);
  ctx.fillStyle = '#e8af62';
  ctx.beginPath();
  ctx.moveTo(42, 444);
  ctx.quadraticCurveTo(200, 430, 358, 444);
  ctx.lineTo(348, 479);
  ctx.quadraticCurveTo(200, 466, 52, 479);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#14253a';
  ctx.font = 'italic bold 25px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(art.subtitle, 200, 463, 295);
  ctx.textAlign = 'left';
  adventureLabel(ctx, title.frontBadges[0], 67, 390);
  colourSticker(ctx, title.frontBadges[1]);
  ctx.fillStyle = '#f0e1c7';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText(title.media, 18, 504, 160);
  if (title.ageRating) {
    ctx.fillStyle = '#f0e1c7';
    ctx.fillRect(352, 484, 35, 28);
    ctx.fillStyle = '#172536';
    ctx.font = 'bold 19px Arial, sans-serif';
    ctx.fillText(title.ageRating, 355, 505, 30);
  }
  ctx.save();
  ctx.translate(339, 12);
  ctx.rotate(0.09);
  ctx.fillStyle = '#f7edc9';
  ctx.fillRect(-7, -6, 56, 31);
  ctx.strokeStyle = '#20283a';
  ctx.strokeRect(-7, -6, 56, 31);
  ctx.fillStyle = '#20283a';
  ctx.font = 'bold 15px Arial, sans-serif';
  if (title.price.label) {
    ctx.font = 'bold 7px Arial, sans-serif';
    ctx.fillText(title.price.label, -3, 3, 51);
    ctx.font = 'bold 15px Arial, sans-serif';
  }
  ctx.fillText(title.price.amount, -4, title.price.label ? 19 : 15, 52);
  ctx.restore();
}

const ega = [
  '#000000',
  '#0000aa',
  '#00aa00',
  '#00aaaa',
  '#aa0000',
  '#aa00aa',
  '#aa5500',
  '#aaaaaa',
  '#555555',
  '#5555ff',
  '#55ff55',
  '#55ffff',
  '#ff5555',
  '#ff55ff',
  '#ffff55',
  '#ffffff',
];

function shot(
  ctx: Paint,
  title: SoftwareTitle,
  index: number,
  x: number,
  y: number,
): void {
  const block = (
    colour: number,
    bx: number,
    by: number,
    w: number,
    h: number,
  ): void => {
    ctx.fillStyle = ega[colour];
    ctx.fillRect(bx * 4, by * 4, w * 4, h * 4);
  };
  ctx.save();
  ctx.translate(x, y);
  block(0, 0, 0, 44, 16);
  ctx.save();
  ctx.beginPath();
  ctx.rect(4, 8, 168, 48);
  ctx.clip();
  block(index === 1 ? 1 : 9, 1, 2, 42, 6);
  block(index === 1 ? 3 : 7, 1, 8, 42, 6);
  block(index === 1 ? 1 : 8, 1, 14, 42, 1);
  if (index === 0 || index === 3) {
    for (let n = 0; n < 3; n += 1) {
      const at = 3 + n * 11;
      block(8, at, 5, 7, 9);
      block(7, at + 1, 6, 5, 7);
      block(15, at + 2, 8, 3, 2);
      block(4, at + 4, 8, 1, 1);
      block(0, at + 4, 8, 1, 1);
      block(6, at + 2, 12, 3, 1);
    }
    block(6, 38, 9, 3, 4);
    block(14, 38, 8, 3, 1);
  } else if (index === 1) {
    block(15, 1, 8, 42, 1);
    block(3, 1, 9, 42, 5);
    for (let n = 0; n < 4; n += 1) {
      block(15, 4 + n * 10, 10, 7, 1);
      block(11, 5 + n * 10, 12, 6, 1);
    }
    block(8, 35, 3, 2, 5);
    block(7, 32, 3, 8, 1);
    block(15, 33, 2, 6, 1);
  } else {
    block(5, 1, 7, 42, 7);
    block(6, 4, 9, 23, 5);
    block(14, 6, 10, 18, 1);
    block(7, 31, 5, 8, 8);
    block(8, 32, 6, 6, 7);
    block(14, 15, 8, 2, 1);
    block(15, 15, 7, 2, 1);
  }
  // Sonny is a small, readable blue walking sprite in every scene.
  const px = [26, 16, 27, 19][index];
  block(14, px + 1, 7, 2, 2);
  block(1, px, 9, 4, 3);
  block(9, px + 1, 9, 2, 2);
  block(1, px, 12, 1, 2);
  block(1, px + 3, 12, 1, 2);
  ctx.restore();
  block(0, 0, 0, 44, 2);
  block(0, 0, 14, 44, 2);
  ctx.fillStyle = ega[15];
  ctx.font = 'bold 6px monospace';
  ctx.fillText(title.questArt!.screenshots[index].status, 4, 6, 165);
  ctx.fillText(title.questArt!.screenshots[index].command, 4, 62, 165);
  ctx.restore();
  ctx.fillStyle = '#e9d3a7';
  ctx.font = 'bold 9px Georgia, serif';
  ctx.fillText(title.screenshots[index], x + 5, y + 76, 162);
}

function back(
  ctx: Paint,
  title: SoftwareTitle,
  barcode: Furniture['barcode'],
): void {
  const art = title.questArt!;
  const g = ctx.createLinearGradient(0, 0, 400, 520);
  g.addColorStop(0, '#10162b');
  g.addColorStop(0.5, '#243c4c');
  g.addColorStop(1, '#101326');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 400, 520);
  glow(ctx, 355, 243, 148, '#23b4a555');
  series(ctx, art.series, 19, 13, 304, 37);
  series(ctx, art.volume, 335, 13, 41, 36);
  ctx.fillStyle = '#edc883';
  ctx.font = 'italic bold 17px Georgia, serif';
  ctx.fillText(art.headline, 18, 69, 366);
  ctx.fillStyle = '#f2ead3';
  ctx.font = '12px Georgia, serif';
  const words = title.blurb.split(' ');
  let line = '';
  let y = 91;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 365) {
      ctx.fillText(line, 19, y);
      y += 14;
      line = word;
    } else line = next;
  }
  if (line) ctx.fillText(line, 19, y);
  ctx.fillStyle = '#f2c36f';
  ctx.font = 'bold 10px Arial, sans-serif';
  title.features
    .slice(0, 3)
    .forEach((feature, i) =>
      ctx.fillText(`◆ ${feature}`, 19, 166 + i * 16, 365),
    );
  title.screenshots
    .slice(0, 4)
    .forEach((_, i) =>
      shot(ctx, title, i, 17 + (i % 2) * 192, 210 + Math.floor(i / 2) * 81),
    );
  reviewQuote(
    ctx,
    art.review.quote,
    art.review.magazine,
    art.review.score,
    17,
    378,
    366,
  );
  ctx.fillStyle = '#eadfbe';
  ctx.fillRect(16, 417, 368, 64);
  ctx.fillStyle = '#16283a';
  ctx.font = 'bold 9px Arial, sans-serif';
  const req = title.requirements;
  const values = [
    req.cpu,
    req.ram,
    req.disk,
    req.graphics,
    req.sound,
    req.os,
    req.drive,
  ];
  const rows = values.map(
    (value, index) => `${art.requirementLabels[index]}  ${value}`,
  );
  rows.forEach((row, i) => {
    const x = 23 + (i < 4 ? 0 : 185);
    const width = i < 4 ? 176 : 169;
    ctx.fillText(row, x, 429 + (i < 4 ? i : i - 4) * 13, width);
  });
  cascade(ctx, 16, 487, 27);
  ctx.fillStyle = '#f1e5c8';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(title.publisher, 50, 505, 143);
  barcode(ctx, title, 207, 485, 177, 31);
  ctx.font = '7px Georgia, serif';
  ctx.fillStyle = '#fff4d4';
  ctx.fillText(
    `© ${title.year} ${title.publisher}. ${art.copyright}`,
    17,
    518,
    184,
  );
}

function spine(ctx: Paint, title: SoftwareTitle, left: boolean): void {
  const art = title.questArt!;
  const g = ctx.createLinearGradient(0, 0, 110, 520);
  g.addColorStop(0, '#11162d');
  g.addColorStop(0.55, '#285567');
  g.addColorStop(1, '#101629');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 110, 520);
  ctx.fillStyle = '#d7a656';
  ctx.fillRect(left ? 104 : 0, 0, 6, 520);
  ctx.fillStyle = '#081a2a';
  ctx.beginPath();
  ctx.moveTo(55, 12);
  ctx.lineTo(94, 59);
  ctx.lineTo(55, 106);
  ctx.lineTo(16, 59);
  ctx.closePath();
  ctx.fill();
  series(ctx, art.volume, 33, 38, 44, 45);
  ctx.save();
  ctx.translate(55, 258);
  ctx.rotate(left ? -Math.PI / 2 : Math.PI / 2);
  series(ctx, art.series, -129, -21, 258, 42);
  ctx.restore();
  ctx.fillStyle = '#f4dfb7';
  ctx.font = 'italic bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  const subtitleWords = art.subtitle.split(' ');
  ctx.fillText(subtitleWords.slice(0, -1).join(' '), 55, 431, 78);
  ctx.fillText(subtitleWords.at(-1) ?? '', 55, 447, 78);
  ctx.textAlign = 'left';
  cascade(ctx, 38, 468, 34);
}

function top(ctx: Paint, title: SoftwareTitle): void {
  const art = title.questArt!;
  ctx.fillStyle = '#132d3f';
  ctx.fillRect(0, 0, 400, 110);
  ctx.fillStyle = '#d7a656';
  ctx.fillRect(0, 0, 400, 6);
  cascade(ctx, 13, 30, 44);
  series(ctx, art.series, 70, 26, 260, 43);
  series(ctx, art.volume, 345, 25, 36, 40);
  ctx.fillStyle = '#f1deb7';
  ctx.font = 'italic 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(art.subtitle, 200, 92, 270);
  ctx.textAlign = 'left';
}

function bottom(
  ctx: Paint,
  title: SoftwareTitle,
  barcode: Furniture['barcode'],
): void {
  ctx.fillStyle = '#172b3a';
  ctx.fillRect(0, 0, 400, 110);
  barcode(ctx, title, 10, 12, 178, 68);
  ctx.fillStyle = '#f1deb7';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(`© ${title.year} ${title.publisher}`, 200, 35, 190);
  ctx.font = '10px Courier New, monospace';
  ctx.fillText(title.media, 200, 60, 190);
  ctx.fillText(title.id.toUpperCase(), 200, 82, 190);
}

interface Furniture {
  barcode: (
    ctx: Paint,
    title: SoftwareTitle,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
}

export function drawQuestBoxFace(
  ctx: Paint,
  title: SoftwareTitle,
  face: BoxFace,
  furniture: Furniture,
): void {
  if (face === 'front') front(ctx, title);
  else if (face === 'back') back(ctx, title, furniture.barcode);
  else if (face === 'left' || face === 'right')
    spine(ctx, title, face === 'left');
  else if (face === 'top') top(ctx, title);
  else bottom(ctx, title, furniture.barcode);
}
