import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { buildFilterWhere, FilterData } from "@/lib/types/filter";

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const parentIdParam = req.nextUrl.searchParams.get("parentId");
  const filterIdParam = req.nextUrl.searchParams.get("filterId");

  const parentId = parentIdParam ? parseInt(parentIdParam, 10) : null;

  let filterWhere: Record<string, unknown> = {};
  if (filterIdParam) {
    const filterId = parseInt(filterIdParam, 10);
    const filter = await prisma.filter.findFirst({
      where: { id: filterId, userId: user.id },
    });
    if (filter) {
      filterWhere = buildFilterWhere(filter as FilterData);
    }
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      parentId,
      ...filterWhere,
    },
    orderBy: { sortOrder: "asc" },
    include: {
      context: true,
      _count: { select: { children: true } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { description, parentId, contextId, importance, urgency, size, sizeCustom, dateDue } = body;

  if (!description || !description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  if (parentId != null) {
    const parent = await prisma.task.findFirst({
      where: { id: parentId, userId: user.id },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }
  }

  const siblingCount = await prisma.task.count({
    where: { userId: user.id, parentId: parentId ?? null },
  });

  const task = await prisma.task.create({
    data: {
      description: description.trim(),
      parentId: parentId ?? null,
      contextId: contextId ?? null,
      importance: importance ?? 0,
      urgency: urgency ?? 0,
      size: size ?? 0,
      sizeCustom: sizeCustom ?? null,
      dateDue: dateDue ? new Date(dateDue) : null,
      sortOrder: siblingCount,
      userId: user.id,
    },
    include: {
      context: true,
      _count: { select: { children: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
