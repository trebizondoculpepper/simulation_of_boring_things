import type { BoxFace, SoftwareTitle } from '../logic/software-boxes';
import {
  airbrushSpot,
  burst,
  chromeText,
  glow,
  lensFlare,
  reviewQuote,
  sticker,
} from './software-box-airbrush';

type Paint = CanvasRenderingContext2D;

/** Shared printing furniture supplied by the box renderer. */
export interface GameBoxFurniture {
  logo: (
    ctx: Paint,
    title: SoftwareTitle,
    x: number,
    y: number,
    size: number,
    colour: string,
  ) => void;
  barcode: (
    ctx: Paint,
    title: SoftwareTitle,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  requirements: (ctx: Paint, title: SoftwareTitle) => void;
}

function sky(ctx: Paint, height: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#030b24');
  g.addColorStop(0.38, '#26345f');
  g.addColorStop(0.68, '#884b5a');
  g.addColorStop(1, '#0b2948');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 400, height);
  glow(ctx, 316, 183, 158, '#f59b7277');
  glow(ctx, 64, 220, 110, '#4cbed688');
  ctx.fillStyle = '#f4ab68';
  ctx.beginPath();
  ctx.arc(305, 204, 71, Math.PI, Math.PI * 2);
  ctx.fill();
  airbrushSpot(ctx, 305, 210, 80, '#fff3b277');
  ctx.fillStyle = '#081529';
  ctx.fillRect(0, 218, 400, 32);
  for (let i = 0; i < 7; i += 1) {
    const x = i * 72 - 20;
    ctx.fillRect(x, 178 - (i % 2) * 16, 7, 68);
    glow(ctx, x + 3, 177 - (i % 2) * 16, 26, '#f9eec2aa');
  }
  lensFlare(ctx, 308, 198, 31);
}

