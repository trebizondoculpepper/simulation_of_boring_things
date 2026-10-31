import type { BoxFace, SoftwareTitle } from '../logic/software-boxes';
import {
  airbrushSpot,
  burst,
  glow,
  lensFlare,
  reviewQuote,
  sticker,
} from './software-box-airbrush';
import type { GameBoxFurniture } from './software-box-game-art';

type Paint = CanvasRenderingContext2D;

function polygon(
  ctx: Paint,
  points: readonly (readonly [number, number])[],
  colour: string | CanvasGradient,
): void {
  ctx.fillStyle = colour;
  ctx.beginPath();
  points.forEach(([x, y], index) =>
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
  );
  ctx.closePath();
  ctx.fill();
}

function publisher(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
  colour: string,
): void {
  furniture.logo(ctx, title, 15, 477, 30, colour);
  ctx.fillStyle = colour;
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.fillText(title.publisher, 52, 498, 137);
}

function price(ctx: Paint, title: SoftwareTitle): void {
  ctx.save();
  ctx.translate(355, 22);
  ctx.rotate(0.1);
  ctx.fillStyle = '#fff8dd';
  ctx.shadowColor = '#06172b';
  ctx.shadowBlur = 7;
  ctx.fillRect(-5, -5, 46, 29);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#182b3a';
  ctx.strokeRect(-5, -5, 46, 29);
  ctx.fillStyle = '#142536';
  ctx.font = 'bold 14px Arial Black, sans-serif';
  ctx.fillText(title.price.amount, -3, 15, 43);
  ctx.restore();
}

function age(ctx: Paint, title: SoftwareTitle, dark: string): void {
  if (!title.ageRating) return;
  ctx.fillStyle = '#fff8df';
  ctx.fillRect(357, 473, 34, 34);
  ctx.fillStyle = dark;
  ctx.font = '900 20px Arial Black, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.ageRating, 358, 490, 32);
  ctx.textBaseline = 'alphabetic';
}

function goldTitle(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  width: number,
  size = 68,
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#ffeb76';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#fff0aa';
  ctx.strokeText(value, x, y, width);
  ctx.shadowBlur = 0;
  for (let offset = 10; offset > 0; offset -= 2) {
    ctx.strokeStyle = offset > 4 ? '#772822' : '#d14a25';
    ctx.lineWidth = 8;
    ctx.strokeText(value, x + offset, y + offset, width);
  }
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#64261f';
  ctx.strokeText(value, x, y, width);
  const metal = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  metal.addColorStop(0, '#fffbd5');
  metal.addColorStop(0.38, '#ffe674');
  metal.addColorStop(0.48, '#fff8bc');
  metal.addColorStop(0.51, '#df8a2e');
  metal.addColorStop(1, '#a83b24');
  ctx.fillStyle = metal;
  ctx.fillText(value, x, y, width);
  ctx.restore();
}

function sun(ctx: Paint): void {
  glow(ctx, 303, 119, 155, '#fff49daa');
  ctx.fillStyle = '#fff1a1';
  ctx.beginPath();
  ctx.arc(303, 119, 56, 0, Math.PI * 2);
  ctx.fill();
  lensFlare(ctx, 305, 113, 38);
}

