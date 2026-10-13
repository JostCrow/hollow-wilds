import { Music2, Volume2, VolumeX } from "lucide-react";
import { gameAudio } from "./audio";
import { useAudioSettings } from "./useGameAudio";

export function AudioToggle() {
  const { muted, update } = useAudioSettings();
  return (
    <button
      className={`icon-button audio-toggle ${muted ? "is-muted" : ""}`}
      data-audio-control
      aria-label={muted ? "Unmute game audio" : "Mute game audio"}
      aria-pressed={muted}
      title={muted ? "Unmute game audio" : "Mute game audio"}
      onClick={() => update({ muted: !muted })}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}

export function AudioSettingsCard() {
  const { muted, music, effects, update } = useAudioSettings();
  return (
    <section className="settings-card audio-settings" data-audio-control>
      <Music2 size={25} />
      <h2>A soundtrack for the trail</h2>
      <p>Soft town melodies, a little rhythm for the road, and a new tempo when a wild friend appears.</p>
      <div className="audio-master">
        <span>Game audio <small>{muted ? "Muted" : "Sound on"}</small></span>
        <AudioToggle />
      </div>
      {([ ["music", "Music", music], ["effects", "Sound effects", effects] ] as const).map(([key, label, value]) => (
        <label className="audio-slider" key={key}>
          <span>{label}<output>{Math.round(value * 100)}%</output></span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(value * 100)}
            aria-label={`${label} volume`}
            aria-valuetext={`${Math.round(value * 100)} percent${muted ? ", game audio muted" : ""}`}
            onChange={(event) => update({ [key]: Number(event.target.value) / 100 })}
            onPointerUp={() => { if (key === "effects") gameAudio.play("treasure"); }}
            onKeyUp={() => { if (key === "effects") gameAudio.play("treasure"); }}
          />
        </label>
      ))}
      <p className="small-note">
        {muted ? "Unmute to hear your volume changes. " : ""}Audio starts after your first click or keypress and pauses when this tab is hidden. Your preferences stay on this browser.
      </p>
    </section>
  );
}
