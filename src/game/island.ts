import worldData from "../../data/world.json" with { type: "json" };
import type { Exit, Zone } from "./world.ts";

export const islandCircuit = worldData.islandCircuit;
// One continuous shoreline encloses the circuit, headlands, and optional habitats.
export const islandShore = "M 84 530 C 46 498 62 447 87 414 C 91 386 129 370 143 340 C 149 317 187 291 208 272 C 215 221 264 215 291 192 C 340 152 394 143 444 133 C 490 109 548 123 593 137 C 625 141 650 114 681 96 C 711 60 757 55 802 65 C 834 43 874 63 892 97 C 900 126 925 143 944 171 C 976 202 956 237 935 261 C 916 283 903 309 915 337 C 948 354 978 390 962 430 C 951 465 911 477 893 498 C 882 522 894 550 917 573 C 949 611 924 660 887 669 C 856 685 829 710 816 748 C 810 782 788 795 806 834 C 835 877 801 928 757 943 C 713 968 663 926 623 899 C 590 887 572 850 530 858 C 491 864 458 897 425 906 C 394 927 363 900 331 886 C 293 874 266 903 224 914 C 179 942 135 921 117 882 C 90 847 119 796 140 761 C 160 733 139 714 111 700 C 76 689 42 655 45 620 C 42 584 72 559 84 530 Z";

const vector = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
export function islandRoutePath(source: Zone, exit: Exit, target: Zone) {
  const x = source.mapX * 10, y = source.mapY * 10;
  const tx = target.mapX * 10, ty = target.mapY * 10;
  const bend = Math.hypot(tx - x, ty - y) * .38;
  const [dx, dy] = vector[exit.direction];
  return `M ${x} ${y} C ${x + dx * bend} ${y + dy * bend}, ${tx - dx * bend} ${ty - dy * bend}, ${tx} ${ty}`;
}
