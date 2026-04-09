"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskWithChildren, TaskStatus, TaskSizeLabels } from "@/lib/types/task";
import { formatMinutes } from "@/lib/types/slot";
import { useScheduleTask, useSuggestSlot } from "@/hooks/use-scheduling";
import { useChangeStatus } from "@/hooks/use-tasks";
import { TimeSlotWithContext } from "@/lib/types/slot";

type InterventionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithChildren | null;
  reason?: string;
};

const RESCHEDULE_OPTIONS = [
  { label: "Same date", days: 0 },
  { label: "+1 day", days: 1 },
  { label: "+2 days", days: 2 },
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+2 weeks", days: 14 },
  { label: "+1 month", days: 30 },
];

export function InterventionDialog({
  open,
  onOpenChange,
  task,
  reason,
}: InterventionDialogProps) {
  const [selectedDays, setSelectedDays] = useState(0);
  const [suggestedSlot, setSuggestedSlot] = useState<TimeSlotWithContext | null>(null);

  const scheduleTask = useScheduleTask();
  const suggestSlot = useSuggestSlot();
  const changeStatus = useChangeStatus();

  if (!task) return null;

  const handleSuggest = async () => {
    const result = await suggestSlot.mutateAsync({ taskId: task.id });
    setSuggestedSlot(result);
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestedSlot) return;
    await scheduleTask.mutateAsync({ taskId: task.id, slotId: suggestedSlot.id });
    setSuggestedSlot(null);
    onOpenChange(false);
  };

  const handleDone = async () => {
    await changeStatus.mutateAsync({ id: task.id, status: TaskStatus.DONE });
    onOpenChange(false);
  };

  const handleDropped = async () => {
    await changeStatus.mutateAsync({ id: task.id, status: TaskStatus.DROPPED });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSuggestedSlot(null);
    setSelectedDays(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scheduling Intervention</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
            {reason || "No time slot available as scheduled"}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">{task.description}</p>
            <div className="flex gap-2">
              <Badge variant="outline">{TaskSizeLabels[task.size] || "Unknown"}</Badge>
              {task.context && (
                <Badge variant="secondary">{task.context.name}</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Reschedule to:</p>
            <div className="flex flex-wrap gap-1">
              {RESCHEDULE_OPTIONS.map((opt) => (
                <Button
                  key={opt.days}
                  variant={selectedDays === opt.days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDays(opt.days)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {suggestedSlot && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm">
              <p className="font-medium">Suggested slot:</p>
              <p>
                {suggestedSlot.dateScheduled} {formatMinutes(suggestedSlot.startMinutes)}
                {" - "}
                {formatMinutes(suggestedSlot.endMinutes)}
                {suggestedSlot.description && ` - ${suggestedSlot.description}`}
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={handleAcceptSuggestion}
                disabled={scheduleTask.isPending}
              >
                Accept
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggest}
            disabled={suggestSlot.isPending}
          >
            {suggestSlot.isPending ? "Suggesting..." : "Suggest"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDone}
            disabled={changeStatus.isPending}
          >
            Done
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDropped}
            disabled={changeStatus.isPending}
          >
            Dropped
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
