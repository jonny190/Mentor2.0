import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

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

  const pattern = await prisma.repeatPattern.create({
    data: {
      slotId,
      type: body.type,
      intervalVal: body.intervalVal ?? 1,
      dateFrom: body.dateFrom ? new Date(body.dateFrom) : slot.dateScheduled,
      dateTo: body.dateTo ? new Date(body.dateTo) : null,
      occurrences: body.occurrences ?? 0,
      flags: body.flags ?? 0,
      priority: body.priority ?? 1,
      pattern: body.pattern ?? "",
      userId: user.id,
    },
  });

  return NextResponse.json({ pattern }, { status: 201 });
}
