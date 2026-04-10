import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { buildFilterWhere, FilterData } from "@/lib/types/filter";
import { suggestSlot, taskSizeToMinutes } from "@/lib/engine/scheduler";
import { ScheduleState, type SchedulerContext } from "@/lib/engine/types";
import { DEFAULT_PREFERENCES, type UserPrefs } from "@/lib/types/preferences";

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const parentIdParam = req.nextUrl.searchParams.get("parentId");
  const filterIdParam = req.nextUrl.searchParams.get("filterId");

  const parentId = parentIdParam ? parseInt(parentIdParam, 10) : null;

  let filterWhere: Record<string, unknown> = {};
  if (filterIdParam) {
    const filterId = parseInt(filterIdParam, 10);
    const filter = await prisma.filter.findFirst({
      where: { id: filterId, userId: user.id },
    });
    if (filter) {
      filterWhere = buildFilterWhere(filter as FilterData);
    }
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      parentId,
      ...filterWhere,
    },
    orderBy: { sortOrder: "asc" },
    include: {
      context: true,
      _count: { select: { children: true } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { description, parentId, contextId, importance, urgency, size, sizeCustom, dateDue } = body;

  if (!description || !description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  if (parentId != null) {
    const parent = await prisma.task.findFirst({
      where: { id: parentId, userId: user.id },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }
  }

  const siblingCount = await prisma.task.count({
    where: { userId: user.id, parentId: parentId ?? null },
  });

  const task = await prisma.task.create({
    data: {
      description: description.trim(),
      parentId: parentId ?? null,
      contextId: contextId ?? null,
      importance: importance ?? 0,
      urgency: urgency ?? 0,
      size: size ?? 0,
      sizeCustom: sizeCustom ?? null,
      dateDue: dateDue ? new Date(dateDue) : null,
      sortOrder: siblingCount,
      userId: user.id,
    },
    include: {
      context: true,
      _count: { select: { children: true } },
    },
  });

  // Auto-schedule if preference is enabled and task has a size
  const prefsRecord = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });
  const prefs: UserPrefs = {
    ...DEFAULT_PREFERENCES,
    ...((prefsRecord?.prefs as Partial<UserPrefs>) ?? {}),
  };

  let autoScheduled = false;
  if (prefs.autoSchedule && task.size > 0) {
    const sizeMinutes = taskSizeToMinutes(task.size, task.sizeCustom, {
      sizeMinutes: prefs.sizeMinutes,
      sizeHour: prefs.sizeHour,
      sizeHalfDay: prefs.sizeHalfDay,
      sizeDay: prefs.sizeDay,
    });

    if (sizeMinutes > 0) {
      const ctx: SchedulerContext = {
        findSlots: async (query) => {
          const slots = await prisma.timeSlot.findMany({
            where: {
              userId: query.userId,
              dateScheduled: { gte: query.dateFrom, lte: query.dateTo },
              ...(query.contextId ? { contextId: query.contextId } : {}),
            },
            orderBy: [{ dateScheduled: "asc" }, { startMinutes: "asc" }],
          });
          return slots.map((s) => ({ ...s, remainingCapacity: s.allocated - s.overallAlloc }));
        },
        findUnscheduledTasks: async () => [],
        findTasksInSlot: async () => [],
        assignTask: async () => {},
        unassignTask: async () => {},
        updateSlotCounts: async () => {},
        updateTaskScheduleState: async () => {},
      };

      const suggested = await suggestSlot(
        ctx,
        {
          id: task.id,
          contextId: task.contextId,
          size: task.size,
          sizeCustom: task.sizeCustom,
          status: task.status,
          schedule: task.schedule,
          dateScheduled: task.dateScheduled,
          dateDue: task.dateDue,
          description: task.description,
          userId: task.userId,
        },
        {
          sizeMinutes,
          scanAheadDays: prefs.scanAheadDays,
          contextId: task.contextId,
        }
      );

      if (suggested) {
        await prisma.taskSlotAssignment.create({
          data: { taskId: task.id, slotId: suggested.id, userId: user.id },
        });
        const count = await prisma.taskSlotAssignment.count({
          where: { slotId: suggested.id, userId: user.id },
        });
        await prisma.timeSlot.update({
          where: { id: suggested.id },
          data: { scheduled: count, count },
        });
        await prisma.task.update({
          where: { id: task.id },
          data: {
            schedule: ScheduleState.SCHEDULED,
            dateScheduled: suggested.dateScheduled,
          },
        });
        autoScheduled = true;
      }
    }
  }

  const finalTask = autoScheduled
    ? await prisma.task.findUnique({
        where: { id: task.id },
        include: { context: true, _count: { select: { children: true } } },
      })
    : task;

  return NextResponse.json(finalTask, { status: 201 });
}
