"use client";

import { UserPrefs } from "@/lib/types/preferences";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function SizeSettings({ prefs, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Task Sizes (minutes)
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Minutes</Label>
          <Input
            type="number"
            min={1}
            value={prefs.sizeMinutes}
            onChange={(e) => onChange("sizeMinutes", Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hour</Label>
          <Input
            type="number"
            min={1}
            value={prefs.sizeHour}
            onChange={(e) => onChange("sizeHour", Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Half day</Label>
          <Input
            type="number"
            min={1}
            value={prefs.sizeHalfDay}
            onChange={(e) => onChange("sizeHalfDay", Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Day</Label>
          <Input
            type="number"
            min={1}
            value={prefs.sizeDay}
            onChange={(e) => onChange("sizeDay", Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
