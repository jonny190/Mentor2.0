import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const contexts = await prisma.context.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
    include: { children: true },
  });

  return NextResponse.json(contexts);
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { name, description, parentId, ctxType, symbolType, symbolIcon } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (parentId != null) {
    const parent = await prisma.context.findFirst({
      where: { id: parentId, userId: user.id },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent context not found" }, { status: 404 });
    }
  }

  const context = await prisma.context.create({
    data: {
      name: name.trim(),
      description: description ?? "",
      parentId: parentId ?? null,
      ctxType: ctxType ?? 0,
      symbolType: symbolType ?? 0,
      symbolIcon: symbolIcon ?? "",
      sortOrder: 0,
      userId: user.id,
    },
  });

  return NextResponse.json(context, { status: 201 });
}
