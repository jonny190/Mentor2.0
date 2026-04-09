"use client";

import { useContexts } from "@/hooks/use-contexts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ContextPickerProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

export function ContextPicker({ value, onChange }: ContextPickerProps) {
  const { data: contexts } = useContexts();

  return (
    <Select
      value={value === null ? "none" : String(value)}
      onValueChange={(val) => {
        if (val === null) return;
        onChange(val === "none" ? null : Number(val));
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select context" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No context</SelectItem>
        {contexts?.map((ctx) => (
          <SelectItem key={ctx.id} value={String(ctx.id)}>
            {ctx.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
