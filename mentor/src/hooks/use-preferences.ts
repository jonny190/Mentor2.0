import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPrefs } from "@/lib/types/preferences";

export function usePreferences() {
  return useQuery<UserPrefs>({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await fetch("/api/preferences");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<UserPrefs>) => {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["preferences"] });
      const previous = queryClient.getQueryData<UserPrefs>(["preferences"]);
      if (previous) {
        queryClient.setQueryData<UserPrefs>(["preferences"], {
          ...previous,
          ...data,
        });
      }
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["preferences"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });
}
