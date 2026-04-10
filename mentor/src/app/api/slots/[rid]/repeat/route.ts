import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { generateRepeatDates } from "@/lib/engine/repeat";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();
  const { rid } = await params;
  const patterns = await prisma.repeatPattern.findMany({
    where: { slotId: parseInt(rid), userId: user.id },
  });
  return NextResponse.json({ patterns });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();
  const { rid } = await params;
  const slotId = parseInt(rid);
  const body = await request.json();

  const slot = await prisma.timeSlot.findFirst({ where: { id: slotId, userId: user.id } });
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

  await prisma.repeatPattern.deleteMany({ where: { slotId, userId: user.id } });

  if (body.type === 0) {
    return NextResponse.json({ pattern: null, message: "Repeat removed" });
  }

  const dateFrom = body.dateFrom ? new Date(body.dateFrom) : slot.dateScheduled;
  const dateTo = body.dateTo ? new Date(body.dateTo) : null;

  const pattern = await prisma.repeatPattern.create({
    data: {
      slotId,
      type: body.type,
      intervalVal: body.intervalVal ?? 1,
      dateFrom,
      dateTo,
      occurrences: body.occurrences ?? 0,
      flags: body.flags ?? 0,
      priority: body.priority ?? 1,
      pattern: body.pattern ?? "",
      userId: user.id,
    },
  });

  // Generate actual slot instances for the next 90 days
  const rangeFrom = new Date(dateFrom);
  rangeFrom.setHours(0, 0, 0, 0);
  const rangeTo = new Date(rangeFrom);
  rangeTo.setDate(rangeTo.getDate() + 90);

  const dates = generateRepeatDates(
    {
      type: body.type,
      intervalVal: body.intervalVal ?? 1,
      dateFrom,
      dateTo,
      occurrences: body.occurrences ?? 0,
      pattern: body.pattern ?? "",
    },
    rangeFrom,
    rangeTo
  );

  // Create slot instances for each generated date (skip the origin date)
  let created = 0;
  for (const date of dates) {
    const dateStr = date.toISOString().slice(0, 10);
    const slotDateStr = slot.dateScheduled.toISOString().slice(0, 10);
    if (dateStr === slotDateStr) continue;

    // Check if a slot already exists on this date with same start/end and context
    const existing = await prisma.timeSlot.findFirst({
      where: {
        userId: user.id,
        dateScheduled: date,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        contextId: slot.contextId,
      },
    });
    if (existing) continue;

    await prisma.timeSlot.create({
      data: {
        userId: user.id,
        contextId: slot.contextId,
        dateScheduled: date,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        allocated: slot.allocated,
        description: slot.description,
        type: slot.type,
      },
    });
    created++;
  }

  return NextResponse.json({ pattern, instancesCreated: created }, { status: 201 });
}
