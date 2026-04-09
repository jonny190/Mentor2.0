import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const contextId = req.nextUrl.searchParams.get("contextId");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query parameters are required" },
      { status: 400 }
    );
  }

  const slots = await prisma.timeSlot.findMany({
    where: {
      userId: user.id,
      dateScheduled: {
        gte: new Date(from),
        lte: new Date(to),
      },
      ...(contextId ? { contextId: parseInt(contextId, 10) } : {}),
    },
    include: {
      context: true,
      taskAssignments: {
        include: { task: true },
      },
    },
    orderBy: [{ dateScheduled: "asc" }, { startMinutes: "asc" }],
  });

  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const {
    contextId,
    dateScheduled,
    startMinutes = 540,
    endMinutes = 1020,
    allocated,
    description,
    type,
  } = body;

  if (!dateScheduled) {
    return NextResponse.json(
      { error: "dateScheduled is required" },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(dateScheduled);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (scheduledDate < today) {
    return NextResponse.json(
      { error: "dateScheduled cannot be in the past" },
      { status: 400 }
    );
  }

  const finalAllocated = allocated ?? endMinutes - startMinutes;

  const slot = await prisma.timeSlot.create({
    data: {
      userId: user.id,
      contextId: contextId ?? null,
      dateScheduled: scheduledDate,
      startMinutes,
      endMinutes,
      allocated: finalAllocated,
      overallAlloc: 0,
      scheduled: 0,
      count: 0,
      description: description ?? "",
      type: type ?? 0,
    },
  });

  return NextResponse.json(slot, { status: 201 });
}
