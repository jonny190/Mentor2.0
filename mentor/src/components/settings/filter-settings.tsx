"use client";

import { UserPrefs } from "@/lib/types/preferences";

type Props = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function FilterSettings({ prefs, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Default Filters
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.zeroDropped}
            onChange={(e) => onChange("zeroDropped", e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Hide dropped tasks
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.zeroDeferred}
            onChange={(e) => onChange("zeroDeferred", e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Hide deferred tasks
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs.zeroDelegated}
            onChange={(e) => onChange("zeroDelegated", e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Hide delegated tasks
        </label>
      </div>
    </div>
  );
}
