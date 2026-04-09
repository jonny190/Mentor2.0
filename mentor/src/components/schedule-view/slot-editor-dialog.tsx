"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContextPicker } from "@/components/shared/context-picker";
import { TimeSlotWithContext, formatMinutes } from "@/lib/types/slot";
import { useCreateSlot, useUpdateSlot } from "@/hooks/use-slots";

type SlotEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: TimeSlotWithContext | null;
  defaultDate?: string;
  defaultContextId?: number | null;
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SlotEditorDialog({
  open,
  onOpenChange,
  slot,
  defaultDate,
  defaultContextId,
}: SlotEditorDialogProps) {
  const [contextId, setContextId] = useState<number | null>(defaultContextId ?? null);
  const [date, setDate] = useState(defaultDate || todayString());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [description, setDescription] = useState("");

  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();

  const isEditing = slot !== null;

  useEffect(() => {
    if (slot) {
      setContextId(slot.contextId);
      setDate(slot.dateScheduled);
      setStartTime(minutesToTime(slot.startMinutes));
      setEndTime(minutesToTime(slot.endMinutes));
      setDescription(slot.description || "");
    } else {
      setContextId(defaultContextId ?? null);
      setDate(defaultDate || todayString());
      setStartTime("09:00");
      setEndTime("17:00");
      setDescription("");
    }
  }, [slot, defaultDate, defaultContextId, open]);

  const handleSave = async () => {
    const payload = {
      contextId,
      dateScheduled: date,
      startMinutes: timeToMinutes(startTime),
      endMinutes: timeToMinutes(endTime),
      description,
    };

    if (isEditing) {
      await updateSlot.mutateAsync({ id: slot.id, ...payload });
    } else {
      await createSlot.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createSlot.isPending || updateSlot.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Slot" : "New Slot"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Context</Label>
            <ContextPicker value={contextId} onChange={setContextId} />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Slot description"
            />
          </div>

          {isEditing && slot.taskAssignments.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {slot.taskAssignments.length} task{slot.taskAssignments.length !== 1 ? "s" : ""} assigned
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
