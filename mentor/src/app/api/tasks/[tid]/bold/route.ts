import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

const TASK_FLAG_BOLD = 1;

export async function PUT(
  _req: NextRequest,
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

  const newFlags = existing.flags ^ TASK_FLAG_BOLD;

  const task = await prisma.task.update({
    where: { id },
    data: { flags: newFlags },
  });

  return NextResponse.json(task);
}
