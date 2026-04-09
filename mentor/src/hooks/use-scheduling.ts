import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TimeSlotWithContext } from "@/lib/types/slot";
import { RescheduleResult } from "@/lib/engine/types";

export function useScheduleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, slotId }: { taskId: number; slotId: number }) => {
      const res = await fetch(`/api/tasks/${taskId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      if (!res.ok) throw new Error("Failed to schedule task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useSuggestSlot() {
  return useMutation({
    mutationFn: async ({ taskId }: { taskId: number }): Promise<TimeSlotWithContext | null> => {
      const res = await fetch("/api/schedule/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error("Failed to suggest slot");
      return res.json();
    },
  });
}

export function useReschedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      mode: string;
      slotId?: number;
      taskIds?: number[];
    }): Promise<RescheduleResult> => {
      const res = await fetch("/api/schedule/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to reschedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
