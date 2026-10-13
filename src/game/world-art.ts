import { walkingLegPose } from "./player-walk";

/** Illustrated scenery is painted from the same references as the hollowings. */
export type WorldArt =
  | "oak" | "pine" | "orchard" | "snowPine"
  | "cottage" | "healing" | "shop" | "windmill"
  | "rock" | "iceRock" | "flowers" | "mushrooms"
  | "fountain" | "shrine" | "boat" | "bench"
  | "camp" | "cart" | "crystals" | "bridge" | "gift" | "sign" | "reeds";

const slots: WorldArt[] = [
  "oak", "pine", "orchard", "snowPine",
  "cottage", "healing", "shop", "windmill",
  "rock", "iceRock", "flowers", "mushrooms",
  "fountain", "shrine", "boat", "bench",
];
// Generation left uneven gutters, so the regions follow the actual painted rows.
// Values are normalized to keep extraction correct if the source is resized.
const mainRows = [0, 355, 695, 941, 1254];
const mainColumns = [
  [0, 327, 634, 960, 1254], [0, 327, 634, 981, 1254],
  [0, 327, 634, 955, 1254], [0, 327, 634, 946, 1254],
];
const propRows = [0, 466, 887];
const propColumns = [[0, 448, 890, 1275, 1774], [0, 448, 890, 1280, 1774]];
const files = import.meta.glob("../../assets/world/illustrated-*.png", {
  eager: true, query: "?url", import: "default",
}) as Record<string, string>;
const originalFiles = import.meta.glob(["../../assets/player/*-*.png", "../../assets/tiles/grass.png", "../../assets/tiles/path-full.png"], {
  eager: true, query: "?url", import: "default",
}) as Record<string, string>;
const originalImages = new Map<string, HTMLImageElement>();
type Crop = { x: number; y: number; width: number; height: number };
type Sprite = Crop & { image: HTMLImageElement };
const sprites = new Map<WorldArt, Sprite>();
let started = false;
let revision = 0;

function loadArt() {
  if (started || typeof Image === "undefined") return;
  started = true;
  loadAtlas("illustrated-world-v1.png", slots, 4);
  loadAtlas("illustrated-props-v1.png", ["camp", "cart", "crystals", "bridge", "gift", "sign", "reeds", "bench"], 2);
}

function loadAtlas(filename: string, names: WorldArt[], rows: number) {
  const url = files[`../../assets/world/${filename}`];
  if (!url) return;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const cellWidth = canvas.width / 4, cellHeight = canvas.height / rows;
    names.forEach((name, index) => {
      const row = Math.floor(index / 4), column = index % 4;
      const main = filename === "illustrated-world-v1.png", props = filename === "illustrated-props-v1.png";
      const columns = main ? mainColumns : props ? propColumns : undefined;
      const rowBounds = main ? mainRows : props ? propRows : undefined;
      const referenceWidth = main ? 1254 : 1774, referenceHeight = main ? 1254 : 887;
      const left = Math.round(columns ? columns[row][column] / referenceWidth * canvas.width : column * cellWidth);
      const top = Math.round(rowBounds ? rowBounds[row] / referenceHeight * canvas.height : row * cellHeight);
      const right = Math.round(columns ? columns[row][column + 1] / referenceWidth * canvas.width : (column + 1) * cellWidth);
      const bottom = Math.round(rowBounds ? rowBounds[row + 1] / referenceHeight * canvas.height : (row + 1) * cellHeight);
      let minX = right, minY = bottom, maxX = left, maxY = top;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] < 12) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (minX > maxX || minY > maxY) return;
      const x = Math.max(left, minX - 2), y = Math.max(top, minY - 2);
      // A supplemental prop deliberately replaces the broad atlas equivalent.
      if (filename === "illustrated-world-v1.png" && sprites.has(name)) return;
      sprites.set(name, { image, x, y, width: Math.min(right - 1, maxX + 2) - x + 1, height: Math.min(bottom - 1, maxY + 2) - y + 1 });
    });
    // The landscape cache is rebuilt after the asynchronous image arrives.
    revision++;
  };
  image.src = url;
}

