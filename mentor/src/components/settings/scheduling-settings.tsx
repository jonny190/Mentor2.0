"use client";

import { UserPrefs } from "@/lib/types/preferences";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function SchedulingSettings({ prefs, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Scheduling
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          label="ASAP days"
          value={prefs.asapDays}
          onChange={(v) => onChange("asapDays", v)}
        />
        <NumberField
          label="Soon days"
          value={prefs.soonDays}
          onChange={(v) => onChange("soonDays", v)}
        />
        <NumberField
          label="Sometime days"
          value={prefs.sometimeDays}
          onChange={(v) => onChange("sometimeDays", v)}
        />
        <NumberField
          label="Suggest ahead days"
          value={prefs.suggestAheadDays}
          onChange={(v) => onChange("suggestAheadDays", v)}
        />
        <NumberField
          label="Scan ahead days"
          value={prefs.scanAheadDays}
          onChange={(v) => onChange("scanAheadDays", v)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.autoSchedule}
            onChange={(e) => onChange("autoSchedule", e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Auto schedule
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.incrementalReschedule}
            onChange={(e) => onChange("incrementalReschedule", e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Incremental reschedule
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.fullDay}
            onChange={(e) => onChange("fullDay", e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Full day
        </label>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
