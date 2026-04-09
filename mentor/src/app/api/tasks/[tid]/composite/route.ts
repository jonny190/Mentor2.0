import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function POST(
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

  if (existing.type === 1) {
    return NextResponse.json({ error: "Task is already composite" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: { type: 1 },
  });

  return NextResponse.json(task);
}
