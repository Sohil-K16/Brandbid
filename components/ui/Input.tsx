import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefixText, type = "text", ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixText && (
            <span className="absolute left-3.5 text-sm font-mono-num text-muted select-none">
              {prefixText}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={twMerge(
              clsx(
                "w-full bg-white text-foreground border border-border rounded px-3.5 py-2.5 text-sm placeholder:text-muted/60 transition-colors focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground",
                prefixText && "pl-8",
                error && "border-red-500 focus:border-red-600 focus:ring-red-600",
                className
              )
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
