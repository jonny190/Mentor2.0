import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSetRepeatPattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slotId, ...data }: { slotId: number } & Record<string, unknown>) => {
      const res = await fetch(`/api/slots/${slotId}/repeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to set repeat pattern");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
