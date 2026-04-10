"use client";

import { useMemo, useState, useCallback } from "react";
import { Plus, Search, Undo2, Redo2, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TaskList } from "@/components/task-view/task-list";
import { TaskEditDialog } from "@/components/task-view/task-edit-dialog";
import { TaskNotesEditor } from "@/components/task-view/task-notes-editor";
import { FilterBar } from "@/components/shared/filter-bar";
import { SearchDialog } from "@/components/shared/search-dialog";
import { useTaskStore } from "@/stores/task-store";
import { useUiStore } from "@/stores/ui-store";
import {
  useToggleBold,
  useChangeStatus,
  useDeleteTask,
  useCopyTask,
  useMoveTask,
} from "@/hooks/use-tasks";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { TaskStatus, TaskType, TaskWithChildren } from "@/lib/types/task";
import { InterventionDialog } from "@/components/shared/intervention-dialog";

type ClipboardState = {
  id: number;
  mode: "cut" | "copy";
} | null;

export default function TasksPage() {
  const { currentParentId } = useTaskStore();
  const { undo, redo, canUndo, canRedo } = useUiStore();

  const [editingTask, setEditingTask] = useState<TaskWithChildren | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardState>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    task: TaskWithChildren;
    x: number;
    y: number;
  } | null>(null);

  // Delete confirm dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<TaskWithChildren | null>(
    null
  );

  const [interventionTask, setInterventionTask] = useState<TaskWithChildren | null>(null);
  const [notesTask, setNotesTask] = useState<TaskWithChildren | null>(null);

  const toggleBold = useToggleBold();
  const changeStatus = useChangeStatus();
  const deleteTask = useDeleteTask();
  const copyTask = useCopyTask();
  const moveTask = useMoveTask();

  const handleEditTask = (task: TaskWithChildren) => {
    setEditingTask(task);
    setShowDialog(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setShowDialog(true);
  };

  const handleContextMenu = (e: React.MouseEvent, task: TaskWithChildren) => {
    e.preventDefault();
    setContextMenu({ task, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    if (clipboard.mode === "copy") {
      copyTask.mutate({
        id: clipboard.id,
        targetParentId: currentParentId,
      });
    } else {
      moveTask.mutate({
        id: clipboard.id,
        targetParentId: currentParentId,
      });
      setClipboard(null);
    }
  }, [clipboard, currentParentId, copyTask, moveTask]);

  const handleDelete = (task: TaskWithChildren) => {
    if (task.type === TaskType.COMPOSITE && task.children.length > 0) {
      setDeleteConfirm(task);
    } else {
      deleteTask.mutate(task.id);
    }
    closeContextMenu();
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteTask.mutate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleSearchSelect = (task: TaskWithChildren) => {
    handleEditTask(task);
  };

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () => ({
      "ctrl+n": () => handleNewTask(),
      "ctrl+f": () => setSearchOpen(true),
      "ctrl+z": () => undo(),
      "ctrl+shift+z": () => redo(),
    }),
    [undo, redo]
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex flex-col flex-1">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 border-b">
        <Button onClick={handleNewTask} size="sm">
          <Plus className="size-4 mr-1" />
          New Task
        </Button>

        <FilterBar />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-4 mr-1" />
          Find
        </Button>

        {clipboard && (
          <Button variant="outline" size="sm" onClick={handlePaste}>
            <ClipboardPaste className="size-4 mr-1" />
            Paste
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => undo()}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => redo()}
            disabled={!canRedo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-4" />
          </Button>
        </div>
      </div>

      <TaskList onEditTask={handleEditTask} onContextMenu={handleContextMenu} />

      <TaskEditDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        task={editingTask}
        parentId={currentParentId}
      />

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectTask={handleSearchSelect}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
          onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
        >
          <div
            className="fixed z-50 min-w-48 rounded-lg border bg-popover p-1 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: "Edit", action: () => { handleEditTask(contextMenu.task); closeContextMenu(); } },
              { label: "Notes", action: () => { setNotesTask(contextMenu.task); closeContextMenu(); } },
              { label: "Schedule", action: () => { setInterventionTask(contextMenu.task); closeContextMenu(); } },
              null,
              { label: "Toggle Bold", action: () => { toggleBold.mutate(contextMenu.task.id); closeContextMenu(); } },
              null,
              { label: "Cut", action: () => { setClipboard({ id: contextMenu.task.id, mode: "cut" }); closeContextMenu(); } },
              { label: "Copy", action: () => { setClipboard({ id: contextMenu.task.id, mode: "copy" }); closeContextMenu(); } },
              null,
              { label: "Mark Done", action: () => { changeStatus.mutate({ id: contextMenu.task.id, status: TaskStatus.DONE }); closeContextMenu(); } },
              { label: "Mark Dropped", action: () => { changeStatus.mutate({ id: contextMenu.task.id, status: TaskStatus.DROPPED }); closeContextMenu(); } },
              { label: "Mark Deferred", action: () => { changeStatus.mutate({ id: contextMenu.task.id, status: TaskStatus.DEFERRED }); closeContextMenu(); } },
              { label: "Mark Delegated", action: () => { changeStatus.mutate({ id: contextMenu.task.id, status: TaskStatus.DELEGATED }); closeContextMenu(); } },
              null,
              { label: "Delete", action: () => handleDelete(contextMenu.task), destructive: true },
            ].map((item, i) =>
              item === null ? (
                <div key={`sep-${i}`} className="my-1 h-px bg-border" />
              ) : (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                    (item as { destructive?: boolean }).destructive && "text-destructive hover:bg-destructive/10"
                  )}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This task has {deleteConfirm?.children.length ?? 0} sub-task(s).
            Deleting it will also remove all sub-tasks. Are you sure?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InterventionDialog
        open={interventionTask !== null}
        onOpenChange={(open) => { if (!open) setInterventionTask(null); }}
        task={interventionTask}
      />

      <TaskNotesEditor
        open={notesTask !== null}
        onOpenChange={(open) => { if (!open) setNotesTask(null); }}
        taskId={notesTask?.id ?? null}
        taskDescription={notesTask?.description ?? ""}
        initialNotes={notesTask?.notes ?? ""}
      />
    </div>
  );
}
