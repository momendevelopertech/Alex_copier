"use client";

import { useEffect, useState } from "react";

function readParams(names: readonly string[]): Record<string, string> {
  const search = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = search.get(name);
    if (value) out[name] = value;
  }
  return out;
}

/**
 * Reads URL query params once after mount (SSR/hydration safe).
 * Returns {} initially, then the actual param values shortly after mount.
 */
export function useUrlParams(names: readonly string[]): Record<string, string> {
  const [params, setParams] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setParams(readParams(names));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- names is a static literal per call site
  }, []);
  return params;
}

/**
 * Search-box state that starts from a URL-derived default and only diverges
 * once the user types. Reset by passing null.
 */
export function useSearchWithDefault(defaultValue: string): [string, (value: string | null) => void] {
  const [override, setOverride] = useState<string | null>(null);
  const value = override ?? defaultValue;
  return [value, setOverride];
}
