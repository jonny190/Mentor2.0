# Mentor Phase 3: Role View (Calendar Grid) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Role View - a calendar grid where rows are contexts/roles and columns are days, showing time slot allocation with usage meters, supporting 1/2/3 week views, repeating time slots, and slot completion.

**Architecture:** The Role View is a custom CSS Grid component (no table library needed). Each cell shows usage meters (allocated vs capacity) and slot entries. Repeating slots are managed via the existing RepeatPattern Prisma model with a new engine module for generating instances. The view reads from the existing slot API with context grouping done client-side.

**Tech Stack:** Next.js 16, Prisma 6, TypeScript, Zustand, TanStack Query, shadcn/ui, CSS Grid

---

## File Structure

```
src/
  lib/
    engine/
      repeat.ts                           # Repeat pattern generation logic
    types/
      repeat.ts                           # Repeat pattern frontend types
  app/
    api/
      slots/[rid]/
        repeat/route.ts                   # POST set repeat pattern on slot
    (app)/
      roles/page.tsx                      # Role View page (replace placeholder)
  hooks/
    use-repeat.ts                         # Repeat pattern hooks
  stores/
    role-store.ts                         # Role View state (week offset, selected cell)
  components/
    role-view/
      calendar-grid.tsx                   # Main grid layout (rows=contexts, cols=days)
      calendar-cell.tsx                   # Single cell: usage meter + slot entries
      usage-meter.tsx                     # Progress bar (allocated vs capacity)
      cell-slot-entry.tsx                 # Single slot entry within a cell
      repeat-pattern-dialog.tsx           # Create/edit repeat pattern dialog
      week-selector.tsx                   # 1/2/3 week view toggle
```

---

### Task 1: Repeat Pattern Types and Engine

**Files:**
- Create: `src/lib/types/repeat.ts`
- Create: `src/lib/engine/repeat.ts`

- [ ] **Step 1: Create repeat pattern types**

Create `src/lib/types/repeat.ts`:

```typescript
export const RepeatType = {
  NONE: 0,
  DAILY: 1,
  WEEKLY: 2,
  MONTHLY_DATE: 3,
  MONTHLY_DAY: 4,
  YEARLY_DATE: 5,
  YEARLY_DAY: 6,
} as const;

export const RepeatTypeLabels: Record<number, string> = {
  0: "No repeat",
  1: "Daily",
  2: "Weekly",
  3: "Monthly (by date)",
  4: "Monthly (by day)",
  5: "Yearly (by date)",
  6: "Yearly (by day)",
};

export const RepeatPriority = {
  RECESSIVE: 0,
  NORMAL: 1,
  DOMINANT: 2,
} as const;

export const RepeatPriorityLabels: Record<number, string> = {
  0: "Recessive",
  1: "Normal",
  2: "Dominant",
};

export type RepeatPatternData = {
  id: number;
  slotId: number;
  type: number;
  intervalVal: number;
  dateTo: string | null;
  dateFrom: string;
  occurrences: number;
  flags: number;
  priority: number;
  pattern: string;
  userId: number;
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
```

- [ ] **Step 2: Create repeat pattern generator**

Create `src/lib/engine/repeat.ts`:

