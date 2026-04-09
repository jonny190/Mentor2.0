import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { suggestSlot, taskSizeToMinutes } from "@/lib/engine/scheduler";
import { DEFAULT_PREFERENCES } from "@/lib/types/preferences";
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
      return slots.map((s) => ({ ...s, remainingCapacity: s.allocated - s.overallAlloc }));
    },
    findUnscheduledTasks: async (query) => {
      return prisma.task.findMany({
        where: { userId: query.userId, status: query.status ?? 0, schedule: 0 },
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
      await prisma.taskSlotAssignment.create({ data: { taskId, slotId, userId: uid } });
    },
    unassignTask: async (taskId, uid) => {
      await prisma.taskSlotAssignment.deleteMany({ where: { taskId, userId: uid } });
    },
    updateSlotCounts: async (slotId, uid) => {
      const count = await prisma.taskSlotAssignment.count({ where: { slotId, userId: uid } });
      await prisma.timeSlot.update({ where: { id: slotId }, data: { scheduled: count, count } });
    },
    updateTaskScheduleState: async (taskId, data) => {
      await prisma.task.update({ where: { id: taskId }, data: { schedule: data.schedule, dateScheduled: data.dateScheduled } });
    },
  };
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
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

  const userPrefs = await prisma.userPreferences.findUnique({ where: { userId: user.id } });
  const prefs = (userPrefs?.prefs as Record<string, unknown>) ?? {};
  const sizePrefs = {
    sizeMinutes: (prefs.sizeMinutes as number) ?? DEFAULT_PREFERENCES.sizeMinutes,
    sizeHour: (prefs.sizeHour as number) ?? DEFAULT_PREFERENCES.sizeHour,
    sizeHalfDay: (prefs.sizeHalfDay as number) ?? DEFAULT_PREFERENCES.sizeHalfDay,
    sizeDay: (prefs.sizeDay as number) ?? DEFAULT_PREFERENCES.sizeDay,
  };
  const scanAheadDays = (prefs.scanAheadDays as number) ?? DEFAULT_PREFERENCES.scanAheadDays;

  const sizeMinutes = taskSizeToMinutes(task.size, task.sizeCustom, sizePrefs);

  const ctx = createSchedulerContext();
  const slot = await suggestSlot(ctx, task, {
    sizeMinutes,
    scanAheadDays,
    contextId: task.contextId,
  });

  if (slot) {
    return NextResponse.json({ slot });
  }

  return NextResponse.json({
    slot: null,
    message: "No suitable slot found within the scan range",
  });
}
