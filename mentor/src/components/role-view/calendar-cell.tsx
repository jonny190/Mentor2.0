"use client";

import { cn } from "@/lib/utils";
import { UsageMeter } from "./usage-meter";
import { CellSlotEntry } from "./cell-slot-entry";
import type { TimeSlotWithContext } from "@/lib/types/slot";

type CalendarCellProps = {
  date: string;
  contextId: number;
  slots: TimeSlotWithContext[];
  isToday: boolean;
  isSelected: boolean;
  compact: boolean;
  onCellClick: (contextId: number, date: string) => void;
  onSlotClick: (slot: TimeSlotWithContext) => void;
};

export function CalendarCell({
  date,
  contextId,
  slots,
  isToday,
  isSelected,
  compact,
  onCellClick,
  onSlotClick,
}: CalendarCellProps) {
  // Calculate usage: total task count vs total capacity in the cell
  // Each slot's capacity is its allocated minutes; each task is assumed to use sizeHour (60min) as default
  const totalAllocated = slots.reduce((sum, s) => sum + s.allocated, 0);
  const totalTaskMinutes = slots.reduce((sum, s) => sum + s.taskAssignments.length * 60, 0);
  const totalUsed = Math.min(totalAllocated, totalTaskMinutes);
  const maxVisible = compact ? 1 : 3;
  const overflow = slots.length - maxVisible;

  return (
    <div
      className={cn(
        "flex min-h-[48px] cursor-pointer flex-col border-b border-r p-0.5",
        isToday && "bg-blue-50/50",
        isSelected && "ring-1 ring-inset ring-blue-400"
      )}
      onClick={() => onCellClick(contextId, date)}
    >
      {slots.length > 0 && (
        <>
          <UsageMeter
            allocated={totalAllocated}
            used={totalUsed}
            className="mb-0.5"
          />
          <div className="flex flex-col gap-px overflow-hidden">
            {slots.slice(0, maxVisible).map((slot) => (
              <CellSlotEntry
                key={slot.id}
                slot={slot}
                compact={compact}
                onClick={onSlotClick}
              />
            ))}
            {overflow > 0 && (
              <span className="px-1 text-[9px] text-gray-400">
                +{overflow} more
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
