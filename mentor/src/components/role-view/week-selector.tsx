"use client";

import { Button } from "@/components/ui/button";
import { useRoleStore, getWeekStart } from "@/stores/role-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function WeekSelector() {
  const {
    weekOffset,
    weeksToShow,
    goForwardWeek,
    goBackWeek,
    goToCurrentWeek,
    setWeeksToShow,
  } = useRoleStore();
  const startDate = getWeekStart(weekOffset);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeksToShow * 7 - 1);

  const formatShort = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={goBackWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={weekOffset === 0 ? "default" : "outline"}
        onClick={goToCurrentWeek}
      >
        Today
      </Button>
      <Button size="sm" variant="ghost" onClick={goForwardWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="min-w-[160px] text-center text-sm">
        {formatShort(startDate)} - {formatShort(endDate)}
      </span>
      <div className="ml-2 flex rounded-md border">
        {([1, 2, 3] as const).map((w) => (
          <button
            key={w}
            onClick={() => setWeeksToShow(w)}
            className={cn(
              "px-2 py-1 text-xs",
              weeksToShow === w
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {w}w
          </button>
        ))}
      </div>
    </div>
  );
}
