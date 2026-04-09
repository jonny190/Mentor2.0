# Mentor Phase 2: Schedule View & Scheduling Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Schedule View, time slot management, and scheduling engine that matches tasks to available time slots based on context and capacity.

**Architecture:** The scheduling engine lives in `src/lib/engine/` as pure business logic with injected database operations (repository pattern), making it extractable to a separate service later. The Schedule View shows tasks grouped by date with time slot information. New API routes handle slot CRUD and scheduling operations.

**Tech Stack:** Next.js 16, Prisma 6, TypeScript, Zustand, TanStack Query, shadcn/ui

---

## File Structure

```
src/
  lib/
    engine/
      types.ts                          # Engine-specific types and interfaces
      scheduler.ts                      # Core: suggestSlot, scheduleTask, unscheduleTask
      reschedule.ts                     # Reschedule logic (incremental + full)
    types/
      slot.ts                           # TimeSlot types for frontend
  app/
    api/
      slots/
        route.ts                        # GET (list by date range), POST (create)
        [rid]/
          route.ts                      # GET, PUT, DELETE
          complete/route.ts             # POST (complete slot, trigger reschedule)
      tasks/[tid]/
        schedule/route.ts               # POST (schedule task to slot)
      schedule/
        suggest/route.ts                # POST (suggest next available slot)
        reschedule/route.ts             # POST (full/incremental reschedule)
    (app)/
      schedule/page.tsx                 # Schedule View page (replace placeholder)
  hooks/
    use-slots.ts                        # TanStack Query hooks for slots
    use-scheduling.ts                   # Scheduling operation hooks
  stores/
    schedule-store.ts                   # Zustand: current date, date cursor
  components/
    schedule-view/
      schedule-list.tsx                 # Main date-grouped task list
      schedule-date-group.tsx           # Single date group with tasks
      date-navigator.tsx                # Date navigation header
      slot-editor-dialog.tsx            # Create/edit time slot dialog
    shared/
      intervention-dialog.tsx           # Scheduling intervention dialog
```

---

### Task 1: Engine Types and Slot Types

**Files:**
- Create: `src/lib/engine/types.ts`
- Create: `src/lib/types/slot.ts`

- [ ] **Step 1: Create engine types**

Create `src/lib/engine/types.ts`:

```typescript
export type SlotQuery = {
  userId: number;
  contextId?: number;
  dateFrom: Date;
  dateTo: Date;
  minAvailable?: number;
};

export type TaskQuery = {
  userId: number;
  status?: number;
  scheduled?: boolean;
  slotId?: number;
};

export type SuggestOptions = {
  startDate?: Date;
  scanAheadDays: number;
  contextId?: number | null;
  sizeMinutes: number;
};

export type RescheduleScope = {
  userId: number;
  slotId?: number;
  taskIds?: number[];
};

export type RescheduleResult = {
  rescheduled: number;
  failed: number;
  details: { taskId: number; slotId: number | null; success: boolean }[];
};

export type CompleteOptions = {
  rescheduleMode: "this-slot" | "all-current";
};

export type SchedulerContext = {
  findSlots: (query: SlotQuery) => Promise<SlotWithCapacity[]>;
  findUnscheduledTasks: (query: TaskQuery) => Promise<SchedulableTask[]>;
  findTasksInSlot: (slotId: number, userId: number) => Promise<SchedulableTask[]>;
  assignTask: (taskId: number, slotId: number, userId: number) => Promise<void>;
  unassignTask: (taskId: number, userId: number) => Promise<void>;
  updateSlotCounts: (slotId: number, userId: number) => Promise<void>;
  updateTaskScheduleState: (taskId: number, data: { schedule: number; dateScheduled: Date | null }) => Promise<void>;
};

export type SlotWithCapacity = {
  id: number;
  contextId: number | null;
  dateScheduled: Date;
  startMinutes: number;
  endMinutes: number;
  allocated: number;
  overallAlloc: number;
  description: string;
  userId: number;
  remainingCapacity: number;
};

export type SchedulableTask = {
  id: number;
  contextId: number | null;
  size: number;
  sizeCustom: number | null;
  status: number;
  schedule: number;
  dateScheduled: Date | null;
  dateDue: Date | null;
  description: string;
  userId: number;
};

export const ScheduleState = {
  UNSCHEDULED: 0,
  SCHEDULED: 1,
  PARTIALLY_SCHEDULED: 2,
} as const;
```

- [ ] **Step 2: Create slot frontend types**

Create `src/lib/types/slot.ts`:

```typescript
export type TimeSlotWithContext = {
  id: number;
  type: number;
  contextId: number | null;
  dateScheduled: string;
  startMinutes: number;
  endMinutes: number;
  allocated: number;
  scheduled: number;
  count: number;
  overallAlloc: number;
  description: string;
  userId: number;
  context: { id: number; name: string; symbolIcon: string } | null;
  taskAssignments: {
    id: number;
    task: {
      id: number;
      description: string;
      status: number;
      size: number;
    };
  }[];
};

export const SlotType = {
  REGULAR: 0,
  APPOINTMENT: 1,
  MILESTONE: 2,
} as const;

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function slotDurationMinutes(slot: { startMinutes: number; endMinutes: number }): number {
  return slot.endMinutes - slot.startMinutes;
}
```

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/engine/types.ts src/lib/types/slot.ts
git commit -m "feat: add engine types and slot types for scheduling"
```

---

### Task 2: Scheduling Engine - Core

**Files:**
- Create: `src/lib/engine/scheduler.ts`

- [ ] **Step 1: Create the scheduling engine**

Create `src/lib/engine/scheduler.ts`:

```typescript
import {
  SchedulerContext,
  SlotWithCapacity,
  SchedulableTask,
  SuggestOptions,
  ScheduleState,
} from "./types";

