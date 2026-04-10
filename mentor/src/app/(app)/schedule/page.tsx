"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { FilterBar } from "@/components/shared/filter-bar";
import { DateNavigator } from "@/components/schedule-view/date-navigator";
import { ScheduleList } from "@/components/schedule-view/schedule-list";
import { SlotEditorDialog } from "@/components/schedule-view/slot-editor-dialog";
import { RepeatPatternDialog } from "@/components/role-view/repeat-pattern-dialog";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { useDeleteSlot, useCompleteSlot } from "@/hooks/use-slots";
import { useReschedule } from "@/hooks/use-scheduling";
import { useScheduleStore } from "@/stores/schedule-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { TimeSlotWithContext } from "@/lib/types/slot";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const router = useRouter();
  const { currentDate, goToToday } = useScheduleStore();
  const reschedule = useReschedule();
  const deleteSlot = useDeleteSlot();
  const completeSlot = useCompleteSlot();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlotWithContext | null>(null);
  const [slotMenu, setSlotMenu] = useState<{ slot: TimeSlotWithContext; x: number; y: number } | null>(null);
  const [repeatSlot, setRepeatSlot] = useState<{ id: number; date: string } | null>(null);

  const handleNewSlot = () => {
    setEditingSlot(null);
    setEditorOpen(true);
  };

  const handleSlotClick = (slot: TimeSlotWithContext, e?: React.MouseEvent) => {
    // Show action menu at click coords (works for left AND right click)
    const x = e?.clientX ?? window.innerWidth / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    setSlotMenu({ slot, x, y });
  };

  const handleTaskClick = (taskId: number) => {
    router.push("/tasks");
  };

  const shortcuts = useMemo(
    () => ({
      "ctrl+n": () => handleNewSlot(),
      " ": () => goToToday(),
    }),
    [goToToday]
  );
  useKeyboardShortcuts(shortcuts);

  const defaultDate = currentDate.toISOString().slice(0, 10);

  return (
    <div className="flex h-full flex-col gap-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleNewSlot}>
          <Plus className="mr-1 h-4 w-4" />
          New Slot
        </Button>
        <FilterBar />
        <div className="flex-1" />
        <DateNavigator />
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reschedule.mutate({ mode: "full" })}
            disabled={reschedule.isPending}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            {reschedule.isPending ? "Rescheduling..." : "Reschedule All"}
          </Button>
          <InfoTooltip>
            Assigns all unscheduled active tasks to available time slots based on context and capacity. Click a slot to set a repeat pattern (daily, weekly, monthly).
          </InfoTooltip>
        </div>
      </div>

      <ScheduleList onSlotClick={handleSlotClick} onTaskClick={handleTaskClick} />

      {/* Slot action menu */}
      {slotMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setSlotMenu(null)}
        >
          <div
            className="fixed z-50 min-w-48 rounded-lg border bg-popover p-1 shadow-lg"
            style={{ left: slotMenu.x, top: slotMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground truncate">
              {slotMenu.slot.description || "Time Slot"}
            </p>
            <div className="my-1 h-px bg-border" />
            <button
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => { setEditingSlot(slotMenu.slot); setEditorOpen(true); setSlotMenu(null); }}
            >
              Edit Slot
            </button>
            <button
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setRepeatSlot({
                  id: slotMenu.slot.id,
                  date: slotMenu.slot.dateScheduled.slice(0, 10),
                });
                setSlotMenu(null);
              }}
            >
              Set Repeat
            </button>
            <button
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => { completeSlot.mutate({ id: slotMenu.slot.id, rescheduleMode: "this-slot" }); setSlotMenu(null); }}
            >
              Complete Slot
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Delete this time slot?")) {
                  deleteSlot.mutate(slotMenu.slot.id);
                }
                setSlotMenu(null);
              }}
            >
              Delete Slot
            </button>
          </div>
        </div>
      )}

      <SlotEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        slot={editingSlot}
        defaultDate={defaultDate}
      />

      <RepeatPatternDialog
        open={repeatSlot !== null}
        onOpenChange={(open) => { if (!open) setRepeatSlot(null); }}
        slotId={repeatSlot?.id ?? null}
        slotDate={repeatSlot?.date ?? ""}
      />
    </div>
  );
}
