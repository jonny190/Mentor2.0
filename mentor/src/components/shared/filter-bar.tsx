"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/hooks/use-filters";
import { useFilterStore } from "@/stores/filter-store";

export function FilterBar() {
  const { data: filters } = useFilters();
  const { activeFilterId, setActiveFilter } = useFilterStore();

  return (
    <Select
      value={activeFilterId === null ? "all" : String(activeFilterId)}
      onValueChange={(val) => {
        setActiveFilter(val === "all" ? null : Number(val));
      }}
    >
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All tasks</SelectItem>
        {filters?.map((filter) => (
          <SelectItem key={filter.id} value={String(filter.id)}>
            {filter.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
