import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

type Options<T> = {
  data: T;
  save: (data: T) => Promise<void>;
  enabled: boolean;
  debounceMs?: number;
};

/**
 * Debounced auto-save.
 * Triggers whenever `data` changes (referentially) after `debounceMs`.
 * Also flushes on visibility change and beforeunload.
 */
export function useAutosave<T>({ data, save, enabled, debounceMs = 2000 }: Options<T>) {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const dataRef = useRef(data);
  const savedRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => { dataRef.current = data; }, [data]);

  const flush = useCallback(async () => {
    if (!enabled) return;
    if (savingRef.current) return;
    if (dataRef.current === savedRef.current) return;
    const snap = dataRef.current;
    savingRef.current = true;
    setState({ kind: "saving" });
    try {
      await save(snap);
      savedRef.current = snap;
      setState({ kind: "saved", at: Date.now() });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    } finally {
      savingRef.current = false;
    }
  }, [enabled, save]);

  // Debounce on data change
  useEffect(() => {
    if (!enabled) return;
    if (data === savedRef.current) return;
    setState((s) => (s.kind === "saving" ? s : { kind: "dirty" }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, enabled, debounceMs, flush]);

  // Flush on tab hide / unload
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => { void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [enabled, flush]);

  const markSaved = useCallback(() => {
    savedRef.current = dataRef.current;
    setState({ kind: "saved", at: Date.now() });
  }, []);

  return { state, flush, markSaved };
}
