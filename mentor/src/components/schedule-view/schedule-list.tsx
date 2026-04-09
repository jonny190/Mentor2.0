"use client";

import { useMemo } from "react";
import { useScheduleStore } from "@/stores/schedule-store";
import { useSlots } from "@/hooks/use-slots";
import { ScheduleDateGroup } from "./schedule-date-group";
import { TimeSlotWithContext } from "@/lib/types/slot";

type ScheduleListProps = {
  onSlotClick: (slot: TimeSlotWithContext) => void;
  onTaskClick: (taskId: number) => void;
};

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ScheduleList({ onSlotClick, onTaskClick }: ScheduleListProps) {
  const { currentDate } = useScheduleStore();

  const { from, to } = useMemo(() => {
    const f = new Date(currentDate);
    const t = new Date(currentDate);
    t.setDate(t.getDate() + 13);
    return { from: toDateString(f), to: toDateString(t) };
  }, [currentDate]);

  const { data: slots } = useSlots(from, to);

  const grouped = useMemo(() => {
    const map: Record<string, TimeSlotWithContext[]> = {};
    // Create entries for all 14 days
    for (let i = 0; i < 14; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      map[toDateString(d)] = [];
    }
    // Fill in slots
    if (slots) {
      for (const slot of slots) {
        const key = slot.dateScheduled;
        if (map[key]) {
          map[key].push(slot);
        }
      }
    }
    return map;
  }, [slots, currentDate]);

  const today = new Date();

  return (
    <div className="flex-1 overflow-auto">
      {Object.entries(grouped).map(([date, daySlots]) => (
        <ScheduleDateGroup
          key={date}
          date={date}
          slots={daySlots}
          isToday={isSameDay(new Date(date + "T00:00:00"), today)}
          onSlotClick={onSlotClick}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}
