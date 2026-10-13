// Original synthesized music and effects: no downloads or external audio assets.
export type AudioSettings = { muted: boolean; music: number; effects: number };
export type MusicScene = "town" | "trail" | "battle" | null;
export type Sound =
  | "select" | "step" | "travel" | "encounter" | "hit" | "status"
  | "throw" | "escape" | "heal" | "treasure" | "switch"
  | "victory" | "capture" | "defeat" | "evolve" | "level";
export type SoundCue = { sound: Sound; delay?: number };
export const AUDIO_KEY = "hollow-wilds-audio-v1";
export const DEFAULT_AUDIO: AudioSettings = { muted: false, music: 0.35, effects: 0.65 };

export function parseAudioSettings(value: unknown): AudioSettings {
  const input = value && typeof value === "object" ? value as Partial<AudioSettings> : {};
  const volume = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
  return {
    muted: typeof input.muted === "boolean" ? input.muted : DEFAULT_AUDIO.muted,
    music: volume(input.music, DEFAULT_AUDIO.music),
    effects: volume(input.effects, DEFAULT_AUDIO.effects),
  };
}

// Eight bars per theme; nulls leave breathing room between phrases.
const scores = {
  town: {
    bpm: 88,
    roots: [48, 53, 45, 55, 48, 53, 55, 48],
    melody: [72, null, 76, 79, 76, null, 74, null, 72, 69, 65, null, 69, null, 72, null,
      69, null, 72, 76, 79, null, 76, null, 74, 71, 67, null, 69, 71, 74, null,
      76, null, 79, 84, 83, 79, 76, null, 77, 76, 72, null, 69, null, 72, null,
      74, null, 79, 77, 74, 71, 67, null, 72, null, 76, 74, 72, null, null, null],
  },
  trail: {
    bpm: 104,
    roots: [48, 55, 45, 53, 48, 52, 53, 55],
    melody: [76, 79, 81, null, 79, 76, 74, null, 74, 79, 83, 81, 79, null, 74, null,
      76, 81, 84, null, 83, 81, 79, 76, 77, null, 81, 79, 77, 76, 72, null,
      79, 76, 72, null, 76, 79, 84, null, 83, 79, 76, null, 79, 76, 71, null,
      72, 77, 81, 84, 81, 77, 76, null, 74, 79, 83, 81, 79, 74, 71, null],
  },
  battle: {
    bpm: 138,
    roots: [45, 45, 41, 43, 45, 48, 41, 40],
    melody: [81, 76, 81, 84, 83, 81, 76, 79, 81, null, 84, 88, 86, 84, 83, 79,
      81, 77, 81, 84, 86, 84, 81, 77, 79, 74, 79, 83, 86, 83, 79, 74,
      81, 84, 88, null, 86, 84, 83, 81, 84, 79, 84, 88, 91, 88, 86, 84,
      89, 88, 84, 81, 84, 81, 77, null, 80, 83, 88, 86, 83, 80, 76, null],
  },
};
const jingles: Partial<Record<Sound, number[]>> = {
  select: [79], travel: [67, 72, 76], encounter: [57, 69, 76, 81],
  status: [76, 72, 79], throw: [84, 79, 72, 64], escape: [76, 72, 67, 60],
  heal: [60, 64, 67, 72, 76, 79], treasure: [79, 84, 88], switch: [67, 74, 79],
  victory: [72, 72, 72, 76, 79, 84, 79, 84], capture: [79, 76, 79, 84, 88, 91],
  defeat: [69, 67, 64, 60, 57], evolve: [60, 64, 67, 72, 76, 79, 84, 88, 91, 96],
  level: [72, 76, 79, 84],
};
type Voice = { source: OscillatorNode; envelope: GainNode; channel: "music" | "effects" };
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

export class AdventureAudio {
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private voices = new Set<Voice>();
  private settings = DEFAULT_AUDIO;
  private scene: MusicScene = null;
  private hidden = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private step = 0;
  private nextNote = 0;
  private lastStep = -Infinity;

