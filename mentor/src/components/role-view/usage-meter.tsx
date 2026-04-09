"use client";

import { cn } from "@/lib/utils";

type UsageMeterProps = {
  allocated: number;
  used: number;
  className?: string;
};

export function UsageMeter({ allocated, used, className }: UsageMeterProps) {
  if (allocated === 0) return null;
  const percentage = Math.min(100, Math.round((used / allocated) * 100));
  const barColor =
    percentage >= 90
      ? "bg-red-500"
      : percentage >= 70
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-gray-200">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-400">{percentage}%</span>
    </div>
  );
}
