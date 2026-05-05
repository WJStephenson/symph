import { create } from "zustand";

export type ToastVariant = "success" | "error";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

let idSeq = 0;

type ToastState = {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant) => string;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, variant = "success") => {
    const id = `t-${++idSeq}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    window.setTimeout(() => {
      get().dismiss(id);
    }, 4200);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}));

export function pushToast(message: string, variant: ToastVariant = "success") {
  useToastStore.getState().push(message, variant);
}
