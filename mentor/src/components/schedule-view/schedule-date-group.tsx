"use client";

import { Badge } from "@/components/ui/badge";
import { ContextSymbol } from "@/components/shared/context-symbol";
import { TimeSlotWithContext, formatMinutes } from "@/lib/types/slot";
import { TaskSizeLabels, TaskStatusLabels } from "@/lib/types/task";
import { cn } from "@/lib/utils";

type ScheduleDateGroupProps = {
  date: string;
  slots: TimeSlotWithContext[];
  isToday: boolean;
  onSlotClick: (slot: TimeSlotWithContext, e?: React.MouseEvent) => void;
  onTaskClick: (taskId: number) => void;
};

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function ScheduleDateGroup({
  date,
  slots,
  isToday,
  onSlotClick,
  onTaskClick,
}: ScheduleDateGroupProps) {
  return (
    <div className="mb-4">
      <div
        className={cn(
          "sticky top-0 z-10 px-3 py-1.5 text-sm font-semibold",
          isToday
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {formatDateHeader(date)}
      </div>

      {slots.length === 0 ? (
        <p className="text-muted-foreground px-3 py-2 text-sm">
          No slots scheduled
        </p>
      ) : (
        <div className="space-y-1 py-1">
          {slots.map((slot) => (
            <div key={slot.id} className="px-3">
              <button
                className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                onClick={(e) => onSlotClick(slot, e)}
                onContextMenu={(e) => { e.preventDefault(); onSlotClick(slot, e); }}
              >
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {formatMinutes(slot.startMinutes)} - {formatMinutes(slot.endMinutes)}
                </span>
                {slot.description && (
                  <span className="truncate">{slot.description}</span>
                )}
                {slot.context && (
                  <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                    <ContextSymbol icon={slot.context.symbolIcon} className="size-3" />
                    {slot.context.name}
                  </Badge>
                )}
                {slot.taskAssignments.length > 0 && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {slot.taskAssignments.length} task
                    {slot.taskAssignments.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </button>

              {slot.taskAssignments.length > 0 && (
                <div className="ml-6 space-y-0.5 pb-1">
                  {slot.taskAssignments.map((ta) => (
                    <button
                      key={ta.id}
                      className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(ta.task.id);
                      }}
                    >
                      <span className="truncate">{ta.task.description}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {TaskStatusLabels[ta.task.status] || "Unknown"}
                      </Badge>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {TaskSizeLabels[ta.task.size] || "?"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
