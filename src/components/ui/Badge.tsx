import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "subtle";
  className?: string;
}

export function Badge({
  children,
  variant = "subtle",
  className = "",
}: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    solid: "bg-black text-white border border-black",
    outline: "bg-white text-black border border-black",
    subtle: "bg-[#F3F3F3] text-[#1A1A1A] border border-[#E5E5E5]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] whitespace-nowrap ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