/**
 * Convert a task's size enum to minutes using preference values.
 */
export function taskSizeToMinutes(
  size: number,
  sizeCustom: number | null,
  prefs: { sizeMinutes: number; sizeHour: number; sizeHalfDay: number; sizeDay: number }
): number {
  switch (size) {
    case 1: return prefs.sizeMinutes;
    case 2: return prefs.sizeHour;
    case 3: return prefs.sizeHalfDay;
    case 4: return prefs.sizeDay;
    case 5: return sizeCustom ?? prefs.sizeHour;
    default: return 0;
  }
}

/**
 * Find the best available slot for a task.
 * Scans forward from startDate looking for a slot with matching context
 * and enough remaining capacity.
 */
export async function suggestSlot(
  ctx: SchedulerContext,
  task: SchedulableTask,
  options: SuggestOptions
): Promise<SlotWithCapacity | null> {
  const startDate = options.startDate ?? new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + options.scanAheadDays);

  const slots = await ctx.findSlots({
    userId: task.userId,
    contextId: options.contextId ?? undefined,
    dateFrom: startDate,
    dateTo: endDate,
    minAvailable: options.sizeMinutes,
  });

  // Find first slot with enough capacity and matching context
  for (const slot of slots) {
    if (slot.remainingCapacity >= options.sizeMinutes) {
      if (options.contextId === null || options.contextId === undefined || slot.contextId === options.contextId) {
        return slot;
      }
    }
  }

  // If no exact context match, try any slot with capacity
  if (options.contextId !== null && options.contextId !== undefined) {
    for (const slot of slots) {
      if (slot.remainingCapacity >= options.sizeMinutes) {
        return slot;
      }
    }
  }

  return null;
}

/**
 * Assign a task to a specific time slot.
 */
export async function scheduleTask(
  ctx: SchedulerContext,
  taskId: number,
  slotId: number,
  userId: number
): Promise<void> {
  await ctx.assignTask(taskId, slotId, userId);
  await ctx.updateSlotCounts(slotId, userId);
  await ctx.updateTaskScheduleState(taskId, {
    schedule: ScheduleState.SCHEDULED,
    dateScheduled: new Date(),
  });
}

/**
 * Remove a task from its current slot assignment.
 */
