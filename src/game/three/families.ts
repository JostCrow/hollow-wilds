import * as THREE from "three";
import { part, line, leaf, reusableGeometry } from "./primitives.ts";
import type { CreatureModel } from "./creatures.ts";
import type { ModelProfile } from "./catalog.ts";
type V = [number, number, number];
const box = reusableGeometry(new THREE.BoxGeometry(2, 2, 2));
const rock = reusableGeometry(new THREE.IcosahedronGeometry(1, 1));
const cone = reusableGeometry(new THREE.ConeGeometry(1, 2, 8));
const cylinder = reusableGeometry(new THREE.CylinderGeometry(1, 1, 2, 12));
const torus = reusableGeometry(new THREE.TorusGeometry(1, 0.12, 8, 36));
const dome = reusableGeometry(
  new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
);
const wingShape = new THREE.Shape();
wingShape.moveTo(0, 0);
wingShape.lineTo(0.2, 0.9);
wingShape.lineTo(1.5, 0.7);
wingShape.lineTo(1.1, -0.25);
wingShape.lineTo(0.65, -0.1);
wingShape.lineTo(0.3, -0.3);
wingShape.closePath();
const wingGeometry = reusableGeometry(
  new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    steps: 1,
  }),
);

export function buildFamily(p: ModelProfile): CreatureModel {
  const root = new THREE.Group(),
    rig = new THREE.Group();
  root.add(rig);
  const feet: THREE.Group[] = [],
    wings: THREE.Object3D[] = [],
    tails: THREE.Object3D[] = [];
  const B = p.body,
    A = p.accent,
    ink = "#333337",
    cream = "#f6e8c5",
    has = (feature: string) => p.features.includes(feature);
  const shape = (
    color: string,
    pos: V,
    size: V,
    geometry?: THREE.BufferGeometry,
    parent: THREE.Object3D = rig,
  ) => part(parent, color, pos, size, true, geometry);
  const ball = (pos: V, size: V, color = B, parent: THREE.Object3D = rig) =>
    shape(color, pos, size, undefined, parent);
  const spike = (
    pos: V,
    size: V,
    color = A,
    rx = 0,
    rz = 0,
    parent: THREE.Object3D = rig,
  ) => {
    const m = shape(color, pos, size, cone, parent);
    m.rotation.set(rx, 0, rz);
    return m;
  };
  const stroke = (
    points: V[],
    color = A,
    radius = 0.025,
    parent: THREE.Object3D = rig,
  ) => line(parent, points, radius, color);
  const tube = (
    points: V[],
    radius: number,
    color = B,
    parent: THREE.Object3D = rig,
  ) => stroke(points, color, radius, parent);
  const ring = (
    pos: V,
    size: number,
    color = A,
    rx = 0,
    parent: THREE.Object3D = rig,
  ) => {
    const m = shape(color, pos, [size, size, size], torus, parent);
    m.rotation.x = rx;
    return m;
  };
  const eyes = (
    x: number,
    y: number,
    z: number,
    size = 0.1,
    parent: THREE.Object3D = rig,
  ) => {
    for (const sign of [-1, 1]) {
      ball([sign * x, y, z], [size, size * 1.35, size * 0.42], cream, parent);
      ball(
        [sign * x, y, z + size * 0.35],
        [size * 0.66, size, size * 0.3],
        p.eye,
        parent,
      );
      ball(
        [sign * x - size * 0.2, y + size * 0.4, z + size * 0.6],
        [size * 0.25, size * 0.35, size * 0.12],
        "#fff9de",
        parent,
      );
    }
  };
  const face = (x: number, y: number, z: number, size = 0.1) => {
    eyes(x, y, z, size);
    stroke(
      [
        [-0.07, y - 0.2, z],
        [0, y - 0.23, z + 0.02],
        [0.07, y - 0.2, z],
      ],
      ink,
      0.012,
    );
  };
  const leg = (
    x: number,
    y: number,
    z: number,
    length = 0.5,
    width = 0.12,
    color = B,
  ) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    rig.add(pivot);
    ball([0, -length * 0.5, 0], [width, length * 0.55, width], color, pivot);
    ball(
      [0, -length, 0.1],
      [width * 1.5, width * 0.75, width * 2],
      color,
      pivot,
    );
    feet.push(pivot);
    return pivot;
  };
  const ears = (y: number, z: number, width = 0.3, long = false) => {
    for (const s of [-1, 1]) {
      if (has("floppy")) {
        ball([s * width, y - 0.1, z], [0.17, 0.3, 0.12], A);
      } else {
        spike(
          [s * width, y, z],
          [0.13, long ? 0.6 : 0.24, 0.12],
          B,
          0,
          -s * 0.18,
        );
        spike(
          [s * width, y + 0.015, z + 0.09],
          [0.075, long ? 0.45 : 0.15, 0.035],
          A,
          0,
          -s * 0.18,
        );
      }
    }
  };
  const tail = (points: V[], width = 0.12, color = B) => {
    const pivot = new THREE.Group();
    rig.add(pivot);
    tube(points, width, color, pivot);
    ball(points.at(-1)!, [width * 0.7, width * 1.2, width * 0.7], color, pivot);
    tails.push(pivot);
    return pivot;
  };
  const wing = (
    x: number,
    y: number,
    z: number,
    size = 1,
    color = A,
    sign = 1,
  ) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    rig.add(pivot);
    const mesh = shape(
      color,
      [0, 0, 0],
      [sign * size, size, size],
      wingGeometry,
      pivot,
    );
    stroke(
      [
        [0, 0, 0.08],
        [sign * size * 0.5, size * 0.55, 0.08],
        [sign * size * 1.4, size * 0.68, 0.08],
      ],
      B,
      0.025,
      pivot,
    );
    wings.push(pivot);
    return mesh;
  };
  let maneCenter: V = [0, 1.1, 0.55],
    featureTop = 1.8;
  switch (p.family) {
    case "canine":
    case "cat": {
      const kitten = p.family === "cat",
        puppy = p.stage === 0;
      ball(
        [0, 0.75, 0],
        [puppy ? 0.44 : 0.36, puppy ? 0.45 : 0.44, puppy ? 0.5 : 0.73],
      );
      ball(
        [0, 1.18, 0.62],
        [puppy ? 0.46 : kitten ? 0.32 : 0.35, puppy ? 0.43 : 0.38, 0.37],
      );
      ball(
        [0, 1.05, 0.94],
        [kitten ? 0.22 : 0.25, 0.17, puppy ? 0.2 : 0.32],
        has("mask") ? A : B,
      );
      ball([0, 1.12, puppy ? 1.12 : 1.23], [0.1, 0.07, 0.07], ink);
      eyes(0.16, 1.29, 0.91, puppy ? 0.12 : 0.085);
      ears(1.59, 0.57, 0.25);
      for (const x of [-0.27, 0.27])
        for (const z of [-0.48, 0.5])
          leg(x, 0.65, z, 0.54, puppy ? 0.13 : 0.11);
      tail(
        [
          [0, 0.75, -0.7],
          [0.1, 1.03, -1.05],
          [0.3, 1.38, -1.2],
          [0.24, 1.55, -1.15],
        ],
        puppy ? 0.13 : kitten ? 0.06 : 0.19,
      );
      if (kitten) {
        for (const s of [-1, 1])
          for (const y of [1.04, 1.1])
            stroke(
              [
                [s * 0.17, y, 0.98],
                [s * 0.48, y + 0.025, 1.1],
              ],
              cream,
              0.008,
            );
      } else if (!puppy) {
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          const m = leaf(
            rig,
            i % 3 ? B : A,
            [Math.sin(a) * 0.28, 1.15 + Math.cos(a) * 0.35, 0.53],
            0.42,
            [0.25, 0, a + Math.PI],
          );
          m.scale.x *= 1.35;
        }
      }
      if (has("threeheads")) {
        for (const s of [-1, 1]) {
          ball([s * 0.42, 1.12, 0.55], [0.3, 0.33, 0.35]);
          ball([s * 0.42, 1.03, 0.83], [0.22, 0.14, 0.23]);
          for (const t of [-1, 1])
            ball(
              [s * 0.42 + t * 0.1, 1.22, 0.86],
              [0.047, 0.065, 0.025],
              s < 0 ? "#b68bd1" : "#f8eed5",
            );
          spike([s * 0.58, 1.47, 0.5], [0.1, 0.2, 0.08], B);
        }
      }
      if (has("jaw")) {
        shape(A, [0, 0.95, 0.94], [0.28, 0.16, 0.33], box);
        for (const s of [-1, 1])
          spike([s * 0.17, 1.02, 1.22], [0.06, 0.1, 0.06], cream, Math.PI);
      }
      featureTop = 1.9;
      break;
    }
    case "frog": {
      ball([0, 0.9, 0], [0.38, 0.58, 0.27]);
      ball([0, 1.5, 0.08], [0.46, 0.32, 0.32]);
      for (const s of [-1, 1]) {
        ball([s * 0.28, 1.67, 0.12], [0.17, 0.18, 0.17], A);
        ball([s * 0.29, 1.71, 0.26], [0.075, 0.09, 0.03], p.eye);
        leg(s * 0.26, 0.65, 0, 0.53, 0.09);
        tube(
          [
            [s * 0.32, 1.2, 0.02],
            [s * 0.51, 0.93, 0.12],
            [s * 0.47, 0.65, 0.18],
          ],
          0.065,
        );
        for (let j = 0; j < 3; j++)
          tube(
            [
              [s * 0.46, 0.66, 0.18],
              [s * (0.35 + j * 0.09), 0.6, 0.26],
            ],
            0.025,
          );
      }
      ball([0, 1.16, 0.31], [0.28, 0.29, 0.18], A);
      stroke(
        [
          [-0.21, 1.45, 0.36],
          [0, 1.4, 0.41],
          [0.21, 1.45, 0.36],
        ],
        ink,
        0.015,
      );
      if (has("sun")) {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          spike(
            [Math.sin(a) * 0.3, 0.97 + Math.cos(a) * 0.3, 0.3],
            [0.06, 0.14, 0.025],
            A,
            0,
            -a,
          );
        }
      }
      featureTop = 1.9;
      break;
    }
    case "otter": {
      ball([0, 0.79, -0.04], [0.42, 0.68, 0.35]);
      ball([0, 1.5, 0.08], [0.43, 0.39, 0.34]);
      ball([0, 1.36, 0.34], [0.26, 0.2, 0.15], A);
      eyes(0.17, 1.55, 0.37, 0.09);
      ball([0, 1.4, 0.49], [0.08, 0.05, 0.04], ink);
      for (const s of [-1, 1]) {
        ball([s * 0.34, 1.76, 0.03], [0.13, 0.13, 0.1]);
        leg(s * 0.24, 0.35, 0.12, 0.23, 0.15);
        ball([s * 0.38, 0.96, 0.17], [0.12, 0.32, 0.13]);
      }
      tail(
        [
          [0, 0.4, -0.26],
          [0.1, 0.4, -0.65],
          [0.3, 0.7, -0.85],
          [0.32, 1, -0.8],
        ],
        0.14,
      );
      if (has("leaves")) {
        for (let row = 0; row < 4; row++)
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            leaf(
              rig,
              i % 2 ? B : A,
              [Math.sin(a) * 0.37, 0.55 + row * 0.28, Math.cos(a) * 0.31],
              0.48,
              [0, a, Math.PI],
            );
          }
        ears(1.89, 0.02, 0.29);
      }
      featureTop = 2.15;
      break;
    }
    case "dinosaur":
    case "dragon": {
      const dragon = p.family === "dragon";
      ball([0, 0.83, -0.05], [0.44, 0.58, 0.52]);
      ball([0, 0.92, 0.33], [0.3, 0.43, 0.15], A);
      tube(
        [
          [0, 1.15, 0.15],
          [0, 1.5, 0.4],
          [0, 1.72, 0.5],
        ],
        0.22,
      );
      ball([0, 1.76, 0.58], [0.33, 0.29, 0.39]);
      ball([0, 1.64, 0.91], [0.29, 0.16, 0.24], has("snout") ? A : B);
      eyes(0.17, 1.85, 0.88, 0.09);
      for (const s of [-1, 1]) {
        leg(s * 0.31, 0.65, -0.05, 0.53, 0.18);
        tube(
          [
            [s * 0.3, 1.1, 0.3],
            [s * 0.45, 0.9, 0.46],
            [s * 0.42, 0.75, 0.53],
          ],
          0.09,
        );
      }
      tail(
        [
          [0, 0.55, -0.48],
          [0.12, 0.44, -0.95],
          [0.5, 0.65, -1.3],
          [0.62, 1.02, -1.36],
        ],
        0.18,
      );
      if (dragon) {
        for (const s of [-1, 1]) {
          if (has("wings")) wing(s * 0.23, 1.15, -0.1, 0.95, A, s);
          else
            for (let i = 0; i < 4; i++)
              leaf(rig, A, [s * 0.25, 0.8 + i * 0.25, -0.15], 0.6, [
                0,
                s * 0.7,
                s * (0.6 + i * 0.15),
              ]);
        }
      }
      if (has("skull")) {
        ball([0, 1.83, 0.71], [0.34, 0.27, 0.3], A);
        for (const s of [-1, 1])
          ball([s * 0.16, 1.85, 0.96], [0.08, 0.12, 0.03], ink);
        ball([0, 1.61, 0.97], [0.13, 0.12, 0.04], A);
      }
      maneCenter = [0, 1.7, 0.45];
      featureTop = 2.2;
      break;
    }
    case "rodent": {
      ball([0, 0.5, -0.05], [0.48, 0.48, 0.38]);
      ball([0, 0.94, 0.15], [0.42, 0.36, 0.31]);
      face(0.17, 1.01, 0.43, 0.08);
      for (const s of [-1, 1]) {
        ball([s * 0.29, 1.3, 0.06], [0.15, 0.25, 0.08]);
        ball([s * 0.29, 1.31, 0.13], [0.09, 0.17, 0.02], "#e3a09d");
        leg(s * 0.26, 0.23, 0.03, 0.1, 0.14);
        ball([s * 0.39, 0.58, 0.27], [0.12, 0.2, 0.1]);
      }
      if (has("teeth")) {
        for (const s of [-1, 1])
          shape(cream, [s * 0.06, 0.77, 0.5], [0.05, 0.1, 0.03], box);
      }
      const t = tail(
        [
          [0, 0.43, -0.33],
          [0.23, 0.65, -0.7],
          [0.16, 1.05, -0.8],
          [0, 1.44, -0.65],
        ],
        has("flametail") ? 0.31 : 0.14,
        has("flametail") ? A : B,
      );
      if (has("flametail"))
        for (let i = 0; i < 5; i++)
          leaf(t, A, [(i - 2) * 0.11, 1.05, -0.7], 0.5, [0, 0, (i - 2) * 0.2]);
      if (has("scar"))
        stroke(
          [
            [-0.32, 1.15, 0.4],
            [-0.1, 0.92, 0.47],
          ],
          A,
          0.018,
        );
      featureTop = 1.6;
      break;
    }
    case "beetle":
    case "fly": {
      const fly = p.family === "fly";
      ball([0, 0.52, -0.12], [0.46, 0.4, 0.65], B, rig);
      ball([0, 0.43, 0.52], [0.29, 0.25, 0.3]);
      for (const s of [-1, 1]) {
        ball(
          [s * 0.21, 0.52, 0.72],
          [fly ? 0.21 : 0.1, fly ? 0.24 : 0.1, 0.09],
          fly ? A : p.eye,
        );
        for (let i = 0; i < 3; i++)
          tube(
            [
              [s * 0.3, 0.48, 0.35 - i * 0.35],
              [s * 0.63, 0.27, 0.5 - i * 0.4],
              [s * 0.7, 0.03, 0.7 - i * 0.4],
            ],
            0.045,
          );
      }
      if (fly) {
        for (const s of [-1, 1]) {
          const w = ball([s * 0.64, 0.8, -0.18], [0.65, 0.045, 0.3], "#c4d6d0");
          w.rotation.z = s * 0.25;
          wings.push(w);
        }
        for (let i = 0; i < 9; i++) {
          const a = i * 2.4;
          ball(
            [
              Math.sin(a) * 0.35,
              0.65 + Math.cos(a) * 0.13,
              (i % 4) * 0.23 - 0.5,
            ],
            [0.055, 0.055, 0.055],
            A,
          );
        }
      } else {
        stroke(
          [
            [0, 0.82, 0.38],
            [0, 0.92, -0.1],
            [0, 0.76, -0.6],
          ],
          A,
          0.022,
        );
        for (let i = 0; has("segments") && i < 5; i++)
          stroke(
            [
              [-0.35, 0.66, 0.35 - i * 0.22],
              [0, 0.88, 0.35 - i * 0.22],
              [0.35, 0.66, 0.35 - i * 0.22],
            ],
            "#514a3c",
            0.018,
          );
      }
      if (has("antennae"))
        for (const s of [-1, 1])
          tube(
            [
              [s * 0.18, 0.63, 0.58],
              [s * 0.31, 0.96, 0.77],
              [s * 0.35, 1.06, 0.8],
            ],
            0.025,
            A,
          );
      if (has("horn")) spike([0, 0.94, 0.6], [0.1, 0.5, 0.12], A, -0.25);
      featureTop = 1.2;
      break;
    }
    case "slug": {
      ball([0, 0.23, 0], [0.38, 0.24, 0.75]);
      ball([0, 0.36, 0.49], [0.3, 0.3, 0.3]);
      eyes(0.16, 0.45, 0.74, 0.08);
      for (const s of [-1, 1]) {
        const fin = leaf(rig, A, [s * 0.15, 0.1, -0.5], 0.8, [
          -0.9,
          0,
          -s * 0.65,
        ]);
        wings.push(fin);
        tube(
          [
            [s * 0.2, 0.35, -0.25],
            [s * 0.3, 0.86, -0.45],
            [s * 0.4, 1.01, -0.4],
          ],
          0.085,
          cream,
        );
        ball([s * 0.4, 1.02, -0.4], [0.063, 0.02, 0.063], ink);
      }
      featureTop = 1.1;
      break;
    }
    case "bird": {
      ball([0, 0.79, -0.05], [0.38, 0.48, 0.38]);
      ball([0, 1.32, 0.12], [0.29, 0.29, 0.27]);
      eyes(0.13, 1.38, 0.35, 0.075);
      spike([0, 1.25, 0.47], [0.13, 0.2, 0.12], A, Math.PI / 2);
      for (const s of [-1, 1]) {
        leg(s * 0.15, 0.43, 0.03, 0.35, 0.045, ink);
        if (p.stage < 3) {
          ball([s * 0.32, 0.8, -0.08], [0.16, 0.35, 0.3], A);
          for (let i = 0; i < 3; i++)
            leaf(
              rig,
              i % 2 ? A : B,
              [s * 0.35, 0.75 - i * 0.1, -0.05 - i * 0.1],
              0.35,
              [-0.3, 0, Math.PI + s * 0.25],
            );
        } else {
          wing(s * 0.28, 1.03, -0.1, has("fourwings") ? 1 : 1.3, A, s);
          if (has("fourwings")) wing(s * 0.23, 0.65, -0.17, 0.8, B, s);
        }
      }
      for (let i = 0; i < 5; i++) {
        const l = leaf(
          rig,
          A,
          [(i - 2) * 0.09, 0.56, -0.3],
          p.stage > 2 ? 1.4 : 0.5,
          [-1.4, 0, (i - 2) * 0.16],
        );
        tails.push(l);
      }
      if (has("ember")) ball([0, 0.73, 0.31], [0.22, 0.23, 0.08], A);
      featureTop = 1.8;
      maneCenter = [0, 1.32, 0.1];
      break;
    }
    case "ghost":
    case "blob": {
      const blob = p.family === "blob";
      ball([0, 0.51, 0], [blob ? 0.63 : 0.44, 0.48, 0.38]);
      face(0.18, 0.61, 0.35, 0.1);
      if (blob) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ball(
            [Math.sin(a) * 0.43, 0.12, Math.cos(a) * 0.3],
            [0.24, 0.12, 0.21],
          );
        }
        ball([-0.22, 0.75, 0.27], [0.12, 0.055, 0.035], A);
      } else if (has("vortex")) {
        for (let row = 0; row < 3; row++) {
          const pts: V[] = [];
          for (let i = 0; i < 35; i++) {
            const a = (i / 34) * Math.PI * 2.2;
            const r = 0.24 + row * 0.19;
            pts.push([
              Math.sin(a) * r,
              0.2 + row * 0.45 + Math.cos(a) * 0.15,
              Math.cos(a) * r,
            ]);
          }
          tube(pts, 0.14, row % 2 ? A : B);
        }
        for (const s of [-1, 1])
          tube(
            [
              [s * 0.3, 0.85, 0],
              [s * 0.8, 1.05, 0],
              [s * 0.95, 1.35, 0.1],
            ],
            0.13,
            A,
          );
      } else if (has("cloud")) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ball(
            [Math.sin(a) * 0.4, 0.5 + Math.cos(a) * 0.4, -0.04],
            [0.2, 0.22, 0.18],
          );
        }
      } else {
        spike([0.08, 1.1, 0], [0.25, 0.4, 0.25], B, 0, -0.35);
        for (const s of [-1, 1]) {
          tail(
            [
              [s * 0.3, 0.4, 0],
              [s * 0.6, 0.6, 0],
              [s * 0.55, 0.8, 0],
            ],
            0.07,
            A,
          );
          leg(s * 0.18, 0.18, 0, 0.1, 0.1);
        }
      }
      featureTop = 1.5;
      break;
    }
    case "golem":
    case "robot":
    case "plant":
    case "cherub": {
      const robot = p.family === "robot",
        plant = p.family === "plant",
        baby = p.family === "cherub",
        g = robot ? box : p.family === "golem" ? rock : undefined;
      if (p.family === "golem" && p.stage === 1) {
        shape(B, [0, 0.5, 0], [0.6, 0.52, 0.45], rock);
        eyes(0.24, 0.58, 0.4, 0.11);
        for (const s of [-1, 1]) leg(s * 0.33, 0.2, 0.05, 0.12, 0.15);
      } else {
        shape(B, [0, 1, 0], [0.4, 0.51, 0.26], g);
        shape(B, [0, 1.7, 0.03], [0.3, 0.31, 0.29], g);
        eyes(0.13, 1.75, 0.3, 0.08);
        for (const s of [-1, 1]) {
          leg(s * 0.25, 0.63, 0, 0.5, 0.14);
          tube(
            [
              [s * 0.37, 1.34, 0],
              [s * 0.62, 1.02, 0.05],
              [s * 0.64, 0.68, 0.12],
            ],
            robot ? 0.12 : 0.1,
          );
          shape(B, [s * 0.64, 0.65, 0.15], [0.18, 0.17, 0.17], g);
        }
      }
      if (robot) {
        ring([0, 0.98, 0.28], 0.22, A);
        if (has("ears"))
          for (const s of [-1, 1])
            spike([s * 0.33, 1.85, 0], [0.2, 0.22, 0.08], B, 0, -s * 0.65);
        if (has("furnace")) shape(A, [0, 0.96, 0.28], [0.25, 0.2, 0.04], box);
        if (has("grin")) {
          shape(ink, [0, 1.56, 0.3], [0.24, 0.08, 0.025], box);
          for (let i = 0; i < 5; i++)
            shape(
              cream,
              [(i - 2) * 0.085, 1.58, 0.335],
              [0.033, 0.035, 0.013],
              box,
            );
        }
      }
      if (plant) {
        ball([0, 0.98, 0.26], [0.12, 0.17, 0.06], A);
        if (has("bud")) {
          const bud = leaf(rig, A, [0, 1.42, 0], 0.8, [0, 0, 0]);
          bud.scale.x = 1.4;
          eyes(0.12, 1.61, 0.16, 0.065);
        }
        for (const s of [-1, 1])
          leaf(rig, A, [s * 0.28, 1.15, -0.08], 0.6, [0, 0, -s * 1.1]);
        if (has("fans"))
          for (const s of [-1, 1])
            for (let i = 0; i < 4; i++)
              leaf(
                rig,
                ["#e8c3d9", "#b6d5e3", "#edd88a"][i % 3],
                [s * 0.64, 0.7, 0.12],
                0.36,
                [0, 0, s * (0.6 + i * 0.3)],
              );
      }
      if (baby) {
        for (const s of [-1, 1]) wing(s * 0.22, 1.04, -0.1, 0.3, cream, s);
      }
      featureTop = 2.1;
      maneCenter = [0, 1.7, 0];
      break;
    }
    case "mushroom": {
      ball([0, 0.58, 0], [0.32, 0.56, 0.26]);
      eyes(0.13, 0.7, 0.25, 0.08);
      for (const s of [-1, 1]) leg(s * 0.2, 0.18, 0, 0.09, 0.12);
      shape(A, [0, 1.02, 0], [0.78, 0.53, 0.63], dome);
      ball([0, 1.035, 0], [0.75, 0.055, 0.61], cream);
      if (has("crown")) {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          ball(
            [Math.sin(a) * 0.58, 1.55, Math.cos(a) * 0.46],
            [0.12, 0.14, 0.12],
            A,
          );
        }
        shape(A, [0, 1.2, 0], [0.65, 0.28, 0.5], cylinder);
      }
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4,
          r = 0.25 + (i % 3) * 0.14;
        ball(
          [
            Math.cos(a) * r,
            1.08 + Math.sqrt(Math.max(0, 1 - (r / 0.78) ** 2)) * 0.46,
            Math.sin(a) * r * 0.8,
          ],
          [0.1, 0.035, 0.08],
          i % 2 ? cream : B,
        );
      }
      if (has("fungi"))
        for (const s of [-1, 1]) {
          ball([s * 0.37, 0.64, 0], [0.13, 0.15, 0.13], B);
          shape(A, [s * 0.37, 0.79, 0], [0.25, 0.18, 0.23], dome);
          ball([s * 0.27, 0.24, 0.2], [0.16, 0.1, 0.08], A);
        }
      featureTop = 1.7;
      break;
    }
    case "moth": {
      ball([0, 0.84, 0], [0.12, 0.48, 0.14]);
      ball([0, 1.3, 0.02], [0.23, 0.2, 0.17]);
      eyes(0.11, 1.33, 0.17, 0.07);
      for (const s of [-1, 1]) {
        tube(
          [
            [s * 0.1, 1.42, 0],
            [s * 0.2, 1.7, 0],
            [s * 0.36, 1.85, 0],
          ],
          0.025,
          A,
        );
        for (let row = 0; row < 2; row++) {
          const pivot = new THREE.Group();
          pivot.position.set(s * 0.1, row ? 0.65 : 1.1, -0.08);
          rig.add(pivot);
          const m = ball(
            [s * 0.46, row ? -0.05 : 0.18, 0],
            [row ? 0.5 : 0.6, row ? 0.38 : 0.67, 0.055],
            A,
            pivot,
          );
          m.rotation.z = -s * 0.45;
          for (let i = 0; i < 5; i++) {
            const color = has("prism")
              ? ["#eaa976", "#db94b6", "#88bfcf", "#a9c773", "#e8d661"][i]
              : i % 2
                ? cream
                : B;
            const stripe = ball(
              [s * (0.2 + i * 0.09), (row ? -0.12 : 0.04) + i * 0.075, 0.054],
              [0.1, row ? 0.25 : 0.43, 0.015],
              color,
              pivot,
            );
            stripe.rotation.z = -s * 0.45;
            stroke(
              [
                [0, 0, 0.07],
                [s * 0.8, row ? -0.3 : 0.58, 0.07],
              ],
              B,
              0.012,
              pivot,
            );
          }
          wings.push(pivot);
        }
      }
      featureTop = 1.9;
      break;
    }
    case "bear": {
      ball([0, 0.8, 0], [0.57, 0.63, 0.49]);
      ball([0, 1.31, 0.28], [0.45, 0.4, 0.36]);
      ball([0, 1.18, 0.6], [0.25, 0.17, 0.18], A);
      eyes(0.18, 1.4, 0.58, 0.08);
      ball([0, 1.26, 0.77], [0.09, 0.06, 0.04], ink);
      for (const s of [-1, 1]) {
        ball([s * 0.34, 1.63, 0.22], [0.15, 0.17, 0.1]);
        leg(s * 0.38, 0.37, -0.15, 0.24, 0.22);
        leg(s * 0.43, 0.65, 0.38, 0.51, 0.17);
      }
      maneCenter = [0, 1.25, 0.2];
      featureTop = 1.9;
      break;
    }
    case "crystal": {
      shape(B, [0, 0.8, 0], [0.4, 0.5, 0.3], rock);
      shape(B, [0, 1.35, 0.1], [0.35, 0.33, 0.3], rock);
      eyes(0.15, 1.39, 0.35, 0.07);
      for (const s of [-1, 1]) {
        leg(s * 0.23, 0.4, 0, 0.27, 0.13);
        tube(
          [
            [s * 0.32, 1, 0],
            [s * 0.55, 0.67, 0.1],
          ],
          0.1,
        );
      }
      for (let i = 0; i < 8; i++)
        spike(
          [
            (i % 2 ? 1 : -1) * (0.15 + Math.floor(i / 2) * 0.05),
            0.6 + Math.floor(i / 2) * 0.2,
            -0.2,
          ],
          [0.1, 0.4, 0.1],
          i % 2 ? A : B,
          -0.5,
          (i % 2 ? 1 : -1) * 0.4,
        );
      ball([0, 0.9, 0.29], [0.17, 0.2, 0.03], cream);
      featureTop = 1.9;
      break;
    }
    case "serpent": {
      const pts: V[] = [];
      for (let i = 0; i < 36; i++) {
        const a = (i / 35) * Math.PI * 2;
        pts.push([
          Math.sin(a) * 0.57,
          0.25 + (i / 35) * 0.9,
          Math.cos(a) * 0.4,
        ]);
      }
      tube(pts, 0.19);
      ball([0, 1.42, 0.45], [0.31, 0.22, 0.32]);
      eyes(0.14, 1.46, 0.7, 0.08);
      for (let i = 0; i < 7; i++)
        spike(
          [Math.sin(i) * 0.6, 0.4 + i * 0.13, Math.cos(i) * 0.4],
          [0.09, 0.2, 0.08],
          A,
        );
      featureTop = 1.7;
      break;
    }
    case "armadillo":
    case "turtle": {
      const turtle = p.family === "turtle";
      ball([0, 0.45, 0], [0.52, 0.42, 0.7]);
      ball([0, 0.34, 0.7], [0.24, 0.21, 0.25], turtle ? "#e1d08b" : B);
      eyes(0.12, 0.4, 0.91, 0.06);
      for (const s of [-1, 1])
        for (const z of [-0.42, 0.38]) leg(s * 0.42, 0.31, z, 0.23, 0.13);
      if (turtle) {
        for (let i = 0; i < 5; i++)
          ring([0, 0.76 + i * 0.018, -0.05], 0.15 + i * 0.075, A, Math.PI / 2);
        ball([0, 0.59, 0.75], [0.19, 0.25, 0.18], "#f7e5a0");
      } else
        for (let i = 0; i < 6; i++) {
          const m = shape(
            i % 2 ? A : B,
            [0, 0.65, 0.5 - i * 0.21],
            [0.57, 0.32, 0.19],
            rock,
          );
          m.rotation.x = -0.1;
        }
      featureTop = 1.1;
      break;
    }
    case "rabbit": {
      ball([0, 0.52, -0.13], [0.4, 0.46, 0.42]);
      ball([0, 0.97, 0.18], [0.33, 0.32, 0.29]);
      eyes(0.15, 1.05, 0.43, 0.08);
      ball([0, 0.92, 0.49], [0.055, 0.04, 0.035], "#be989f");
      for (const s of [-1, 1]) {
        ball([s * 0.23, 0.24, -0.18], [0.25, 0.24, 0.32]);
        leg(s * 0.18, 0.41, 0.34, 0.29, 0.09);
        ball(
          [s * 0.22, 1.6, 0.12],
          [has("blades") ? 0.09 : 0.1, 0.48, 0.075],
          A,
        );
        ball([s * 0.22, 1.59, 0.18], [0.045, 0.33, 0.015], B);
      }
      ball([0, 0.54, -0.55], [0.17, 0.18, 0.17], cream);
      if (has("ruff"))
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          spike(
            [Math.sin(a) * 0.32, 0.78 + Math.cos(a) * 0.15, 0.15],
            [0.1, 0.17, 0.12],
            A,
            0,
            a,
          );
        }
      featureTop = 2.15;
      break;
    }
    case "mote": {
      ball([0, 0.6, 0], [0.3, 0.34, 0.3]);
      face(0.12, 0.66, 0.27, 0.08);
      for (const s of [-1, 1])
        stroke(
          [
            [s * 0.22, 0.6, 0],
            [s * 0.48, 0.72, 0],
            [s * 0.4, 0.9, 0],
            [s * 0.65, 1, 0],
          ],
          A,
          0.035,
        );
      featureTop = 1.1;
      break;
    }
    case "fish": {
      ball([0, 0.65, 0], [0.5, 0.59, 0.33]);
      for (const s of [-1, 1]) {
        ball([s * 0.28, 0.8, 0.26], [0.17, 0.19, 0.09], cream);
        ball([s * 0.28, 0.8, 0.34], [0.07, 0.1, 0.035], p.eye);
        const fin = leaf(rig, A, [s * 0.4, 0.55, -0.05], 0.55, [
          0,
          0,
          -s * 1.3,
        ]);
        wings.push(fin);
      }
      ring([0, 0.48, 0.34], has("teeth") ? 0.25 : 0.18, A);
      ball([0, 0.48, 0.34], [0.16, 0.17, 0.03], ink);
      spike([0, 1.3, -0.06], [0.18, 0.3, 0.09], A, 0, 0.25);
      for (const s of [-1, 1])
        leaf(rig, A, [0, 0.45, -0.25], 0.75, [-1.3, 0, s * 0.5]);
      if (has("lure")) {
        tube(
          [
            [0, 1.1, 0],
            [0, 1.65, 0.17],
            [0, 1.56, 0.5],
          ],
          0.035,
          B,
        );
        ball([0, 1.53, 0.5], [0.11, 0.12, 0.11], "#ed6863");
      }
      if (has("teeth"))
        for (let i = 0; i < 5; i++)
          spike(
            [(i - 2) * 0.07, 0.58, 0.39],
            [0.025, 0.07, 0.025],
            cream,
            Math.PI,
          );
      featureTop = 1.8;
      break;
    }
    case "caterpillar": {
      for (let i = 0; i < 5; i++) {
        ball(
          [Math.sin(i * 0.45) * 0.1, 0.3, i * 0.27 - 0.55],
          [0.27, 0.28, 0.24],
          i % 2 ? A : B,
        );
        for (const s of [-1, 1])
          leg(s * 0.18, 0.18, i * 0.27 - 0.55, 0.1, 0.06);
        spike([0, 0.65, i * 0.27 - 0.55], [0.07, 0.18, 0.07], A);
      }
      ball([0, 0.43, 0.65], [0.3, 0.29, 0.22]);
      face(0.13, 0.49, 0.84, 0.07);
      featureTop = 0.95;
      break;
    }
    case "cocoon": {
      shape(B, [0, 0.7, 0], [0.38, 0.69, 0.32], rock);
      for (let i = 0; i < 5; i++) {
        const m = ring(
          [0, 0.3 + i * 0.18, 0],
          0.2 + Math.sin((i / 4) * Math.PI) * 0.14,
          A,
          Math.PI / 2,
        );
        m.scale.z = 0.8;
      }
      eyes(0.12, 0.85, 0.28, 0.065);
      featureTop = 1.5;
      break;
    }
    case "flower": {
      tube(
        [
          [0, 0.15, 0],
          [0.05, 0.65, 0],
          [0, 1.2, 0],
        ],
        0.09,
      );
      ball([0, 1.3, 0], [0.29, 0.3, 0.16], has("lily") ? "#ad9abd" : "#d9c15f");
      eyes(0.12, 1.35, 0.15, 0.07);
      for (const s of [-1, 1]) {
        leaf(rig, B, [0, 0.6, 0], 0.65, [0, 0, -s * 1.2]);
        leg(s * 0.13, 0.2, 0, 0.12, 0.1);
      }
      const count = has("petal") ? 3 : has("buds") ? 5 : has("lily") ? 6 : 12;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const l = leaf(
          rig,
          A,
          [Math.sin(a) * 0.14, 1.3 + Math.cos(a) * 0.14, -0.09],
          has("petal") ? 0.8 : 0.62,
          [0, 0, -a],
        );
        if (has("buds")) {
          l.scale.x = 0.55;
          ball(
            [Math.sin(a) * 0.32, 1.3 + Math.cos(a) * 0.32, 0],
            [0.13, 0.19, 0.13],
            A,
          );
        }
      }
      featureTop = 2.2;
      break;
    }
  }
  // Species-specific surface anatomy. These details deliberately remain mesh geometry.
  if (has("horns") || has("antlers"))
    for (const s of [-1, 1]) {
      tube(
        [
          [s * 0.23, featureTop - 0.45, 0.13],
          [s * 0.4, featureTop - 0.05, -0.03],
          [s * 0.32, featureTop + 0.2, -0.18],
        ],
        0.065,
        has("antlers") ? A : ink,
      );
    }
  if (has("halo")) {
    const m = ring([0, featureTop + 0.1, 0], 0.48, A, Math.PI / 2);
    m.rotation.z = 0.12;
  }
  if (has("sun") && !["frog", "flower"].includes(p.family)) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      spike(
        [
          maneCenter[0] + Math.sin(a) * 0.45,
          maneCenter[1] + Math.cos(a) * 0.45,
          maneCenter[2] - 0.25,
        ],
        [0.055, 0.18, 0.05],
        A,
        0,
        -a,
      );
    }
  }
  if (has("flames")) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const l = leaf(
        rig,
        i % 2 ? A : "#ffc54e",
        [
          Math.sin(a) * 0.4,
          maneCenter[1] + Math.cos(a) * 0.26,
          maneCenter[2] - 0.18,
        ],
        0.6,
        [0, 0, -a * 0.3],
      );
      l.scale.x = 0.7;
    }
  }
  if (has("wings") && p.family === "canine")
    for (const s of [-1, 1]) wing(s * 0.3, 1.25, -0.05, 0.85, A, s);
  if (has("fins") && !["dragon", "fish"].includes(p.family))
    for (let i = 0; i < 5; i++)
      spike([0, 0.8 + i * 0.08, -0.7 + i * 0.2], [0.07, 0.27, 0.12], A, 0.5);
  if (has("spines") || has("crystals") || has("spikes")) {
    for (let i = 0; i < 7; i++) {
      const s = i % 2 ? 1 : -1;
      spike(
        [
          s * (0.15 + (i % 3) * 0.1),
          0.8 + (i % 4) * 0.15,
          -0.4 + (i % 3) * 0.19,
        ],
        [0.1, 0.28 + (i % 2) * 0.13, 0.1],
        i % 2 ? A : B,
        -0.3,
        s * 0.4,
      );
    }
  }
  if (has("armor") || has("plates"))
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const m = shape(
          i % 2 ? A : B,
          [s * 0.36, 0.65 + (i % 2) * 0.35, -0.3 + Math.floor(i / 2) * 0.53],
          [0.18, 0.22, 0.23],
          rock,
        );
        m.rotation.z = -s * 0.3;
      }
  if (has("cracks") || has("veins") || has("runes") || has("bolts")) {
    for (const s of [-1, 1])
      stroke(
        [
          [s * 0.12, 1.05, 0.3],
          [s * 0.31, 0.9, 0.4],
          [s * 0.17, 0.71, 0.43],
          [s * 0.36, 0.55, 0.35],
        ],
        A,
        0.022,
      );
  }
  if (has("leaves") && p.family === "canine")
    for (let i = 0; i < 9; i++)
      leaf(
        rig,
        A,
        [Math.sin(i * 2.4) * 0.3, 1.12, -0.7 + (i % 4) * 0.28],
        0.36,
        [0, i * 0.7, -0.5],
      );
  if (has("flowers"))
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++)
        ball([s * 0.34, 1.02, 0.2 - i * 0.34], [0.075, 0.075, 0.03], "#eccc56");
  if (has("coils")) {
    for (const s of [-1, 1]) {
      shape(B, [s * 0.32, 1.6, -0.25], [0.09, 0.53, 0.09], cylinder);
      for (let i = 0; i < 6; i++)
        ring([s * 0.32, 1.28 + i * 0.13, -0.25], 0.18, A, Math.PI / 2);
      ball([s * 0.32, 2.15, -0.25], [0.22, 0.22, 0.22], "#b8dfdf");
    }
  }
  if (has("stacks"))
    for (const s of [-1, 1])
      shape(ink, [s * 0.32, 1.75, -0.18], [0.08, 0.42, 0.08], cylinder);
  if (has("chains"))
    for (const s of [-1, 1])
      for (let i = 0; i < 7; i++) {
        const m = ring(
          [s * (0.4 + i * 0.12), 0.13, 0.1 - i * 0.13],
          0.07,
          "#858397",
          i % 2 ? 0 : Math.PI / 2,
        );
        m.scale.y = 0.7;
      }
  if (has("wisps")) {
    const effects = new THREE.Group();
    effects.userData.effect = true;
    rig.add(effects);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ball(
        [Math.sin(a) * 0.7, 0.6 + i * 0.2, Math.cos(a) * 0.6],
        [0.055, 0.08, 0.055],
        A,
        effects,
      );
    }
    tails.push(effects);
  }
  if (has("ghost")) {
    root.userData.ethereal = true;
  }
  const wingRest = wings.map((w) => w.rotation.clone()),
    tailRest = tails.map((t) => t.rotation.clone());
  return {
    root,
    animate(time, moving = false) {
      feet.forEach((f, i) => {
        f.rotation.x = moving ? Math.sin(time * 9 + i * Math.PI) * 0.35 : 0;
      });
      wings.forEach((w, i) => {
        w.rotation.z =
          wingRest[i].z + Math.sin(time * 2.5 + (i % 2) * Math.PI) * 0.08;
      });
      tails.forEach((t, i) => {
        t.rotation.y = tailRest[i].y + Math.sin(time * 1.8 + i) * 0.08;
      });
      rig.position.y = Math.sin(time * 2) * 0.008;
    },
  };
}
