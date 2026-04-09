# Mentor Phase 4: Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add export functionality, full preferences UI, mobile responsiveness, PWA support, and data backup/restore to complete the Mentor application.

**Architecture:** Export and backup use new API routes returning downloadable files. Preferences get a full settings page with grouped controls. Mobile responsiveness uses Tailwind responsive classes on existing components. PWA support via next-pwa for offline caching and installability.

**Tech Stack:** Next.js 16, Prisma 6, TypeScript, Tailwind CSS, shadcn/ui, next-pwa

---

## File Structure

```
src/
  app/
    api/
      export/route.ts                    # GET export (CSV or JSON)
      backup/
        route.ts                         # GET (download) and POST (restore)
    (app)/
      settings/page.tsx                  # Full preferences UI (replace placeholder)
    manifest.ts                          # PWA web manifest (Next.js metadata API)
  components/
    settings/
      display-settings.tsx               # Display preference controls
      scheduling-settings.tsx            # Scheduling preference controls
      size-settings.tsx                  # Size/effort preference controls
      filter-settings.tsx                # Filter display preferences
    shared/
      mobile-nav.tsx                     # Mobile bottom navigation bar
  hooks/
    use-media-query.ts                   # Responsive breakpoint hook
public/
  icons/
    icon-192.png                         # PWA icon 192x192
    icon-512.png                         # PWA icon 512x512
next.config.ts                           # Updated for PWA (withPWA wrapper)
```

---

### Task 1: Export API

**Files:**
- Create: `src/app/api/export/route.ts`

- [ ] **Step 1: Create export route**

Create `src/app/api/export/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    include: {
      context: { select: { id: true, name: true } },
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
  });

  const contexts = await prisma.context.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
  });

  const slots = await prisma.timeSlot.findMany({
    where: { userId: user.id },
    include: {
      context: { select: { id: true, name: true } },
      taskAssignments: { select: { taskId: true } },
    },
    orderBy: { dateScheduled: "asc" },
  });

  const filters = await prisma.filter.findMany({
    where: { userId: user.id },
  });

  if (format === "csv") {
    const lines = [
      "id,parentId,type,description,status,importance,urgency,size,context,dateScheduled,dateDue,notes",
    ];
    for (const task of tasks) {
      const fields = [
        task.id,
        task.parentId ?? "",
        task.type,
        `"${task.description.replace(/"/g, '""')}"`,
        task.status,
        task.importance,
        task.urgency,
        task.size,
        task.context?.name ?? "",
        task.dateScheduled?.toISOString().split("T")[0] ?? "",
        task.dateDue?.toISOString().split("T")[0] ?? "",
        `"${(task.notes || "").replace(/"/g, '""')}"`,
      ];
      lines.push(fields.join(","));
    }
    const csv = lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="mentor-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  const data = { tasks, contexts, slots, filters, exportDate: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mentor-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/export/
