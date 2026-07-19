import { useState, useEffect, useCallback } from "react";
import { CONFIG } from "../lib/config";
import {
  DEFAULT_AUDIO_PREFS,
  resolveAudioPrefs,
  type AudioPrefs,
} from "../lib/audio-prefs";

/**
 * The extension sound preferences (device-level, chrome.storage.local).
 * Writes propagate to open tabs via chrome.storage.onChanged, which the
 * content-script sound player (lib/sound.ts) subscribes to.
 */
export function useAudioPrefs() {
  const [prefs, setPrefs] = useState<AudioPrefs>(DEFAULT_AUDIO_PREFS);

  useEffect(() => {
    let cancelled = false;
    chrome.storage.local
      .get(CONFIG.AUDIO_PREFS_KEY)
      .then((stored) => {
        if (!cancelled) setPrefs(resolveAudioPrefs(stored[CONFIG.AUDIO_PREFS_KEY]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((next: AudioPrefs) => {
    setPrefs(next);
    void chrome.storage.local.set({ [CONFIG.AUDIO_PREFS_KEY]: next });
  }, []);

  const setVolume = useCallback(
    (volume: number) => update({ ...prefs, volume: Math.min(1, Math.max(0, volume)) }),
    [prefs, update]
  );

  const toggleMuted = useCallback(
    () => update({ ...prefs, muted: !prefs.muted }),
    [prefs, update]
  );

  return { prefs, setVolume, toggleMuted };
}