export async function unscheduleTask(
  ctx: SchedulerContext,
  taskId: number,
  userId: number
): Promise<void> {
  await ctx.unassignTask(taskId, userId);
  await ctx.updateTaskScheduleState(taskId, {
    schedule: ScheduleState.UNSCHEDULED,
    dateScheduled: null,
  });
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/scheduler.ts
git commit -m "feat: add core scheduling engine with suggest, schedule, and unschedule"
```

---

### Task 3: Reschedule Engine

**Files:**
- Create: `src/lib/engine/reschedule.ts`

- [ ] **Step 1: Create reschedule logic**

Create `src/lib/engine/reschedule.ts`:

```typescript
import {
  SchedulerContext,
  RescheduleScope,
  RescheduleResult,
  CompleteOptions,
  ScheduleState,
} from "./types";
import { suggestSlot, scheduleTask, unscheduleTask, taskSizeToMinutes } from "./scheduler";

const DEFAULT_SIZE_PREFS = {
  sizeMinutes: 15,
  sizeHour: 60,
  sizeHalfDay: 240,
  sizeDay: 480,
};

/**
 * Reschedule tasks - either incrementally (specific tasks/slot) or fully (all unscheduled).
 */
export async function reschedule(
  ctx: SchedulerContext,
  mode: "incremental" | "full",
  scope: RescheduleScope,
  sizePrefs = DEFAULT_SIZE_PREFS,
  scanAheadDays = 30
): Promise<RescheduleResult> {
  const result: RescheduleResult = { rescheduled: 0, failed: 0, details: [] };

  let tasks;
  if (mode === "incremental" && scope.slotId) {
    tasks = await ctx.findTasksInSlot(scope.slotId, scope.userId);
    // Only reschedule active, non-completed tasks
    tasks = tasks.filter((t) => t.status === 0);
  } else if (mode === "incremental" && scope.taskIds) {
    // Reschedule specific tasks - fetch them as unscheduled
    tasks = await ctx.findUnscheduledTasks({
      userId: scope.userId,
      status: 0,
      scheduled: false,
    });
    tasks = tasks.filter((t) => scope.taskIds!.includes(t.id));
  } else {
    // Full reschedule - all active unscheduled tasks
    tasks = await ctx.findUnscheduledTasks({
      userId: scope.userId,
      status: 0,
      scheduled: false,
    });
  }

  for (const task of tasks) {
    const sizeMinutes = taskSizeToMinutes(task.size, task.sizeCustom, sizePrefs);
    if (sizeMinutes === 0) {
      result.details.push({ taskId: task.id, slotId: null, success: false });
      result.failed++;
      continue;
    }

    const slot = await suggestSlot(ctx, task, {
      sizeMinutes,
      scanAheadDays,
      contextId: task.contextId,
    });

    if (slot) {
      await scheduleTask(ctx, task.id, slot.id, scope.userId);
      result.details.push({ taskId: task.id, slotId: slot.id, success: true });
      result.rescheduled++;
    } else {
      result.details.push({ taskId: task.id, slotId: null, success: false });
      result.failed++;
    }
  }

  return result;
}

/**
 * Complete a time slot and handle remaining tasks.
 */
export async function completeSlot(
  ctx: SchedulerContext,
  slotId: number,
  userId: number,
  options: CompleteOptions,
  sizePrefs = DEFAULT_SIZE_PREFS,
  scanAheadDays = 30
): Promise<RescheduleResult> {
  const tasks = await ctx.findTasksInSlot(slotId, userId);
  const activeTasks = tasks.filter((t) => t.status === 0);

  // Unassign active tasks from this slot
  for (const task of activeTasks) {
    await unscheduleTask(ctx, task.id, userId);
  }

  if (options.rescheduleMode === "this-slot") {
    return reschedule(ctx, "incremental", {
      userId,
      taskIds: activeTasks.map((t) => t.id),
    }, sizePrefs, scanAheadDays);
  } else {
    return reschedule(ctx, "full", { userId }, sizePrefs, scanAheadDays);
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/reschedule.ts
git commit -m "feat: add reschedule engine with incremental and full modes"
```

---

### Task 4: Time Slot API Routes

**Files:**
- Create: `src/app/api/slots/route.ts`
- Create: `src/app/api/slots/[rid]/route.ts`
- Create: `src/app/api/slots/[rid]/complete/route.ts`

- [ ] **Step 1: Create slot list and create routes**

Create `src/app/api/slots/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const contextId = url.searchParams.get("contextId");

  const where: Record<string, unknown> = { userId: user.id };

  if (from && to) {
    where.dateScheduled = {
      gte: new Date(from),
      lte: new Date(to),
    };
  }

  if (contextId) {
    where.contextId = parseInt(contextId);
  }

  const slots = await prisma.timeSlot.findMany({
    where,
    include: {
      context: { select: { id: true, name: true, symbolIcon: true } },
      taskAssignments: {
        include: {
          task: { select: { id: true, description: true, status: true, size: true } },
        },
      },
    },
    orderBy: [{ dateScheduled: "asc" }, { startMinutes: "asc" }],
  });

  return NextResponse.json({ slots });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { contextId, dateScheduled, startMinutes, endMinutes, allocated, description, type } = body;

  if (!dateScheduled) {
    return NextResponse.json({ error: "dateScheduled is required" }, { status: 400 });
  }

  const scheduledDate = new Date(dateScheduled);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (scheduledDate < today) {
    return NextResponse.json(
      { error: "Time slots cannot be created in the past" },
      { status: 400 }
    );
  }

  const slot = await prisma.timeSlot.create({
    data: {
      type: type ?? 0,
      contextId: contextId ?? null,
      dateScheduled: scheduledDate,
      startMinutes: startMinutes ?? 540,
      endMinutes: endMinutes ?? 1020,
      allocated: allocated ?? (endMinutes ?? 1020) - (startMinutes ?? 540),
      description: description ?? "",
      userId: user.id,
    },
    include: {
      context: { select: { id: true, name: true, symbolIcon: true } },
      taskAssignments: {
        include: {
          task: { select: { id: true, description: true, status: true, size: true } },
        },
      },
    },
  });

  return NextResponse.json({ slot }, { status: 201 });
}
```

- [ ] **Step 2: Create single slot routes**

Create `src/app/api/slots/[rid]/route.ts`:

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
  const slot = await prisma.timeSlot.findFirst({
    where: { id: parseInt(rid), userId: user.id },
    include: {
      context: { select: { id: true, name: true, symbolIcon: true } },
      taskAssignments: {
        include: {
          task: { select: { id: true, description: true, status: true, size: true } },
        },
      },
    },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  return NextResponse.json({ slot });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const id = parseInt(rid);
  const body = await request.json();

  const existing = await prisma.timeSlot.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const slot = await prisma.timeSlot.update({
    where: { id },
    data: {
      contextId: body.contextId !== undefined ? body.contextId : existing.contextId,
      dateScheduled: body.dateScheduled ? new Date(body.dateScheduled) : existing.dateScheduled,
      startMinutes: body.startMinutes ?? existing.startMinutes,
      endMinutes: body.endMinutes ?? existing.endMinutes,
      allocated: body.allocated ?? existing.allocated,
      description: body.description ?? existing.description,
      type: body.type ?? existing.type,
    },
    include: {
      context: { select: { id: true, name: true, symbolIcon: true } },
      taskAssignments: {
        include: {
          task: { select: { id: true, description: true, status: true, size: true } },
        },
      },
    },
  });

  return NextResponse.json({ slot });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const id = parseInt(rid);

  const existing = await prisma.timeSlot.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  await prisma.timeSlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create slot complete route**

Create `src/app/api/slots/[rid]/complete/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { completeSlot } from "@/lib/engine/reschedule";
import type { SchedulerContext } from "@/lib/engine/types";

function createSchedulerContext(userId: number): SchedulerContext {
  return {
    findSlots: async (query) => {
      const slots = await prisma.timeSlot.findMany({
        where: {
          userId: query.userId,
          dateScheduled: { gte: query.dateFrom, lte: query.dateTo },
          ...(query.contextId ? { contextId: query.contextId } : {}),
        },
        include: {
          taskAssignments: { select: { id: true } },
        },
        orderBy: [{ dateScheduled: "asc" }, { startMinutes: "asc" }],
      });
      return slots.map((s) => ({
        ...s,
        remainingCapacity: s.allocated - s.overallAlloc,
      }));
    },
    findUnscheduledTasks: async (query) => {
      return prisma.task.findMany({
        where: {
          userId: query.userId,
          status: query.status ?? 0,
          schedule: 0,
        },
        orderBy: [{ urgency: "desc" }, { importance: "desc" }, { dateDue: "asc" }],
      });
    },
    findTasksInSlot: async (slotId, uid) => {
      const assignments = await prisma.taskSlotAssignment.findMany({
        where: { slotId, userId: uid },
        include: { task: true },
      });
      return assignments.map((a) => a.task);
    },
    assignTask: async (taskId, slotId, uid) => {
      await prisma.taskSlotAssignment.create({
        data: { taskId, slotId, userId: uid },
      });
    },
    unassignTask: async (taskId, uid) => {
      await prisma.taskSlotAssignment.deleteMany({
        where: { taskId, userId: uid },
      });
    },
    updateSlotCounts: async (slotId, uid) => {
      const count = await prisma.taskSlotAssignment.count({
        where: { slotId, userId: uid },
      });
      await prisma.timeSlot.update({
        where: { id: slotId },
        data: { scheduled: count, count },
      });
    },
    updateTaskScheduleState: async (taskId, data) => {
      await prisma.task.update({
        where: { id: taskId },
        data: { schedule: data.schedule, dateScheduled: data.dateScheduled },
      });
    },
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const id = parseInt(rid);
  const body = await request.json();

  const existing = await prisma.timeSlot.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const ctx = createSchedulerContext(user.id);
  const result = await completeSlot(
    ctx,
    id,
    user.id,
    { rescheduleMode: body.rescheduleMode ?? "this-slot" }
  );

  return NextResponse.json({ result });
}
```

- [ ] **Step 4: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/slots/
git commit -m "feat: add time slot CRUD and complete API routes"
```

---

### Task 5: Schedule and Suggest API Routes

**Files:**
- Create: `src/app/api/tasks/[tid]/schedule/route.ts`
- Create: `src/app/api/schedule/suggest/route.ts`
- Create: `src/app/api/schedule/reschedule/route.ts`

- [ ] **Step 1: Create task schedule route**

Create `src/app/api/tasks/[tid]/schedule/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const taskId = parseInt(tid);
  const body = await request.json();
  const { slotId } = body;

  if (!slotId) {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const slot = await prisma.timeSlot.findFirst({
    where: { id: slotId, userId: user.id },
  });
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  // Check if already assigned
  const existing = await prisma.taskSlotAssignment.findUnique({
    where: { taskId_slotId: { taskId, slotId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Task already assigned to this slot" }, { status: 409 });
  }

  await prisma.taskSlotAssignment.create({
    data: { taskId, slotId, userId: user.id },
  });

  // Update slot counts
  const count = await prisma.taskSlotAssignment.count({
    where: { slotId, userId: user.id },
  });
  await prisma.timeSlot.update({
    where: { id: slotId },
    data: { scheduled: count, count },
  });

  // Update task schedule state
  await prisma.task.update({
    where: { id: taskId },
    data: { schedule: 1, dateScheduled: slot.dateScheduled },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create suggest route**

Create `src/app/api/schedule/suggest/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { suggestSlot, taskSizeToMinutes } from "@/lib/engine/scheduler";
import type { SchedulerContext } from "@/lib/engine/types";
import { DEFAULT_PREFERENCES } from "@/lib/types/preferences";

function createSchedulerContext(): SchedulerContext {
  return {
    findSlots: async (query) => {
      const slots = await prisma.timeSlot.findMany({
        where: {
          userId: query.userId,
          dateScheduled: { gte: query.dateFrom, lte: query.dateTo },
          ...(query.contextId ? { contextId: query.contextId } : {}),
        },
        orderBy: [{ dateScheduled: "asc" }, { startMinutes: "asc" }],
      });
      return slots.map((s) => ({
        ...s,
        remainingCapacity: s.allocated - s.overallAlloc,
      }));
    },
    findUnscheduledTasks: async () => [],
    findTasksInSlot: async () => [],
    assignTask: async () => {},
    unassignTask: async () => {},
    updateSlotCounts: async () => {},
    updateTaskScheduleState: async () => {},
  };
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { taskId } = body;

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: user.id },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Get user preferences for size calculations
  const userPrefs = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });
  const prefs = { ...DEFAULT_PREFERENCES, ...(userPrefs?.prefs as Record<string, unknown> ?? {}) };

  const sizeMinutes = taskSizeToMinutes(
    task.size,
    task.sizeCustom,
    {
      sizeMinutes: (prefs.sizeMinutes as number) ?? 15,
      sizeHour: (prefs.sizeHour as number) ?? 60,
      sizeHalfDay: (prefs.sizeHalfDay as number) ?? 240,
      sizeDay: (prefs.sizeDay as number) ?? 480,
    }
  );

  const ctx = createSchedulerContext();
  const slot = await suggestSlot(ctx, task, {
    sizeMinutes,
    scanAheadDays: (prefs.scanAheadDays as number) ?? 30,
    contextId: task.contextId,
  });

  if (!slot) {
    return NextResponse.json({ slot: null, message: "No available slot found" });
  }

  return NextResponse.json({ slot });
}
```

- [ ] **Step 3: Create reschedule route**

Create `src/app/api/schedule/reschedule/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { reschedule } from "@/lib/engine/reschedule";
import type { SchedulerContext } from "@/lib/engine/types";

