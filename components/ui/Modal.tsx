"use client";

import React, { useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={twMerge(
          clsx(
            "relative w-full bg-[#F7F6F2] border border-black shadow-2xl rounded p-6 md:p-8 z-10 animate-in fade-in zoom-in-95 duration-150",
            widthStyles[maxWidth]
          )
        )}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          {title && (
            <h3 className="text-lg md:text-xl font-bold tracking-tight font-display uppercase">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-muted hover:text-foreground text-sm font-mono-num p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
