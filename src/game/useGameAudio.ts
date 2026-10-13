import { useEffect } from "react";
import { create } from "zustand";
import { AUDIO_KEY, DEFAULT_AUDIO, gameAudio, parseAudioSettings } from "./audio";
import type { AudioSettings } from "./audio";
import { worldCues } from "./audio-cues";
import { useAdventure } from "./store";
import { isTown, zoneById } from "./world";

function readSettings(): AudioSettings {
  try {
    return parseAudioSettings(JSON.parse(localStorage.getItem(AUDIO_KEY) ?? "null"));
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}
export const useAudioSettings = create<AudioSettings & {
  update: (settings: Partial<AudioSettings>) => void;
}>((set, get) => ({
  ...readSettings(),
  update: (patch) => {
    const settings = parseAudioSettings({ ...get(), ...patch });
    set(settings);
    gameAudio.configure(settings);
    gameAudio.unlock();
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
    } catch {
      // Preferences still work for this visit if storage is unavailable.
    }
  },
}));

export function useGameAudio() {
  useEffect(() => {
    gameAudio.configure(useAudioSettings.getState());
    gameAudio.setHidden(document.hidden);
    const syncScene = (state: ReturnType<typeof useAdventure.getState>) => {
      gameAudio.setScene(!state.save ? null : state.battle
        ? state.battle.outcome ? null : "battle"
        : isTown(zoneById(state.save.zone)) ? "town" : "trail");
    };
    syncScene(useAdventure.getState());
    const unsubscribe = useAdventure.subscribe((next, previous) => {
      syncScene(next);
      gameAudio.playCues(worldCues(previous, next));
    });
    const unlock = (event: Event) => {
      if (event instanceof KeyboardEvent && (event.repeat || event.metaKey || event.ctrlKey || event.altKey)) return;
      gameAudio.unlock();
    };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      const inAudioOrBattle = event.composedPath().some((node) =>
        node instanceof Element && node.matches("[data-audio-control], .battle-overlay"));
      if (button && !button.disabled && !inAudioOrBattle)
        gameAudio.play("select");
    };
    const visibility = () => gameAudio.setHidden(document.hidden);
    const pageHide = () => gameAudio.setHidden(true);
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", click);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", visibility);
    return () => {
      unsubscribe();
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", visibility);
      gameAudio.dispose();
    };
  }, []);
}
