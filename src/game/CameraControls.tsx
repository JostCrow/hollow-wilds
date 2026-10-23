import { Camera, RotateCcw } from "lucide-react";
import { create } from "zustand";
import { CAMERA_KEY, CAMERA_LIMITS, DEFAULT_CAMERA, parseCameraSettings } from "./three/camera";
import type { CameraSettings } from "./three/camera";

function readSettings() {
  try {
    return parseCameraSettings(JSON.parse(localStorage.getItem(CAMERA_KEY) ?? "null"));
  } catch {
    return { ...DEFAULT_CAMERA };
  }
}

export const useCameraSettings = create<CameraSettings & {
  update: (patch: Partial<CameraSettings>) => void;
}>((set, get) => ({
  ...readSettings(),
  update: (patch) => {
    const settings = parseCameraSettings({ ...get(), ...patch });
    set(settings);
    try {
      localStorage.setItem(CAMERA_KEY, JSON.stringify(settings));
    } catch {
      // Keep the preference for this visit when browser storage is unavailable.
    }
  },
}));

export function CameraSettingsCard() {
  const { tilt, distance, update } = useCameraSettings();
  return <section className="settings-card camera-settings">
    <Camera size={25} />
    <h2>Your view of the trail</h2>
    <p>The camera stays behind your explorer as you turn. Choose the angle and distance that feel comfortable.</p>
    {([
      ["tilt", "Camera tilt", tilt, 1, `${tilt}°`],
      ["distance", "Camera zoom", distance, 0.5, `${distance.toFixed(1)} m away`],
    ] as const).map(([key, label, value, step, display]) => <label className="camera-slider" key={key}>
      <span>{label}<output>{display}</output></span>
      <input type="range" min={CAMERA_LIMITS[key][0]} max={CAMERA_LIMITS[key][1]}
        step={step} value={value} aria-label={label} aria-valuetext={display}
        onChange={(event) => update({ [key]: Number(event.target.value) })} />
    </label>)}
    <button className="secondary-button" onClick={() => update(DEFAULT_CAMERA)}>
      <RotateCcw size={15} /> Reset camera settings
    </button>
    <p className="small-note">Lower tilt looks toward the horizon; higher tilt looks down at the trail. Your preferences stay on this browser.</p>
  </section>;
}
