import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "gold" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 uppercase tracking-wider select-none";

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-xs md:text-sm px-4 py-2.5 gap-2",
      lg: "text-sm md:text-base px-6 py-3.5 gap-2.5 font-semibold",
    };

    const variantStyles = {
      primary: "bg-foreground text-background hover:bg-black border border-black",
      secondary: "bg-white text-foreground hover:bg-[#EFEFEA] border border-border",
      outline: "bg-transparent text-foreground hover:bg-black/5 border border-foreground/30 hover:border-foreground",
      gold: "bg-[#E7B93C] text-black hover:bg-[#D4A528] border border-[#C2931A] font-bold shadow-subtle",
      danger: "bg-red-600 text-white hover:bg-red-700 border border-red-700",
      ghost: "bg-transparent text-foreground hover:bg-black/5 border border-transparent",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            baseStyles,
            sizeStyles[size],
            variantStyles[variant],
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
