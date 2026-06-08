"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    },
    []
  );

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const colors = {
    success: "border-l-green-500",
    error: "border-l-red-500",
    info: "border-l-zinc-400",
  };

  const icons = {
    success: <Check size={16} className="text-green-400 shrink-0" />,
    error: <X size={16} className="text-red-400 shrink-0" />,
    info: null,
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-[90vw] max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 bg-zinc-900/95 backdrop-blur-xl border border-white/[0.08] border-l-4 ${colors[toast.type]} text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-toast-in`}
          >
            {icons[toast.type]}
            <span className="text-sm font-medium flex-1 tracking-wide">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-zinc-600 hover:text-white transition cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
