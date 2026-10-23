import type { WorldPoint } from "./types.ts";
export const distance = (a: WorldPoint, b: WorldPoint) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export const lerpPoint = (
  a: WorldPoint,
  b: WorldPoint,
  t: number,
): WorldPoint => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
export function cubic(
  a: WorldPoint,
  b: WorldPoint,
  c: WorldPoint,
  d: WorldPoint,
  t: number,
) {
  const s = 1 - t;
  return {
    x:
      s * s * s * a.x +
      3 * s * s * t * b.x +
      3 * s * t * t * c.x +
      t * t * t * d.x,
    z:
      s * s * s * a.z +
      3 * s * s * t * b.z +
      3 * s * t * t * c.z +
      t * t * t * d.z,
  };
}
/** Sample the authored SVG geography into continuous coast/river curves, never gameplay cells. */
export function samplePath(
  path: string,
  convert: (x: number, z: number) => WorldPoint,
  samples = 16,
) {
  const tokens = path.match(/[MCQLZ]|-?\d+(?:\.\d+)?/gi) ?? [];
  let i = 0,
    current = { x: 0, z: 0 };
  const points: WorldPoint[] = [];
  while (i < tokens.length) {
    const command = tokens[i++].toUpperCase();
    if (command === "Z") break;
    const number = () => Number(tokens[i++]);
    if (command === "M" || command === "L") {
      current = { x: number(), z: number() };
      points.push(convert(current.x, current.z));
    } else if (command === "C") {
      const a = current,
        b = { x: number(), z: number() },
        c = { x: number(), z: number() },
        d = { x: number(), z: number() };
      for (let j = 1; j <= samples; j++) {
        const p = cubic(a, b, c, d, j / samples);
        points.push(convert(p.x, p.z));
      }
      current = d;
    } else if (command === "Q") {
      const a = current,
        b = { x: number(), z: number() },
        d = { x: number(), z: number() };
      for (let j = 1; j <= samples; j++) {
        const t = j / samples,
          s = 1 - t;
        points.push(
          convert(
            s * s * a.x + 2 * s * t * b.x + t * t * d.x,
            s * s * a.z + 2 * s * t * b.z + t * t * d.z,
          ),
        );
      }
      current = d;
    } else throw new Error(`Unsupported geography command ${command}`);
  }
  return points;
}
export function insidePolygon(point: WorldPoint, polygon: WorldPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function projectSegment(p: WorldPoint, a: WorldPoint, b: WorldPoint) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    length = dx * dx + dz * dz,
    t = length
      ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length))
      : 0;
  const point = lerpPoint(a, b, t);
  return { point, t, distance: distance(p, point) };
}
export function distanceToLine(
  point: WorldPoint,
  line: WorldPoint[],
  closed = false,
) {
  let best = Infinity;
  for (let i = 0; i < line.length - (closed ? 0 : 1); i++) {
    const a = line[i],
      b = line[(i + 1) % line.length],
      dx = b.x - a.x,
      dz = b.z - a.z,
      length = dx * dx + dz * dz,
      t = length
        ? Math.max(
            0,
            Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / length),
          )
        : 0;
    const ex = point.x - a.x - t * dx,
      ez = point.z - a.z - t * dz;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return Math.sqrt(best);
}
export function hashRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
