"use client";

import { useRef, useState } from "react";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { DEFAULT_PREFERENCES, UserPrefs } from "@/lib/types/preferences";
import { DisplaySettings } from "@/components/settings/display-settings";
import { SchedulingSettings } from "@/components/settings/scheduling-settings";
import { SizeSettings } from "@/components/settings/size-settings";
import { FilterSettings } from "@/components/settings/filter-settings";
import { ContextManagerDialog } from "@/components/shared/context-manager-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download, Upload, Settings } from "lucide-react";

export default function SettingsPage() {
  const { data: prefs, isLoading } = usePreferences();
  const { mutate: updatePrefs } = useUpdatePreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showContextManager, setShowContextManager] = useState(false);

  if (isLoading || !prefs) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const handleChange = (key: keyof UserPrefs, value: unknown) => {
    updatePrefs({ [key]: value } as Partial<UserPrefs>);
  };

  const handleResetDefaults = () => {
    updatePrefs(DEFAULT_PREFERENCES);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Restore failed: ${err.error ?? "Unknown error"}`);
        return;
      }

      const result = await res.json();
      alert(
        `Restore complete: ${result.counts.contexts} contexts, ${result.counts.tasks} tasks, ${result.counts.slots} slots, ${result.counts.filters} filters`
      );
      window.location.reload();
    } catch {
      alert("Failed to read or restore backup file.");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <h2 className="text-lg font-semibold">Settings</h2>

        <DisplaySettings prefs={prefs} onChange={handleChange} />
        <Separator />

        <SchedulingSettings prefs={prefs} onChange={handleChange} />
        <Separator />

        <SizeSettings prefs={prefs} onChange={handleChange} />
        <Separator />

        <FilterSettings prefs={prefs} onChange={handleChange} />
        <Separator />

        {/* Contexts */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contexts
          </h3>
          <Button variant="outline" onClick={() => setShowContextManager(true)}>
            <Settings data-icon="inline-start" />
            Manage Contexts
          </Button>
        </div>
        <Separator />

        {/* Export */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Export Data
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open("/api/export?format=csv", "_blank")}
            >
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("/api/export?format=json", "_blank")}
            >
              <Download data-icon="inline-start" />
              Export JSON
            </Button>
          </div>
        </div>
        <Separator />

        {/* Backup */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Backup & Restore
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open("/api/backup", "_blank")}
            >
              <Download data-icon="inline-start" />
              Download Backup
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Restore from Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestore}
            />
          </div>
        </div>
        <Separator />

        {/* Reset */}
        <div className="space-y-4">
          <Button variant="destructive" onClick={handleResetDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      <ContextManagerDialog
        open={showContextManager}
        onOpenChange={setShowContextManager}
      />
    </ScrollArea>
  );
}
