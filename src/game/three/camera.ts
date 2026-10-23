export type CameraSettings = { tilt: number; distance: number };

export const CAMERA_KEY = "hollow-wilds-camera";
export const DEFAULT_CAMERA: CameraSettings = { tilt: 30, distance: 9.5 };
export const CAMERA_LIMITS = { tilt: [15, 60], distance: [5.5, 24] } as const;

export function parseCameraSettings(value: unknown): CameraSettings {
  const settings = value && typeof value === "object" ? value as Partial<CameraSettings> : {};
  const clamp = (key: keyof CameraSettings) => {
    const n = settings[key], [min, max] = CAMERA_LIMITS[key];
    return typeof n === "number" && Number.isFinite(n)
      ? Math.max(min, Math.min(max, n)) : DEFAULT_CAMERA[key];
  };
  return { tilt: clamp("tilt"), distance: clamp("distance") };
}