function createSchedulerContext(): SchedulerContext {
  return {
    findSlots: async (query) => {
      const slots = await prisma.timeSlot.findMany({
        where: {
          userId: query.userId,
          dateScheduled: { gte: query.dateFrom, lte: query.dateTo },
          ...(query.contextId ? { contextId: query.contextId } : {}),
        },
        orderBy: [{ dateScheduled: "asc" }, { startMinutes: "asc" }],
      });
      return slots.map((s) => ({
        ...s,
        remainingCapacity: s.allocated - s.overallAlloc,
      }));
    },
    findUnscheduledTasks: async (query) => {
      return prisma.task.findMany({
        where: {
          userId: query.userId,
          status: query.status ?? 0,
          schedule: 0,
        },
        orderBy: [{ urgency: "desc" }, { importance: "desc" }, { dateDue: "asc" }],
      });
    },
    findTasksInSlot: async (slotId, uid) => {
      const assignments = await prisma.taskSlotAssignment.findMany({
        where: { slotId, userId: uid },
        include: { task: true },
      });
      return assignments.map((a) => a.task);
    },
    assignTask: async (taskId, slotId, uid) => {
      await prisma.taskSlotAssignment.create({
        data: { taskId, slotId, userId: uid },
      });
    },
    unassignTask: async (taskId, uid) => {
      await prisma.taskSlotAssignment.deleteMany({
        where: { taskId, userId: uid },
      });
    },
    updateSlotCounts: async (slotId, uid) => {
      const count = await prisma.taskSlotAssignment.count({
        where: { slotId, userId: uid },
      });
      await prisma.timeSlot.update({
        where: { id: slotId },
        data: { scheduled: count, count },
      });
    },
    updateTaskScheduleState: async (taskId, data) => {
      await prisma.task.update({
        where: { id: taskId },
        data: { schedule: data.schedule, dateScheduled: data.dateScheduled },
      });
    },
  };
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const mode = body.mode ?? "full";
  const slotId = body.slotId;
  const taskIds = body.taskIds;

  const ctx = createSchedulerContext();
  const result = await reschedule(
    ctx,
    mode,
    { userId: user.id, slotId, taskIds }
  );

  return NextResponse.json({ result });
}
```

- [ ] **Step 4: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tasks/\[tid\]/schedule/ src/app/api/schedule/
git commit -m "feat: add schedule, suggest, and reschedule API routes"
```

