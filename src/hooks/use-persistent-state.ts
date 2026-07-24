"use client";

import { useCallback, useSyncExternalStore } from "react";

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

export function usePersistentState<T>(key: string, initialValue: T) {
  const fallback = JSON.stringify(initialValue);
  if (!serverSnapshots.has(key)) serverSnapshots.set(key, fallback);
  const serialized = useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => window.localStorage.getItem(key) ?? fallback,
    () => serverSnapshots.get(key) ?? fallback,
  );
  const value = JSON.parse(serialized) as T;
  const setValue = useCallback((next: T | ((current: T) => T)) => {
    const currentSerialized = window.localStorage.getItem(key) ?? fallback;
    const current = JSON.parse(currentSerialized) as T;
    const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
    window.localStorage.setItem(key, JSON.stringify(resolved));
    emit(key);
  }, [fallback, key]);
  return [value, setValue] as const;
}
