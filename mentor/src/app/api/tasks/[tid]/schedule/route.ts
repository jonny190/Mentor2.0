import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { ScheduleState } from "@/lib/engine/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const taskId = parseInt(tid, 10);

  const body = await req.json();
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

  const existing = await prisma.taskSlotAssignment.findFirst({
    where: { taskId, slotId, userId: user.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Task is already assigned to this slot" },
      { status: 409 }
    );
  }

  await prisma.taskSlotAssignment.create({
    data: { taskId, slotId, userId: user.id },
  });

  const count = await prisma.taskSlotAssignment.count({
    where: { slotId, userId: user.id },
  });
  await prisma.timeSlot.update({
    where: { id: slotId },
    data: { scheduled: count, count },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      schedule: ScheduleState.SCHEDULED,
      dateScheduled: slot.dateScheduled,
    },
  });

  return NextResponse.json({ success: true, taskId, slotId });
}