---

### Task 6: Schedule Store and Hooks

**Files:**
- Create: `src/stores/schedule-store.ts`
- Create: `src/hooks/use-slots.ts`
- Create: `src/hooks/use-scheduling.ts`

- [ ] **Step 1: Create schedule store**

Create `src/stores/schedule-store.ts`:

```typescript
import { create } from "zustand";

type ScheduleStore = {
  currentDate: Date;
  selectedSlotId: number | null;
  setCurrentDate: (date: Date) => void;
  goToToday: () => void;
  goForward: (days: number) => void;
  goBack: (days: number) => void;
  setSelectedSlot: (id: number | null) => void;
};

export const useScheduleStore = create<ScheduleStore>((set) => ({
  currentDate: new Date(),
  selectedSlotId: null,

  setCurrentDate: (date) => set({ currentDate: date }),

  goToToday: () => set({ currentDate: new Date() }),

  goForward: (days) =>
    set((state) => {
      const next = new Date(state.currentDate);
      next.setDate(next.getDate() + days);
      return { currentDate: next };
    }),

  goBack: (days) =>
    set((state) => {
      const prev = new Date(state.currentDate);
      prev.setDate(prev.getDate() - days);
      return { currentDate: prev };
    }),

  setSelectedSlot: (id) => set({ selectedSlotId: id }),
}));
```

- [ ] **Step 2: Create slot hooks**

Create `src/hooks/use-slots.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TimeSlotWithContext } from "@/lib/types/slot";

export function useSlots(from: string, to: string) {
  return useQuery<TimeSlotWithContext[]>({
    queryKey: ["slots", from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/slots?${params}`);
      if (!res.ok) throw new Error("Failed to fetch slots");
      const data = await res.json();
      return data.slots;
    },
    enabled: !!from && !!to,
  });
}

