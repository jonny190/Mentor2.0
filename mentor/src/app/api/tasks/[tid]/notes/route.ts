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
    select: { id: true, notes: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ id: task.id, notes: task.notes });
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
  const { notes } = body;

  const task = await prisma.task.update({
    where: { id },
    data: { notes: notes ?? "" },
  });

  return NextResponse.json({ id: task.id, notes: task.notes });
}
