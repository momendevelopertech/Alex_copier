// Shared client-side helper for API error responses.
// Server routes return { error: string, code?: string }. The code maps to an
// i18n key under `errors.*` so messages follow the UI locale; the raw server
// message is the fallback (and the final fallback is common.error).

type ApiErrorData = { error?: unknown; code?: unknown; message?: unknown } | null | undefined;

export function apiErrorMessage(
  data: ApiErrorData,
  t: (key: string) => string,
  fallbackKey = "common.error",
): string {
  const code = typeof data?.code === "string" ? data.code : "";
  if (code) {
    const key = `errors.${code}`;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  if (typeof data?.error === "string" && data.error.trim() !== "") return data.error;
  if (typeof data?.message === "string" && data.message.trim() !== "") return data.message;
  const fallback = t(fallbackKey);
  return fallback !== fallbackKey ? fallback : t("common.error");
}

export async function readApiError(response: Response): Promise<ApiErrorData> {
  try {
    return (await response.json()) as ApiErrorData;
  } catch {
    return null;
  }
}