export function useCreateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create slot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useUpdateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      const res = await fetch(`/api/slots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useDeleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/slots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useCompleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rescheduleMode }: { id: number; rescheduleMode: string }) => {
      const res = await fetch(`/api/slots/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescheduleMode }),
      });
      if (!res.ok) throw new Error("Failed to complete slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
```

- [ ] **Step 3: Create scheduling hooks**

Create `src/hooks/use-scheduling.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useScheduleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, slotId }: { taskId: number; slotId: number }) => {
      const res = await fetch(`/api/tasks/${taskId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useSuggestSlot() {
  return useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch("/api/schedule/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error("Failed to suggest slot");
      return res.json();
    },
  });
}

export function useReschedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { mode: string; slotId?: number; taskIds?: number[] }) => {
      const res = await fetch("/api/schedule/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to reschedule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
```

- [ ] **Step 4: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/stores/schedule-store.ts src/hooks/use-slots.ts src/hooks/use-scheduling.ts
git commit -m "feat: add schedule store and hooks for slots and scheduling"
```

---

### Task 7: Intervention Dialog

**Files:**
- Create: `src/components/shared/intervention-dialog.tsx`

- [ ] **Step 1: Create intervention dialog**

Create `src/components/shared/intervention-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
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
import { TaskSizeLabels } from "@/lib/types/task";
import type { TaskWithChildren } from "@/lib/types/task";
import { useScheduleTask, useSuggestSlot } from "@/hooks/use-scheduling";
import { useChangeStatus } from "@/hooks/use-tasks";
import { TaskStatus } from "@/lib/types/task";
import { formatMinutes } from "@/lib/types/slot";

type InterventionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithChildren | null;
  reason?: string;
};

const dueDateOptions = [
  { label: "Same date", days: 0 },
  { label: "+1 day", days: 1 },
  { label: "+2 days", days: 2 },
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+2 weeks", days: 14 },
  { label: "+1 month", days: 30 },
];

export function InterventionDialog({
  open,
  onOpenChange,
  task,
  reason,
}: InterventionDialogProps) {
  const [selectedDueDays, setSelectedDueDays] = useState("0");
  const [customDate, setCustomDate] = useState("");
  const [suggestedSlot, setSuggestedSlot] = useState<Record<string, unknown> | null>(null);

  const scheduleTask = useScheduleTask();
  const suggestSlot = useSuggestSlot();
  const changeStatus = useChangeStatus();

  if (!task) return null;

  async function handleSuggest() {
    const result = await suggestSlot.mutateAsync(task!.id);
    if (result.slot) {
      setSuggestedSlot(result.slot);
    }
  }

  async function handleAcceptSuggestion() {
    if (suggestedSlot && task) {
      await scheduleTask.mutateAsync({
        taskId: task.id,
        slotId: suggestedSlot.id as number,
      });
      onOpenChange(false);
    }
  }

  async function handleForce() {
    // Force means accept whatever slot is suggested or the first available
    await handleSuggest();
  }

  async function handleDone() {
    if (task) {
      await changeStatus.mutateAsync({ id: task.id, status: TaskStatus.DONE });
      onOpenChange(false);
    }
  }

  async function handleDropped() {
    if (task) {
      await changeStatus.mutateAsync({ id: task.id, status: TaskStatus.DROPPED });
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {reason || "No time slot available as scheduled"}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">{task.description}</p>
            <p className="text-xs text-gray-500">
              Size: {TaskSizeLabels[task.size]} | Context: {task.context?.name ?? "None"}
            </p>
            {task.dateScheduled && (
              <p className="text-xs text-gray-500">
                Scheduled: {new Date(task.dateScheduled).toLocaleDateString()}
              </p>
            )}
          </div>

          <div>
            <Label>Reschedule to</Label>
            <Select value={selectedDueDays} onValueChange={setSelectedDueDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dueDateOptions.map((opt) => (
                  <SelectItem key={opt.days} value={String(opt.days)}>
                    {opt.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom date...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedDueDays === "custom" && (
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </div>
          )}

          {suggestedSlot && (
            <div className="rounded-md border bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">Suggested slot found:</p>
              <p className="text-xs text-green-700">
                {new Date(suggestedSlot.dateScheduled as string).toLocaleDateString()} |{" "}
                {formatMinutes(suggestedSlot.startMinutes as number)} -{" "}
                {formatMinutes(suggestedSlot.endMinutes as number)}
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={handleAcceptSuggestion}
              >
                Accept
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSuggest}>
            Suggest
          </Button>
          <Button variant="outline" size="sm" onClick={handleForce}>
            Force
          </Button>
          <Button variant="outline" size="sm" onClick={handleDone}>
            Done
          </Button>
          <Button variant="outline" size="sm" onClick={handleDropped}>
            Dropped
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/intervention-dialog.tsx
git commit -m "feat: add scheduling intervention dialog"
```

---

### Task 8: Slot Editor Dialog

**Files:**
- Create: `src/components/schedule-view/slot-editor-dialog.tsx`

- [ ] **Step 1: Create slot editor dialog**

Create `src/components/schedule-view/slot-editor-dialog.tsx`:

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
import { ContextPicker } from "@/components/shared/context-picker";
import { useCreateSlot, useUpdateSlot } from "@/hooks/use-slots";
import { formatMinutes } from "@/lib/types/slot";
import type { TimeSlotWithContext } from "@/lib/types/slot";

type SlotEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: TimeSlotWithContext | null;
  defaultDate?: string;
};

export function SlotEditorDialog({
  open,
  onOpenChange,
  slot,
  defaultDate,
}: SlotEditorDialogProps) {
  const isEditing = slot !== null;
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();

  const [contextId, setContextId] = useState<number | null>(null);
  const [dateScheduled, setDateScheduled] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (slot) {
      setContextId(slot.contextId);
      setDateScheduled(new Date(slot.dateScheduled).toISOString().split("T")[0]);
      setStartTime(formatMinutes(slot.startMinutes));
      setEndTime(formatMinutes(slot.endMinutes));
      setDescription(slot.description);
    } else {
      setContextId(null);
      setDateScheduled(defaultDate ?? new Date().toISOString().split("T")[0]);
      setStartTime("09:00");
      setEndTime("17:00");
      setDescription("");
    }
  }, [slot, open, defaultDate]);

  function timeToMinutes(time: string): number {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) return;

    const data = {
      contextId,
      dateScheduled,
      startMinutes,
      endMinutes,
      allocated: endMinutes - startMinutes,
      description,
    };

    if (isEditing) {
      await updateSlot.mutateAsync({ id: slot.id, ...data });
    } else {
      await createSlot.mutateAsync(data);
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Time Slot" : "New Time Slot"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Context</Label>
            <ContextPicker value={contextId} onChange={setContextId} />
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={dateScheduled}
              onChange={(e) => setDateScheduled(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Slot description (optional)"
            />
          </div>

          {isEditing && slot.taskAssignments.length > 0 && (
            <div className="text-xs text-gray-500">
              {slot.taskAssignments.length} task{slot.taskAssignments.length !== 1 ? "s" : ""} scheduled
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule-view/slot-editor-dialog.tsx
git commit -m "feat: add time slot editor dialog"
```

---

### Task 9: Schedule View Components

**Files:**
- Create: `src/components/schedule-view/date-navigator.tsx`
- Create: `src/components/schedule-view/schedule-date-group.tsx`
- Create: `src/components/schedule-view/schedule-list.tsx`

- [ ] **Step 1: Create date navigator**

Create `src/components/schedule-view/date-navigator.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { useScheduleStore } from "@/stores/schedule-store";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DateNavigator() {
  const { currentDate, goToToday, goForward, goBack } = useScheduleStore();

  const isToday = new Date().toDateString() === currentDate.toDateString();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={isToday ? "default" : "outline"}
        onClick={goToToday}
      >
        Today
      </Button>
      <Button size="sm" variant="ghost" onClick={() => goBack(7)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[180px] text-center text-sm font-medium">
        {currentDate.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </span>
      <Button size="sm" variant="ghost" onClick={() => goForward(7)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create schedule date group**

Create `src/components/schedule-view/schedule-date-group.tsx`:

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { TaskStatusLabels, TaskSizeLabels } from "@/lib/types/task";
import { formatMinutes } from "@/lib/types/slot";
import type { TimeSlotWithContext } from "@/lib/types/slot";
import { cn } from "@/lib/utils";

type ScheduleDateGroupProps = {
  date: string;
  slots: TimeSlotWithContext[];
  isToday: boolean;
  onSlotClick: (slot: TimeSlotWithContext) => void;
  onTaskClick: (taskId: number) => void;
};

const statusColors: Record<number, string> = {
  0: "bg-green-100 text-green-800",
  1: "bg-amber-100 text-amber-800",
  2: "bg-red-100 text-red-800",
  3: "bg-blue-100 text-blue-800",
  4: "bg-purple-100 text-purple-800",
};

export function ScheduleDateGroup({
  date,
  slots,
  isToday,
  onSlotClick,
  onTaskClick,
}: ScheduleDateGroupProps) {
  const dateObj = new Date(date);
  const dateLabel = dateObj.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "sticky top-0 z-10 px-3 py-1.5 text-xs font-bold",
          isToday
            ? "bg-blue-50 text-blue-700"
            : "bg-gray-50 text-gray-500"
        )}
      >
        {isToday ? `Today - ${dateLabel}` : dateLabel}
      </div>

      {slots.length === 0 ? (
        <div className="px-3 py-2 text-xs italic text-gray-400">
          No slots scheduled
        </div>
      ) : (
        slots.map((slot) => (
          <div key={slot.id} className="space-y-0.5 px-2">
            <button
              onClick={() => onSlotClick(slot)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-50"
            >
              <span className="w-[100px] shrink-0 text-gray-500">
                {formatMinutes(slot.startMinutes)} - {formatMinutes(slot.endMinutes)}
              </span>
              <span className="truncate font-medium">
                {slot.description || "Time Slot"}
              </span>
              {slot.context && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {slot.context.name}
                </Badge>
              )}
              <span className="ml-auto shrink-0 text-gray-400">
                {slot.taskAssignments.length} task{slot.taskAssignments.length !== 1 ? "s" : ""}
              </span>
            </button>

            {slot.taskAssignments.map((assignment) => (
              <button
                key={assignment.id}
                onClick={() => onTaskClick(assignment.task.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1 pl-[116px] text-left text-xs hover:bg-gray-50",
                  assignment.task.status === 1 && "opacity-50 line-through"
                )}
              >
                <span className="truncate">{assignment.task.description}</span>
                <Badge className={cn("ml-auto shrink-0 text-xs", statusColors[assignment.task.status])}>
                  {TaskStatusLabels[assignment.task.status]}
                </Badge>
                {assignment.task.size > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {TaskSizeLabels[assignment.task.size]}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create schedule list**

Create `src/components/schedule-view/schedule-list.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScheduleDateGroup } from "./schedule-date-group";
import { useSlots } from "@/hooks/use-slots";
import { useScheduleStore } from "@/stores/schedule-store";
import type { TimeSlotWithContext } from "@/lib/types/slot";

type ScheduleListProps = {
  onSlotClick: (slot: TimeSlotWithContext) => void;
  onTaskClick: (taskId: number) => void;
};

export function ScheduleList({ onSlotClick, onTaskClick }: ScheduleListProps) {
  const { currentDate } = useScheduleStore();

  // Show 2 weeks from current date
  const from = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  }, [currentDate]);

  const to = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 13);
    return d.toISOString().split("T")[0];
  }, [currentDate]);

  const { data: slots, isLoading } = useSlots(from, to);

  const today = new Date().toISOString().split("T")[0];

  // Group slots by date
  const groupedSlots = useMemo(() => {
    const groups: Record<string, TimeSlotWithContext[]> = {};

    // Create entries for all 14 days
    for (let i = 0; i < 14; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      groups[key] = [];
    }

    // Assign slots to their dates
    if (slots) {
      for (const slot of slots) {
        const key = new Date(slot.dateScheduled).toISOString().split("T")[0];
        if (groups[key]) {
          groups[key].push(slot);
        }
      }
    }

    return groups;
  }, [slots, currentDate]);

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-gray-500">Loading...</div>;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0">
        {Object.entries(groupedSlots).map(([date, dateSlots]) => (
          <ScheduleDateGroup
            key={date}
            date={date}
            slots={dateSlots}
            isToday={date === today}
            onSlotClick={onSlotClick}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule-view/date-navigator.tsx src/components/schedule-view/schedule-date-group.tsx src/components/schedule-view/schedule-list.tsx
git commit -m "feat: add Schedule View components - date navigator, date groups, and list"
```

---

### Task 10: Schedule View Page

**Files:**
- Modify: `src/app/(app)/schedule/page.tsx`

- [ ] **Step 1: Replace the schedule page placeholder**

Replace `src/app/(app)/schedule/page.tsx` with:

```typescript
"use client";

import { useState } from "react";
import { ScheduleList } from "@/components/schedule-view/schedule-list";
import { DateNavigator } from "@/components/schedule-view/date-navigator";
import { SlotEditorDialog } from "@/components/schedule-view/slot-editor-dialog";
import { InterventionDialog } from "@/components/shared/intervention-dialog";
import { FilterBar } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { useScheduleStore } from "@/stores/schedule-store";
import { useDeleteSlot, useCompleteSlot } from "@/hooks/use-slots";
import { useReschedule } from "@/hooks/use-scheduling";
import type { TimeSlotWithContext } from "@/lib/types/slot";
import { Plus, RefreshCw } from "lucide-react";

export default function SchedulePage() {
  const [editingSlot, setEditingSlot] = useState<TimeSlotWithContext | null>(null);
  const [showNewSlot, setShowNewSlot] = useState(false);
  const [interventionTask, setInterventionTask] = useState<null>(null);
  const { currentDate } = useScheduleStore();

  const deleteSlot = useDeleteSlot();
  const completeSlot = useCompleteSlot();
  const rescheduleAll = useReschedule();

  function handleSlotClick(slot: TimeSlotWithContext) {
    setEditingSlot(slot);
  }

  function handleTaskClick(taskId: number) {
    // Navigate to task - for now just log
    window.location.href = `/tasks?highlight=${taskId}`;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
        <Button size="sm" onClick={() => setShowNewSlot(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Slot
        </Button>
        <FilterBar />
        <DateNavigator />
        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => rescheduleAll.mutate({ mode: "full" })}
            disabled={rescheduleAll.isPending}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${rescheduleAll.isPending ? "animate-spin" : ""}`} />
            Reschedule
          </Button>
        </div>
      </div>

      <ScheduleList
        onSlotClick={handleSlotClick}
        onTaskClick={handleTaskClick}
      />

      <SlotEditorDialog
        open={showNewSlot || editingSlot !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewSlot(false);
            setEditingSlot(null);
          }
        }}
        slot={editingSlot}
        defaultDate={currentDate.toISOString().split("T")[0]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/schedule/page.tsx
git commit -m "feat: add Schedule View page with slot management and reschedule"
```

---

### Task 11: Add Schedule Option to Task View Context Menu

**Files:**
- Modify: `src/app/(app)/tasks/page.tsx`

- [ ] **Step 1: Read the current tasks page**

Read `src/app/(app)/tasks/page.tsx` to understand the current context menu structure.

- [ ] **Step 2: Add Schedule menu item to context menu**

In the tasks page, add a "Schedule" menu item to the right-click context menu. This should open the intervention dialog where users can schedule or suggest a slot for the selected task.

Add these imports at the top:
```typescript
import { InterventionDialog } from "@/components/shared/intervention-dialog";
```

Add state:
```typescript
const [interventionTask, setInterventionTask] = useState<TaskWithChildren | null>(null);
```

Add a "Schedule" DropdownMenuItem in the context menu (after "Notes", before "Toggle Bold"):
```typescript
<DropdownMenuItem onClick={() => { setInterventionTask(contextMenuTask); setShowContextMenu(false); }}>
  Schedule
</DropdownMenuItem>
```

Add the InterventionDialog component at the bottom of the JSX (alongside the other dialogs):
```typescript
<InterventionDialog
  open={interventionTask !== null}
  onOpenChange={(open) => { if (!open) setInterventionTask(null); }}
  task={interventionTask}
/>
```

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/tasks/page.tsx
git commit -m "feat: add Schedule option to Task View context menu with intervention dialog"
```

---

### Task 12: Seed Data for Schedule View

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Read current seed file**

Read `prisma/seed.ts` to understand the current seed structure.

- [ ] **Step 2: Add time slots to seed data**

Add time slot creation after the existing task creation in the seed file. Create slots for the next 5 business days under the Work context, and assign some of the existing tasks to slots.

Add this code after the filter creation section:

```typescript
  // Create time slots for the next 5 business days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slots = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const slot = await prisma.timeSlot.create({
      data: {
        contextId: work.id,
        dateScheduled: date,
        startMinutes: 540,  // 9:00
        endMinutes: 1020,   // 17:00
        allocated: 480,
        description: `Work day ${i + 1}`,
        userId: user.id,
      },
    });
    slots.push(slot);
  }

  // Also create a Personal slot
  const personalSlot = await prisma.timeSlot.create({
    data: {
      contextId: personal.id,
      dateScheduled: new Date(today.getTime() + 86400000), // tomorrow
      startMinutes: 1080,  // 18:00
      endMinutes: 1200,    // 20:00
      allocated: 120,
      description: "Personal evening",
      userId: user.id,
    },
  });

  // Assign some tasks to the first work slot
  if (slots.length > 0) {
    // Get the sub-tasks we created
    const wireframes = await prisma.task.findFirst({
      where: { description: "Wireframes", userId: user.id },
    });
    const fixBug = await prisma.task.findFirst({
      where: { description: "Fix login bug on staging", userId: user.id },
    });

    if (wireframes) {
      await prisma.taskSlotAssignment.create({
        data: { taskId: wireframes.id, slotId: slots[0].id, userId: user.id },
      });
      await prisma.task.update({
        where: { id: wireframes.id },
        data: { schedule: 1, dateScheduled: slots[0].dateScheduled },
      });
      await prisma.timeSlot.update({
        where: { id: slots[0].id },
        data: { scheduled: 1, count: 1 },
      });
    }

    if (fixBug && slots.length > 0) {
      await prisma.taskSlotAssignment.create({
        data: { taskId: fixBug.id, slotId: slots[0].id, userId: user.id },
      });
      await prisma.task.update({
        where: { id: fixBug.id },
        data: { schedule: 1, dateScheduled: slots[0].dateScheduled },
      });
      await prisma.timeSlot.update({
        where: { id: slots[0].id },
        data: { scheduled: 2, count: 2 },
      });
    }
  }

  console.log("Seed complete with schedule data. Login: demo@mentor.app / password123");
```

- [ ] **Step 3: Verify build**

Run: `cd /mnt/d/Mentor2.0/mentor && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add time slot seed data for Schedule View"
```
