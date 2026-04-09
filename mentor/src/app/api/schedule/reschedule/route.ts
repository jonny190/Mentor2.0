import { NextRequest, NextResponse } from "next/server";
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
  const { mode, slotId, taskIds } = body;

  if (!mode || !["full", "incremental"].includes(mode)) {
    return NextResponse.json(
      { error: "mode must be 'full' or 'incremental'" },
      { status: 400 }
    );
  }

  const ctx = createSchedulerContext();
  const result = await reschedule(ctx, mode, {
    userId: user.id,
    slotId,
    taskIds,
  });

  return NextResponse.json(result);
}
