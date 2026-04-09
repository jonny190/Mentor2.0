import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid, 10);

  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: {
      children: { orderBy: { sortOrder: "asc" } },
      context: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PUT(
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
  const {
    description, parentId, contextId, importance, urgency,
    size, sizeCustom, status, schedule, dateDue, dateScheduled,
    flags, sortOrder, type, crossRef, stateText, notes,
  } = body;

  if (description !== undefined && (!description || !description.trim())) {
    return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(description !== undefined && { description: description.trim() }),
      ...(parentId !== undefined && { parentId }),
      ...(contextId !== undefined && { contextId }),
      ...(importance !== undefined && { importance }),
      ...(urgency !== undefined && { urgency }),
      ...(size !== undefined && { size }),
      ...(sizeCustom !== undefined && { sizeCustom }),
      ...(status !== undefined && { status }),
      ...(schedule !== undefined && { schedule }),
      ...(dateDue !== undefined && { dateDue: dateDue ? new Date(dateDue) : null }),
      ...(dateScheduled !== undefined && { dateScheduled: dateScheduled ? new Date(dateScheduled) : null }),
      ...(flags !== undefined && { flags }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(type !== undefined && { type }),
      ...(crossRef !== undefined && { crossRef }),
      ...(stateText !== undefined && { stateText }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      context: true,
      _count: { select: { children: true } },
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid, 10);

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { children: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const hadChildren = existing._count.children > 0;

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true, hadChildren });
}
