import React from "react";
import { AlertTriangle, Inbox } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[#EAEAEA] ${className}`}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3.5 w-1/3" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-[#E5E5E5] bg-white">
      <div className="mb-4 text-[#777777]">
        {icon ?? <Inbox className="h-8 w-8 stroke-[1.25]" />}
      </div>
      <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-black">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-[#777777]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 border border-black bg-white">
      <AlertTriangle className="h-7 w-7 mb-3 text-black stroke-[1.5]" />
      <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-black">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-[#777777]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  prevLabel = "Previous",
  nextLabel = "Next",
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  prevLabel?: string;
  nextLabel?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-9 px-4 border border-[#E5E5E5] bg-white text-xs uppercase tracking-widest disabled:opacity-40 hover:border-black transition-colors cursor-pointer"
      >
        {prevLabel}
      </button>
      <span className="px-4 text-xs text-[#777777] tabular-nums">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="h-9 px-4 border border-[#E5E5E5] bg-white text-xs uppercase tracking-widest disabled:opacity-40 hover:border-black transition-colors cursor-pointer"
      >
        {nextLabel}
      </button>
    </div>
  );
}
