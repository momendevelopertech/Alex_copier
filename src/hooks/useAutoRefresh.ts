"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeDataChanged, type DataEntity } from "@/lib/data-events";

interface UseAutoRefreshOptions {
  /** Batch rapid events into a single refresh. */
  debounceMs?: number;
  /** Don't refetch for this long after a completed refresh (dedupes a page's own mutations). */
  skipAfterMs?: number;
  /** Refetch when the tab becomes visible again (cross-tab freshness). */
  focus?: boolean;
}

/**
 * Keeps a page's data current with near-zero server load:
 * - Refreshes when related entities change elsewhere in the same tab (event bus).
 * - Refreshes when the user returns to the tab/window.
 * - Never polls on an interval.
 *
 * The returned `refresh` is the single entry point for manual refreshes
 * (RefreshButton) and for mutation handlers, so concurrent requests are
 * deduped and the `refreshing` spinner is shared.
 */
export function useAutoRefresh(
  refreshFn: () => Promise<void> | void,
  entities: DataEntity[],
  options: UseAutoRefreshOptions = {}
) {
  const { debounceMs = 400, skipAfterMs = 2000, focus = true } = options;
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ running: false, pending: false, lastDoneAt: 0 });
  const fnRef = useRef(refreshFn);
  useEffect(() => {
    fnRef.current = refreshFn;
  }, [refreshFn]);

  const run = async () => {
    if (state.current.running) {
      state.current.pending = true;
      return;
    }
    state.current.running = true;
    setRefreshing(true);
    try {
      await fnRef.current();
    } finally {
      state.current.running = false;
      state.current.lastDoneAt = Date.now();
      setRefreshing(false);
      if (state.current.pending) {
        state.current.pending = false;
        void run();
      }
    }
  };

  const refresh = () => {
    void run();
  };

  const mayRefresh = () => Date.now() - state.current.lastDoneAt >= skipAfterMs;

  const entitiesKey = entities.join(",");

  useEffect(() => {
    const timers: number[] = [];

    const onVisible = () => {
      if (document.visibilityState === "visible" && mayRefresh()) void run();
    };

    const unsubscribe = subscribeDataChanged((evEntities) => {
      if (!evEntities.some((e) => entitiesKey.split(",").includes(e))) return;
      if (!mayRefresh()) return;
      const timer = window.setTimeout(() => run(), debounceMs);
      timers.push(timer);
    });

    if (focus) {
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onVisible);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      unsubscribe();
      if (focus) {
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onVisible);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitiesKey, debounceMs, focus]);

  return { refresh, refreshing };
}