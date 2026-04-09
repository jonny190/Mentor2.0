"use client";

import { ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TaskWithChildren,
  TaskType,
  TaskStatus,
  TaskFlags,
  TaskSizeLabels,
  TaskStatusLabels,
} from "@/lib/types/task";

const statusColors: Record<number, string> = {
  [TaskStatus.ACTIVE]: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  [TaskStatus.DONE]: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  [TaskStatus.DROPPED]: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  [TaskStatus.DEFERRED]: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  [TaskStatus.DELEGATED]: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

type TaskTreeItemProps = {
  task: TaskWithChildren;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
};

export function TaskTreeItem({
  task,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: TaskTreeItemProps) {
  const isComposite = task.type === TaskType.COMPOSITE;
  const isBold = (task.flags & TaskFlags.BOLD) !== 0;
  const isCrossedOut = (task.flags & TaskFlags.CROSSED_OUT) !== 0;
  const isDone = task.status === TaskStatus.DONE;
  const hasNotes = task.notes && task.notes.length > 0;
  const childCount = task.children?.length ?? 0;

  const formattedDue = task.dateDue
    ? new Date(task.dateDue).toLocaleDateString()
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/50"
      )}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <span className="w-4 flex-shrink-0 flex items-center justify-center">
        {isComposite ? (
          <ChevronRight className="size-4 text-muted-foreground" />
        ) : null}
      </span>

      <span
        className={cn(
          "flex-1 text-sm truncate",
          isBold && "font-bold",
          (isCrossedOut || isDone) && "line-through text-muted-foreground"
        )}
      >
        {task.description}
      </span>

      {hasNotes && (
        <FileText className="size-3.5 text-muted-foreground flex-shrink-0" />
      )}

      {isComposite && childCount > 0 && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {childCount}
        </span>
      )}

      {task.context && (
        <Badge variant="outline" className="text-xs flex-shrink-0">
          {task.context.name}
        </Badge>
      )}

      {task.size > 0 && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {TaskSizeLabels[task.size]}
        </Badge>
      )}

      {formattedDue && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formattedDue}
        </span>
      )}

      <Badge
        className={cn(
          "text-xs flex-shrink-0 border-transparent",
          statusColors[task.status] ?? ""
        )}
      >
        {TaskStatusLabels[task.status]}
      </Badge>
    </div>
  );
}
