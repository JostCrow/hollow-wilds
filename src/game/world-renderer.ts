import { exitPoint, random, TILE, zoneById } from "./world";
import type { Building, Landmark, World } from "./world";
import { drawIllustratedPerson, drawWorldArt, worldArtRevision, worldArtSize, worldGroundTexture } from "./world-art";
import type { WorldArt } from "./world-art";

type Context = CanvasRenderingContext2D;
export type DepthItem = { x: number; y: number; width: number; height: number; depth?: number; draw: (c: Context) => void };
type Landscape = { ground: HTMLCanvasElement; scenery: DepthItem[]; artRevision: number };
const cache = new Map<string, Landscape>();
const TAU = Math.PI * 2;

function ellipse(c: Context, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}
function round(c: Context, x: number, y: number, w: number, h: number, radius: number | number[], fill: string | CanvasGradient) {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, radius);
  c.fill();
}
function polygon(c: Context, points: number[][], fill: string | CanvasGradient) {
  c.fillStyle = fill;
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
  c.fill();
  c.strokeStyle = "#514d3a70";
  c.lineWidth = .85;
  c.stroke();
}
function line(c: Context, points: number[][], color: string, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.stroke();
}
function gradient(c: Context, x: number, y: number, dx: number, dy: number, colors: string[]) {
  const g = c.createLinearGradient(x, y, x + dx, y + dy);
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
  return g;
}
function dome(c: Context, x: number, y: number, rx: number, ry: number, light: string, base: string, dark: string) {
  const g = c.createRadialGradient(x - rx * .35, y - ry * .45, 1, x + rx * .16, y + ry * .15, Math.max(rx, ry) * 1.2);
  g.addColorStop(0, light);
  g.addColorStop(.48, base);
  g.addColorStop(1, dark);
  ellipse(c, x, y, rx, ry, g);
  c.strokeStyle = `${dark}55`;
  c.lineWidth = .7;
  c.stroke();
}
function shadow(c: Context, x: number, y: number, rx: number, ry: number, opacity = .2) {
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(44, 70, 49, ${opacity})`);
  g.addColorStop(1, "rgba(44, 70, 49, 0)");
  ellipse(c, 0, 0, rx, rx, g);
  c.restore();
}
function leaf(c: Context, x: number, y: number, length: number, lean: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x + lean - 3, y - length * .45, x + lean, y - length);
  c.quadraticCurveTo(x + lean + 4, y - length * .4, x, y);
  c.fill();
  c.strokeStyle = "#43583755";
  c.lineWidth = .55;
  c.stroke();
}

// Foliage follows the original hollowings' olive ink and organic leaf edges.
// Broad shaded areas keep depth without turning trees into polished spheres.
function canopy(c: Context, x: number, y: number, rx: number, ry: number, light: string, base: string, dark: string) {
  c.save();
  c.translate(x, y);
  c.scale(rx, ry);
  c.beginPath();
  c.moveTo(-.86, .2);
  c.bezierCurveTo(-1.1, -.03, -.98, -.42, -.7, -.5);
  c.lineTo(-.77, -.72);
  c.quadraticCurveTo(-.48, -.65, -.4, -.91);
  c.quadraticCurveTo(-.16, -1.08, .06, -.91);
  c.lineTo(.27, -1.02);
  c.quadraticCurveTo(.3, -.79, .56, -.76);
  c.quadraticCurveTo(.84, -.75, .87, -.4);
  c.lineTo(1.02, -.28);
  c.quadraticCurveTo(.87, -.12, 1, .14);
  c.quadraticCurveTo(1.02, .52, .63, .62);
  c.lineTo(.68, .81);
  c.quadraticCurveTo(.4, .75, .18, .96);
  c.quadraticCurveTo(-.12, 1.02, -.35, .79);
  c.lineTo(-.56, .9);
  c.quadraticCurveTo(-.53, .66, -.78, .58);
  c.quadraticCurveTo(-1.02, .45, -.86, .2);
  c.closePath();
  c.fillStyle = gradient(c, -.7, -.85, 1.5, 1.7, [light, base, dark]);
  c.fill();
  c.strokeStyle = "#3f4e32bd";
  c.lineWidth = .055;
  c.stroke();
  c.save();
  c.clip();
  c.fillStyle = `${dark}40`;
  c.beginPath();
  c.moveTo(.58, -.75);
  c.quadraticCurveTo(.25, -.05, -.03, .28);
  c.quadraticCurveTo(-.38, .56, -.78, .58);
  c.lineTo(-.5, 1.15);
  c.lineTo(1.2, 1.15);
  c.lineTo(1.2, -.85);
  c.closePath();
  c.fill();
  c.restore();
  c.strokeStyle = `${dark}aa`;
  c.lineWidth = .045;
  c.beginPath();
  c.moveTo(-.65, .13);
  c.quadraticCurveTo(-.48, .27, -.25, .11);
  c.moveTo(.24, .51);
  c.quadraticCurveTo(.49, .7, .68, .43);
  c.moveTo(.53, -.28);
  c.quadraticCurveTo(.75, -.27, .79, -.08);
  c.stroke();
  // Little pointed leaves have the same readable linework as Verdreep's fur.
  for (const [lx, ly, tilt] of [[-.4, -.48, -.4], [.06, -.61, .3], [-.55, .37, -.25]]) {
    c.save();
    c.translate(lx, ly);
    c.rotate(tilt);
    c.beginPath();
    c.moveTo(0, .12);
    c.quadraticCurveTo(-.2, -.06, 0, -.24);
    c.quadraticCurveTo(.2, -.06, 0, .12);
    c.fillStyle = `${light}90`;
    c.fill();
    c.strokeStyle = `${dark}80`;
    c.lineWidth = .025;
    c.stroke();
    c.beginPath();
    c.moveTo(0, .1);
    c.lineTo(0, -.15);
    c.stroke();
    c.restore();
  }
  c.restore();
}

function tree(c: Context, x: number, y: number, variation: number, snow: boolean, orchard: boolean) {
  const broad = 1 + variation * .035;
  polygon(c, [[x - 4, y - 22], [x + 4, y - 22], [x + 5, y], [x - 6, y]], gradient(c, x - 5, y, 11, 0, ["#ad8b58", "#745f42", "#574e37"]));
  line(c, [[x - 2, y - 8], [x - 9, y - 19]], "#856842", 4);
  line(c, [[x + 1, y - 8], [x + 8, y - 23]], "#755c40", 4);
  ellipse(c, x, y, 7, 2, "#6b795141");
  canopy(c, x + 10, y - 24, 13 * broad, 13, "#9fac66", "#75864a", "#485e37");
  canopy(c, x - 11, y - 26, 13 * broad, 14, "#c0c780", "#99a85c", "#647b41");
  canopy(c, x, y - 37, 17 * broad, 17, "#c4cc85", "#9caa5b", "#5c763d");
  canopy(c, x - 1, y - 21, 15 * broad, 12, "#acbc74", "#82974e", "#496633");
  if (orchard) for (const [dx, dy] of [[-12, -28], [9, -32], [3, -17]]) {
    dome(c, x + dx, y + dy, 3, 3.2, "#f0ba7e", "#d58a61", "#a45a48");
    line(c, [[x + dx, y + dy - 3], [x + dx + 1, y + dy - 5]], "#665c3e");
  }
  if (snow) {
    ellipse(c, x - 3, y - 46, 13, 4.5, gradient(c, x, y - 48, 0, 8, ["#faf8e9", "#d1e1d9"]));
    ellipse(c, x - 13, y - 31, 10, 3.5, "#e6eee0");
    ellipse(c, x + 8, y - 30, 11, 3, "#d3e4dc");
  }
}
function rock(c: Context, x: number, y: number, variation: number, snow: boolean) {
  const h = 19 + variation * 2;
  polygon(c, [[x - 14, y - 3], [x - 15, y - h + 8], [x - 7, y - h], [x + 7, y - h - 1], [x + 15, y - h + 8], [x + 14, y - 2], [x + 5, y + 2], [x - 6, y + 1]], gradient(c, x - 10, y - h, 24, h, snow ? ["#dce7de", "#a6b9b5", "#708c91"] : ["#d3c9a9", "#aaa58c", "#7f8775"]));
  polygon(c, [[x - 15, y - h + 8], [x - 7, y - h], [x + 7, y - h - 1], [x + 3, y - h + 8], [x - 6, y - h + 13]], snow ? "#ebf0e6" : "#dfd4b4");
  line(c, [[x + 3, y - h + 8], [x + 7, y - 7], [x + 5, y + 2]], "#61766938", 1.5);
  if (!snow) ellipse(c, x - 6, y - 2, 6, 2.5, "#849964");
}
function building(c: Context, b: Building) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
  const left = x + 9, right = x + w - 9, bottom = y + h - 2, eave = y + h * .48, ridge = y + 1;
  // Facade and shaded right return sit beneath a wide pitched roof.
  round(c, left, eave - 6, w - 18, bottom - eave + 6, 5, gradient(c, left, eave, w, h * .4, ["#fbefd0", "#e5d1a7", "#c4ae89"]));
  polygon(c, [[right - 14, eave - 5], [right, eave + 5], [right, bottom], [right - 14, bottom - 5]], "#b7a180");
  round(c, left - 1, bottom - 12, w - 17, 12, 3, gradient(c, x, bottom - 12, 0, 12, ["#b9b59c", "#90977f"]));
  for (let i = 0; i < w / 28; i++) line(c, [[left + i * 28, bottom - 10], [left + i * 28, bottom - 3]], "#e6dcc13d");
  round(c, left + 4, eave, 5, bottom - eave - 12, 2, "#c7af87");
  round(c, right - 21, eave, 5, bottom - eave - 12, 2, "#c3a87f");
  const chimneyX = x + w - 42;
  round(c, chimneyX, ridge - 8, 15, 34, 2, gradient(c, chimneyX, ridge, 16, 0, ["#ddc8a7", "#a99479"]));
  round(c, chimneyX - 3, ridge - 10, 21, 6, 2, "#e9dbbd");
  line(c, [[chimneyX + 3, ridge + 2], [chimneyX + 12, ridge + 2]], "#8c786340");
  const roof = [[x + 26, ridge], [x + w - 37, ridge], [x + w + 1, eave], [x - 3, eave]];
  polygon(c, roof, gradient(c, x, ridge, w * .5, eave - ridge, ["#dcb390", b.roof, "#775e50"]));
  polygon(c, [[x + w - 37, ridge], [x + w - 12, ridge + 14], [x + w + 10, eave - 8], [x + w + 1, eave]], "#5d574c60");
  c.save();
  c.beginPath();
  roof.forEach(([rx, ry], i) => i ? c.lineTo(rx, ry) : c.moveTo(rx, ry));
  c.closePath();
  c.clip();
  for (let row = 1; row < 7; row++) {
    const ry = ridge + (eave - ridge) * row / 7;
    line(c, [[x, ry], [x + w, ry]], "#4f49402c", 1.5);
    line(c, [[x, ry + 1.5], [x + w, ry + 1.5]], "#ffe5c523", 1);
    for (let col = 0; col < w / 20; col++) line(c, [[x + col * 20 + row % 2 * 10, ry - 7], [x + col * 20 + row % 2 * 10, ry]], "#604d4220");
  }
  c.restore();
  line(c, [[x + 26, ridge], [x + w - 37, ridge]], "#f3c7a0", 3);
  round(c, x - 3, eave - 1, w + 5, 7, 3, gradient(c, x, eave, 0, 7, ["#b99a78", "#79634e"]));
  const windowY = bottom - 62;
  for (const wx of [left + 15, right - 45]) {
    round(c, wx - 3, windowY - 3, 31, 34, 5, "#a18c69");
    round(c, wx, windowY, 25, 27, 3, gradient(c, wx, windowY, 25, 27, ["#ddebdc", "#b3d0c2", "#749f9c"]));
    line(c, [[wx + 3, windowY + 18], [wx + 16, windowY + 3]], "#fff9df80", 3);
    line(c, [[wx + 12, windowY + 1], [wx + 12, windowY + 27]], "#f7e7c0", 2);
    line(c, [[wx, windowY + 13], [wx + 25, windowY + 13]], "#f7e7c0", 2);
    round(c, wx - 5, windowY + 28, 35, 9, 3, "#ae805e");
    for (let i = 0; i < 5; i++) {
      ellipse(c, wx - 1 + i * 7, windowY + 27, 4, 3, "#799864");
      dome(c, wx + i * 6, windowY + 25 - i % 2 * 2, 2.3, 2.3, "#f9dcac", "#e6ad8e", "#c38b78");
    }
  }
  const doorX = x + Math.floor(b.w / 2) * TILE;
  round(c, doorX - 4, bottom - 45, 37, 48, [16, 16, 2, 2], "#c1a47b");
  round(c, doorX, bottom - 42, 29, 43, [13, 13, 1, 1], gradient(c, doorX, bottom - 42, 30, 40, ["#9ca68a", "#607d6b", "#4e6657"]));
  round(c, doorX + 5, bottom - 36, 19, 15, [8, 8, 2, 2], "#b6d1bc");
  line(c, [[doorX + 14, bottom - 36], [doorX + 14, bottom - 22]], "#e4d8b1", 1.5);
  dome(c, doorX + 23, bottom - 12, 2, 2, "#fff0ba", "#d7b576", "#ab8758");
  round(c, doorX - 10, bottom + 1, 47, 6, 3, gradient(c, x, bottom, 0, 8, ["#e1d5b2", "#a9a68b"]));
  // A carved sign keeps the service readable without floating technical labels.
  const labelY = eave + 16;
  c.font = "600 8px system-ui";
  c.textAlign = "center";
  const labelW = c.measureText(b.name).width + 18;
  round(c, x + w / 2 - labelW / 2, labelY - 8, labelW, 17, 4, "#846e51");
  round(c, x + w / 2 - labelW / 2 + 1, labelY - 8, labelW - 2, 14, 3, "#f0ddae");
  c.fillStyle = "#596349";
  c.fillText(b.name, x + w / 2, labelY + 2);
  if (b.service === "heal") {
    dome(c, x + w / 2 - 4, ridge + 31, 13, 12, "#ffefcf", "#eed9b7", "#d5b799");
    round(c, x + w / 2 - 7, ridge + 22, 6, 18, 2, "#ad6e5d");
    round(c, x + w / 2 - 13, ridge + 28, 18, 6, 2, "#ad6e5d");
  }
}

function landmark(c: Context, mark: Landmark) {
  const x = mark.x * TILE + 16, y = mark.y * TILE + 23;
  switch (mark.kind) {
    case "oak":
      polygon(c, [[x - 7, y], [x - 5, y - 56], [x + 5, y - 54], [x + 9, y]], gradient(c, x - 7, y, 16, 0, ["#bb985c", "#7b6846"]));
      for (const [dx, dy, rx, ry] of [[22, -40, 27, 24], [-22, -44, 25, 24], [0, -69, 30, 26], [0, -39, 27, 22]]) canopy(c, x + dx, y + dy, rx, ry, "#c4cc85", "#98aa5b", "#57743c");
      break;
    case "windmill":
      polygon(c, [[x - 17, y], [x - 11, y - 50], [x + 10, y - 50], [x + 19, y]], gradient(c, x - 14, y - 50, 31, 40, ["#f3e2b8", "#c3b18b"]));
      round(c, x - 5, y - 17, 10, 17, [5, 5, 0, 0], "#7b7e61");
      polygon(c, [[x - 20, y - 49], [x, y - 65], [x + 21, y - 49]], "#a98461");
      c.save(); c.translate(x, y - 42); c.rotate(Math.PI / 4);
      for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); round(c, -1.5, -42, 3, 43, 1, "#897458"); round(c, 2, -40, 10, 27, 2, gradient(c, 2, -40, 10, 0, ["#ffedc3", "#cbb995"])); for (let j = 0; j < 4; j++) line(c, [[2, -36 + j * 6], [12, -36 + j * 6]], "#9f8d6e", .8); }
      c.restore(); dome(c, x, y - 42, 4, 4, "#d1b987", "#a78d62", "#746448");
      break;
    case "fountain":
      ellipse(c, x, y, 29, 13, "#899f92");
      ellipse(c, x, y - 6, 29, 13, gradient(c, x, y - 18, 0, 25, ["#e7e5cb", "#b6c4ad"]));
      ellipse(c, x, y - 7, 23, 9, "#7babaa");
      ellipse(c, x - 4, y - 10, 17, 5, "#a2d0c0");
      round(c, x - 4, y - 34, 8, 28, 3, gradient(c, x - 4, y, 8, 0, ["#edf0d5", "#acbba3"]));
      ellipse(c, x, y - 32, 17, 6, "#c4d2b9"); ellipse(c, x, y - 35, 17, 6, "#edf0d6"); ellipse(c, x, y - 35, 12, 3, "#9ec6b7");
      line(c, [[x - 12, y - 33], [x - 15, y - 19], [x - 19, y - 9]], "#d3eddb99", 2);
      line(c, [[x + 12, y - 33], [x + 16, y - 17], [x + 19, y - 9]], "#d3eddb99", 2);
      break;
    case "camp":
      polygon(c, [[x - 27, y], [x - 4, y - 37], [x + 21, y - 32], [x + 37, y]], gradient(c, x - 20, y - 30, 60, 30, ["#f0d4a1", "#c79968"]));
      polygon(c, [[x - 27, y], [x - 4, y - 37], [x + 12, y]], "#eed9ac");
      polygon(c, [[x - 12, y], [x - 4, y - 21], [x + 5, y]], "#766f4e");
      line(c, [[x - 4, y - 37], [x + 12, y]], "#fff0ca", 1.5);
      line(c, [[x - 21, y - 7], [x - 34, y + 5]], "#a28c67");
      line(c, [[x + 32, y - 6], [x + 41, y + 5]], "#a28c67");
      ellipse(c, x + 45, y + 1, 10, 5, "#adb096"); line(c, [[x + 39, y + 1], [x + 51, y - 1]], "#8c7354", 4);
      dome(c, x + 45, y - 4, 4, 6, "#f8d789", "#dba65d", "#c5814e");
      break;
    case "ruins":
    case "shrine": {
      const shrine = mark.kind === "shrine";
      round(c, x - 27, y - 3, 54, 9, 3, "#a0aa91");
      for (const [dx, height] of shrine ? [[-9, 36]] : [[-22, 30], [15, 46]]) {
        round(c, x + dx, y - height, shrine ? 20 : 12, height, 2, gradient(c, x + dx, y, 16, 0, ["#e1dfbf", "#a5b09a"]));
        round(c, x + dx - 4, y - height - 5, shrine ? 28 : 20, 7, 2, "#d9ddbf");
        line(c, [[x + dx + 2, y - height + 12], [x + dx + 8, y - height + 12]], "#85958160");
      }
      if (shrine) { round(c, x - 3, y - 27, 8, 12, 3, "#8fb9ad"); dome(c, x + 1, y - 22, 2, 3, "#f2ebbb", "#d4dba7", "#99b393"); }
      leaf(c, x - 22, y + 2, 15, -6, "#89a66e"); leaf(c, x + 21, y + 2, 12, 4, "#759566");
      break;
    }
    case "crystals":
      for (const [dx, dy, height] of [[-16, -2, 27], [0, 3, 43], [17, 0, 30]]) {
        polygon(c, [[x + dx - 7, y + dy], [x + dx - 7, y + dy - height + 8], [x + dx, y + dy - height], [x + dx + 8, y + dy - height + 8], [x + dx + 7, y + dy]], gradient(c, x + dx - 7, y - height, 15, height, ["#e4f0d6", "#a3cbc5", "#77aba9"]));
        polygon(c, [[x + dx, y + dy - height], [x + dx + 3, y + dy - height + 10], [x + dx + 3, y + dy - 3], [x + dx, y + dy]], "#e0f1dd9c");
      }
      break;
    case "mushrooms":
      for (const [dx, dy, size] of [[-22, -3, 8], [-9, -20, 9], [14, -19, 10], [26, -2, 7], [0, 10, 11]]) {
        round(c, x + dx - 2, y + dy - 9, 5, 13, 2, gradient(c, x + dx - 2, y, 5, 0, ["#faf0cb", "#d2c39d"]));
        dome(c, x + dx, y + dy - 10, size, size * .65, "#f0c8a7", "#ca9581", "#a37368");
        ellipse(c, x + dx - size * .3, y + dy - 12, 2, 1.5, "#fbe5c4");
        ellipse(c, x + dx + size * .4, y + dy - 10, 1.5, 1, "#fbe5c4");
      }
      break;
    case "boat":
      polygon(c, [[x - 29, y - 7], [x + 27, y - 7], [x + 15, y + 6], [x - 17, y + 5]], gradient(c, x, y - 7, 0, 14, ["#c9a379", "#896b50"]));
      ellipse(c, x - 1, y - 8, 25, 6, "#e1bd8b"); ellipse(c, x - 1, y - 8, 20, 3, "#a88a62");
      line(c, [[x, y - 47], [x, y - 8]], "#8b7959", 3);
      polygon(c, [[x + 3, y - 47], [x + 26, y - 16], [x + 3, y - 16]], gradient(c, x, y - 47, 20, 25, ["#fff5d6", "#e0cfab"]));
      break;
    case "cart":
      for (const dx of [-17, 17]) { dome(c, x + dx, y + 3, 6, 7, "#aaa27e", "#776f51", "#5c614a"); ellipse(c, x + dx, y + 3, 2, 2, "#caba8e"); }
      round(c, x - 24, y - 19, 48, 21, 3, gradient(c, x, y - 19, 0, 21, ["#d5b587", "#ab875f"]));
      round(c, x - 27, y - 21, 54, 5, 2, "#e1c599");
      for (let i = 0; i < 5; i++) dome(c, x - 18 + i * 9, y - 24, 5, 5, "#e5b587", "#c48b62", "#ac7757");
      line(c, [[x + 24, y - 10], [x + 37, y - 3]], "#ac8e68", 3);
      break;
    case "bench":
      for (const dx of [-19, 19]) { round(c, x + dx, y - 5, 4, 13, 2, "#7c8161"); round(c, x + dx, y - 27, 4, 24, 2, "#8b8b65"); }
      round(c, x - 25, y - 23, 53, 8, 3, gradient(c, x, y - 23, 0, 8, ["#ddc694", "#b19b6d"]));
      round(c, x - 27, y - 9, 57, 8, 3, gradient(c, x, y - 9, 0, 8, ["#dfcba1", "#a18e68"]));
      break;
    default:
      for (let i = 0; i < 7; i++) { const dx = -22 + i * 7, h = 18 + i % 3 * 7; leaf(c, x + dx, y, h, (i % 2 ? 1 : -1) * 6, "#7f9f68"); line(c, [[x + dx, y], [x + dx + 2, y - h - 3]], "#899b66", 1.5); round(c, x + dx, y - h - 10, 4, 9, 2, "#baab78"); }
  }
  c.font = "600 8px system-ui"; c.textAlign = "center";
  const width = c.measureText(mark.label).width + 16;
  round(c, x - width / 2, y + 18, width, 16, 7, "#fbf4dfe8");
  c.fillStyle = "#657a5b"; c.fillText(mark.label, x, y + 29);
}

function cachedItem(x: number, y: number, width: number, height: number, render: (c: Context) => void): DepthItem {
  const canvas = document.createElement("canvas");
  canvas.width = width * 2; canvas.height = height * 2;
  const c = canvas.getContext("2d")!; c.scale(2, 2); c.translate(-x, height - y);
  render(c);
  return { x, y, width, height, draw: (ctx) => ctx.drawImage(canvas, x, y - height, width, height) };
}

function illustratedItem(name: WorldArt, x: number, y: number, width: number, height: number, flip = false): DepthItem | undefined {
  const size = worldArtSize(name, width, height);
  if (!size) return undefined;
  return { x: x - size.width / 2, y, width: size.width, height: size.height,
    draw: (ctx) => { drawWorldArt(ctx, name, x, y, width, height, flip); } };
}

function landmarkArt(mark: Landmark): { name: WorldArt; width: number; height: number } {
  switch (mark.kind) {
    case "oak": return { name: "oak", width: 98, height: 110 };
    case "windmill": return { name: "windmill", width: 94, height: 100 };
    case "fountain": return { name: "fountain", width: 74, height: 70 };
    case "ruins": case "shrine": return { name: "shrine", width: 85, height: 85 };
    case "boat": return { name: "boat", width: 79, height: 88 };
    case "mushrooms": return { name: "mushrooms", width: 66, height: 50 };
    case "crystals": return { name: "crystals", width: 67, height: 62 };
    case "camp": return { name: "camp", width: 80, height: 70 };
    case "cart": return { name: "cart", width: 75, height: 60 };
    case "bench": return { name: "bench", width: 75, height: 53 };
    case "reeds": return { name: "reeds", width: 65, height: 46 };
    default: return { name: "flowers", width: 65, height: 44 };
  }
}

function landmarkLabel(c: Context, mark: Landmark) {
  const x = mark.x * TILE + 16, y = mark.y * TILE + 23;
  c.font = "600 8px system-ui"; c.textAlign = "center";
  const width = c.measureText(mark.label).width + 16;
  round(c, x - width / 2, y + 18, width, 16, 7, "#fbf4dfe8");
  c.fillStyle = "#657a5b"; c.fillText(mark.label, x, y + 29);
}

function illustratedBridges(world: World) {
  const runs: { x: number; y: number; width: number; height: number }[] = [];
  const visited = new Set<string>();
  if (!worldArtSize("bridge", 64, 64)) return runs;
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    if (world.tiles[y][x] !== "bridge" || visited.has(`${x},${y}`)) continue;
    const queue = [{ x, y }], points: { x: number; y: number }[] = [];
    let left = x, right = x, top = y, bottom = y;
    visited.add(`${x},${y}`);
    for (let i = 0; i < queue.length; i++) {
      const point = queue[i]; points.push(point);
      left = Math.min(left, point.x); right = Math.max(right, point.x);
      top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = point.x + dx, ny = point.y + dy, key = `${nx},${ny}`;
        if (world.tiles[ny]?.[nx] !== "bridge" || visited.has(key)) continue;
        visited.add(key); queue.push({ x: nx, y: ny });
      }
    }
    // Authored crossings are rectangles. Leave irregular junctions to the deck fallback.
    if (points.length !== (right - left + 1) * (bottom - top + 1)) continue;
    runs.push({ x: left * TILE, y: top * TILE, width: (right - left + 1) * TILE, height: (bottom - top + 1) * TILE });
  }
  return runs;
}

export function landscape(world: World): Landscape {
  const artRevision = worldArtRevision();
  const existing = cache.get(world.zone.id);
  if (existing?.artRevision === artRevision) return existing;
  const canvas = document.createElement("canvas");
  canvas.width = world.width * TILE; canvas.height = world.height * TILE;
  const c = canvas.getContext("2d")!, rng = random(world.zone.seed);
  const snow = world.zone.kind === "snow", orchard = world.zone.kind === "orchard", highland = world.zone.kind === "highland";
  const grass = snow ? "#e0e9de" : highland ? "#afb97c" : world.zone.kind === "forest" ? "#88a768" : world.zone.kind === "glade" ? "#99b77d" : orchard ? "#aabd76" : "#a0b975";
  c.fillStyle = grass; c.fillRect(0, 0, canvas.width, canvas.height);
  const grassTexture = worldGroundTexture("grass"), pathTexture = worldGroundTexture("path");
  if (grassTexture && !snow) {
    const texture = c.createPattern(grassTexture, "repeat");
    if (texture) {
      texture.setTransform(new DOMMatrix().scale(.38));
      c.save(); c.globalAlpha = .16; c.fillStyle = texture;
      c.fillRect(0, 0, canvas.width, canvas.height); c.restore();
    }
  }
  // Broad, translucent washes have the irregular color of painted paper.
  for (let i = 0; i < 95; i++) {
    const x = rng() * canvas.width, y = rng() * canvas.height, radius = 25 + rng() * 110;
    const wash = c.createRadialGradient(x, y, 0, x, y, radius);
    wash.addColorStop(0, i % 2 ? "#ead9891c" : "#49743e12");
    wash.addColorStop(1, "#8ca56500");
    ellipse(c, x, y, radius, radius * .6, wash);
  }
  const waterFill = gradient(c, 0, 0, canvas.width * .3, canvas.height, ["#93bdb1", "#76a8a6"]);
  const bridges = illustratedBridges(world);
  const illustratedFlowers = !!worldArtSize("flowers", 38, 31);
  const watery = (x: number, y: number) => ["water", "bridge"].includes(world.tiles[y]?.[x]);
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const tile = world.tiles[y][x], px = x * TILE, py = y * TILE;
    // Fine flecks keep flat terrain from looking like plastic beneath the art.
    for (let j = 0; j < 3; j++) {
      const gx = px + 3 + rng() * 25, gy = py + 3 + rng() * 25;
      ellipse(c, gx, gy, 1 + rng() * 2, .7, snow ? "#f4f5e750" : "#e1ddb039");
      if (j === 0 && tile === "grass") line(c, [[gx - 2, gy], [gx - 3, gy - 2], [gx, gy], [gx + 1, gy - 3]], snow ? "#b4c8b954" : "#67864a50", .7);
    }
    if (["path", "sand", "ice"].includes(tile)) {
      const path = tile === "path", ice = tile === "ice";
      const fill = ice ? "#b9d8d5" : snow && path ? "#c6d6c3" : "#e3d4ac";
      const same = (dx: number, dy: number) => world.tiles[y + dy]?.[x + dx] === tile || path && world.tiles[y + dy]?.[x + dx] === "bridge";
      const radii = [!same(-1, 0) && !same(0, -1) ? 9 : 0, !same(1, 0) && !same(0, -1) ? 9 : 0, !same(1, 0) && !same(0, 1) ? 9 : 0, !same(-1, 0) && !same(0, 1) ? 9 : 0];
      round(c, px, py, TILE, TILE, radii, fill);
      if (pathTexture && !ice) {
        c.save(); c.clip(); c.globalAlpha = .15;
        c.drawImage(pathTexture, (x * TILE) % pathTexture.width, (y * TILE) % pathTexture.height, TILE, TILE, px, py, TILE, TILE);
        c.restore();
      }
      if (!same(0, 1)) { line(c, [[px + radii[3], py + 30], [px + TILE - radii[2], py + 30]], ice ? "#7caaa954" : "#b6a17c50", 2); }
      if (!same(0, -1)) line(c, [[px + radii[0], py + 1], [px + TILE - radii[1], py + 1]], "#fdf1ca82", 1.5);
      for (let j = 0; j < 4; j++) ellipse(c, px + 5 + rng() * 22, py + 5 + rng() * 22, 1.6, .7, ice ? "#eff5db77" : "#bda88238");
      if (ice) line(c, [[px + 5, py + 20], [px + 13, py + 13], [px + 26, py + 13]], "#edf5e370", 1);
    }
    if (tile === "water" || tile === "bridge") {
      c.fillStyle = waterFill; c.fillRect(px, py, TILE, TILE);
      if (!watery(x - 1, y)) { round(c, px, py, 5, TILE, 0, "#869c76"); line(c, [[px + 5, py], [px + 5, py + TILE]], "#d9ddbb", 2); }
      if (!watery(x + 1, y)) { round(c, px + 27, py, 5, TILE, 0, "#a7b791"); line(c, [[px + 26, py], [px + 26, py + TILE]], "#bcd9c5", 1.5); }
      if (!watery(x, y - 1)) { round(c, px, py, TILE, 5, 0, "#839b77"); line(c, [[px, py + 5], [px + TILE, py + 5]], "#bbd7ba", 2); }
      if (!watery(x, y + 1)) round(c, px, py + 28, TILE, 4, 0, "#b7c699");
      for (let j = 0; j < 2; j++) { const wx = px + 5 + rng() * 16, wy = py + 8 + j * 11; line(c, [[wx, wy], [wx + 4, wy - 1], [wx + 9, wy]], "#d4e5cd70", 1); }
    }
    if (tile === "bridge") {
      round(c, px, py + 4, TILE, TILE - 4, 1, "#6f80643b");
      for (let j = 0; j < 4; j++) { round(c, px + j * 8 + .5, py - 2, 7.2, TILE, 1.3, gradient(c, px, py - 2, 0, TILE, ["#e1c69b", "#b39a76"])); line(c, [[px + j * 8 + 2, py + 2], [px + j * 8 + 3, py + 19]], "#9c805a50", .6); }
      if (world.tiles[y - 1]?.[x] !== "bridge") round(c, px - 1, py - 4, 34, 4, 2, "#f0d9b1");
      if (world.tiles[y + 1]?.[x] !== "bridge") round(c, px - 1, py + 26, 34, 5, 2, "#a18c68");
    }
    const plant = rng() < (tile === "tall" ? .6 : .45);
    if (tile === "tall" && (!illustratedFlowers || plant) && !drawWorldArt(c, "flowers", px + 13 + rng() * 6, py + 28 + rng() * 5, 32 + rng() * 5, 26 + rng() * 4, (x + y) % 2 === 0)) for (let j = 0; j < 6; j++) {
      const gx = px + 4 + rng() * 23, gy = py + 10 + rng() * 19;
      ellipse(c, gx, gy, 5, 2, "#67865b22");
      leaf(c, gx, gy, 8, -4, "#799b67"); leaf(c, gx, gy, 12, 1, "#90ae72"); leaf(c, gx, gy, 8, 5, "#a5bc80");
    }
    if (tile === "flowers" && (!illustratedFlowers || plant) && !drawWorldArt(c, "flowers", px + 12 + rng() * 8, py + 26 + rng() * 5, 27 + rng() * 7, 23 + rng() * 5, x % 2 === 0)) for (let j = 0; j < 3; j++) {
      const fx = px + 5 + rng() * 22, fy = py + 8 + rng() * 20, color = ["#f4e9b7", "#edc0a7", "#e9dfcf"][Math.floor(rng() * 3)];
      line(c, [[fx, fy], [fx, fy - 6]], "#879b66", 1); leaf(c, fx, fy, 4, 3, "#79985e");
      for (let k = 0; k < 5; k++) ellipse(c, fx + Math.cos(k / 5 * TAU) * 2, fy - 7 + Math.sin(k / 5 * TAU) * 2, 1.7, 1.7, color);
      ellipse(c, fx, fy - 7, 1, 1, "#ceae6d");
    }
    if (tile === "grass" && !snow && rng() < .045) {
      drawWorldArt(c, "flowers", px + 16, py + 27, 24, 17, y % 2 === 0);
    }
  }
  for (const bridge of bridges) {
    const vertical = bridge.height > bridge.width;
    const width = vertical ? bridge.height : bridge.width, height = vertical ? bridge.width : bridge.height;
    const size = worldArtSize("bridge", width, height)!;
    c.save(); c.translate(bridge.x + bridge.width / 2, bridge.y + bridge.height / 2);
    if (vertical) c.rotate(Math.PI / 2);
    drawWorldArt(c, "bridge", 0, size.height / 2, width, height);
    c.restore();
  }
  // A broad wash of warm skylight ties the terrain palette together.
  const wash = c.createLinearGradient(0, 0, canvas.width, canvas.height);
  wash.addColorStop(0, "#fff0bd25"); wash.addColorStop(.5, "#fff0bd00"); wash.addColorStop(1, "#3b795014");
  c.fillStyle = wash; c.fillRect(0, 0, canvas.width, canvas.height);
  const scenery: DepthItem[] = [], treeSprites = new Map<number, HTMLCanvasElement>(), rockSprites = new Map<number, HTMLCanvasElement>();
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const tile = world.tiles[y][x], px = x * TILE + 16, py = y * TILE + 28;
    if (tile !== "tree" && tile !== "rock") continue;
    const isTree = tile === "tree", variation = Math.floor(rng() * 4), sprites = isTree ? treeSprites : rockSprites;
    const name: WorldArt = isTree ? snow ? "snowPine" : orchard ? "orchard" : world.zone.kind === "forest" && variation % 2 ? "pine" : "oak" : snow ? "iceRock" : "rock";
    const illustrated = illustratedItem(name, px, py + 4, isTree ? 57 + variation * 2 : 35 + variation * 2, isTree ? 75 + variation * 3 : 31 + variation * 2, variation % 2 === 0);
    shadow(c, px + (isTree ? 5 : 3), py + 3, isTree ? 25 : 18, isTree ? 11 : 7, .2);
    if (illustrated) { scenery.push(illustrated); continue; }
    let sprite = sprites.get(variation);
    if (!sprite) {
      sprite = document.createElement("canvas"); sprite.width = 128; sprite.height = 136;
      const sc = sprite.getContext("2d")!; sc.scale(2, 2);
      if (isTree) tree(sc, 32, 64, variation, snow, orchard); else rock(sc, 32, 64, variation, snow);
      sprites.set(variation, sprite);
    }
    const image = sprite;
    scenery.push({ x: px - 32, y: py + 4, width: 64, height: 68, draw: (ctx) => ctx.drawImage(image, px - 32, py - 64, 64, 68) });
  }
  for (const b of world.buildings) {
    const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
    shadow(c, x + w / 2 + 13, y + h - 3, w * .65, 35, .28);
    const name: WorldArt = b.service === "heal" ? "healing" : b.service === "shop" ? "shop" : "cottage";
    const image = b.service === "gym" || b.service === "champion" ? null : illustratedItem(name, x + w / 2, y + h + 6, w + 24, h + 30);
    scenery.push(image ?? cachedItem(x - 8, y + h + 8, w + 24, h + 24, (ctx) => building(ctx, b)));
  }
  for (const mark of world.landmarks) {
    shadow(c, mark.x * TILE + 22, mark.y * TILE + 25, mark.kind === "oak" ? 57 : 36, mark.kind === "oak" ? 20 : 12, .23);
    const art = landmarkArt(mark);
    const image = illustratedItem(art.name, mark.x * TILE + 16, mark.y * TILE + 29, art.width, art.height);
    const item = image ?? cachedItem(mark.x * TILE - 51, mark.y * TILE + 59, 138, 154, (ctx) => landmark(ctx, mark));
    item.depth = mark.y * TILE + 28;
    scenery.push(item);
    if (image) scenery.push(cachedItem(mark.x * TILE - 70, mark.y * TILE + 59, 175, 40, (ctx) => landmarkLabel(ctx, mark)));
  }
  for (const exit of world.zone.exits) {
    const point = exitPoint(world.zone, exit, 4), x = point.x * TILE + 16, y = point.y * TILE + 20;
    const arrows = { north: "↑", south: "↓", east: "→", west: "←" };
    const label = `${arrows[exit.direction]} ${zoneById(exit.target).name}`;
    c.font = "600 9px system-ui"; const width = c.measureText(label).width + 18;
    shadow(c, x + 5, y + 2, 19, 7, .2);
    scenery.push(cachedItem(x - width / 2 - 3, y + 3, width + 6, 75, (ctx) => {
      if (drawWorldArt(ctx, "sign", x, y + 2, width + 8, 50)) {
        // The painted arrow stays at its natural aspect; the destination remains legible.
        round(ctx, x - width / 2, y - 64, width, 16, 7, "#fbf4dfe8");
        ctx.font = "600 9px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#544c35";
        ctx.fillText(label, x, y - 53);
        return;
      }
      round(ctx, x - 2, y - 25, 5, 27, 2, gradient(ctx, x - 2, y, 5, 0, ["#bc9e6c", "#8a7957"]));
      round(ctx, x - width / 2, y - 44, width, 23, 4, "#a38b64");
      round(ctx, x - width / 2, y - 44, width, 20, 4, gradient(ctx, x, y - 44, 0, 20, ["#f4e5bd", "#dcc599"]));
      ctx.font = "600 9px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#626d4f"; ctx.fillText(label, x, y - 31);
      ellipse(ctx, x - width / 2 + 5, y - 34, 1, 1, "#a28c63"); ellipse(ctx, x + width / 2 - 5, y - 34, 1, 1, "#a28c63");
    }));
  }
  scenery.sort((a, b) => (a.depth ?? a.y) - (b.depth ?? b.y));
  const result = { ground: canvas, scenery, artRevision };
  if (cache.size >= 6) cache.delete(cache.keys().next().value!);
  cache.set(world.zone.id, result);
  return result;
}

export function drawPerson(c: Context, x: number, y: number, direction: string, time: number, moving: boolean, color = "#6a9385", npc = false) {
  const stride = moving ? Math.sin(time / 80) * 2 : 0, bob = moving ? Math.abs(stride) * .4 : 0;
  shadow(c, x + 3, y + 11, 15, 6, .26);
  if (drawIllustratedPerson(c, x, y + 13, direction, time / 80, moving, npc)) return;
  c.save(); c.translate(x, y - bob);
  round(c, -7, 0 + stride, 5, 12, 2.5, "#61705e"); round(c, 2, 0 - stride, 5, 12, 2.5, "#566a59");
  round(c, -8, 9 + stride, 7, 4, 2, "#73604a"); round(c, 2, 9 - stride, 8, 4, 2, "#665741");
  round(c, -12, -12 - stride, 5, 15, 2.5, gradient(c, -12, -12, 4, 12, ["#f1d7ac", "#d1a67d"]));
  round(c, 8, -12 + stride, 5, 15, 2.5, "#cfa882");
  round(c, -9, -17, 18, 23, [6, 6, 4, 4], gradient(c, -9, -17, 19, 22, ["#acc3a0", color, "#426d5b"]));
  c.strokeStyle = "#354f4099"; c.lineWidth = .8; c.stroke();
  line(c, [[-5, -14], [-5, 1]], "#d6d4aa7a", 1.5);
  ellipse(c, 0, -24, 8, 9, gradient(c, -7, -30, 14, 12, ["#f6ddb4", "#e5bf95", "#c89472"]));
  c.strokeStyle = "#7c624a99"; c.lineWidth = .8; c.stroke();
  dome(c, 0, -31, 9, 5, "#b89568", "#896f51", "#6d5945");
  if (!npc) {
    ellipse(c, direction === "left" ? -4 : direction === "right" ? 4 : 0, -29, 13, 3.5, "#b67e59");
    dome(c, -1, -34, 9, 5.5, "#edc499", "#d29d71", "#ad7653");
    line(c, [[-8, -33], [6, -33]], "#f4d3a0", 1.5);
  }
  if (direction !== "up") {
    ellipse(c, direction === "left" ? -6 : 4, -23, 1.1, 1.5, "#4f5741");
    if (direction === "down") { ellipse(c, -4, -23, 1.1, 1.5, "#4f5741"); line(c, [[-1, -19], [1, -19]], "#ad7c61", .8); }
  }
  if (direction === "up" || direction === "left") {
    round(c, -7, -15, 14, 17, 4, gradient(c, -7, -15, 15, 17, ["#e5d2a1", "#bba477", "#8f835a"]));
    round(c, -6, -14, 12, 6, 3, "#eddeb3"); round(c, -4, -5, 8, 5, 2, "#c5b180");
  }
  c.restore();
}

export function drawPickup(c: Context, x: number, y: number, time: number) {
  const bob = Math.sin(time / 550) * 1.5;
  shadow(c, x + 2, y + 10, 12, 5, .2);
  if (drawWorldArt(c, "gift", x, y + 11 + bob, 26, 29)) return;
  c.save(); c.translate(x, y + bob);
  round(c, -7, -7, 14, 15, 4, gradient(c, -7, -7, 15, 15, ["#fbe8b9", "#dfbc7e", "#bd9561"]));
  round(c, -8, -8, 16, 5, 2, "#f3d7a1"); round(c, -1.5, -8, 3, 16, 1, "#fff0c5");
  ellipse(c, -3, -9, 3, 2, "#e3ba79"); ellipse(c, 3, -9, 3, 2, "#f4dca7");
  line(c, [[11, -15], [11, -9]], "#fff4cb", 1.5); line(c, [[8, -12], [14, -12]], "#fff4cb", 1.5);
  c.restore();
}
