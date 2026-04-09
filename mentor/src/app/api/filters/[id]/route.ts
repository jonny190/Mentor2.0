import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);

  const existing = await prisma.filter.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, impFilter, urgFilter, sizFilter, staFilter, schFilter, ctxFilter, flgFilter } = body;

  if (name !== undefined && (!name || !name.trim())) {
    return NextResponse.json({ error: "Name cannot be blank" }, { status: 400 });
  }

  const filter = await prisma.filter.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(impFilter !== undefined && { impFilter }),
      ...(urgFilter !== undefined && { urgFilter }),
      ...(sizFilter !== undefined && { sizFilter }),
      ...(staFilter !== undefined && { staFilter }),
      ...(schFilter !== undefined && { schFilter }),
      ...(ctxFilter !== undefined && { ctxFilter }),
      ...(flgFilter !== undefined && { flgFilter }),
    },
  });

  return NextResponse.json(filter);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);

  const existing = await prisma.filter.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found" }, { status: 404 });
  }

  await prisma.filter.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