function water(ctx: Paint, top: number, bottom: number): void {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#0d435b');
  g.addColorStop(0.2, '#087b91');
  g.addColorStop(0.62, '#14b8c9');
  g.addColorStop(1, '#072e4c');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, 400, bottom - top);
  glow(ctx, 205, 247, 125, '#fff3bd88');
  glow(ctx, 205, 355, 195, '#14fff177');
  glow(ctx, 340, 415, 130, '#7fffe955');
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, 400, bottom - top);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 16; i += 1) {
    const y = top + 12 + i * i * 0.9;
    const spread = 5 + i * 3.4;
    const light = ctx.createLinearGradient(205 - spread, y, 205 + spread, y);
    light.addColorStop(0, '#fff8cf00');
    light.addColorStop(0.5, '#fff8cf99');
    light.addColorStop(1, '#fff8cf00');
    ctx.fillStyle = light;
    ctx.fillRect(205 - spread, y, spread * 2, 1 + i * 0.22);
  }
  for (let i = 0; i < 35; i += 1) {
    const x = (i * 83 + 31) % 400;
    const y = top + 26 + ((i * 47) % 208);
    airbrushSpot(ctx, x, y, 9 + (i % 5) * 5, '#b9fff32e');
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let row = 0; row < 26; row += 1) {
    const y = top + (row * row * (bottom - top)) / 700;
    const alpha = 0.13 + row / 80;
    ctx.strokeStyle = `rgba(164,255,241,${alpha})`;
    ctx.lineWidth = 1 + row / 20;
    for (let col = 0; col < 8; col += 1) {
      const x = col * 61 - 80 + (row % 3) * 21;
      ctx.beginPath();
      ctx.moveTo(x, y + Math.sin(col + row) * 3);
      ctx.quadraticCurveTo(x + 28, y - 5, x + 61, y + 3);
      ctx.stroke();
    }
  }
  for (let lane = -3; lane <= 3; lane += 1) {
    const farX = 207;
    const nearX = 207 + lane * 88;
    ctx.strokeStyle = '#051a2a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(farX, top + 8);
    ctx.lineTo(nearX, bottom);
    ctx.stroke();
    ctx.strokeStyle = lane % 2 ? '#fff2b0' : '#f06d56';
    ctx.lineWidth = 3;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.moveTo(farX, top + 8);
    ctx.lineTo(nearX, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function diver(ctx: Paint): void {
  ctx.save();
  ctx.strokeStyle = '#071322';
  ctx.fillStyle = '#071322';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(44, 261);
  ctx.lineTo(44, 222);
  ctx.lineTo(111, 222);
  ctx.stroke();
  ctx.strokeStyle = '#effbdc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(44, 221);
  ctx.lineTo(112, 221);
  ctx.stroke();
  ctx.translate(209, 183);
  ctx.rotate(0.14);
  const body = ctx.createLinearGradient(0, -20, 0, 28);
  body.addColorStop(0, '#fff9d4');
  body.addColorStop(0.34, '#b6d8c6');
  body.addColorStop(1, '#071a30');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(48, -2, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(37, -8);
  ctx.bezierCurveTo(23, -10, 11, -2, -7, -8);
  ctx.lineTo(-30, -18);
  ctx.lineTo(-39, -12);
  ctx.lineTo(-15, 4);
  ctx.bezierCurveTo(6, 13, 19, 7, 39, 7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, 5);
  ctx.lineTo(52, 19);
  ctx.lineTo(79, 11);
  ctx.lineTo(88, 12);
  ctx.lineTo(54, 28);
  ctx.lineTo(22, 12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-27, -14);
  ctx.lineTo(-57, -20);
  ctx.lineTo(-75, -33);
  ctx.lineTo(-80, -31);
  ctx.lineTo(-60, -12);
  ctx.lineTo(-36, -5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-23, 2);
  ctx.lineTo(-51, 16);
  ctx.lineTo(-78, 10);
  ctx.lineTo(-82, 13);
  ctx.lineTo(-54, 24);
  ctx.lineTo(-20, 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#f7f4d766';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(99, 167);
  ctx.quadraticCurveTo(75, 160, 59, 145);
  ctx.stroke();
  for (const [x, y, r] of [
    [56, 143, 2],
    [48, 135, 1.5],
    [67, 150, 1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e8fff5';
    ctx.fill();
  }
}

function publisher(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
  x: number,
  y: number,
  size: number,
): void {
  furniture.logo(ctx, title, x, y, size, '#e6f6e9');
  ctx.fillStyle = '#f2fbef';
  ctx.font = `bold ${Math.round(size * 0.44)}px Arial Black, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(title.publisher, x + size + 8, y + size / 2, 128);
}

function front(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const art = title.gameArt;
  if (!art) return;
  sky(ctx, 250);
  water(ctx, 245, 520);
  diver(ctx);
  const shade = ctx.createLinearGradient(0, 0, 0, 520);
  shade.addColorStop(0, '#020b20bb');
  shade.addColorStop(0.38, '#020b2000');
  shade.addColorStop(0.78, '#04132a00');
  shade.addColorStop(1, '#021325dd');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 400, 520);
  publisher(ctx, title, furniture, 15, 14, 31);
  chromeText(
    ctx,
    art.hero,
    194,
    99,
    '900 61px Impact, Arial Black, sans-serif',
    361,
    68,
    true,
  );
  chromeText(
    ctx,
    art.edition,
    107,
    319,
    '900 125px Impact, Arial Black, sans-serif',
    163,
    132,
    true,
  );
  burst(ctx, art.bursts[0], 345, 309, 42, '#ffef6f', '#fa6833');
  burst(ctx, art.bursts[1], 339, 391, 35, '#fdfbb7', '#39bad3', 0.13);
  ctx.save();
  ctx.translate(0, 433);
  ctx.fillStyle = '#071e38cc';
  ctx.fillRect(0, 0, 400, 30);
  ctx.fillStyle = '#ffca71';
  ctx.font = 'bold 17px Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(art.ribbon, 200, 15, 380);
  ctx.restore();
  sticker(ctx, title.compatibility, 171, 471, 174, 37);
  if (title.ageRating) {
    ctx.fillStyle = '#f8f5e2';
    ctx.fillRect(354, 472, 35, 36);
    ctx.fillStyle = '#0c2742';
    ctx.font = '900 21px Arial Black, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.ageRating, 356, 490, 31);
  }
  ctx.save();
  ctx.translate(31, 491);
  ctx.strokeStyle = '#e7f8ed';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e7f8ed';
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.media, 53, 0, 70);
  ctx.restore();
  ctx.save();
  ctx.translate(347, 22);
  ctx.rotate(0.1);
  ctx.fillStyle = '#fff3ce';
  ctx.fillRect(-7, -6, 55, 32);
  ctx.strokeStyle = '#222c36';
  ctx.strokeRect(-7, -6, 55, 32);
  ctx.fillStyle = '#182338';
  ctx.font = 'bold 16px Arial Black, sans-serif';
  ctx.fillText(title.price.amount, -4, 15, 50);
  ctx.restore();
}

function shot(
  ctx: Paint,
  caption: string,
  x: number,
  y: number,
  index: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#030d20';
  ctx.fillRect(0, 0, 176, 71);
  ctx.beginPath();
  ctx.rect(4, 4, 168, 48);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, 52);
  g.addColorStop(0, ['#080e2b', '#042c47', '#2b244c', '#101d28'][index]);
  g.addColorStop(1, ['#ad6b63', '#087b90', '#f4b676', '#354f59'][index]);
  ctx.fillStyle = g;
  ctx.fillRect(4, 4, 168, 48);
  if (index === 3) {
    ctx.strokeStyle = '#58dcd9';
    ctx.lineWidth = 7;
    ctx.shadowColor = '#40f8f1';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.moveTo(4, 42);
    ctx.lineTo(46, 42);
    ctx.lineTo(46, 15);
    ctx.lineTo(117, 15);
    ctx.lineTo(117, 35);
    ctx.lineTo(169, 35);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d4e7d7';
    ctx.beginPath();
    ctx.arc(83, 34, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#123f4e';
    ctx.beginPath();
    ctx.arc(83, 34, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f8d077';
    ctx.beginPath();
    ctx.moveTo(83, 34);
    ctx.lineTo(88, 28);
    ctx.stroke();
  } else if (index === 1) {
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = '#ddfff022';
      ctx.beginPath();
      ctx.moveTo(28 + i * 28, 0);
      ctx.lineTo(10 + i * 27, 52);
      ctx.lineTo(31 + i * 30, 52);
      ctx.fill();
    }
    glow(ctx, 96, 2, 45, '#ffebadbb');
    ctx.fillStyle = '#c9eeea';
    ctx.beginPath();
    ctx.ellipse(90, 29, 13, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#183c51';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(81, 30);
    ctx.lineTo(55, 38);
    ctx.moveTo(99, 28);
    ctx.lineTo(125, 36);
    ctx.stroke();
  } else if (index === 2) {
    ctx.fillStyle = '#102b43';
    ctx.fillRect(8, 39, 164, 13);
    ctx.fillRect(128, 12, 5, 34);
    ctx.fillRect(79, 14, 54, 5);
    ctx.fillStyle = '#d9e9df';
    ctx.fillRect(73, 12, 60, 3);
    ctx.fillStyle = '#0b1b2c';
    ctx.beginPath();
    ctx.ellipse(72, 28, 5, 9, 0.5, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, 67, 39, 23, '#fff9b888');
  } else {
    lensFlare(ctx, 115, 20, 9);
    ctx.fillStyle = '#095877';
    ctx.beginPath();
    ctx.moveTo(4, 52);
    ctx.lineTo(102, 30);
    ctx.lineTo(173, 21);
    ctx.lineTo(173, 52);
    ctx.fill();
    ctx.strokeStyle = '#bcfff3';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(2 + i * 16, 51);
      ctx.lineTo(102 + i * 18, 30);
      ctx.stroke();
    }
    glow(ctx, 127, 41, 24, '#fff0b688');
  }
  ctx.restore();
  ctx.fillStyle = '#eaf6f1';
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.fillText(caption, x + 6, y + 65, 164);
}

function back(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const art = title.gameArt;
  if (!art) return;
  const g = ctx.createLinearGradient(0, 0, 400, 520);
  g.addColorStop(0, '#081d3f');
  g.addColorStop(0.55, '#123d5d');
  g.addColorStop(1, '#030e2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 400, 520);
  glow(ctx, 347, 131, 155, '#176f9388');
  glow(ctx, 42, 286, 115, '#5b90b455');
  ctx.fillStyle = '#ffcf85';
  ctx.font = '900 38px Impact, Arial Black, sans-serif';
  ctx.fillText(art.headline, 16, 45, 370);
  ctx.fillStyle = '#e1f4f1';
  ctx.font = '12px Georgia, serif';
  ctx.fillText(art.backLead, 18, 68, 364);
  ctx.fillStyle = '#f6b858';
  ctx.font = 'bold 11px Verdana, sans-serif';
  title.features.slice(0, 3).forEach((feature, index) => {
    ctx.beginPath();
    ctx.arc(24, 91 + index * 16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f8f7';
    ctx.fillText(feature, 35, 95 + index * 16, 345);
    ctx.fillStyle = '#f6b858';
  });
  title.screenshots
    .slice(0, 4)
    .forEach((caption, index) =>
      shot(
        ctx,
        caption,
        16 + (index % 2) * 192,
        142 + Math.floor(index / 2) * 79,
        index,
      ),
    );
  art.reviews.forEach((review, index) =>
    reviewQuote(
      ctx,
      review.quote,
      review.magazine,
      review.score,
      18,
      297 + index * 36,
      363,
    ),
  );
  furniture.requirements(ctx, title);
  publisher(ctx, title, furniture, 16, 481, 29);
  furniture.barcode(ctx, title, 207, 479, 177, 35);
  ctx.fillStyle = '#c9e2dc';
  ctx.font = '7px Verdana, sans-serif';
  ctx.fillText(
    `© ${title.year} ${title.publisher}. Printed in the EU.`,
    17,
    514,
    176,
  );
}

function spine(
  ctx: Paint,
  title: SoftwareTitle,
  left: boolean,
  furniture: GameBoxFurniture,
): void {
  const art = title.gameArt;
  if (!art) return;
  const g = ctx.createLinearGradient(0, 0, 110, 520);
  g.addColorStop(0, '#07112b');
  g.addColorStop(0.5, '#165a76');
  g.addColorStop(1, '#04142a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 110, 520);
  ctx.fillStyle = '#f8b664';
  ctx.fillRect(left ? 103 : 0, 0, 7, 520);
  chromeText(
    ctx,
    art.edition,
    55,
    57,
    '900 64px Impact, Arial Black, sans-serif',
    82,
    68,
  );
  ctx.save();
  ctx.translate(55, 260);
  ctx.rotate(left ? -Math.PI / 2 : Math.PI / 2);
  chromeText(
    ctx,
    art.hero,
    0,
    0,
    '900 45px Impact, Arial Black, sans-serif',
    274,
    48,
  );
  ctx.restore();
  ctx.fillStyle = '#e9f8ef';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.publisher, 53, 443, 90);
  furniture.logo(ctx, title, 40, 464, 29, '#e9f8ef');
}

function top(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  const art = title.gameArt;
  if (!art) return;
  const g = ctx.createLinearGradient(0, 0, 0, 110);
  g.addColorStop(0, '#07112b');
  g.addColorStop(1, '#20738b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 400, 110);
  ctx.fillStyle = '#f6b65c';
  ctx.fillRect(0, 0, 400, 7);
  furniture.logo(ctx, title, 15, 32, 42, '#e9f8ef');
  chromeText(
    ctx,
    art.hero,
    202,
    58,
    '900 43px Impact, Arial Black, sans-serif',
    245,
    47,
  );
  chromeText(
    ctx,
    art.edition,
    367,
    57,
    '900 43px Impact, Arial Black, sans-serif',
    38,
    46,
  );
}

function bottom(
  ctx: Paint,
  title: SoftwareTitle,
  furniture: GameBoxFurniture,
): void {
  ctx.fillStyle = '#0b3049';
  ctx.fillRect(0, 0, 400, 110);
  furniture.barcode(ctx, title, 10, 11, 178, 67);
  ctx.fillStyle = '#e4f4ed';
  ctx.font = 'bold 10px Verdana, sans-serif';
  ctx.fillText(`© ${title.year} ${title.publisher}`, 198, 37, 190);
  ctx.font = '9px Courier New, monospace';
  ctx.fillText(
    `CAT. ${title.id.toUpperCase().slice(0, 12)}-${title.year}`,
    198,
    59,
    190,
  );
  ctx.fillText(title.media, 198, 79, 190);
}

/** Paint the airbrushed edition of Pool Simulator on any one box face. */
export function drawGameBoxFace(
  ctx: Paint,
  title: SoftwareTitle,
  face: BoxFace,
  furniture: GameBoxFurniture,
): void {
  if (face === 'front') front(ctx, title, furniture);
  else if (face === 'back') back(ctx, title, furniture);
  else if (face === 'left' || face === 'right')
    spine(ctx, title, face === 'left', furniture);
  else if (face === 'top') top(ctx, title, furniture);
  else bottom(ctx, title, furniture);
}
