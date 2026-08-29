"use client";

interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Standard primary submit button with inline loading state.
 * - Turns into a spinner + loading label while `loading` is true.
 * - Disables itself (prevents double-submit) while `loading` or `disabled`.
 * `children` is the leading icon shown when NOT loading.
 */
export default function SubmitButton({
  loading = false,
  disabled = false,
  label = "حفظ",
  loadingLabel = "جاري الحفظ...",
  className = "bg-blue-600 hover:bg-blue-700 text-white",
  children,
}: SubmitButtonProps) {
  const blocked = loading || disabled;
  return (
    <button
      type="submit"
      disabled={blocked}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition ${className} ${blocked ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current opacity-40 border-t-current" aria-hidden="true" />
      ) : (
        children
      )}
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}
