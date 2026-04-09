import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

async function getDescendantIds(taskId: number, userId: number): Promise<Set<number>> {
  const ids = new Set<number>();
  const queue = [taskId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    ids.add(currentId);
    const children = await prisma.task.findMany({
      where: { parentId: currentId, userId },
      select: { id: true },
    });
    for (const child of children) {
      queue.push(child.id);
    }
  }

  return ids;
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

    const descendants = await getDescendantIds(id, user.id);
    if (descendants.has(targetParentId)) {
      return NextResponse.json(
        { error: "Cannot move task into itself or its descendants" },
        { status: 400 }
      );
    }
  }

  const siblingCount = await prisma.task.count({
    where: { userId: user.id, parentId: targetParentId ?? null, id: { not: id } },
  });

  const task = await prisma.task.update({
    where: { id },
    data: {
      parentId: targetParentId ?? null,
      sortOrder: siblingCount,
    },
  });

  return NextResponse.json(task);
}
