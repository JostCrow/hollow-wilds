"""
Simple audio manager for playing sound effects with graceful fallbacks.
"""
import os
import pygame
from src.config import ASSETS_PATH

_sfx_cache: dict[str, pygame.mixer.Sound] = {}
_mixer_ready = False


def init_audio():
    global _mixer_ready
    if _mixer_ready:
        return
    try:
        pygame.mixer.init()
        _mixer_ready = True
    except Exception:
        _mixer_ready = False  # Audio not available


def load_sfx(name: str) -> pygame.mixer.Sound | None:
    if not _mixer_ready:
        return None
    if name in _sfx_cache:
        return _sfx_cache[name]
    path_wav = os.path.join(ASSETS_PATH, "sfx", f"{name}.wav")
    path_ogg = os.path.join(ASSETS_PATH, "sfx", f"{name}.ogg")
    path = path_wav if os.path.exists(path_wav) else path_ogg
    if os.path.exists(path):
        try:
            snd = pygame.mixer.Sound(path)
            _sfx_cache[name] = snd
            return snd
        except Exception:
            return None
    return None


def play_sfx(name: str, volume: float = 0.6):
    snd = load_sfx(name)
    if snd:
        try:
            snd.set_volume(volume)
            snd.play()
        except Exception:
            pass


def shutdown_audio():
    global _mixer_ready
    try:
        for snd in _sfx_cache.values():
            snd.stop()
        if _mixer_ready:
            pygame.mixer.quit()
    except Exception:
        pass
    _mixer_ready = False
