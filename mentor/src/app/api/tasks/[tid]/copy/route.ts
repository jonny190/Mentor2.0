import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { Task } from "@/generated/prisma/client";

async function copyTaskTree(
  task: Task,
  targetParentId: number | null,
  userId: number
): Promise<Task> {
  const siblingCount = await prisma.task.count({
    where: { userId, parentId: targetParentId },
  });

  const copy = await prisma.task.create({
    data: {
      description: task.description,
      parentId: targetParentId,
      contextId: task.contextId,
      type: task.type,
      flags: task.flags,
      importance: task.importance,
      urgency: task.urgency,
      size: task.size,
      sizeCustom: task.sizeCustom,
      status: 0,
      schedule: task.schedule,
      dateDue: task.dateDue,
      dateScheduled: task.dateScheduled,
      crossRef: task.crossRef,
      stateText: task.stateText,
      notes: task.notes,
      sortOrder: siblingCount,
      userId,
    },
  });

  const children = await prisma.task.findMany({
    where: { parentId: task.id, userId },
    orderBy: { sortOrder: "asc" },
  });

  for (const child of children) {
    await copyTaskTree(child, copy.id, userId);
  }

  return copy;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid, 10);

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();
  const { targetParentId } = body;

  if (targetParentId != null) {
    const target = await prisma.task.findFirst({
      where: { id: targetParentId, userId: user.id },
    });
    if (!target) {
      return NextResponse.json({ error: "Target parent not found" }, { status: 404 });
    }
  }

  const copy = await copyTaskTree(existing, targetParentId ?? null, user.id);

  return NextResponse.json(copy, { status: 201 });
}
