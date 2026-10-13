import { test } from "node:test";
import assert from "node:assert/strict";
import { AdventureAudio, DEFAULT_AUDIO, parseAudioSettings } from "./audio.ts";
import { battleCues, worldCues } from "./audio-cues.ts";
import { beginBattle, heal, newSave, takeTurn } from "./engine.ts";

test("audio preferences tolerate missing/corrupt values and clamp volumes", () => {
  for (const input of [null, [], false, "bad", { music: NaN, effects: Infinity, muted: "yes" }])
    assert.deepEqual(parseAudioSettings(input), DEFAULT_AUDIO);
  assert.deepEqual(parseAudioSettings({ music: -1, effects: 5, muted: true }), { music: 0, effects: 1, muted: true });
  assert.deepEqual(parseAudioSettings({ music: 0, effects: 0 }), { music: 0, effects: 0, muted: false });
});

test("accepted capture, escape, and potion actions have distinct cues; invalid actions stay silent", () => {
  const save = newSave("Flarepib", "Audio test");
  const battle = beginBattle(save, "Niblet", 2);
  const before = { save, battle };
  assert.deepEqual(battleCues(before, takeTurn(save, battle, { type: "potion" }), { type: "potion" }), []);
  assert.deepEqual(battleCues(before, takeTurn(save, battle, { type: "move", key: "invalid" }), { type: "move", key: "invalid" }), []);
  const caught = takeTurn(save, battle, { type: "catch" }, () => 0);
  assert.deepEqual(battleCues(before, caught, { type: "catch" }).slice(0, 2), [
    { sound: "throw" }, { sound: "capture", delay: 0.4 },
  ]);
  assert.deepEqual(battleCues(caught, takeTurn(caught.save, caught.battle, { type: "run" }), { type: "run" }), []);
  assert.deepEqual(battleCues(before, takeTurn(save, battle, { type: "run" }), { type: "run" }), [{ sound: "escape" }]);
  save.party[0].hp = 1;
  assert.equal(battleCues(before, takeTurn(save, battle, { type: "potion" }, () => 0.99), { type: "potion" })[0].sound, "heal");
});

test("exploration cues follow movement, treasures, healing, and encounters without replaying on notices", () => {
  const save = newSave("Flarepib", "Audio test");
  const state = { save, battle: null, panel: "adventure", dialog: null };
  assert.deepEqual(worldCues(state, { ...state }), []);
  assert.deepEqual(worldCues(state, { ...state, save: { ...save, steps: save.steps + 1 } }), [{ sound: "step" }]);
  assert.deepEqual(worldCues(state, { ...state, save: { ...save, steps: save.steps + 1, collected: ["treasure"] } }), [{ sound: "treasure" }]);
  assert.deepEqual(worldCues(state, { ...state, battle: beginBattle(save, "Niblet", 2) }), [{ sound: "encounter" }]);
  save.party[0].pp[save.party[0].moves[0]] = 0;
  assert.deepEqual(worldCues(state, { ...state, save: heal(save) }), [{ sound: "heal" }]);
  save.party[0].hp = 1;
  assert.deepEqual(worldCues(state, { ...state, save: heal(save) }), [{ sound: "heal" }]);
});

// Exercise lifecycle with an audio device double, without needing speakers in Node.
class Parameter {
  value = 1;
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
  cancelScheduledValues() {}
}
class Gain {
  gain = new Parameter();
  connect() {}
  disconnect() {}
}
class Oscillator {
  frequency = new Parameter();
  type = "sine";
  onended: (() => void) | null = null;
  startTime = -1;
  stopTime = -1;
  connect() {}
  disconnect() {}
  start(time: number) { this.startTime = time; }
  stop(time: number) { this.stopTime = time; }
}
class Device {
  static instances: Device[] = [];
  currentTime = 10;
  state = "suspended";
  destination = {};
  oscillators: Oscillator[] = [];
  constructor() { Device.instances.push(this); }
  createGain() { return new Gain(); }
  createOscillator() { const node = new Oscillator(); this.oscillators.push(node); return node; }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
  async close() { this.state = "closed"; }
}

test("audio waits for a gesture, cancels queued effects when muted/hidden, resumes, and disposes", async () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = Device as unknown as typeof AudioContext;
  const audio = new AdventureAudio();
  try {
    audio.setScene("town");
    audio.play("select");
    assert.equal(Device.instances.length, 0);
    audio.unlock();
    await Promise.resolve();
    const device = Device.instances[0];
    assert.ok(device.oscillators.length > 0, "starts the selected music after gesture");
    audio.play("capture", 1);
    const queued = device.oscillators.at(-1)!;
    assert.ok(queued.startTime > device.currentTime);
    audio.configure({ ...DEFAULT_AUDIO, muted: true });
    assert.equal(device.state, "suspended");
    assert.ok(queued.stopTime < queued.startTime, "scheduled jingle cannot leak after muting");
    const count = device.oscillators.length;
    audio.play("hit");
    assert.equal(device.oscillators.length, count);
    audio.configure(DEFAULT_AUDIO);
    await Promise.resolve();
    assert.equal(device.state, "running");
    assert.ok(device.oscillators.length > count);
    audio.setHidden(true);
    assert.equal(device.state, "suspended");
    const hiddenCount = device.oscillators.length;
    audio.unlock();
    audio.play("victory");
    assert.equal(device.oscillators.length, hiddenCount);
    audio.setHidden(false);
    await Promise.resolve();
    assert.equal(device.state, "running");
    audio.configure({ ...DEFAULT_AUDIO, music: 0, effects: 0 });
    const silentCount = device.oscillators.length;
    audio.play("hit");
    assert.equal(device.oscillators.length, silentCount);
    audio.dispose();
    assert.equal(device.state, "closed");
  } finally {
    audio.dispose();
    globalThis.AudioContext = original;
  }
});
