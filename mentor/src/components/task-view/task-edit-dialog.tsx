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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContextPicker } from "@/components/shared/context-picker";
import { useCreateTask, useUpdateTask } from "@/hooks/use-tasks";
import { useUiStore } from "@/stores/ui-store";
import { TaskWithChildren, TaskSizeLabels, TaskStatusLabels } from "@/lib/types/task";

const importanceLabels: Record<string, string> = {
  "0": "None", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5",
};
const sizeValueToLabel = Object.fromEntries(
  Object.entries(TaskSizeLabels).map(([k, v]) => [k, v])
);
const sizeLabelToValue = Object.fromEntries(
  Object.entries(TaskSizeLabels).map(([k, v]) => [v, k])
);

type TaskEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithChildren | null;
  parentId: number | null;
};

export function TaskEditDialog({
  open,
  onOpenChange,
  task,
  parentId,
}: TaskEditDialogProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const pushUndo = useUiStore((s) => s.pushUndo);

  const [description, setDescription] = useState("");
  const [contextId, setContextId] = useState<number | null>(null);
  const [importance, setImportance] = useState("None");
  const [urgency, setUrgency] = useState("None");
  const [size, setSize] = useState("Undefined");
  const [sizeCustom, setSizeCustom] = useState("");
  const [dateDue, setDateDue] = useState("");

  useEffect(() => {
    if (open) {
      if (task) {
        setDescription(task.description);
        setContextId(task.contextId);
        setImportance(importanceLabels[String(task.importance)] ?? "None");
        setUrgency(importanceLabels[String(task.urgency)] ?? "None");
        setSize(sizeValueToLabel[String(task.size)] ?? "Undefined");
        setSizeCustom(task.sizeCustom ? String(task.sizeCustom) : "");
        setDateDue(task.dateDue ? task.dateDue.split("T")[0] : "");
      } else {
        setDescription("");
        setContextId(null);
        setImportance("None");
        setUrgency("None");
        setSize("Undefined");
        setSizeCustom("");
        setDateDue("");
      }
    }
  }, [open, task]);

  const isEditing = task !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const payload = {
      description: description.trim(),
      contextId,
      importance: importance === "None" ? 0 : Number(importance),
      urgency: urgency === "None" ? 0 : Number(urgency),
      size: Number(sizeLabelToValue[size] ?? 0),
      sizeCustom: size === "Custom" && sizeCustom ? Number(sizeCustom) : null,
      dateDue: dateDue || null,
    };

    if (isEditing) {
      const previousData = {
        description: task.description,
        contextId: task.contextId,
        importance: task.importance,
        urgency: task.urgency,
        size: task.size,
        dateDue: task.dateDue,
      };

      await updateTask.mutateAsync({ id: task.id, ...payload });

      pushUndo({
        description: `Edit task "${task.description}"`,
        undo: async () => {
          await updateTask.mutateAsync({ id: task.id, ...previousData });
        },
        redo: async () => {
          await updateTask.mutateAsync({ id: task.id, ...payload });
        },
      });
    } else {
      await createTask.mutateAsync({
        ...payload,
        parentId,
      } as Partial<TaskWithChildren>);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Context</Label>
            <ContextPicker value={contextId} onChange={setContextId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Importance</Label>
              <Select value={importance} onValueChange={(val) => { if (val !== null) setImportance(val); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(importanceLabels).map(([, label]) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={(val) => { if (val !== null) setUrgency(val); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(importanceLabels).map(([, label]) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Size</Label>
              <Select value={size} onValueChange={(val) => { if (val !== null) setSize(val); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TaskSizeLabels).map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {size === "Custom" && (
              <div className="flex flex-col gap-1.5">
                <Label>Custom (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 45"
                  value={sizeCustom}
                  onChange={(e) => setSizeCustom(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dateDue">Due Date</Label>
            <Input
              id="dateDue"
              type="date"
              value={dateDue}
              onChange={(e) => setDateDue(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!description.trim()}>
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
