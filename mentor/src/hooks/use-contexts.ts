import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ContextWithChildren } from "@/lib/types/context";

export function useContexts() {
  return useQuery<ContextWithChildren[]>({
    queryKey: ["contexts"],
    queryFn: async () => {
      const res = await fetch("/api/contexts");
      if (!res.ok) throw new Error("Failed to fetch contexts");
      return res.json();
    },
  });
}

export function useCreateContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ContextWithChildren>) => {
      const res = await fetch("/api/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create context");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contexts"] });
    },
  });
}

export function useUpdateContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<ContextWithChildren>) => {
      const res = await fetch(`/api/contexts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update context");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contexts"] });
    },
  });
}

export function useDeleteContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remapTo }: { id: number; remapTo?: number }) => {
      const params = remapTo !== undefined ? `?remapTo=${remapTo}` : "";
      const res = await fetch(`/api/contexts/${id}${params}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete context");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contexts"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