export function worldArtRevision() {
  loadArt();
  originalImage("tiles/grass.png", true);
  originalImage("tiles/path-full.png", true);
  return revision;
}

function originalImage(name: string, terrain = false) {
  if (typeof Image === "undefined") return undefined;
  let image = originalImages.get(name);
  if (!image) {
    const url = originalFiles[`../../assets/${name}`];
    if (!url) return undefined;
    image = new Image();
    if (terrain) image.onload = () => { revision++; };
    image.src = url;
    originalImages.set(name, image);
  }
  return image.complete && image.naturalWidth ? image : undefined;
}

export function worldGroundTexture(kind: "grass" | "path") {
  return originalImage(kind === "grass" ? "tiles/grass.png" : "tiles/path-full.png", true);
}

type WalkingLeg = { image: HTMLCanvasElement; hipX: number; kneeX: number };
type WalkingRig = { body: HTMLCanvasElement; legs: WalkingLeg[]; width: number; height: number; hipY: number; kneeY: number };
const walkingRigs = new WeakMap<HTMLImageElement, WalkingRig>();

function imageLayer(width: number, height: number, pixels: Uint8ClampedArray) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d")!;
  const layer = context.createImageData(width, height);
  layer.data.set(pixels);
  context.putImageData(layer, 0, 0);
  return canvas;
}

/** Isolate shoes and legs only; hands remain on the unchanged upper-body layer. */
function walkingRig(image: HTMLImageElement, profile: boolean, right: boolean) {
  const cached = walkingRigs.get(image);
  if (cached) return cached;
  // Resample the PNG before masking. Scaling full-resolution Canvas layers directly
  // to a 54px avatar leaves the source illustration's tiny alpha speckles visible.
  const height = 108, width = Math.round(image.naturalWidth / image.naturalHeight * height);
  const source = document.createElement("canvas");
  source.width = width; source.height = height;
  const context = source.getContext("2d", { willReadFrequently: true })!;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const hipY = Math.round(height * .735), kneeY = Math.round(height * .84);
  const body = new Uint8ClampedArray(pixels);
  const masks: Uint8ClampedArray[] = [];

  if (profile) {
    // The side PNG overlaps two legs. Follow the existing foreground leg outline,
    // then reuse that complete leg behind it for the opposite half of the stride.
    const boundary = [[.735, .47], [.87, .55], [.905, .55], [.925, .40], [.94, .32], [.96, .28], [1, .28]];
    const foreground = new Uint8ClampedArray(pixels.length);
    for (let y = hipY; y < height; y++) {
      const relativeY = y / height;
      const next = boundary.findIndex(([row]) => row >= relativeY);
      const lower = boundary[Math.max(0, next - 1)], upper = boundary[Math.max(0, next)];
      const mix = upper[0] === lower[0] ? 0 : (relativeY - lower[0]) / (upper[0] - lower[0]);
      const split = (lower[1] + (upper[1] - lower[1]) * mix) * width;
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        if (y > hipY + height * .012) body[index + 3] = 0;
        if (right ? x <= width - split : x >= split) foreground.set(pixels.subarray(index, index + 4), index);
      }
    }
    masks.push(foreground, foreground);
  } else {
    // Flood from the lower shoes rather than the hands at the same height as shorts.
    const visited = new Uint8Array(width * height);
    for (let seed = hipY * width; seed < width * height; seed++) {
      if (visited[seed] || pixels[seed * 4 + 3] < 12) continue;
      const component: number[] = [], queue = [seed];
      visited[seed] = 1;
      let bottom = hipY;
      for (let head = 0; head < queue.length; head++) {
        const point = queue[head], px = point % width, py = Math.floor(point / width);
        component.push(point); bottom = Math.max(bottom, py);
        for (const adjacent of [px > 0 ? point - 1 : -1, px < width - 1 ? point + 1 : -1, py > hipY ? point - width : -1, py < height - 1 ? point + width : -1]) {
          if (adjacent < 0 || visited[adjacent] || pixels[adjacent * 4 + 3] < 12) continue;
          visited[adjacent] = 1; queue.push(adjacent);
        }
      }
      if (bottom < height * .93 || component.length < height * width * .004) continue;
      const leg = new Uint8ClampedArray(pixels.length);
      component.forEach((point) => {
        const index = point * 4;
        leg.set(pixels.subarray(index, index + 4), index);
        if (point >= (hipY + Math.round(height * .012)) * width) body[index + 3] = 0;
      });
      masks.push(leg);
    }
  }

  const centerAt = (mask: Uint8ClampedArray, row: number) => {
    let left = width, right = 0;
    for (let x = 0; x < width; x++) {
      if (mask[(row * width + x) * 4 + 3] < 12) continue;
      left = Math.min(left, x); right = Math.max(right, x);
    }
    return (left + right) / 2;
  };
  const legs = masks.map((mask) => ({ image: imageLayer(width, height, mask), hipX: centerAt(mask, hipY + 1), kneeX: centerAt(mask, kneeY) }));
  const rig = { body: imageLayer(width, height, body), legs, width, height, hipY, kneeY };
  walkingRigs.set(image, rig);
  return rig;
}