git commit -m "feat: add export API with CSV and JSON format support"
```

---

### Task 2: Backup and Restore API

**Files:**
- Create: `src/app/api/backup/route.ts`

- [ ] **Step 1: Create backup/restore route**

Create `src/app/api/backup/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const tasks = await prisma.task.findMany({ where: { userId: user.id } });
  const contexts = await prisma.context.findMany({ where: { userId: user.id } });
  const slots = await prisma.timeSlot.findMany({ where: { userId: user.id } });
  const assignments = await prisma.taskSlotAssignment.findMany({ where: { userId: user.id } });
  const patterns = await prisma.repeatPattern.findMany({ where: { userId: user.id } });
  const filters = await prisma.filter.findMany({ where: { userId: user.id } });
  const prefs = await prisma.userPreferences.findUnique({ where: { userId: user.id } });

  const backup = {
    version: 1,
    date: new Date().toISOString(),
    data: { tasks, contexts, slots, assignments, patterns, filters, preferences: prefs?.prefs ?? {} },
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mentor-backup-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const backup = await request.json();

  if (!backup.version || !backup.data) {
    return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
  }

  const { contexts, tasks, slots, assignments, patterns, filters, preferences } = backup.data;

  // Clear existing data (in dependency order)
  await prisma.repeatPattern.deleteMany({ where: { userId: user.id } });
  await prisma.taskSlotAssignment.deleteMany({ where: { userId: user.id } });
  await prisma.timeSlot.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.filter.deleteMany({ where: { userId: user.id } });
  await prisma.context.deleteMany({ where: { userId: user.id } });

  // Restore contexts first (tasks reference them)
  const contextIdMap = new Map<number, number>();
  for (const ctx of contexts) {
    const oldId = ctx.id;
    const { id, userId, ...data } = ctx;
    const created = await prisma.context.create({
      data: { ...data, parentId: null, userId: user.id },
    });
    contextIdMap.set(oldId, created.id);
  }

  // Fix context parent references
  for (const ctx of contexts) {
    if (ctx.parentId && contextIdMap.has(ctx.parentId)) {
      await prisma.context.update({
        where: { id: contextIdMap.get(ctx.id)! },
        data: { parentId: contextIdMap.get(ctx.parentId)! },
      });
    }
  }

  // Restore tasks (handle hierarchy)
  const taskIdMap = new Map<number, number>();
  // First pass: create root tasks
  for (const task of tasks) {
    if (task.parentId === null) {
      const oldId = task.id;
      const { id, userId, contextId, ...data } = task;
      const created = await prisma.task.create({
        data: {
          ...data,
          contextId: contextId ? (contextIdMap.get(contextId) ?? null) : null,
          userId: user.id,
        },
      });
      taskIdMap.set(oldId, created.id);
    }
  }
  // Second pass: create child tasks
  for (const task of tasks) {
    if (task.parentId !== null) {
      const oldId = task.id;
      const { id, userId, contextId, parentId, ...data } = task;
      const created = await prisma.task.create({
        data: {
          ...data,
          parentId: taskIdMap.get(parentId) ?? null,
          contextId: contextId ? (contextIdMap.get(contextId) ?? null) : null,
          userId: user.id,
        },
      });
      taskIdMap.set(oldId, created.id);
    }
  }

  // Restore slots
  const slotIdMap = new Map<number, number>();
  for (const slot of slots) {
    const oldId = slot.id;
    const { id, userId, contextId, ...data } = slot;
    const created = await prisma.timeSlot.create({
      data: {
        ...data,
        contextId: contextId ? (contextIdMap.get(contextId) ?? null) : null,
        userId: user.id,
      },
    });
    slotIdMap.set(oldId, created.id);
  }

  // Restore assignments
  for (const a of assignments) {
    const newTaskId = taskIdMap.get(a.taskId);
    const newSlotId = slotIdMap.get(a.slotId);
    if (newTaskId && newSlotId) {
      await prisma.taskSlotAssignment.create({
        data: { taskId: newTaskId, slotId: newSlotId, userId: user.id },
      });
    }
  }

  // Restore repeat patterns
  for (const p of patterns) {
    const newSlotId = slotIdMap.get(p.slotId);
    if (newSlotId) {
      const { id, userId, slotId, ...data } = p;
      await prisma.repeatPattern.create({
        data: { ...data, slotId: newSlotId, userId: user.id },
      });
    }
  }

  // Restore filters
  for (const f of filters) {
    const { id, userId, ...data } = f;
    await prisma.filter.create({ data: { ...data, userId: user.id } });
  }

  // Restore preferences
  if (preferences) {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: { prefs: preferences },
      create: { userId: user.id, prefs: preferences },
    });
  }

  return NextResponse.json({
    success: true,
    restored: {
      contexts: contextIdMap.size,
      tasks: taskIdMap.size,
      slots: slotIdMap.size,
      filters: filters.length,
    },
  });
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/backup/
git commit -m "feat: add backup download and restore API with full data migration"
```

---

### Task 3: Settings Page - Preferences UI

**Files:**
- Create: `src/components/settings/display-settings.tsx`
- Create: `src/components/settings/scheduling-settings.tsx`
- Create: `src/components/settings/size-settings.tsx`
- Create: `src/components/settings/filter-settings.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create display settings component**

Create `src/components/settings/display-settings.tsx`:

