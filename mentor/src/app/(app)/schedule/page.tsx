"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { FilterBar } from "@/components/shared/filter-bar";
import { DateNavigator } from "@/components/schedule-view/date-navigator";
import { ScheduleList } from "@/components/schedule-view/schedule-list";
import { SlotEditorDialog } from "@/components/schedule-view/slot-editor-dialog";
import { useDeleteSlot, useCompleteSlot } from "@/hooks/use-slots";
import { useReschedule } from "@/hooks/use-scheduling";
import { useScheduleStore } from "@/stores/schedule-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { TimeSlotWithContext } from "@/lib/types/slot";

export default function SchedulePage() {
  const router = useRouter();
  const { currentDate, goToToday } = useScheduleStore();
  const reschedule = useReschedule();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlotWithContext | null>(null);

  const handleNewSlot = () => {
    setEditingSlot(null);
    setEditorOpen(true);
  };

  const handleSlotClick = (slot: TimeSlotWithContext) => {
    setEditingSlot(slot);
    setEditorOpen(true);
  };

  const handleTaskClick = (taskId: number) => {
    router.push("/tasks");
  };

  const handleRescheduleAll = () => {
    reschedule.mutate({ mode: "full" });
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
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleNewSlot}>
          <Plus className="mr-1 h-4 w-4" />
          New Slot
        </Button>
        <FilterBar />
        <div className="flex-1" />
        <DateNavigator />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRescheduleAll}
          disabled={reschedule.isPending}
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          {reschedule.isPending ? "Rescheduling..." : "Reschedule All"}
        </Button>
      </div>

      <ScheduleList onSlotClick={handleSlotClick} onTaskClick={handleTaskClick} />

      <SlotEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        slot={editingSlot}
        defaultDate={defaultDate}
      />
    </div>
  );
}
