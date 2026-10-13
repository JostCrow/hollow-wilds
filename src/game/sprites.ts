import { species, typeColors } from "./data";
const files = import.meta.glob("../../assets/monster/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
export const hasSprite = (name: string) =>
  !!files[`../../assets/monster/${species[name]?.sprite}`];
export function spriteUrl(name: string) {
  const url = files[`../../assets/monster/${species[name]?.sprite}`];
  if (url) return url;
  const color = typeColors[species[name]?.typing?.[0]] ?? "#78977c";
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><ellipse cx="80" cy="135" rx="45" ry="9" fill="#233d30" opacity=".1"/><path d="M37 71 27 28 62 48Q81 37 99 48L131 28 124 76Q142 134 80 135 18 134 37 71" fill="${color}"/><ellipse cx="60" cy="84" rx="6" ry="9" fill="#fff"/><ellipse cx="102" cy="84" rx="6" ry="9" fill="#fff"/><path d="M70 107Q80 116 91 106" stroke="#fff" fill="none" stroke-width="4" stroke-linecap="round"/></svg>`)}`;
}
const images = new Map<string, HTMLImageElement>();
export function spriteImage(name: string) {
  if (!images.has(name)) {
    const image = new Image();
    image.src = spriteUrl(name);
    images.set(name, image);
  }
  return images.get(name)!;
}
