"use client";

import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/types/slot";
import type { TimeSlotWithContext } from "@/lib/types/slot";

type CellSlotEntryProps = {
  slot: TimeSlotWithContext;
  compact: boolean;
  onClick: (slot: TimeSlotWithContext) => void;
};

export function CellSlotEntry({ slot, compact, onClick }: CellSlotEntryProps) {
  const taskCount = slot.taskAssignments.length;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(slot);
      }}
      className={cn(
        "w-full truncate rounded px-1 text-left text-[10px] leading-tight hover:bg-blue-50",
        slot.taskAssignments.every((a) => a.task.status === 1) && "opacity-50"
      )}
      title={`${formatMinutes(slot.startMinutes)}-${formatMinutes(slot.endMinutes)} ${slot.description || ""} (${taskCount} tasks)`}
    >
      {compact ? (
        <span className="truncate">{slot.description || `${taskCount}t`}</span>
      ) : (
        <span className="flex items-center gap-0.5">
          <span className="shrink-0 text-gray-400">
            {formatMinutes(slot.startMinutes)}
          </span>
          <span className="truncate">
            {slot.description ||
              `${taskCount} task${taskCount !== 1 ? "s" : ""}`}
          </span>
        </span>
      )}
    </button>
  );
}
