"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 border-transparent shadow-sm shadow-violet-600/25 hover:shadow-md hover:shadow-violet-600/20",
      secondary:
        "bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-200/80 border-transparent",
      outline:
        "bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 shadow-sm",
      danger:
        "bg-white text-red-600 border-red-200 hover:bg-red-50 active:bg-red-100/80 shadow-sm",
      ghost:
        "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 active:bg-slate-200/60",
    };
    const sizes = {
      sm: "px-3.5 py-2 text-sm rounded-lg",
      md: "px-4 py-2.5 text-sm rounded-xl",
      lg: "px-6 py-3 text-base rounded-xl",
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export default Button;
