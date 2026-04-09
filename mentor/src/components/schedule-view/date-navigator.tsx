"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useScheduleStore } from "@/stores/schedule-store";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DateNavigator() {
  const { currentDate, goToToday, goForward, goBack } = useScheduleStore();
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isToday ? "default" : "outline"}
        size="sm"
        onClick={goToToday}
      >
        Today
      </Button>
      <Button variant="ghost" size="icon" onClick={() => goBack(7)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => goForward(7)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">{formatDate(currentDate)}</span>
    </div>
  );
}