```typescript
"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserPrefs } from "@/lib/types/preferences";

type DisplaySettingsProps = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function DisplaySettings({ prefs, onChange }: DisplaySettingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Display</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Zoom Level</Label>
          <Select value={prefs.zoom} onValueChange={(v) => onChange("zoom", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Role View Weeks</Label>
          <Select value={String(prefs.rvRows)} onValueChange={(v) => onChange("rvRows", parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 week</SelectItem>
              <SelectItem value="2">2 weeks</SelectItem>
              <SelectItem value="3">3 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Cursor Style</Label>
          <Select value={prefs.cursorStyle} onValueChange={(v) => onChange("cursorStyle", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="highlight">Highlight</SelectItem>
              <SelectItem value="underline">Underline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.pathInHeader} onChange={(e) => onChange("pathInHeader", e.target.checked)} />
          Show hierarchy path in header
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.pathInTasks} onChange={(e) => onChange("pathInTasks", e.target.checked)} />
          Show tree path for tasks
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.indentGoals} onChange={(e) => onChange("indentGoals", e.target.checked)} />
          Indent goals in hierarchy
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.dueNumerals} onChange={(e) => onChange("dueNumerals", e.target.checked)} />
          Show due dates as numbers
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.toolbar} onChange={(e) => onChange("toolbar", e.target.checked)} />
          Show toolbar
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.buttonBar} onChange={(e) => onChange("buttonBar", e.target.checked)} />
          Show button bar
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create scheduling settings**

Create `src/components/settings/scheduling-settings.tsx`:

```typescript
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserPrefs } from "@/lib/types/preferences";

type SchedulingSettingsProps = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function SchedulingSettings({ prefs, onChange }: SchedulingSettingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Scheduling</h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>ASAP (days)</Label>
          <Input type="number" min={1} value={prefs.asapDays} onChange={(e) => onChange("asapDays", parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <Label>Soon (days)</Label>
          <Input type="number" min={1} value={prefs.soonDays} onChange={(e) => onChange("soonDays", parseInt(e.target.value) || 7)} />
        </div>
        <div>
          <Label>Sometime (days)</Label>
          <Input type="number" min={1} value={prefs.sometimeDays} onChange={(e) => onChange("sometimeDays", parseInt(e.target.value) || 30)} />
        </div>
        <div>
          <Label>Suggest ahead (days)</Label>
          <Input type="number" min={1} value={prefs.suggestAheadDays} onChange={(e) => onChange("suggestAheadDays", parseInt(e.target.value) || 90)} />
        </div>
        <div>
          <Label>Scan ahead (days)</Label>
          <Input type="number" min={1} value={prefs.scanAheadDays} onChange={(e) => onChange("scanAheadDays", parseInt(e.target.value) || 30)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.autoSchedule} onChange={(e) => onChange("autoSchedule", e.target.checked)} />
          Auto-schedule new tasks
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.incrementalReschedule} onChange={(e) => onChange("incrementalReschedule", e.target.checked)} />
          Use incremental reschedule (vs full)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.fullDay} onChange={(e) => onChange("fullDay", e.target.checked)} />
          Full day scheduling
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create size settings**

Create `src/components/settings/size-settings.tsx`:

```typescript
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserPrefs } from "@/lib/types/preferences";

type SizeSettingsProps = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function SizeSettings({ prefs, onChange }: SizeSettingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Effort Sizes (minutes)</h3>
      <p className="text-sm text-gray-500">
        Define how many minutes each effort size represents.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Minutes</Label>
          <Input type="number" min={1} value={prefs.sizeMinutes} onChange={(e) => onChange("sizeMinutes", parseInt(e.target.value) || 15)} />
        </div>
        <div>
          <Label>Hour</Label>
          <Input type="number" min={1} value={prefs.sizeHour} onChange={(e) => onChange("sizeHour", parseInt(e.target.value) || 60)} />
        </div>
        <div>
          <Label>Half Day</Label>
          <Input type="number" min={1} value={prefs.sizeHalfDay} onChange={(e) => onChange("sizeHalfDay", parseInt(e.target.value) || 240)} />
        </div>
        <div>
          <Label>Day</Label>
          <Input type="number" min={1} value={prefs.sizeDay} onChange={(e) => onChange("sizeDay", parseInt(e.target.value) || 480)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create filter settings**

Create `src/components/settings/filter-settings.tsx`:

```typescript
"use client";

import type { UserPrefs } from "@/lib/types/preferences";

type FilterSettingsProps = {
  prefs: UserPrefs;
  onChange: (key: keyof UserPrefs, value: unknown) => void;
};

export function FilterSettings({ prefs, onChange }: FilterSettingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Filter Defaults</h3>
      <p className="text-sm text-gray-500">
        Control which task statuses are hidden by default.
      </p>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.zeroDropped} onChange={(e) => onChange("zeroDropped", e.target.checked)} />
          Hide dropped tasks
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.zeroDeferred} onChange={(e) => onChange("zeroDeferred", e.target.checked)} />
          Hide deferred tasks
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.zeroDelegated} onChange={(e) => onChange("zeroDelegated", e.target.checked)} />
          Hide delegated tasks
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace settings page**

