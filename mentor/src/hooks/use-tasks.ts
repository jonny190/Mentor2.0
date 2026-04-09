import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskWithChildren } from "@/lib/types/task";

export function useTasks(parentId: number | null, filterId: number | null) {
  return useQuery<TaskWithChildren[]>({
    queryKey: ["tasks", parentId, filterId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (parentId !== null) params.set("parentId", String(parentId));
      if (filterId !== null) params.set("filterId", String(filterId));
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });
}

export function useTask(taskId: number | null) {
  return useQuery<TaskWithChildren>({
    queryKey: ["tasks", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
    enabled: taskId !== null,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TaskWithChildren>) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<TaskWithChildren>) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useToggleBold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/${id}/bold`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to toggle bold");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to change status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useSearchTasks() {
  return useMutation({
    mutationFn: async ({ q, notes }: { q: string; notes?: boolean }): Promise<TaskWithChildren[]> => {
      const params = new URLSearchParams({ q });
      if (notes !== undefined) params.set("notes", String(notes));
      const res = await fetch(`/api/tasks/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to search tasks");
      return res.json();
    },
  });
}

export function useCopyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetParentId }: { id: number; targetParentId: number | null }) => {
      const res = await fetch(`/api/tasks/${id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetParentId }),
      });
      if (!res.ok) throw new Error("Failed to copy task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetParentId }: { id: number; targetParentId: number | null }) => {
      const res = await fetch(`/api/tasks/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetParentId }),
      });
      if (!res.ok) throw new Error("Failed to move task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
