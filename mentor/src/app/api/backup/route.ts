import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { DEFAULT_PREFERENCES, UserPrefs } from "@/lib/types/preferences";
import type { Prisma } from "@/generated/prisma/client";

const BACKUP_VERSION = 1;

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const [tasks, contexts, slots, assignments, repeatPatterns, filters, prefsRecord] =
    await Promise.all([
      prisma.task.findMany({ where: { userId: user.id } }),
      prisma.context.findMany({ where: { userId: user.id } }),
      prisma.timeSlot.findMany({ where: { userId: user.id } }),
      prisma.taskSlotAssignment.findMany({ where: { userId: user.id } }),
      prisma.repeatPattern.findMany({ where: { userId: user.id } }),
      prisma.filter.findMany({ where: { userId: user.id } }),
      prisma.userPreferences.findUnique({ where: { userId: user.id } }),
    ]);

  const preferences = prefsRecord
    ? { ...DEFAULT_PREFERENCES, ...(prefsRecord.prefs as Partial<UserPrefs>) }
    : DEFAULT_PREFERENCES;

  const backup = {
    version: BACKUP_VERSION,
    exportDate: new Date().toISOString(),
    data: {
      contexts,
      tasks,
      slots,
      assignments,
      repeatPatterns,
      filters,
      preferences,
    },
  };

  const now = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mentor-backup-${now}.json"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.version || !body.data) {
    return NextResponse.json(
      { error: "Invalid backup format: must have version and data" },
      { status: 400 }
    );
  }

  const data = body.data as {
    contexts?: Array<Record<string, unknown>>;
    tasks?: Array<Record<string, unknown>>;
    slots?: Array<Record<string, unknown>>;
    assignments?: Array<Record<string, unknown>>;
    repeatPatterns?: Array<Record<string, unknown>>;
    filters?: Array<Record<string, unknown>>;
    preferences?: Record<string, unknown>;
  };

  // Delete all existing user data in dependency order
  await prisma.repeatPattern.deleteMany({ where: { userId: user.id } });
  await prisma.taskSlotAssignment.deleteMany({ where: { userId: user.id } });
  await prisma.timeSlot.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.filter.deleteMany({ where: { userId: user.id } });
  await prisma.context.deleteMany({ where: { userId: user.id } });
  await prisma.userPreferences.deleteMany({ where: { userId: user.id } });

  const counts = {
    contexts: 0,
    tasks: 0,
    slots: 0,
    assignments: 0,
    repeatPatterns: 0,
    filters: 0,
    preferences: 0,
  };

  // Restore contexts with ID mapping
  const contextIdMap = new Map<number, number>();
  if (data.contexts?.length) {
    for (const ctx of data.contexts) {
      const created = await prisma.context.create({
        data: {
          name: ctx.name as string,
          description: (ctx.description as string) ?? "",
          ctxType: (ctx.ctxType as number) ?? 0,
          symbolType: (ctx.symbolType as number) ?? 0,
          symbolIcon: (ctx.symbolIcon as string) ?? "",
          sortOrder: (ctx.sortOrder as number) ?? 0,
          parentId: null, // will fix parent refs in a second pass
          userId: user.id,
        },
      });
      contextIdMap.set(ctx.id as number, created.id);
      counts.contexts++;
    }

    // Fix parent references for contexts
    for (const ctx of data.contexts) {
      if (ctx.parentId != null) {
        const newId = contextIdMap.get(ctx.id as number);
        const newParentId = contextIdMap.get(ctx.parentId as number);
        if (newId != null && newParentId != null) {
          await prisma.context.update({
            where: { id: newId },
            data: { parentId: newParentId },
          });
        }
      }
    }
  }

  // Restore tasks - root tasks first, then children
  const taskIdMap = new Map<number, number>();
  if (data.tasks?.length) {
    const rootTasks = data.tasks.filter((t) => t.parentId == null);
    const childTasks = data.tasks.filter((t) => t.parentId != null);

    const createTask = async (t: Record<string, unknown>, parentId: number | null) => {
      const created = await prisma.task.create({
        data: {
          type: (t.type as number) ?? 0,
          contextId: t.contextId != null ? (contextIdMap.get(t.contextId as number) ?? null) : null,
          flags: (t.flags as number) ?? 0,
          importance: (t.importance as number) ?? 0,
          urgency: (t.urgency as number) ?? 0,
          size: (t.size as number) ?? 0,
          sizeCustom: (t.sizeCustom as number | null) ?? null,
          status: (t.status as number) ?? 0,
          schedule: (t.schedule as number) ?? 0,
          dateEntered: t.dateEntered ? new Date(t.dateEntered as string) : new Date(),
          dateUpdated: t.dateUpdated ? new Date(t.dateUpdated as string) : new Date(),
          dateScheduled: t.dateScheduled ? new Date(t.dateScheduled as string) : null,
          dateDue: t.dateDue ? new Date(t.dateDue as string) : null,
          description: (t.description as string) ?? "",
          crossRef: (t.crossRef as string) ?? "",
          stateText: (t.stateText as string) ?? "",
          notes: (t.notes as string) ?? "",
          sortOrder: (t.sortOrder as number) ?? 0,
          parentId,
          userId: user.id,
        },
      });
      taskIdMap.set(t.id as number, created.id);
      counts.tasks++;
    };

    for (const t of rootTasks) {
      await createTask(t, null);
    }

    // Multiple passes for nested children
    let remaining = [...childTasks];
    let maxPasses = 20;
    while (remaining.length > 0 && maxPasses > 0) {
      const next: typeof remaining = [];
      for (const t of remaining) {
        const newParentId = taskIdMap.get(t.parentId as number);
        if (newParentId != null) {
          await createTask(t, newParentId);
        } else {
          next.push(t);
        }
      }
      remaining = next;
      maxPasses--;
    }
  }

  // Restore slots with ID mapping
  const slotIdMap = new Map<number, number>();
  if (data.slots?.length) {
    for (const s of data.slots) {
      const created = await prisma.timeSlot.create({
        data: {
          type: (s.type as number) ?? 0,
          contextId: s.contextId != null ? (contextIdMap.get(s.contextId as number) ?? null) : null,
          dateScheduled: new Date(s.dateScheduled as string),
          startMinutes: (s.startMinutes as number) ?? 540,
          endMinutes: (s.endMinutes as number) ?? 1020,
          allocated: (s.allocated as number) ?? 0,
          scheduled: (s.scheduled as number) ?? 0,
          count: (s.count as number) ?? 0,
          overallAlloc: (s.overallAlloc as number) ?? 0,
          description: (s.description as string) ?? "",
          crossRef: (s.crossRef as string) ?? "",
          userId: user.id,
        },
      });
      slotIdMap.set(s.id as number, created.id);
      counts.slots++;
    }
  }

  // Restore assignments
  if (data.assignments?.length) {
    for (const a of data.assignments) {
      const newTaskId = taskIdMap.get(a.taskId as number);
      const newSlotId = slotIdMap.get(a.slotId as number);
      if (newTaskId != null && newSlotId != null) {
        await prisma.taskSlotAssignment.create({
          data: {
            taskId: newTaskId,
            slotId: newSlotId,
            userId: user.id,
          },
        });
        counts.assignments++;
      }
    }
  }

  // Restore repeat patterns
  if (data.repeatPatterns?.length) {
    for (const rp of data.repeatPatterns) {
      const newSlotId = slotIdMap.get(rp.slotId as number);
      if (newSlotId != null) {
        await prisma.repeatPattern.create({
          data: {
            slotId: newSlotId,
            type: rp.type as number,
            intervalVal: (rp.intervalVal as number) ?? 1,
            dateTo: rp.dateTo ? new Date(rp.dateTo as string) : null,
            dateFrom: new Date(rp.dateFrom as string),
            occurrences: (rp.occurrences as number) ?? 0,
            flags: (rp.flags as number) ?? 0,
            priority: (rp.priority as number) ?? 1,
            pattern: (rp.pattern as string) ?? "",
            userId: user.id,
          },
        });
        counts.repeatPatterns++;
      }
    }
  }

  // Restore filters
  if (data.filters?.length) {
    for (const f of data.filters) {
      await prisma.filter.create({
        data: {
          name: f.name as string,
          impFilter: (f.impFilter as string) ?? "",
          urgFilter: (f.urgFilter as string) ?? "",
          sizFilter: (f.sizFilter as string) ?? "",
          staFilter: (f.staFilter as string) ?? "",
          schFilter: (f.schFilter as string) ?? "",
          ctxFilter: (f.ctxFilter as string) ?? "",
          flgFilter: (f.flgFilter as string) ?? "",
          userId: user.id,
        },
      });
      counts.filters++;
    }
  }

  // Restore preferences
  if (data.preferences) {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: { prefs: data.preferences as Prisma.InputJsonValue },
      create: { userId: user.id, prefs: data.preferences as Prisma.InputJsonValue },
    });
    counts.preferences = 1;
  }

  return NextResponse.json({ success: true, counts });
}