Replace `src/app/(app)/settings/page.tsx`:

```typescript
"use client";

import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { DisplaySettings } from "@/components/settings/display-settings";
import { SchedulingSettings } from "@/components/settings/scheduling-settings";
import { SizeSettings } from "@/components/settings/size-settings";
import { FilterSettings } from "@/components/settings/filter-settings";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_PREFERENCES, type UserPrefs } from "@/lib/types/preferences";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";

export default function SettingsPage() {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading || !prefs) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading...</div>;
  }

  function handleChange(key: keyof UserPrefs, value: unknown) {
    updatePrefs.mutate({ [key]: value });
  }

  function handleResetDefaults() {
    if (confirm("Reset all preferences to defaults?")) {
      updatePrefs.mutate(DEFAULT_PREFERENCES);
    }
  }

  async function handleExportCSV() {
    window.open("/api/export?format=csv", "_blank");
  }

  async function handleExportJSON() {
    window.open("/api/export?format=json", "_blank");
  }

  async function handleBackup() {
    window.open("/api/backup", "_blank");
  }

  async function handleRestore() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("This will replace ALL your data. Continue?")) {
      e.target.value = "";
      return;
    }

    const text = await file.text();
    const backup = JSON.parse(text);

    const res = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backup),
    });

    if (res.ok) {
      const result = await res.json();
      alert(`Restored: ${result.restored.tasks} tasks, ${result.restored.contexts} contexts, ${result.restored.slots} slots`);
      window.location.reload();
    } else {
      alert("Restore failed. Check the backup file format.");
    }
    e.target.value = "";
  }

  return (
    <ScrollArea className="h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-2xl space-y-8 p-6">
        <h2 className="text-2xl font-bold">Settings</h2>

        <DisplaySettings prefs={prefs} onChange={handleChange} />
        <Separator />
        <SchedulingSettings prefs={prefs} onChange={handleChange} />
        <Separator />
        <SizeSettings prefs={prefs} onChange={handleChange} />
        <Separator />
        <FilterSettings prefs={prefs} onChange={handleChange} />
        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Export</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="mr-1 h-4 w-4" /> Export JSON
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Backup & Restore</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBackup}>
              <Download className="mr-1 h-4 w-4" /> Download Backup
            </Button>
            <Button variant="outline" size="sm" onClick={handleRestore}>
              <Upload className="mr-1 h-4 w-4" /> Restore from Backup
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelected} />
          </div>
          <p className="text-xs text-gray-500">Restoring replaces all your data with the backup contents.</p>
        </div>

        <Separator />

        <div>
          <Button variant="destructive" size="sm" onClick={handleResetDefaults}>
            Reset All Preferences to Defaults
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 6: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/ src/app/\(app\)/settings/page.tsx
git commit -m "feat: add full settings page with display, scheduling, size, and filter preferences"
```

---

### Task 4: Mobile Responsive Navigation

**Files:**
- Create: `src/hooks/use-media-query.ts`
- Create: `src/components/shared/mobile-nav.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create media query hook**

Create `src/hooks/use-media-query.ts`:

```typescript
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    function listener(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 768px)");
}
```

- [ ] **Step 2: Create mobile bottom nav**

Create `src/components/shared/mobile-nav.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListTodo, Calendar, Grid3X3, Settings } from "lucide-react";

