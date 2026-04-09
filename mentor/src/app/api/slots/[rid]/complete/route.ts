import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { completeSlot } from "@/lib/engine/reschedule";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const slotId = parseInt(rid, 10);

  const slot = await prisma.timeSlot.findFirst({
    where: { id: slotId, userId: user.id },
  });
  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const body = await req.json();
  const { rescheduleMode } = body;

  if (!rescheduleMode || !["this-slot", "all-current"].includes(rescheduleMode)) {
    return NextResponse.json(
      { error: "rescheduleMode must be 'this-slot' or 'all-current'" },
      { status: 400 }
    );
  }

  const ctx = createSchedulerContext();
  const result = await completeSlot(ctx, slotId, user.id, { rescheduleMode });

  return NextResponse.json(result);
}