function parasol(ctx: Paint, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#735a45';
  ctx.fillRect(-1, 1, 2, 15);
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 ? '#fff7d0' : '#e64c40';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 12, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function lidoScene(ctx: Paint, compact = false): void {
  const sky = ctx.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#087fc1');
  sky.addColorStop(0.42, '#75dbe2');
  sky.addColorStop(1, '#f1cf84');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 400, 520);
  sun(ctx);
  // Park, sea and the promenade give the pool a horizon beyond the roof.
  polygon(
    ctx,
    [
      [0, 224],
      [400, 197],
      [400, 278],
      [0, 300],
    ],
    '#399eb3',
  );
  for (let i = 0; i < 22; i += 1) {
    const x = i * 21;
    softEllipse(ctx, x, 231 - i * 0.9, 18, 8, '#306d7d66');
  }
  polygon(
    ctx,
    [
      [0, 270],
      [400, 214],
      [400, 520],
      [0, 520],
    ],
    '#e9c88b',
  );
  for (let i = 0; i < 5; i += 1) {
    const inset = i * 9;
    polygon(
      ctx,
      [
        [0, 283 + inset],
        [319, 213 + inset],
        [400, 239 + inset],
        [400, 458 - inset],
        [87, 520 - inset],
        [0, 447 - inset],
      ],
      i % 2 ? '#e7dab4' : '#fff0cc',
    );
  }
  // Long foreshortened water plane, substantial coping and a visible near wall.
  polygon(
    ctx,
    [
      [16, 315],
      [305, 243],
      [380, 271],
      [380, 412],
      [88, 491],
      [16, 433],
    ],
    '#348a9f',
  );
  const pool = ctx.createLinearGradient(110, 265, 275, 473);
  pool.addColorStop(0, '#a6fff0');
  pool.addColorStop(0.48, '#2acdcc');
  pool.addColorStop(1, '#087999');
  polygon(
    ctx,
    [
      [27, 322],
      [307, 255],
      [368, 278],
      [368, 403],
      [89, 478],
      [27, 423],
    ],
    pool,
  );
  polygon(
    ctx,
    [
      [16, 433],
      [88, 491],
      [380, 412],
      [368, 403],
      [89, 478],
      [27, 423],
    ],
    '#12627c',
  );
  ctx.strokeStyle = '#d9fff3aa';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.moveTo(32 + i * 35, 322 - i * 8);
    ctx.bezierCurveTo(
      70 + i * 31,
      345 - i * 5,
      34 + i * 42,
      406 - i * 2,
      98 + i * 33,
      464 - i * 8,
    );
    ctx.stroke();
  }
  // The tower rises from the far coping, with several white diving platforms.
  polygon(
    ctx,
    [
      [183, 226],
      [217, 218],
      [217, 321],
      [183, 330],
    ],
    '#b4d9d5',
  );
  polygon(
    ctx,
    [
      [193, 224],
      [204, 221],
      [204, 321],
      [193, 324],
    ],
    '#f7f6e4',
  );
  for (let i = 0; i < 4; i += 1)
    polygon(
      ctx,
      [
        [178 - i * 6, 247 + i * 20],
        [222, 236 + i * 20],
        [223, 243 + i * 20],
        [178 - i * 6, 254 + i * 20],
      ],
      '#fff9e4',
    );
  polygon(
    ctx,
    [
      [169, 217],
      [225, 202],
      [247, 209],
      [189, 225],
    ],
    '#fffdf0',
  );
  // Ice-cream kiosk and its striped awning sit behind the terrace crowd.
  polygon(
    ctx,
    [
      [8, 257],
      [77, 239],
      [77, 289],
      [8, 307],
    ],
    '#fff1cb',
  );
  for (let i = 0; i < 8; i += 1)
    polygon(
      ctx,
      [
        [i * 10, 252 - i * 2],
        [(i + 1) * 10, 250 - i * 2],
        [(i + 1) * 10, 260 - i * 2],
        [i * 10, 262 - i * 2],
      ],
      i % 2 ? '#fff7de' : '#e95a40',
    );
  ctx.fillStyle = '#7a4939';
  ctx.fillRect(29, 273, 22, 19);
  for (const [x, y, scale] of [
    [50, 304, 0.8],
    [330, 246, 0.7],
    [348, 440, 1.1],
    [65, 454, 1],
    [104, 280, 0.7],
    [312, 435, 0.8],
  ] as const)
    parasol(ctx, x, y, scale);
  // Seeded swimmers and promenaders, with separate caps and swimsuit colours.
  for (let i = 0; i < 190; i += 1) {
    const u = seeded(i, 13);
    const v = seeded(i, 14);
    const x = 36 + u * 317;
    const y = 311 - u * 57 + v * (111 + u * 42);
    const size = 1.4 + v * 2;
    const hue = ['#f04e4d', '#fff2ab', '#173d78', '#fb8b44', '#e7f8df'][i % 5];
    ctx.fillStyle = i % 3 ? '#f4c9a3' : hue;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hue;
    ctx.fillRect(x - size * 0.8, y + size, size * 1.6, size * 2);
    if (i % 4 === 0) {
      ctx.strokeStyle = '#effff1aa';
      ctx.beginPath();
      ctx.arc(x, y + 4, size * 2.5, 0.1, 2.7);
      ctx.stroke();
    }
  }
  if (!compact) {
    airbrushSpot(ctx, 208, 336, 105, '#ffffff20');
    lensFlare(ctx, 120, 329, 7);
  }
}

