"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useContexts,
  useCreateContext,
  useUpdateContext,
  useDeleteContext,
} from "@/hooks/use-contexts";
import { ContextIcons, ContextWithChildren } from "@/lib/types/context";

type ContextManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  name: string;
  description: string;
  symbolIcon: string;
};

const emptyForm: FormState = { name: "", description: "", symbolIcon: "structure" };

export function ContextManagerDialog({ open, onOpenChange }: ContextManagerDialogProps) {
  const { data: contexts } = useContexts();
  const createContext = useCreateContext();
  const updateContext = useUpdateContext();
  const deleteContext = useDeleteContext();

  const [editing, setEditing] = useState<ContextWithChildren | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (ctx: ContextWithChildren) => {
    setEditing(ctx);
    setForm({
      name: ctx.name,
      description: ctx.description,
      symbolIcon: ctx.symbolIcon || "structure",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;

    if (editing) {
      updateContext.mutate(
        { id: editing.id, name: form.name, description: form.description, symbolIcon: form.symbolIcon },
        { onSuccess: cancelForm }
      );
    } else {
      createContext.mutate(
        { name: form.name, description: form.description, symbolIcon: form.symbolIcon },
        { onSuccess: cancelForm }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteContext.mutate({ id }, {
      onSuccess: () => setDeleteConfirm(null),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Contexts</DialogTitle>
        </DialogHeader>

        {/* Existing contexts list */}
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {contexts?.map((ctx) => (
            <div
              key={ctx.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{ctx.name}</span>
                {ctx.description && (
                  <span className="text-xs text-muted-foreground">{ctx.description}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => startEdit(ctx)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {deleteConfirm === ctx.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(ctx.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteConfirm(ctx.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {(!contexts || contexts.length === 0) && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No contexts yet. Create one to get started.
            </p>
          )}
        </div>

        {/* Create / Edit form */}
        {showForm ? (
          <div className="space-y-3 rounded-md border p-3">
            <h4 className="text-sm font-medium">
              {editing ? "Edit Context" : "New Context"}
            </h4>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Work, Personal, Health"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select
                value={form.symbolIcon}
                onValueChange={(v) => setForm({ ...form, symbolIcon: v ?? "structure" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ContextIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                {editing ? "Update" : "Create"}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add Context
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