export function drawIllustratedPerson(context: CanvasRenderingContext2D, x: number, feetY: number, direction: string, phase: number, moving: boolean, female: boolean) {
  const view = direction === "up" ? "back" : direction === "left" ? "left" : direction === "right" ? "right" : "front";
  const image = originalImage(`player/${female ? "female" : "male"}-${view}.png`);
  if (!image) return false;
  const height = 54, width = image.naturalWidth / image.naturalHeight * height;
  context.save();
  context.translate(x - width / 2, feetY - height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  if (!moving || female) {
    context.drawImage(image, 0, 0, width, height);
  } else {
    const profile = direction === "left" || direction === "right";
    const rig = walkingRig(image, profile, direction === "right");
    const scale = height / rig.height;
    context.scale(scale, scale);
    rig.legs.forEach((leg, index) => {
      const pose = walkingLegPose(phase, index % 2 as 0 | 1, direction);
      context.save();
      context.translate(leg.hipX + (profile && index === 0 ? (direction === "left" ? -1.8 : 1.8) : 0), rig.hipY);
      context.scale(1, pose.lengthScale);
      context.rotate(pose.hipAngle);
      context.save();
      context.translate(leg.kneeX - leg.hipX, rig.kneeY - rig.hipY);
      context.rotate(pose.kneeAngle);
      const overlap = 2, shinY = rig.kneeY - overlap, shinHeight = rig.height - shinY;
      context.drawImage(leg.image, 0, shinY, rig.width, shinHeight, -leg.kneeX, -overlap, rig.width, shinHeight);
      context.restore();
      const thighHeight = rig.kneeY - rig.hipY + overlap;
      context.drawImage(leg.image, 0, rig.hipY, rig.width, thighHeight, -leg.hipX, 0, rig.width, thighHeight);
      context.restore();
    });
    context.drawImage(rig.body, 0, 0);
  }
  context.restore();
  return true;
}

export function worldArtSize(name: WorldArt, maxWidth: number, maxHeight: number) {
  loadArt();
  const sprite = sprites.get(name);
  if (!sprite) return undefined;
  const scale = Math.min(maxWidth / sprite.width, maxHeight / sprite.height);
  return { width: sprite.width * scale, height: sprite.height * scale };
}

/** x/y are the ground anchor; transparent cell padding never affects scale. */
export function drawWorldArt(context: CanvasRenderingContext2D, name: WorldArt, x: number, y: number, maxWidth: number, maxHeight: number, flip = false) {
  const sprite = sprites.get(name), size = worldArtSize(name, maxWidth, maxHeight);
  if (!sprite || !size) return false;
  context.save();
  context.translate(x, y);
  if (flip) context.scale(-1, 1);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sprite.image, sprite.x, sprite.y, sprite.width, sprite.height, -size.width / 2, -size.height, size.width, size.height);
  context.restore();
  return true;
}