const items = [
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/roles", label: "Roles", icon: Grid3X3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:hidden">
      <div className="flex h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs",
                isActive ? "text-blue-600" : "text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Update app layout to include mobile nav and adjust spacing**

Read `src/app/(app)/layout.tsx` first, then modify it to:
- Add `<MobileNav />` after the `<main>` element
- Add `pb-14 md:pb-0` class to main for mobile bottom nav spacing
- Hide the desktop `<AppNav />` on mobile: add `hidden md:block` class to it (or wrap in a div with that class)

The mobile nav shows at the bottom on screens under 768px. The desktop nav is hidden on mobile.

- [ ] **Step 4: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-media-query.ts src/components/shared/mobile-nav.tsx src/app/\(app\)/layout.tsx
git commit -m "feat: add mobile responsive navigation with bottom tab bar"
```

---

### Task 5: PWA Support

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icons/icon-192.png` (placeholder)
- Create: `public/icons/icon-512.png` (placeholder)

- [ ] **Step 1: Create web manifest**

Create `src/app/manifest.ts`:

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mentor",
    short_name: "Mentor",
    description: "Personal project management and task scheduling",
    start_url: "/tasks",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a2e",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
```

- [ ] **Step 2: Create placeholder PWA icons**

Generate simple SVG-based PNG placeholders for the icons. Create a simple script or use a canvas approach. For now, create minimal valid PNGs.

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
mkdir -p public/icons
# Create minimal placeholder icons using Node.js
node -e "
const fs = require('fs');
// Minimal 1x1 PNG header (will be replaced with real icons later)
// For now, create a simple SVG as the icon source
const svg192 = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"192\" height=\"192\" viewBox=\"0 0 192 192\"><rect width=\"192\" height=\"192\" fill=\"#1a1a2e\" rx=\"24\"/><text x=\"96\" y=\"120\" text-anchor=\"middle\" fill=\"white\" font-size=\"80\" font-family=\"Arial\">M</text></svg>';
const svg512 = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"512\" height=\"512\" viewBox=\"0 0 512 512\"><rect width=\"512\" height=\"512\" fill=\"#1a1a2e\" rx=\"64\"/><text x=\"256\" y=\"320\" text-anchor=\"middle\" fill=\"white\" font-size=\"200\" font-family=\"Arial\">M</text></svg>';
fs.writeFileSync('public/icons/icon-192.svg', svg192);
fs.writeFileSync('public/icons/icon-512.svg', svg512);
"
```

Then update the manifest to use SVG:
```typescript
icons: [
  { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
  { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
],
```

- [ ] **Step 3: Update root layout metadata for PWA**

Read `src/app/layout.tsx` and add to the metadata export:
```typescript
export const metadata: Metadata = {
  title: "Mentor",
  description: "Personal project management and task scheduling",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mentor",
  },
  formatDetection: {
    telephone: false,
  },
};
```

Also add to the `<head>` via the `<html>` element:
```typescript
<meta name="mobile-web-app-capable" content="yes" />
<meta name="theme-color" content="#1a1a2e" />
```

These can go in the metadata export as `other` or via `viewport` export.

- [ ] **Step 4: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/app/manifest.ts public/icons/ src/app/layout.tsx
git commit -m "feat: add PWA manifest and icons for installable web app"
```

---

### Task 6: Enhanced Keyboard Shortcuts

**Files:**
- Modify: `src/app/(app)/tasks/page.tsx`
- Modify: `src/app/(app)/schedule/page.tsx`
- Modify: `src/app/(app)/roles/page.tsx`

- [ ] **Step 1: Read the three view pages**

Read the current tasks, schedule, and roles pages to understand where to add shortcuts.

- [ ] **Step 2: Add keyboard shortcuts to all views**

For each view page, add or enhance the `useKeyboardShortcuts` call. Import from `@/hooks/use-keyboard-shortcuts`.

**Tasks page** should have (some may already exist):
```typescript
useKeyboardShortcuts({
  "ctrl+f": () => setShowSearch(true),
  "ctrl+z": () => undo(),
  "ctrl+shift+z": () => redo(),
  "ctrl+n": () => setShowNewDialog(true),
  "ctrl+b": () => { /* toggle bold on selected */ },
  "ctrl+shift+x": () => { /* mark selected as done */ },
  "ctrl+shift+c": () => { /* mark selected as dropped */ },
});
```

**Schedule page** should have:
```typescript
useKeyboardShortcuts({
  "ctrl+n": () => setShowNewSlot(true),
  " ": () => goToToday(), // space bar
});
```

**Roles page** should have:
```typescript
useKeyboardShortcuts({
  "ctrl+n": () => { setNewSlotDate(""); setNewSlotContextId(null); setShowNewSlot(true); },
  " ": () => goToCurrentWeek(), // space bar
});
```

The exact implementation depends on what state variables exist in each page. Read the pages first, then add the appropriate shortcuts.

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/tasks/page.tsx src/app/\(app\)/schedule/page.tsx src/app/\(app\)/roles/page.tsx
git commit -m "feat: add keyboard shortcuts to all three views"
```

---

### Task 7: Context Management UI

**Files:**
- Create: `src/components/shared/context-manager-dialog.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create context manager dialog**

Create `src/components/shared/context-manager-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContexts, useCreateContext, useUpdateContext, useDeleteContext } from "@/hooks/use-contexts";
import { ContextIcons } from "@/lib/types/context";
import { Pencil, Trash2, Plus } from "lucide-react";

type ContextManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContextManagerDialog({ open, onOpenChange }: ContextManagerDialogProps) {
  const { data: contexts } = useContexts();
  const createContext = useCreateContext();
  const updateContext = useUpdateContext();
  const deleteContext = useDeleteContext();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [symbolIcon, setSymbolIcon] = useState("");
  const [showForm, setShowForm] = useState(false);

  function startCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setSymbolIcon("");
    setShowForm(true);
  }

  function startEdit(ctx: { id: number; name: string; description: string; symbolIcon: string }) {
    setEditingId(ctx.id);
    setName(ctx.name);
    setDescription(ctx.description);
    setSymbolIcon(ctx.symbolIcon);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (editingId) {
      await updateContext.mutateAsync({ id: editingId, name, description, symbolIcon });
    } else {
      await createContext.mutateAsync({ name, description, symbolIcon });
    }
    setShowForm(false);
  }

  async function handleDelete(id: number) {
    if (confirm("Delete this context? Tasks will be unassigned.")) {
      await deleteContext.mutateAsync({ id });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Contexts / Roles</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {contexts?.map((ctx) => (
            <div key={ctx.id} className="flex items-center gap-2 rounded border px-3 py-2">
              <span className="flex-1 text-sm font-medium">{ctx.name}</span>
              <span className="text-xs text-gray-400">{ctx.description}</span>
              <Button size="sm" variant="ghost" onClick={() => startEdit(ctx)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(ctx.id)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          ))}

          {!showForm && (
            <Button variant="outline" size="sm" onClick={startCreate}>
              <Plus className="mr-1 h-4 w-4" /> Add Context
            </Button>
          )}

          {showForm && (
            <div className="space-y-3 rounded border p-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Context name" autoFocus />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div>
                <Label>Icon</Label>
                <Select value={symbolIcon || "none"} onValueChange={(v) => setSymbolIcon(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="No icon" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No icon</SelectItem>
                    {ContextIcons.map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>{editingId ? "Save" : "Create"}</Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add context management to settings page**

Read `src/app/(app)/settings/page.tsx` then add:
- Import ContextManagerDialog
- Add state: `const [showContextManager, setShowContextManager] = useState(false);`
- Add a "Manage Contexts" section before the Export section with a button that opens the dialog
- Add the dialog component to the JSX

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/context-manager-dialog.tsx src/app/\(app\)/settings/page.tsx
git commit -m "feat: add context/role management UI in settings"
```

---

### Task 8: Production Dockerfile Update and Final Polish

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Read current Dockerfile**

Read `Dockerfile` and `docker-compose.yml` to understand what exists.

- [ ] **Step 2: Ensure Dockerfile handles all new files**

Verify the Dockerfile copies all necessary runtime files including:
- The Prisma generated client (wherever it lives in this Prisma 6 setup)
- The public/icons directory
- The standalone output

The existing Dockerfile should already handle this since `npm run build` includes everything in `.next/standalone`. Just verify it works.

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 4: Commit if any changes were needed**

```bash
git add Dockerfile docker-compose.yml
git commit -m "chore: update deployment config for Phase 4 additions"
```
