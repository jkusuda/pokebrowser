import { useState, useEffect, useCallback } from "react";

/** A device-level preference in chrome.storage.local; writes reach open tabs through storage.onChanged. */
export function useDevicePref<T>(key: string, resolve: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => resolve(undefined));

  useEffect(() => {
    let cancelled = false;
    chrome.storage.local
      .get(key)
      .then((stored) => {
        if (!cancelled) setValue(resolve(stored[key]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key, resolve]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      void chrome.storage.local.set({ [key]: next });
    },
    [key]
  );

  return [value, update] as const;
}