  // Called synchronously from a real pointer/key gesture to satisfy autoplay rules.
  unlock() {
    if (this.hidden || this.settings.muted) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.musicBus = this.context.createGain();
        this.effectsBus = this.context.createGain();
        this.musicBus.connect(this.context.destination);
        this.effectsBus.connect(this.context.destination);
        this.applyVolumes();
      }
      this.resume();
    } catch {
      // Audio is optional; unsupported browsers still run the adventure.
    }
  }

  private resume() {
    const ctx = this.context;
    if (!ctx || this.hidden || this.settings.muted) return;
    if (ctx.state === "running") this.startMusic();
    else void ctx.resume().then(() => {
      if (this.context !== ctx) return;
      if (this.hidden || this.settings.muted) void ctx.suspend().catch(() => {});
      else this.startMusic();
    }).catch(() => {});
  }

  configure(settings: AudioSettings) {
    this.settings = parseAudioSettings(settings);
    this.applyVolumes();
    if (settings.muted) {
      this.stopMusic();
      this.stopVoices("effects");
      if (this.context) void this.context.suspend().catch(() => {});
    } else {
      if (!settings.music) this.stopMusic();
      if (!settings.effects) this.stopVoices("effects");
      this.resume();
    }
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) {
      this.stopMusic();
      this.stopVoices("effects");
      if (this.context) void this.context.suspend().catch(() => {});
    } else this.resume();
  }

  setScene(scene: MusicScene) {
    if (scene === this.scene) return;
    this.stopMusic();
    // Discard delayed jingles when leaving a battle or starting another scene.
    this.stopVoices("effects");
    this.scene = scene;
    this.step = 0;
    this.startMusic();
  }

  private applyVolumes() {
    if (!this.context) return;
    const time = this.context.currentTime;
    for (const [bus, volume] of [[this.musicBus, this.settings.music], [this.effectsBus, this.settings.effects]] as const) {
      if (!bus) continue;
      bus.gain.cancelScheduledValues(time);
      bus.gain.setTargetAtTime(this.settings.muted ? 0 : volume, time, 0.025);
    }
  }

  private tone(note: number, time: number, duration: number, volume: number,
    wave: OscillatorType, channel: Voice["channel"], slide?: number) {
    const ctx = this.context;
    const bus = channel === "music" ? this.musicBus : this.effectsBus;
    if (!ctx || !bus) return;
    const source = ctx.createOscillator();
    const envelope = ctx.createGain();
    source.type = wave;
    source.frequency.setValueAtTime(hz(note), time);
    if (slide !== undefined) source.frequency.exponentialRampToValueAtTime(hz(slide), time + duration);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(envelope);
    envelope.connect(bus);
    const voice = { source, envelope, channel };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      this.voices.delete(voice);
    };
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  private startMusic() {
    if (this.timer || !this.scene || !this.context || this.context.state !== "running" ||
      this.hidden || this.settings.muted || !this.settings.music) return;
    this.nextNote = this.context.currentTime + 0.04;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 50);
  }

  private schedule() {
    const ctx = this.context;
    if (!ctx || !this.scene || ctx.state !== "running") return;
    const score = scores[this.scene];
    const eighth = 30 / score.bpm;
    // A stalled tab must never schedule a backlog of notes all at once.
    if (this.nextNote < ctx.currentTime) this.nextNote = ctx.currentTime + 0.02;
    while (this.nextNote < ctx.currentTime + 0.15) {
      const index = this.step % 64;
      const beat = index % 8;
      const bar = Math.floor(index / 8);
      const root = score.roots[bar];
      const melody = score.melody[index];
      const battle = this.scene === "battle";
      if (melody !== null) {
        this.tone(melody, this.nextNote, eighth * 1.6, battle ? 0.075 : 0.11,
          battle ? "square" : "sine", "music");
        if (!battle) this.tone(melody + 12, this.nextNote, eighth * 0.7, 0.022, "sine", "music");
      }
      if (beat % 2 === 0) {
        this.tone(root + (beat === 4 ? 7 : 0), this.nextNote, eighth * 1.8, 0.12, "triangle", "music");
      }
      const minor = battle ? bar !== 2 && bar !== 3 && bar !== 5 && bar !== 6 : root === 45 || root === 52;
      const chord = [root + 12, root + (minor ? 15 : 16), root + 19, root + 24];
      this.tone(chord[beat % 4], this.nextNote + 0.012, eighth * 1.4, 0.045, "triangle", "music");
      if (battle && beat % 2 === 0) this.tone(40, this.nextNote, 0.1, 0.12, "sine", "music", 22);
      this.step++;
      this.nextNote += eighth;
    }
  }

  play(sound: Sound, delay = 0) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.settings.muted || !this.settings.effects || this.hidden) return;
    const time = ctx.currentTime + 0.01 + delay;
    if (sound === "step") {
      if (time - this.lastStep < 0.14) return;
      this.lastStep = time;
      this.tone(40 + Math.random() * 5, time, 0.045, 0.055, "triangle", "effects", 25);
    } else if (sound === "hit") {
      this.tone(57, time, 0.11, 0.13, "triangle", "effects", 28);
      this.tone(81, time, 0.065, 0.04, "square", "effects", 40);
    } else {
      const notes = jingles[sound] ?? [];
      const speed = sound === "select" ? 0.045 : sound === "defeat" ? 0.22 : 0.105;
      notes.forEach((note, i) => {
        this.tone(note, time + i * speed, sound === "select" ? 0.06 : 0.28,
          sound === "select" ? 0.065 : 0.14, "sine", "effects");
      });
    }
  }

  playCues(cues: SoundCue[]) {
    cues.forEach(({ sound, delay }) => this.play(sound, delay));
  }

  private stopVoices(channel: Voice["channel"]) {
    const time = this.context?.currentTime ?? 0;
    for (const voice of this.voices) {
      if (voice.channel !== channel) continue;
      voice.envelope.gain.cancelScheduledValues(time);
      voice.envelope.gain.setTargetAtTime(0, time, 0.008);
      voice.source.stop(time + 0.04);
    }
  }

  private stopMusic() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.stopVoices("music");
  }

  dispose() {
    this.stopMusic();
    this.stopVoices("effects");
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.musicBus = this.effectsBus = null;
    this.voices.clear();
    this.lastStep = -Infinity;
  }
}
export const gameAudio = new AdventureAudio();