function tycoon(ctx: Paint): void {
  ctx.save();
  ctx.translate(61, 370);
  ctx.rotate(-0.12);
  // A broad striped jacket makes a clear silhouette against the busy pool.
  ctx.fillStyle = '#fff4d5';
  ctx.beginPath();
  ctx.ellipse(0, 77, 71, 75, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 77, 71, 75, -0.2, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = '#d03730';
  ctx.lineWidth = 11;
  for (let i = -6; i <= 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 17 - 35, 156);
    ctx.lineTo(i * 17 + 24, 7);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#f4c39c';
  ctx.beginPath();
  ctx.arc(8, -13, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a4939';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const x of [-18, 34]) {
    ctx.fillStyle = '#e97b72';
    ctx.beginPath();
    ctx.arc(x, 1, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3b302c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-21, -25);
  ctx.lineTo(-7, -25);
  ctx.moveTo(25, -25);
  ctx.quadraticCurveTo(33, -34, 41, -25);
  ctx.stroke();
  ctx.fillStyle = '#342b29';
  ctx.beginPath();
  ctx.arc(-14, -25, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7e0';
  ctx.beginPath();
  ctx.ellipse(8, 17, 24, 14, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#823d38';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#44322c';
  ctx.beginPath();
  ctx.ellipse(-4, 8, 16, 6, 0.3, Math.PI, Math.PI * 2);
  ctx.ellipse(19, 8, 16, 6, -0.3, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7db8c';
  ctx.fillRect(-46, -66, 111, 13);
  ctx.fillRect(-30, -91, 79, 32);
  ctx.fillStyle = '#bd3433';
  ctx.fillRect(-30, -64, 79, 8);
  ctx.fillStyle = '#ffebaa';
  ctx.fillRect(-27, -88, 74, 5);
  // One hand lifts a fan of green notes clear of the face.
  for (let i = 0; i < 5; i += 1) {
    ctx.save();
    ctx.translate(88, 45);
    ctx.rotate(-1.2 + i * 0.27);
    ctx.fillStyle = '#c6e6a4';
    ctx.fillRect(0, -34, 20, 39);
    ctx.strokeStyle = '#276d4d';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, -32, 16, 35);
    ctx.restore();
  }
  ctx.fillStyle = '#f4bd91';
  ctx.beginPath();
  ctx.ellipse(89, 53, 16, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lidoFront(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const art = title.lidoArt!;
  lidoScene(ctx);
  const shade = ctx.createLinearGradient(0, 0, 0, 520);
  shade.addColorStop(0, '#0862a199');
  shade.addColorStop(0.35, '#0862a100');
  shade.addColorStop(0.75, '#0862a100');
  shade.addColorStop(1, '#073d69cc');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 400, 520);
  tycoon(ctx);
  goldTitle(ctx, art.hero, 198, 96, 370);
  ctx.fillStyle = '#ffdc77';
  ctx.fillRect(275, 322, 117, 58);
  ctx.strokeStyle = '#562b28';
  ctx.lineWidth = 3;
  ctx.strokeRect(275, 322, 117, 58);
  ctx.fillStyle = '#412323';
  ctx.textAlign = 'center';
  ctx.font = '900 16px Impact, Arial Black, sans-serif';
  ctx.fillText(art.bursts[0].split(' ').slice(0, 2).join(' '), 333, 344, 107);
  ctx.fillText(art.bursts[0].split(' ').slice(2).join(' '), 333, 363, 107);
  ctx.textAlign = 'left';
  burst(ctx, art.bursts[1], 340, 259, 31, '#e7ffff', '#4abed6', 0.1);
  ctx.fillStyle = '#c72b30';
  ctx.fillRect(0, 431, 400, 34);
  ctx.fillStyle = '#fff5b7';
  ctx.textAlign = 'center';
  ctx.font = '900 18px Arial Black, sans-serif';
  ctx.fillText(art.ribbon, 200, 454, 380);
  ctx.textAlign = 'left';
  sticker(ctx, title.compatibility, 159, 474, 188, 34);
  age(ctx, title, '#173451');
  furniture.logo(ctx, title, 13, 15, 33, '#fff9d3');
  price(ctx, title);
}

function lidoShot(
  ctx: Paint,
  title: SoftwareTitle,
  index: number,
  x: number,
  y: number,
): void {
  const labels = title.lidoArt!.interfaceLabels;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#15374a';
  ctx.fillRect(0, 0, 113, 91);
  ctx.beginPath();
  ctx.rect(4, 4, 105, 64);
  ctx.clip();
  ctx.fillStyle = '#80c4c1';
  ctx.fillRect(4, 4, 105, 64);
  if (index === 1) {
    ctx.fillStyle = '#e9e8bd';
    ctx.fillRect(5, 6, 103, 60);
    ctx.fillStyle = '#4386a4';
    for (let i = 0; i < 6; i += 1)
      ctx.fillRect(14 + i * 14, 47 - i * i, 8, 19 + i * i);
    ctx.strokeStyle = '#b42536';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 52);
    ctx.bezierCurveTo(43, 44, 58, 39, 98, 11);
    ctx.stroke();
  } else {
    const ground = index === 2 ? '#627d8c' : '#7ac691';
    ctx.fillStyle = ground;
    ctx.fillRect(4, 9, 105, 54);
    for (let i = 0; i < 5; i += 1) {
      const px = 8 + i * 21;
      polygon(
        ctx,
        [
          [px, 24],
          [px + 20, 15],
          [px + 37, 23],
          [px + 16, 33],
        ],
        '#e7d7ae',
      );
      polygon(
        ctx,
        [
          [px + 5, 27],
          [px + 20, 21],
          [px + 31, 26],
          [px + 16, 32],
        ],
        index === 2 ? '#426a83' : '#3fd2d2',
      );
    }
    for (let i = 0; i < 34; i += 1) {
      const px = 8 + seeded(i, index + 20) * 96;
      const py = 13 + seeded(i, index + 21) * 43;
      ctx.fillStyle = i % 3 ? '#f5d4a0' : '#e84642';
      ctx.fillRect(px, py, 2, 3);
    }
    polygon(
      ctx,
      [
        [77, 15],
        [88, 10],
        [99, 15],
        [88, 20],
      ],
      '#fff3c3',
    );
    ctx.fillStyle = '#fff7d7';
    ctx.fillRect(86, 18, 4, 16);
    if (index === 2) {
      ctx.fillStyle = '#364a6d77';
      ctx.fillRect(4, 4, 105, 60);
      ctx.strokeStyle = '#d8f7f2aa';
      for (let i = 0; i < 18; i += 1) {
        const px = 6 + seeded(i, 31) * 100;
        const py = 6 + seeded(i, 32) * 50;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 3, py + 8);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = '#1b3951';
  ctx.fillRect(4, 4, 105, 7);
  ctx.fillRect(4, 56, 105, 12);
  ctx.fillStyle = '#fff5cc';
  ctx.font = 'bold 5px Verdana, sans-serif';
  ctx.fillText(labels[0], 70, 9, 35);
  ctx.fillText(labels[1], 11, 64, 28);
  ctx.fillText(labels[2], 53, 64, 27);
  for (let i = 0; i < 3; i += 1) ctx.fillRect(88 + i * 6, 59, 4, 4);
  ctx.restore();
  ctx.fillStyle = '#fff5dc';
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.fillText(title.screenshots[index], x + 5, y + 82, 105);
}

function lidoBack(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const art = title.lidoArt!;
  const bg = ctx.createLinearGradient(0, 0, 400, 360);
  bg.addColorStop(0, '#0d84ca');
  bg.addColorStop(0.5, '#75dbe9');
  bg.addColorStop(1, '#f7c56b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 400, 520);
  glow(ctx, 342, 45, 145, '#fff6b9cc');
  lensFlare(ctx, 358, 35, 25);
  ctx.fillStyle = '#a5212b';
  ctx.font = '900 35px Impact, Arial Black, sans-serif';
  ctx.fillText(art.headline, 15, 45, 370);
  ctx.fillStyle = '#123f63';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(art.backLead, 18, 67, 360);
  title.features.slice(0, 4).forEach((feature, i) => {
    ctx.fillStyle = '#d22b37';
    ctx.beginPath();
    ctx.arc(24, 88 + i * 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#133952';
    ctx.font = 'bold 11px Verdana, sans-serif';
    ctx.fillText(feature, 35, 92 + i * 18, 348);
  });
  title.screenshots
    .slice(0, 3)
    .forEach((_, i) => lidoShot(ctx, title, i, 16 + i * 125, 157));
  art.reviews.forEach((review, i) =>
    reviewQuote(
      ctx,
      review.quote,
      review.magazine,
      review.score,
      16,
      258 + i * 41,
      368,
    ),
  );
  furniture.requirements(ctx, title);
  publisher(ctx, title, furniture, '#123952');
  furniture.barcode(ctx, title, 205, 479, 179, 35);
}

function seeded(index: number, salt = 0): number {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function softEllipse(
  ctx: Paint,
  x: number,
  y: number,
  rx: number,
  ry: number,
  colour: string,
  rotation = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(rx, ry);
  const light = ctx.createRadialGradient(-0.18, 0.3, 0, 0, 0, 1);
  light.addColorStop(0, colour);
  light.addColorStop(1, 'transparent');
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function face(ctx: Paint): void {
  // The painted planes are deliberately translucent, like a retouched FMV still.
  glow(ctx, 195, 315, 175, '#36e5cf55');
  const shirt = ctx.createLinearGradient(80, 330, 325, 440);
  shirt.addColorStop(0, '#210e1a');
  shirt.addColorStop(0.47, '#9e2734');
  shirt.addColorStop(1, '#070e19');
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(139, 324);
  ctx.bezierCurveTo(93, 343, 76, 380, 49, 422);
  ctx.lineTo(340, 422);
  ctx.bezierCurveTo(317, 365, 284, 330, 240, 319);
  ctx.closePath();
  ctx.fill();
  softEllipse(ctx, 175, 380, 80, 36, '#f5534444', -0.4);
  const neck = ctx.createLinearGradient(146, 298, 245, 366);
  neck.addColorStop(0, '#102833');
  neck.addColorStop(0.45, '#649b8e');
  neck.addColorStop(0.76, '#c0e8c5');
  neck.addColorStop(1, '#143340');
  ctx.fillStyle = neck;
  ctx.beginPath();
  ctx.moveTo(161, 288);
  ctx.bezierCurveTo(169, 314, 158, 331, 147, 342);
  ctx.bezierCurveTo(184, 372, 220, 370, 258, 336);
  ctx.bezierCurveTo(233, 316, 229, 297, 235, 280);
  ctx.closePath();
  ctx.fill();
  const skin = ctx.createLinearGradient(99, 165, 282, 340);
  skin.addColorStop(0, '#061621');
  skin.addColorStop(0.28, '#244954');
  skin.addColorStop(0.62, '#659e96');
  skin.addColorStop(0.83, '#c0e6c8');
  skin.addColorStop(1, '#16343b');
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(110, 216);
  ctx.bezierCurveTo(107, 151, 157, 115, 211, 119);
  ctx.bezierCurveTo(272, 126, 295, 179, 278, 251);
  ctx.bezierCurveTo(267, 293, 235, 324, 199, 330);
  ctx.bezierCurveTo(151, 325, 116, 285, 110, 216);
  ctx.fill();
  softEllipse(ctx, 128, 249, 50, 92, '#0b2835bb', -0.25);
  softEllipse(ctx, 241, 287, 67, 50, '#c2ffdb88', -0.4);
  softEllipse(ctx, 191, 307, 56, 21, '#c6edb966');
  softEllipse(ctx, 229, 192, 49, 27, '#172e3aa9');
  softEllipse(ctx, 158, 195, 43, 24, '#071e2abf');
  // Wet hair breaks the forehead silhouette without an ink outline.
  ctx.fillStyle = '#04111b';
  ctx.beginPath();
  ctx.moveTo(111, 218);
  ctx.bezierCurveTo(86, 144, 132, 104, 193, 100);
  ctx.bezierCurveTo(251, 89, 292, 132, 285, 185);
  ctx.bezierCurveTo(261, 156, 249, 147, 225, 149);
  ctx.bezierCurveTo(199, 136, 167, 162, 146, 169);
  ctx.bezierCurveTo(129, 187, 131, 206, 111, 218);
  ctx.fill();
  for (let i = 0; i < 17; i += 1) {
    const x = 128 + i * 7.4;
    softEllipse(
      ctx,
      x,
      143 + seeded(i, 2) * 16,
      2,
      36,
      i % 3 ? '#31737333' : '#75bbb344',
      -0.3,
    );
  }
  for (const [x, y, tilt] of [
    [158, 222, -0.14],
    [232, 211, 0.06],
  ] as const) {
    softEllipse(ctx, x, y - 13, 30, 17, '#071b27dd', tilt);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = '#abc9bc';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e5f68';
    ctx.beginPath();
    ctx.ellipse(3, -1, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#061923';
    ctx.beginPath();
    ctx.arc(4, -1, 4, 0, Math.PI * 2);
    ctx.fill();
    softEllipse(ctx, 5, 4, 19, 8, '#071723bb');
    ctx.fillStyle = '#f4fff1';
    ctx.beginPath();
    ctx.arc(1, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  softEllipse(ctx, 191, 235, 20, 43, '#0c344296', -0.1);
  softEllipse(ctx, 201, 263, 21, 10, '#ddf7ceaa');
  softEllipse(ctx, 213, 266, 11, 6, '#082732bb');
  softEllipse(ctx, 201, 293, 34, 14, '#cda8a184');
  ctx.fillStyle = '#251e2a';
  ctx.beginPath();
  ctx.moveTo(175, 297);
  ctx.bezierCurveTo(191, 288, 213, 290, 226, 300);
  ctx.bezierCurveTo(214, 311, 189, 313, 175, 297);
  ctx.fill();
  softEllipse(ctx, 199, 306, 22, 5, '#e8b5ad88');
  softEllipse(ctx, 202, 295, 20, 3, '#f7ded0aa');
  ctx.strokeStyle = '#c7eee0a9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(153, 331);
  ctx.quadraticCurveTo(175, 360, 202, 392);
  ctx.quadraticCurveTo(224, 364, 250, 329);
  ctx.stroke();
  softEllipse(ctx, 202, 390, 9, 10, '#edf9df');
  ctx.fillStyle = '#09222b';
  ctx.fillRect(197, 388, 10, 4);
  // Fine deterministic grain binds the smooth colour planes together.
  for (let i = 0; i < 2200; i += 1) {
    const x = 78 + seeded(i, 4) * 260;
    const y = 111 + seeded(i, 5) * 315;
    ctx.fillStyle = i % 2 ? '#d5fff012' : '#00101820';
    ctx.fillRect(x, y, 0.7, 0.7);
  }
}

function deepScene(ctx: Paint): void {
  const bg = ctx.createLinearGradient(0, 0, 400, 520);
  bg.addColorStop(0, '#030913');
  bg.addColorStop(0.58, '#0b303a');
  bg.addColorStop(1, '#010710');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 400, 520);
  glow(ctx, 170, 370, 200, '#1ac4b566');
  const water = ctx.createLinearGradient(0, 332, 0, 425);
  water.addColorStop(0, '#9be6db66');
  water.addColorStop(0.16, '#082f3e');
  water.addColorStop(1, '#010d18');
  ctx.fillStyle = water;
  ctx.fillRect(0, 332, 400, 190);
  // A distant body rises toward a broken reflection under the surface.
  ctx.fillStyle = '#010c16e8';
  ctx.beginPath();
  ctx.ellipse(283, 381, 16, 21, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(266, 394);
  ctx.bezierCurveTo(236, 402, 236, 425, 218, 443);
  ctx.lineTo(211, 438);
  ctx.bezierCurveTo(229, 412, 243, 388, 272, 390);
  ctx.bezierCurveTo(300, 389, 315, 412, 333, 437);
  ctx.lineTo(326, 442);
  ctx.bezierCurveTo(306, 417, 305, 402, 291, 400);
  ctx.lineTo(317, 500);
  ctx.lineTo(243, 500);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 15; i += 1) {
    const y = 340 + i * 6;
    ctx.strokeStyle = i % 3 ? '#88e5dd30' : '#c0fff080';
    ctx.lineWidth = i % 4 ? 1 : 3;
    ctx.beginPath();
    ctx.moveTo((i * 37) % 90, y);
    ctx.bezierCurveTo(145, y - 14, 250, y + 7, 400 - i * 6, y - 11);
    ctx.stroke();
  }
  face(ctx);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const beam = ctx.createLinearGradient(400, 190, 49, 422);
  beam.addColorStop(0, '#cffff7aa');
  beam.addColorStop(0.54, '#9bffed36');
  beam.addColorStop(1, '#a9ffee00');
  polygon(
    ctx,
    [
      [400, 175],
      [400, 231],
      [20, 420],
      [86, 367],
    ],
    beam,
  );
  glow(ctx, 398, 203, 105, '#c9fff288');
  ctx.restore();
  for (let i = 0; i < 17; i += 1)
    softEllipse(
      ctx,
      65 + seeded(i, 8) * 320,
      185 + seeded(i, 9) * 195,
      20 + seeded(i, 10) * 34,
      7 + seeded(i, 11) * 12,
      '#86d9cf14',
      -0.5,
    );
  const vignette = ctx.createRadialGradient(195, 265, 75, 200, 280, 320);
  vignette.addColorStop(0, '#00000000');
  vignette.addColorStop(1, '#000712df');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 400, 520);
}

function discStack(ctx: Paint, label: string): void {
  for (let i = 0; i < 4; i += 1) {
    const x = 311 + i * 15;
    const y = 339 - i * 12;
    const disc = ctx.createLinearGradient(x - 28, y - 28, x + 28, y + 28);
    disc.addColorStop(0, '#e8ffff');
    disc.addColorStop(0.24, '#bda5d4');
    disc.addColorStop(0.42, '#9eece0');
    disc.addColorStop(0.65, '#fff6c2');
    disc.addColorStop(1, '#798eaa');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.ellipse(x, y, 28, 17, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#09212c';
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 3, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5ffffa8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 12, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#effbf1';
  ctx.font = '900 12px Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 347, 379, 90);
}

function silverTitle(
  ctx: Paint,
  value: string,
  x: number,
  y: number,
  width: number,
  size = 71,
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`;
  ctx.lineJoin = 'bevel';
  ctx.shadowColor = '#63e6e1';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#09252d';
  ctx.strokeText(value, x, y, width);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#010c14';
  ctx.lineWidth = 5;
  ctx.strokeText(value, x, y, width);
  const chrome = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  chrome.addColorStop(0, '#ffffff');
  chrome.addColorStop(0.28, '#bed4d5');
  chrome.addColorStop(0.48, '#fafff7');
  chrome.addColorStop(0.5, '#335965');
  chrome.addColorStop(0.8, '#9ab9bc');
  chrome.addColorStop(1, '#dbe9e4');
  ctx.fillStyle = chrome;
  ctx.fillText(value, x, y, width);
  ctx.restore();
}

function deepFront(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const art = title.deepArt!;
  deepScene(ctx);
  ctx.fillStyle = '#020916aa';
  ctx.fillRect(0, 0, 400, 112);
  ctx.fillStyle = '#e9f4e9';
  ctx.textAlign = 'center';
  ctx.font = 'italic bold 17px Georgia, serif';
  ctx.fillText(`“${art.critic}”`, 178, 30, 320);
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.fillText(art.criticSource, 178, 48, 300);
  silverTitle(ctx, art.hero, 200, 103, 365);
  ctx.fillStyle = '#be1f36';
  ctx.fillRect(20, 137, 360, 6);
  ctx.fillStyle = '#edf4e9';
  ctx.font = 'bold 14px Verdana, sans-serif';
  ctx.fillText(title.subtitle ?? '', 200, 163, 360);
  ctx.textAlign = 'left';
  discStack(ctx, title.media);
  ctx.fillStyle = '#b11d35';
  ctx.fillRect(0, 413, 400, 47);
  ctx.fillStyle = '#fff4e7';
  ctx.textAlign = 'center';
  ctx.font = '900 13px Arial Black, sans-serif';
  ctx.fillText(art.badges[0], 200, 431, 380);
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.fillText(art.badges[1], 200, 450, 380);
  ctx.fillStyle = '#c5d9d8';
  ctx.font = 'bold 8px Verdana, sans-serif';
  ctx.fillText(art.billing, 200, 469, 385);
  ctx.textAlign = 'left';
  sticker(ctx, title.compatibility, 153, 477, 194, 30);
  age(ctx, title, '#101b2c');
  furniture.logo(ctx, title, 13, 479, 29, '#e6f3e8');
  price(ctx, title);
}

function deepStill(
  ctx: Paint,
  caption: string,
  disc: string,
  index: number,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#080d11';
  ctx.fillRect(0, 0, 113, 91);
  for (let n = 0; n < 5; n += 1) {
    ctx.fillStyle = '#d1d2ba';
    ctx.fillRect(3 + n * 22, 2, 8, 4);
    ctx.fillRect(3 + n * 22, 65, 8, 4);
  }
  ctx.beginPath();
  ctx.rect(5, 10, 103, 53);
  ctx.clip();
  const bg = ctx.createLinearGradient(0, 10, 0, 63);
  bg.addColorStop(0, index === 2 ? '#48555a' : '#142e3d');
  bg.addColorStop(1, '#020b16');
  ctx.fillStyle = bg;
  ctx.fillRect(5, 10, 103, 53);
  if (index === 0) {
    // Empty water and a lone ceiling lamp in the midnight pool hall.
    ctx.fillStyle = '#b6f1d8';
    ctx.fillRect(54, 13, 5, 3);
    glow(ctx, 56, 22, 23, '#c5ffe787');
    polygon(
      ctx,
      [
        [9, 44],
        [104, 42],
        [104, 59],
        [9, 60],
      ],
      '#2b6974',
    );
    ctx.strokeStyle = '#c8fff288';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(9, 44 + i * 3);
      ctx.quadraticCurveTo(58, 43 + i * 3, 104, 45 + i * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#071923';
    for (let i = 0; i < 5; i += 1) ctx.fillRect(10 + i * 23, 20, 3, 23);
  } else if (index === 1) {
    polygon(
      ctx,
      [
        [5, 48],
        [108, 47],
        [108, 63],
        [5, 63],
      ],
      '#286877',
    );
    ctx.fillStyle = '#05131e';
    ctx.beginPath();
    ctx.ellipse(55, 35, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    polygon(
      ctx,
      [
        [47, 43],
        [64, 43],
        [77, 61],
        [38, 61],
      ],
      '#06131d',
    );
    for (let i = 0; i < 45; i += 1) {
      const px = 23 + seeded(i, 44) * 66;
      const py = 13 + seeded(i, 45) * 43;
      const radius = 0.5 + seeded(i, 46) * 1.8;
      ctx.fillStyle = i % 2 ? '#e6fff3dd' : '#71dee4b9';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // The empty lifeguard chair is cut out against a torch cone.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const torch = ctx.createLinearGradient(99, 20, 15, 57);
    torch.addColorStop(0, '#d5fff0b9');
    torch.addColorStop(1, '#b7ffee00');
    polygon(
      ctx,
      [
        [108, 12],
        [108, 24],
        [15, 58],
      ],
      torch,
    );
    ctx.restore();
    ctx.strokeStyle = '#030b13';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(52, 27);
    ctx.lineTo(52, 63);
    ctx.moveTo(69, 27);
    ctx.lineTo(69, 63);
    ctx.moveTo(48, 38);
    ctx.lineTo(75, 38);
    ctx.moveTo(49, 27);
    ctx.lineTo(70, 27);
    ctx.stroke();
    ctx.fillStyle = '#030b13';
    ctx.fillRect(48, 21, 22, 6);
  }
  for (let i = 0; i < 54; i += 1) {
    ctx.fillStyle = i % 2 ? '#d0f8ef22' : '#00041133';
    ctx.fillRect(5, 10 + i, 103, 0.6);
  }
  for (let i = 0; i < 140; i += 1) {
    ctx.fillStyle = i % 3 ? '#dcfff119' : '#030a1e33';
    ctx.fillRect(5 + seeded(i, 50) * 103, 10 + seeded(i, 51) * 53, 1, 1);
  }
  ctx.fillStyle = '#f0f2dc';
  ctx.fillRect(74, 12, 31, 9);
  ctx.fillStyle = '#122d3b';
  ctx.font = 'bold 7px Verdana, sans-serif';
  ctx.fillText(disc, 76, 19, 27);
  ctx.restore();
  ctx.fillStyle = '#e1eeeb';
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.fillText(caption, x + 5, y + 84, 104);
}

function deepBack(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const art = title.deepArt!;
  ctx.fillStyle = '#040b12';
  ctx.fillRect(0, 0, 400, 520);
  glow(ctx, 310, 60, 140, '#116d7888');
  ctx.fillStyle = '#e3eeee';
  ctx.font = '900 36px Impact, Arial Black, sans-serif';
  ctx.fillText(art.headline, 16, 44, 370);
  ctx.fillStyle = '#c2273c';
  ctx.fillRect(16, 53, 368, 4);
  ctx.fillStyle = '#c8d9d9';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(art.discJoke, 18, 78, 364);
  title.features.slice(0, 4).forEach((feature, i) => {
    ctx.fillStyle = '#c12c3e';
    ctx.fillRect(20, 93 + i * 15, 5, 5);
    ctx.fillStyle = '#e4f3ea';
    ctx.font = 'bold 11px Verdana, sans-serif';
    ctx.fillText(feature, 33, 99 + i * 15, 348);
  });
  title.screenshots
    .slice(0, 3)
    .forEach((caption, i) =>
      deepStill(ctx, caption, art.discLabels[i], i, 16 + i * 125, 158),
    );
  art.reviews.forEach((review, i) =>
    reviewQuote(
      ctx,
      review.quote,
      review.magazine,
      review.score,
      16,
      258 + i * 41,
      368,
    ),
  );
  furniture.requirements(ctx, title);
  publisher(ctx, title, furniture, '#dceae6');
  furniture.barcode(ctx, title, 205, 479, 179, 35);
}

function spine(
  ctx: Paint,
  title: SoftwareTitle,
  left: boolean,
  furniture: GameBoxFurniture,
): void {
  const lido = Boolean(title.lidoArt);
  const art = title.lidoArt ?? title.deepArt!;
  const bg = ctx.createLinearGradient(0, 0, 110, 520);
  bg.addColorStop(0, lido ? '#1588bd' : '#040b13');
  bg.addColorStop(0.55, lido ? '#57c5ce' : '#14505c');
  bg.addColorStop(1, lido ? '#0f628e' : '#020810');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 110, 520);
  ctx.fillStyle = lido ? '#efb846' : '#ae2238';
  ctx.fillRect(left ? 105 : 0, 0, 5, 520);
  furniture.logo(ctx, title, 37, 24, 35, '#f7f6e0');
  ctx.save();
  ctx.translate(55, 260);
  ctx.rotate(left ? -Math.PI / 2 : Math.PI / 2);
  if (lido) goldTitle(ctx, art.hero, 0, 0, 350, 62);
  else silverTitle(ctx, art.hero, 0, 0, 355, 65);
  ctx.restore();
  ctx.fillStyle = '#f4f5dc';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.fillText(title.media, 55, 472, 100);
  ctx.fillText(title.publisher, 55, 494, 100);
}

function top(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const lido = Boolean(title.lidoArt);
  const art = title.lidoArt ?? title.deepArt!;
  ctx.fillStyle = lido ? '#1177a9' : '#041019';
  ctx.fillRect(0, 0, 400, 110);
  ctx.fillStyle = lido ? '#f4b348' : '#ae2238';
  ctx.fillRect(0, 0, 400, 7);
  furniture.logo(ctx, title, 16, 33, 43, '#f5f3dd');
  if (lido) goldTitle(ctx, art.hero, 237, 58, 305, 52);
  else silverTitle(ctx, art.hero, 237, 60, 296, 52);
}

function bottom(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  ctx.fillStyle = title.lidoArt ? '#16618a' : '#08131b';
  ctx.fillRect(0, 0, 400, 110);
  furniture.barcode(ctx, title, 10, 11, 178, 67);
  ctx.fillStyle = '#f4f4df';
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.fillText(`${title.year} ${title.publisher}`, 198, 37, 190);
  ctx.font = '9px Courier New, monospace';
  ctx.fillText(
    `${title.id.toUpperCase().slice(0, 12)}-${title.year}`,
    198,
    59,
    190,
  );
  ctx.fillText(title.media, 198, 79, 190);
}

/** Paint the dedicated late-1990s game packaging for Lido Tycoon and DEEP END. */
export function drawPeriodBoxFace(
  ctx: Paint,
  title: SoftwareTitle,
  boxFace: BoxFace,
  furniture: GameBoxFurniture,
): void {
  if (boxFace === 'front') {
    if (title.lidoArt) lidoFront(ctx, title, furniture);
    else deepFront(ctx, title, furniture);
  } else if (boxFace === 'back') {
    if (title.lidoArt) lidoBack(ctx, title, furniture);
    else deepBack(ctx, title, furniture);
  } else if (boxFace === 'left' || boxFace === 'right')
    spine(ctx, title, boxFace === 'left', furniture);
  else if (boxFace === 'top') top(ctx, title, furniture);
  else bottom(ctx, title, furniture);
}
