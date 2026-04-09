"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchTasks } from "@/hooks/use-tasks";
import { TaskWithChildren } from "@/lib/types/task";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTask: (task: TaskWithChildren) => void;
};

export function SearchDialog({
  open,
  onOpenChange,
  onSelectTask,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [includeNotes, setIncludeNotes] = useState(false);
  const searchMutation = useSearchTasks();

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMutation.mutate({ q: query, notes: includeNotes });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelect = (task: TaskWithChildren) => {
    onSelectTask(task);
    onOpenChange(false);
    setQuery("");
    searchMutation.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find Tasks</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={searchMutation.isPending}
          >
            Find
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
            className="rounded border-input"
          />
          Include notes
        </label>

        {searchMutation.data && (
          <div className="max-h-60 overflow-y-auto border rounded-md">
            {searchMutation.data.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">
                No results found
              </p>
            ) : (
              <ul className="py-1">
                {searchMutation.data.map((task) => (
                  <li key={task.id}>
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => handleSelect(task)}
                    >
                      {task.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
