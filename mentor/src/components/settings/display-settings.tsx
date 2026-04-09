"use client";

import { UserPrefs } from "@/lib/types/preferences";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function DisplaySettings({ prefs, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Display
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Zoom</Label>
          <Select value={prefs.zoom} onValueChange={(v) => onChange("zoom", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Role View Rows</Label>
          <Select
            value={String(prefs.rvRows)}
            onValueChange={(v) => onChange("rvRows", Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 week</SelectItem>
              <SelectItem value="2">2 weeks</SelectItem>
              <SelectItem value="3">3 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Cursor Style</Label>
          <Select
            value={prefs.cursorStyle}
            onValueChange={(v) => onChange("cursorStyle", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="highlight">Highlight</SelectItem>
              <SelectItem value="underline">Underline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CheckboxRow
          label="Path in header"
          checked={prefs.pathInHeader}
          onChange={(v) => onChange("pathInHeader", v)}
        />
        <CheckboxRow
          label="Path in tasks"
          checked={prefs.pathInTasks}
          onChange={(v) => onChange("pathInTasks", v)}
        />
        <CheckboxRow
          label="Indent goals"
          checked={prefs.indentGoals}
          onChange={(v) => onChange("indentGoals", v)}
        />
        <CheckboxRow
          label="Due numerals"
          checked={prefs.dueNumerals}
          onChange={(v) => onChange("dueNumerals", v)}
        />
        <CheckboxRow
          label="Toolbar"
          checked={prefs.toolbar}
          onChange={(v) => onChange("toolbar", v)}
        />
        <CheckboxRow
          label="Button bar"
          checked={prefs.buttonBar}
          onChange={(v) => onChange("buttonBar", v)}
        />
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}
