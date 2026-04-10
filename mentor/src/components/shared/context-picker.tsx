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

const NONE_LABEL = "No context";

export function ContextPicker({ value, onChange }: ContextPickerProps) {
  const { data: contexts } = useContexts();

  // Build lookup maps between name and id so base-ui Select shows the
  // label in the trigger (base-ui displays the `value` prop as-is).
  const selected = value !== null
    ? contexts?.find((c) => c.id === value)?.name ?? NONE_LABEL
    : NONE_LABEL;

  return (
    <Select
      value={selected}
      onValueChange={(val) => {
        if (val === null) return;
        if (val === NONE_LABEL) {
          onChange(null);
          return;
        }
        const match = contexts?.find((c) => c.name === val);
        onChange(match ? match.id : null);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select context" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_LABEL}>{NONE_LABEL}</SelectItem>
        {contexts?.map((ctx) => (
          <SelectItem key={ctx.id} value={ctx.name}>
            {ctx.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
