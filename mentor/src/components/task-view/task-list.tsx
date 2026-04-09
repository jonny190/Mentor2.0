"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTaskStore } from "@/stores/task-store";
import { useFilterStore } from "@/stores/filter-store";
import { useTasks } from "@/hooks/use-tasks";
import { TaskBreadcrumb } from "./task-breadcrumb";
import { TaskTreeItem } from "./task-tree-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskType, TaskWithChildren } from "@/lib/types/task";

type TaskListProps = {
  onEditTask: (task: TaskWithChildren) => void;
  onContextMenu: (e: React.MouseEvent, task: TaskWithChildren) => void;
};

export function TaskList({ onEditTask, onContextMenu }: TaskListProps) {
  const {
    currentParentId,
    selectedTaskId,
    setSelectedTask,
    navigateInto,
    navigateUp,
  } = useTaskStore();
  const { activeFilterId } = useFilterStore();
  const { data: tasks, isLoading } = useTasks(currentParentId, activeFilterId);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback(
    (task: TaskWithChildren) => {
      if (task.type === TaskType.COMPOSITE) {
        navigateInto(task.id, task.description);
      } else {
        onEditTask(task);
      }
    },
    [navigateInto, onEditTask]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !tasks || tasks.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = tasks.findIndex((t) => t.id === selectedTaskId);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex =
            currentIndex < tasks.length - 1 ? currentIndex + 1 : 0;
          setSelectedTask(tasks[nextIndex].id);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : tasks.length - 1;
          setSelectedTask(tasks[prevIndex].id);
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (currentIndex >= 0) {
            const task = tasks[currentIndex];
            if (task.type === TaskType.COMPOSITE) {
              navigateInto(task.id, task.description);
            } else {
              onEditTask(task);
            }
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          navigateUp();
          break;
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [tasks, selectedTaskId, setSelectedTask, navigateInto, navigateUp, onEditTask]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1"
      tabIndex={0}
    >
      <div className="px-4 py-2 border-b">
        <TaskBreadcrumb />
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              {currentParentId
                ? "No sub-tasks found. Add a task to get started."
                : "No tasks found. Create your first task to get started."}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {tasks.map((task) => (
              <TaskTreeItem
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onSelect={() => setSelectedTask(task.id)}
                onDoubleClick={() => handleDoubleClick(task)}
                onContextMenu={(e) => onContextMenu(e, task)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
