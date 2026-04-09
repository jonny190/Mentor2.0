import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FilterData } from "@/lib/types/filter";

export function useFilters() {
  return useQuery<FilterData[]>({
    queryKey: ["filters"],
    queryFn: async () => {
      const res = await fetch("/api/filters");
      if (!res.ok) throw new Error("Failed to fetch filters");
      return res.json();
    },
  });
}

export function useCreateFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<FilterData>) => {
      const res = await fetch("/api/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create filter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}

export function useUpdateFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<FilterData>) => {
      const res = await fetch(`/api/filters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update filter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}

export function useDeleteFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/filters/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete filter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}