```typescript
import { RepeatType } from "@/lib/types/repeat";

export type RepeatConfig = {
  type: number;
  intervalVal: number;
  dateFrom: Date;
  dateTo: Date | null;
  occurrences: number;
  pattern: string; // for weekly: comma-separated day numbers (0=Mon, 6=Sun)
};

/**
 * Generate all occurrence dates for a repeat pattern within a date range.
 */
export function generateRepeatDates(
  config: RepeatConfig,
  rangeFrom: Date,
  rangeTo: Date
): Date[] {
  const dates: Date[] = [];
  const maxOccurrences = config.occurrences > 0 ? config.occurrences : 1000;
  let count = 0;

  const effectiveEnd = config.dateTo && config.dateTo < rangeTo ? config.dateTo : rangeTo;

  switch (config.type) {
    case RepeatType.DAILY: {
      const current = new Date(config.dateFrom);
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + config.intervalVal);
        count++;
      }
      break;
    }

    case RepeatType.WEEKLY: {
      const weekdays = config.pattern
        ? config.pattern.split(",").map((d) => parseInt(d.trim()))
        : [config.dateFrom.getDay() === 0 ? 6 : config.dateFrom.getDay() - 1]; // convert to Mon=0

      const current = new Date(config.dateFrom);
      // Align to start of week
      const dayOfWeek = current.getDay() === 0 ? 6 : current.getDay() - 1;
      current.setDate(current.getDate() - dayOfWeek);

      while (current <= effectiveEnd && count < maxOccurrences) {
        for (const wd of weekdays) {
          const date = new Date(current);
          date.setDate(date.getDate() + wd);
          if (date >= config.dateFrom && date >= rangeFrom && date <= effectiveEnd) {
            dates.push(new Date(date));
            count++;
          }
        }
        current.setDate(current.getDate() + 7 * config.intervalVal);
      }
      break;
    }

    case RepeatType.MONTHLY_DATE: {
      const current = new Date(config.dateFrom);
      const dayOfMonth = current.getDate();
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) {
          dates.push(new Date(current));
        }
        current.setMonth(current.getMonth() + config.intervalVal);
        current.setDate(Math.min(dayOfMonth, new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()));
        count++;
      }
      break;
    }

    case RepeatType.MONTHLY_DAY: {
      const current = new Date(config.dateFrom);
      const targetDay = current.getDay();
      const weekNum = Math.floor((current.getDate() - 1) / 7);
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) {
          dates.push(new Date(current));
        }
        current.setMonth(current.getMonth() + config.intervalVal);
        // Find the nth occurrence of the target day in this month
        const firstOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
        const firstTargetDay = new Date(firstOfMonth);
        const diff = (targetDay - firstOfMonth.getDay() + 7) % 7;
        firstTargetDay.setDate(1 + diff + weekNum * 7);
        if (firstTargetDay.getMonth() === current.getMonth()) {
          current.setDate(firstTargetDay.getDate());
        }
        count++;
      }
      break;
    }

    case RepeatType.YEARLY_DATE: {
      const current = new Date(config.dateFrom);
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) {
          dates.push(new Date(current));
        }
        current.setFullYear(current.getFullYear() + config.intervalVal);
        count++;
      }
      break;
    }

    case RepeatType.YEARLY_DAY: {
      const current = new Date(config.dateFrom);
      while (current <= effectiveEnd && count < maxOccurrences) {
        if (current >= rangeFrom) {
          dates.push(new Date(current));
        }
        current.setFullYear(current.getFullYear() + config.intervalVal);
        count++;
      }
      break;
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}
```

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/repeat.ts src/lib/engine/repeat.ts
git commit -m "feat: add repeat pattern types and date generation engine"
```

---

### Task 2: Repeat Pattern API and Hooks

**Files:**
- Create: `src/app/api/slots/[rid]/repeat/route.ts`
- Create: `src/hooks/use-repeat.ts`

- [ ] **Step 1: Create repeat pattern API route**

Create `src/app/api/slots/[rid]/repeat/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const patterns = await prisma.repeatPattern.findMany({
    where: { slotId: parseInt(rid), userId: user.id },
  });

  return NextResponse.json({ patterns });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const slotId = parseInt(rid);
  const body = await request.json();

  const slot = await prisma.timeSlot.findFirst({
    where: { id: slotId, userId: user.id },
  });
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Delete existing patterns for this slot before creating new one
  await prisma.repeatPattern.deleteMany({
    where: { slotId, userId: user.id },
  });

  if (body.type === 0) {
    return NextResponse.json({ pattern: null, message: "Repeat removed" });
  }

  const pattern = await prisma.repeatPattern.create({
    data: {
      slotId,
      type: body.type,
      intervalVal: body.intervalVal ?? 1,
      dateFrom: body.dateFrom ? new Date(body.dateFrom) : slot.dateScheduled,
      dateTo: body.dateTo ? new Date(body.dateTo) : null,
      occurrences: body.occurrences ?? 0,
      flags: body.flags ?? 0,
      priority: body.priority ?? 1,
      pattern: body.pattern ?? "",
      userId: user.id,
    },
  });

  return NextResponse.json({ pattern }, { status: 201 });
}
```

- [ ] **Step 2: Create repeat hooks**

Create `src/hooks/use-repeat.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RepeatPatternData } from "@/lib/types/repeat";

