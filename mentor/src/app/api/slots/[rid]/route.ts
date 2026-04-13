import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const id = parseInt(rid, 10);

  const slot = await prisma.timeSlot.findFirst({
    where: { id, userId: user.id },
    include: {
      context: true,
      taskAssignments: {
        include: { task: true },
      },
    },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  return NextResponse.json(slot);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const id = parseInt(rid, 10);

  const existing = await prisma.timeSlot.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  const body = await req.json();
  const { contextId, dateScheduled, startMinutes, endMinutes, allocated, description, type } = body;

  const slot = await prisma.timeSlot.update({
    where: { id },
    data: {
      ...(contextId !== undefined && { contextId }),
      ...(dateScheduled !== undefined && {
        dateScheduled: /^\d{4}-\d{2}-\d{2}$/.test(dateScheduled)
          ? new Date(`${dateScheduled}T12:00:00.000Z`)
          : new Date(dateScheduled),
      }),
      ...(startMinutes !== undefined && { startMinutes }),
      ...(endMinutes !== undefined && { endMinutes }),
      ...(allocated !== undefined && { allocated }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
    },
  });

  return NextResponse.json(slot);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ rid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { rid } = await params;
  const id = parseInt(rid, 10);

  const existing = await prisma.timeSlot.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  await prisma.taskSlotAssignment.deleteMany({ where: { slotId: id, userId: user.id } });
  await prisma.timeSlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
