"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type TaskNotesEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number | null;
  taskDescription: string;
  initialNotes: string;
};

export function TaskNotesEditor({
  open,
  onOpenChange,
  taskId,
  taskDescription,
  initialNotes,
}: TaskNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes(initialNotes);
    }
  }, [open, initialNotes]);

  const hasChanged = notes !== initialNotes;

  const handleSave = async () => {
    if (!taskId || !hasChanged) return;

    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanged) {
      handleSave();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen && hasChanged) {
        handleSave();
      } else {
        onOpenChange(isOpen);
      }
    }}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Notes: {taskDescription}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 px-4">
          <Textarea
            className="h-full min-h-[300px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
          />
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNotes(initialNotes);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={saving || !hasChanged}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