export function useSetRepeatPattern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slotId,
      ...data
    }: { slotId: number } & Record<string, unknown>) => {
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
```

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/slots/\[rid\]/repeat/ src/hooks/use-repeat.ts
git commit -m "feat: add repeat pattern API route and hooks"
```

---

### Task 3: Role Store

**Files:**
- Create: `src/stores/role-store.ts`

- [ ] **Step 1: Create role view store**

Create `src/stores/role-store.ts`:

```typescript
import { create } from "zustand";

type RoleStore = {
  weekOffset: number;
  weeksToShow: 1 | 2 | 3;
  selectedCell: { contextId: number; date: string } | null;
  setWeekOffset: (offset: number) => void;
  goForwardWeek: () => void;
  goBackWeek: () => void;
  goToCurrentWeek: () => void;
  setWeeksToShow: (weeks: 1 | 2 | 3) => void;
  setSelectedCell: (cell: { contextId: number; date: string } | null) => void;
};

export const useRoleStore = create<RoleStore>((set) => ({
  weekOffset: 0,
  weeksToShow: 3,
  selectedCell: null,

  setWeekOffset: (offset) => set({ weekOffset: offset }),

  goForwardWeek: () => set((s) => ({ weekOffset: s.weekOffset + 1 })),

  goBackWeek: () => set((s) => ({ weekOffset: s.weekOffset - 1 })),

  goToCurrentWeek: () => set({ weekOffset: 0 }),

  setWeeksToShow: (weeks) => set({ weeksToShow: weeks }),

  setSelectedCell: (cell) => set({ selectedCell: cell }),
}));

/**
 * Get the Monday of the current week with offset applied.
 */
export function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Generate array of date strings for the visible range.
 */
export function getVisibleDates(weekOffset: number, weeksToShow: number): string[] {
  const start = getWeekStart(weekOffset);
  const dates: string[] = [];
  for (let i = 0; i < weeksToShow * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/stores/role-store.ts
git commit -m "feat: add Role View store with week navigation and date generation"
```

---

### Task 4: Usage Meter Component

**Files:**
- Create: `src/components/role-view/usage-meter.tsx`

- [ ] **Step 1: Create usage meter**

Create `src/components/role-view/usage-meter.tsx`:

```typescript
"use client";

import { cn } from "@/lib/utils";

type UsageMeterProps = {
  allocated: number;
  used: number;
  className?: string;
};

export function UsageMeter({ allocated, used, className }: UsageMeterProps) {
  if (allocated === 0) return null;

  const percentage = Math.min(100, Math.round((used / allocated) * 100));

  const barColor =
    percentage >= 90
      ? "bg-red-500"
      : percentage >= 70
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-gray-200">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-400">{percentage}%</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/role-view/usage-meter.tsx
git commit -m "feat: add usage meter component for Role View cells"
```

---

### Task 5: Cell Slot Entry and Calendar Cell

**Files:**
- Create: `src/components/role-view/cell-slot-entry.tsx`
- Create: `src/components/role-view/calendar-cell.tsx`

- [ ] **Step 1: Create cell slot entry**

Create `src/components/role-view/cell-slot-entry.tsx`:

```typescript
"use client";

import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/types/slot";
import type { TimeSlotWithContext } from "@/lib/types/slot";
import { Repeat } from "lucide-react";

type CellSlotEntryProps = {
  slot: TimeSlotWithContext;
  compact: boolean;
  onClick: (slot: TimeSlotWithContext) => void;
};

export function CellSlotEntry({ slot, compact, onClick }: CellSlotEntryProps) {
  const taskCount = slot.taskAssignments.length;
  const hasRepeat = false; // Would check slot.repeatPatterns but not included in query yet

  return (
    <button
      onClick={() => onClick(slot)}
      className={cn(
        "w-full truncate rounded px-1 text-left text-[10px] leading-tight hover:bg-blue-50",
        slot.taskAssignments.every((a) => a.task.status === 1) && "opacity-50"
      )}
      title={`${formatMinutes(slot.startMinutes)}-${formatMinutes(slot.endMinutes)} ${slot.description || ""} (${taskCount} tasks)`}
    >
      {compact ? (
        <span className="flex items-center gap-0.5">
          {hasRepeat && <Repeat className="h-2 w-2 shrink-0" />}
          <span className="truncate">{slot.description || `${taskCount}t`}</span>
        </span>
      ) : (
        <span className="flex items-center gap-0.5">
          <span className="shrink-0 text-gray-400">
            {formatMinutes(slot.startMinutes)}
          </span>
          {hasRepeat && <Repeat className="h-2.5 w-2.5 shrink-0 text-gray-400" />}
          <span className="truncate">{slot.description || `${taskCount} task${taskCount !== 1 ? "s" : ""}`}</span>
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create calendar cell**

Create `src/components/role-view/calendar-cell.tsx`:

```typescript
"use client";

import { cn } from "@/lib/utils";
import { UsageMeter } from "./usage-meter";
import { CellSlotEntry } from "./cell-slot-entry";
import type { TimeSlotWithContext } from "@/lib/types/slot";

type CalendarCellProps = {
  date: string;
  contextId: number;
  slots: TimeSlotWithContext[];
  isToday: boolean;
  isSelected: boolean;
  compact: boolean;
  onCellClick: (contextId: number, date: string) => void;
  onSlotClick: (slot: TimeSlotWithContext) => void;
};

export function CalendarCell({
  date,
  contextId,
  slots,
  isToday,
  isSelected,
  compact,
  onCellClick,
  onSlotClick,
}: CalendarCellProps) {
  const totalAllocated = slots.reduce((sum, s) => sum + s.allocated, 0);
  const totalUsed = slots.reduce((sum, s) => sum + s.overallAlloc, 0);
  const maxVisible = compact ? 1 : 3;
  const overflow = slots.length - maxVisible;

  return (
    <div
      className={cn(
        "flex min-h-[48px] cursor-pointer flex-col border-b border-r p-0.5",
        isToday && "bg-blue-50/50",
        isSelected && "ring-1 ring-inset ring-blue-400"
      )}
      onClick={() => onCellClick(contextId, date)}
    >
      {slots.length > 0 && (
        <>
          <UsageMeter
            allocated={totalAllocated}
            used={totalUsed}
            className="mb-0.5"
          />
          <div className="flex flex-col gap-px overflow-hidden">
            {slots.slice(0, maxVisible).map((slot) => (
              <CellSlotEntry
                key={slot.id}
                slot={slot}
                compact={compact}
                onClick={onSlotClick}
              />
            ))}
            {overflow > 0 && (
              <span className="px-1 text-[9px] text-gray-400">
                +{overflow} more
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/role-view/cell-slot-entry.tsx src/components/role-view/calendar-cell.tsx
git commit -m "feat: add calendar cell and slot entry components for Role View"
```

---

### Task 6: Week Selector

**Files:**
- Create: `src/components/role-view/week-selector.tsx`

- [ ] **Step 1: Create week selector**

Create `src/components/role-view/week-selector.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { useRoleStore, getWeekStart } from "@/stores/role-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function WeekSelector() {
  const { weekOffset, weeksToShow, goForwardWeek, goBackWeek, goToCurrentWeek, setWeeksToShow } = useRoleStore();

  const startDate = getWeekStart(weekOffset);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeksToShow * 7 - 1);

  const formatShort = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={goBackWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={weekOffset === 0 ? "default" : "outline"}
        onClick={goToCurrentWeek}
      >
        Today
      </Button>
      <Button size="sm" variant="ghost" onClick={goForwardWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <span className="min-w-[160px] text-center text-sm">
        {formatShort(startDate)} - {formatShort(endDate)}
      </span>

      <div className="ml-2 flex rounded-md border">
        {([1, 2, 3] as const).map((w) => (
          <button
            key={w}
            onClick={() => setWeeksToShow(w)}
            className={cn(
              "px-2 py-1 text-xs",
              weeksToShow === w
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {w}w
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/role-view/week-selector.tsx
git commit -m "feat: add week selector with navigation and 1/2/3 week toggle"
```

---

### Task 7: Calendar Grid

**Files:**
- Create: `src/components/role-view/calendar-grid.tsx`

- [ ] **Step 1: Create calendar grid**

Create `src/components/role-view/calendar-grid.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import { useContexts } from "@/hooks/use-contexts";
import { useSlots } from "@/hooks/use-slots";
import { useRoleStore, getWeekStart, getVisibleDates } from "@/stores/role-store";
import { usePreferences } from "@/hooks/use-preferences";
import { CalendarCell } from "./calendar-cell";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TimeSlotWithContext } from "@/lib/types/slot";
import { cn } from "@/lib/utils";

type CalendarGridProps = {
  onCellClick: (contextId: number, date: string) => void;
  onSlotClick: (slot: TimeSlotWithContext) => void;
};

export function CalendarGrid({ onCellClick, onSlotClick }: CalendarGridProps) {
  const { weekOffset, weeksToShow, selectedCell } = useRoleStore();
  const { data: contexts } = useContexts();
  const { data: prefs } = usePreferences();

  const dates = useMemo(() => getVisibleDates(weekOffset, weeksToShow), [weekOffset, weeksToShow]);
  const from = dates[0];
  const to = dates[dates.length - 1];
  const { data: slots } = useSlots(from, to);

  const today = new Date().toISOString().split("T")[0];
  const compact = (prefs?.zoom ?? "medium") === "small";

  // Group slots by contextId and date
  const slotMap = useMemo(() => {
    const map = new Map<string, TimeSlotWithContext[]>();
    if (!slots) return map;
    for (const slot of slots) {
      const dateKey = new Date(slot.dateScheduled).toISOString().split("T")[0];
      const key = `${slot.contextId ?? "null"}-${dateKey}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
  }, [slots]);

  const roles = contexts?.filter((c) => c.ctxType === 0) ?? [];

  const dayHeaders = dates.map((d) => {
    const date = new Date(d);
    return {
      date: d,
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      dayNum: date.getDate(),
      isToday: d === today,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });

  const colCount = dates.length;

  return (
    <ScrollArea className="flex-1">
      <div
        className="min-w-[600px]"
        style={{
          display: "grid",
          gridTemplateColumns: `100px repeat(${colCount}, minmax(60px, 1fr))`,
        }}
      >
        {/* Header row: empty corner + day headers */}
        <div className="sticky top-0 z-20 border-b border-r bg-white p-1 text-xs font-medium text-gray-500">
          Role
        </div>
        {dayHeaders.map((h) => (
          <div
            key={h.date}
            className={cn(
              "sticky top-0 z-20 border-b border-r p-1 text-center text-xs",
              h.isToday ? "bg-blue-100 font-bold text-blue-700" : "bg-white text-gray-500",
              h.isWeekend && "bg-gray-50"
            )}
          >
            <div>{h.label}</div>
            <div className={cn("text-sm", h.isToday && "text-blue-700")}>{h.dayNum}</div>
          </div>
        ))}

        {/* Context rows */}
        {roles.map((ctx) => (
          <>
            {/* Row header: context name */}
            <div
              key={`label-${ctx.id}`}
              className="sticky left-0 z-10 flex items-center border-b border-r bg-white px-2 text-xs font-medium"
            >
              <span className="truncate">{ctx.name}</span>
            </div>

            {/* Cells for each day */}
            {dates.map((date) => {
              const key = `${ctx.id}-${date}`;
              const cellSlots = slotMap.get(key) ?? [];
              const isToday = date === today;
              const isSelected =
                selectedCell?.contextId === ctx.id &&
                selectedCell?.date === date;

              return (
                <CalendarCell
                  key={key}
                  date={date}
                  contextId={ctx.id}
                  slots={cellSlots}
                  isToday={isToday}
                  isSelected={isSelected}
                  compact={compact}
                  onCellClick={onCellClick}
                  onSlotClick={onSlotClick}
                />
              );
            })}
          </>
        ))}

        {/* Empty state */}
        {roles.length === 0 && (
          <div
            className="col-span-full p-8 text-center text-sm text-gray-500"
            style={{ gridColumn: `1 / span ${colCount + 1}` }}
          >
            No roles/contexts defined. Create contexts first.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/role-view/calendar-grid.tsx
git commit -m "feat: add calendar grid component with context rows and day columns"
```

---

### Task 8: Repeat Pattern Dialog

**Files:**
- Create: `src/components/role-view/repeat-pattern-dialog.tsx`

- [ ] **Step 1: Create repeat pattern dialog**

Create `src/components/role-view/repeat-pattern-dialog.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { useSetRepeatPattern } from "@/hooks/use-repeat";
import { RepeatTypeLabels, RepeatPriorityLabels, WEEKDAY_LABELS } from "@/lib/types/repeat";

type RepeatPatternDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotId: number | null;
  slotDate: string;
};

export function RepeatPatternDialog({
  open,
  onOpenChange,
  slotId,
  slotDate,
}: RepeatPatternDialogProps) {
  const setRepeat = useSetRepeatPattern();

  const [type, setType] = useState(0);
  const [intervalVal, setIntervalVal] = useState(1);
  const [dateTo, setDateTo] = useState("");
  const [occurrences, setOccurrences] = useState(0);
  const [priority, setPriority] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [forever, setForever] = useState(true);

  useEffect(() => {
    setType(0);
    setIntervalVal(1);
    setDateTo("");
    setOccurrences(0);
    setPriority(1);
    setWeekdays([]);
    setForever(true);
  }, [open, slotId]);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slotId) return;

    await setRepeat.mutateAsync({
      slotId,
      type,
      intervalVal,
      dateFrom: slotDate,
      dateTo: forever ? null : dateTo || null,
      occurrences: forever ? 0 : occurrences,
      priority,
      pattern: type === 2 ? weekdays.join(",") : "",
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Repeat Pattern</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Repeat Type</Label>
            <Select value={String(type)} onValueChange={(v) => setType(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RepeatTypeLabels).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type > 0 && (
            <>
              <div>
                <Label>Every</Label>
                <Input
                  type="number"
                  min={1}
                  value={intervalVal}
                  onChange={(e) => setIntervalVal(parseInt(e.target.value) || 1)}
                />
              </div>

              {type === 2 && (
                <div>
                  <Label>Days of week</Label>
                  <div className="flex gap-1">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleWeekday(i)}
                        className={`rounded px-2 py-1 text-xs ${
                          weekdays.includes(i)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Priority</Label>
                <Select value={String(priority)} onValueChange={(v) => setPriority(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RepeatPriorityLabels).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={forever}
                  onChange={(e) => setForever(e.target.checked)}
                />
                Repeat forever
              </label>

              {!forever && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Until date</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Or # occurrences</Label>
                    <Input
                      type="number"
                      min={0}
                      value={occurrences}
                      onChange={(e) => setOccurrences(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {type === 0 ? "Remove Repeat" : "Set Repeat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/role-view/repeat-pattern-dialog.tsx
git commit -m "feat: add repeat pattern dialog with all repeat types and weekday selection"
```

---

### Task 9: Role View Page

**Files:**
- Modify: `src/app/(app)/roles/page.tsx`

- [ ] **Step 1: Replace placeholder with full Role View page**

Replace `src/app/(app)/roles/page.tsx` with:

```typescript
"use client";

import { useState } from "react";
import { CalendarGrid } from "@/components/role-view/calendar-grid";
import { WeekSelector } from "@/components/role-view/week-selector";
import { SlotEditorDialog } from "@/components/schedule-view/slot-editor-dialog";
import { RepeatPatternDialog } from "@/components/role-view/repeat-pattern-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoleStore } from "@/stores/role-store";
import { useDeleteSlot, useCompleteSlot } from "@/hooks/use-slots";
import type { TimeSlotWithContext } from "@/lib/types/slot";
import { Plus } from "lucide-react";

export default function RolesPage() {
  const [editingSlot, setEditingSlot] = useState<TimeSlotWithContext | null>(null);
  const [showNewSlot, setShowNewSlot] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState<string>("");
  const [newSlotContextId, setNewSlotContextId] = useState<number | null>(null);
  const [repeatSlotId, setRepeatSlotId] = useState<number | null>(null);
  const [repeatSlotDate, setRepeatSlotDate] = useState<string>("");
  const [slotMenuTarget, setSlotMenuTarget] = useState<TimeSlotWithContext | null>(null);

  const { setSelectedCell } = useRoleStore();
  const deleteSlot = useDeleteSlot();
  const completeSlot = useCompleteSlot();

  function handleCellClick(contextId: number, date: string) {
    setSelectedCell({ contextId, date });
    setNewSlotDate(date);
    setNewSlotContextId(contextId);
    setShowNewSlot(true);
  }

  function handleSlotClick(slot: TimeSlotWithContext) {
    setSlotMenuTarget(slot);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
        <Button size="sm" onClick={() => { setNewSlotDate(""); setNewSlotContextId(null); setShowNewSlot(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          New Slot
        </Button>
        <WeekSelector />
      </div>

      <CalendarGrid
        onCellClick={handleCellClick}
        onSlotClick={handleSlotClick}
      />

      {/* Slot action menu */}
      {slotMenuTarget && (
        <div className="fixed inset-0 z-50" onClick={() => setSlotMenuTarget(null)}>
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu open onOpenChange={() => setSlotMenuTarget(null)}>
              <DropdownMenuTrigger asChild><div /></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setEditingSlot(slotMenuTarget); setSlotMenuTarget(null); }}>
                  Edit Slot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setRepeatSlotId(slotMenuTarget.id);
                  setRepeatSlotDate(new Date(slotMenuTarget.dateScheduled).toISOString().split("T")[0]);
                  setSlotMenuTarget(null);
                }}>
                  Set Repeat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  completeSlot.mutate({ id: slotMenuTarget.id, rescheduleMode: "this-slot" });
                  setSlotMenuTarget(null);
                }}>
                  Complete Slot
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => {
                    if (confirm("Delete this time slot?")) {
                      deleteSlot.mutate(slotMenuTarget.id);
                    }
                    setSlotMenuTarget(null);
                  }}
                >
                  Delete Slot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <SlotEditorDialog
        open={showNewSlot || editingSlot !== null}
        onOpenChange={(open) => {
          if (!open) { setShowNewSlot(false); setEditingSlot(null); }
        }}
        slot={editingSlot}
        defaultDate={newSlotDate || undefined}
      />

      <RepeatPatternDialog
        open={repeatSlotId !== null}
        onOpenChange={(open) => { if (!open) setRepeatSlotId(null); }}
        slotId={repeatSlotId}
        slotDate={repeatSlotDate}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/roles/page.tsx
git commit -m "feat: add Role View page with calendar grid, slot actions, and repeat patterns"
```

---

### Task 10: Seed Data for Role View

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Read current seed file**

Read `prisma/seed.ts` to understand existing structure.

- [ ] **Step 2: Add repeat pattern seed data**

Add after the existing time slot seed data (near the end of the file, before the final console.log):

```typescript
  // Add a repeat pattern to the first work slot
  if (slots.length > 0) {
    await prisma.repeatPattern.create({
      data: {
        slotId: slots[0].id,
        type: 2, // weekly
        intervalVal: 1,
        dateFrom: today,
        occurrences: 0, // forever
        priority: 1,
        pattern: "0,1,2,3,4", // Mon-Fri
        userId: user.id,
      },
    });
  }
```

Update the final console.log to mention Role View data.

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add repeat pattern seed data for Role View"
```
