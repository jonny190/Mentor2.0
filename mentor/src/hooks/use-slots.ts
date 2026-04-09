import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TimeSlotWithContext } from "@/lib/types/slot";

export function useSlots(from: string, to: string) {
  return useQuery<TimeSlotWithContext[]>({
    queryKey: ["slots", from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/slots?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch slots");
      return res.json();
    },
    enabled: !!from && !!to,
  });
}

export function useCreateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      contextId?: number | null;
      dateScheduled: string;
      startMinutes: number;
      endMinutes: number;
      description?: string;
    }) => {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useUpdateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number;
      contextId?: number | null;
      dateScheduled?: string;
      startMinutes?: number;
      endMinutes?: number;
      description?: string;
    }) => {
      const res = await fetch(`/api/slots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useDeleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/slots/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useCompleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rescheduleMode = "this-slot" }: { id: number; rescheduleMode?: string }) => {
      const res = await fetch(`/api/slots/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescheduleMode }),
      });
      if (!res.ok) throw new Error("Failed to complete slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
