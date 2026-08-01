"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();
const serverSnapshots = new Map<string, string>();

function subscribe(key: string, listener: () => void) {
  const keyListeners = listeners.get(key) ?? new Set();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);
  const onStorage = (event: StorageEvent) => { if (event.key === key) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { keyListeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function parseOrFallback<T>(serialized: string, fallback: string): T {
  try {
    return JSON.parse(serialized) as T;
  } catch {
    return JSON.parse(fallback) as T;
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const fallback = JSON.stringify(initialValue);
  if (!serverSnapshots.has(key)) serverSnapshots.set(key, fallback);
  const subscribeToKey = useCallback((listener: () => void) => subscribe(key, listener), [key]);
  const getSnapshot = useCallback(() => window.localStorage.getItem(key) ?? fallback, [fallback, key]);
  const getServerSnapshot = useCallback(() => serverSnapshots.get(key) ?? fallback, [fallback, key]);
  const serialized = useSyncExternalStore(
    subscribeToKey,
    getSnapshot,
    getServerSnapshot,
  );
  // Keep reference identity stable until storage actually changes. Consumers use this
  // value in effects, so reparsing every render would continuously restart them.
  const value = useMemo(() => parseOrFallback<T>(serialized, fallback), [fallback, serialized]);
  const setValue = useCallback((next: T | ((current: T) => T)) => {
    const currentSerialized = window.localStorage.getItem(key) ?? fallback;
    const current = parseOrFallback<T>(currentSerialized, fallback);
    const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
    window.localStorage.setItem(key, JSON.stringify(resolved));
    emit(key);
  }, [fallback, key]);
  return [value, setValue] as const;
}
