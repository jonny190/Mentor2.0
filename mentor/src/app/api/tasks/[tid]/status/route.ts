import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

const VALID_STATUSES = [0, 1, 2, 3, 4];

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
  const { status } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status value (0-4)" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(task);
}
