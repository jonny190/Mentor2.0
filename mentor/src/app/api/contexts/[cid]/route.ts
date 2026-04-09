import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { cid } = await params;
  const id = parseInt(cid, 10);

  const existing = await prisma.context.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Context not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, parentId, ctxType, symbolType, symbolIcon, sortOrder } = body;

  if (name !== undefined && (!name || !name.trim())) {
    return NextResponse.json({ error: "Name cannot be blank" }, { status: 400 });
  }

  const context = await prisma.context.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(parentId !== undefined && { parentId }),
      ...(ctxType !== undefined && { ctxType }),
      ...(symbolType !== undefined && { symbolType }),
      ...(symbolIcon !== undefined && { symbolIcon }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { cid } = await params;
  const id = parseInt(cid, 10);

  const existing = await prisma.context.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Context not found" }, { status: 404 });
  }

  const remapTo = req.nextUrl.searchParams.get("remapTo");

  if (remapTo) {
    const remapId = parseInt(remapTo, 10);
    const remapContext = await prisma.context.findFirst({
      where: { id: remapId, userId: user.id },
    });
    if (!remapContext) {
      return NextResponse.json({ error: "Remap context not found" }, { status: 404 });
    }
    await prisma.task.updateMany({
      where: { contextId: id, userId: user.id },
      data: { contextId: remapId },
    });
  } else {
    await prisma.task.updateMany({
      where: { contextId: id, userId: user.id },
      data: { contextId: null },
    });
  }

  await prisma.context.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
