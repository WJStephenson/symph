import { createPortal } from "react-dom";
import { useToastStore } from "@/state/toastStore";

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const root = typeof document !== "undefined" ? document.body : null;
  if (!root || !toasts.length) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 z-[110] pointer-events-none flex flex-col items-stretch sm:items-center gap-2 px-4 max-w-lg mx-auto w-full"
      style={{ bottom: "max(calc(5.25rem + var(--safe-bottom)), calc(0.75rem + var(--safe-bottom)))" }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto w-full sm:w-auto sm:min-w-[240px] max-w-full rounded-2xl border px-4 py-3 text-left text-sm shadow-xl backdrop-blur-md transition ${
            t.variant === "error"
              ? "border-rose-400/35 bg-rose-950/90 text-rose-100"
              : "border-white/15 bg-zinc-900/95 text-zinc-100"
          }`}
        >
          {t.message}
        </button>
      ))}
    </div>,
    root
  );
}
