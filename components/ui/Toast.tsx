"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { clsx } from "clsx";

interface ToastMessage {
  id: string;
  text: string;
  type?: "success" | "error" | "info";
}

interface ToastContextValue {
  showToast: (text: string, type?: ToastMessage["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (text: string) => {
        if (typeof window !== "undefined") {
          alert(text);
        }
      },
    };
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: ToastMessage["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "pointer-events-auto px-4 py-3 border shadow-lg text-xs font-mono-num uppercase tracking-wider rounded transition-all animate-in slide-in-from-bottom-2",
              toast.type === "success" && "bg-black text-white border-black",
              toast.type === "error" && "bg-red-600 text-white border-red-700",
              toast.type === "info" && "bg-white text-black border-border"
            )}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
