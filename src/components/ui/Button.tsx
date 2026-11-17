import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium tracking-[0.12em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer select-none";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary:
        "bg-black text-white border border-black hover:bg-[#1a1a1a] active:scale-[0.99]",
      secondary:
        "bg-white text-black border border-black hover:bg-black hover:text-white",
      outline:
        "bg-transparent text-black border border-[#E5E5E5] hover:border-black",
      ghost:
        "bg-transparent text-black border border-transparent hover:bg-[#F2F2F2]",
      danger:
        "bg-white text-black border border-black hover:bg-black hover:text-white underline decoration-1 underline-offset-4",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-9 px-4 text-[11px]",
      md: "h-11 px-6 text-xs",
      lg: "h-13 px-8 text-xs",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
