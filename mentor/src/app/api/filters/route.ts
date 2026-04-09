import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const filters = await prisma.filter.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(filters);
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();
  const { name, impFilter, urgFilter, sizFilter, staFilter, schFilter, ctxFilter, flgFilter } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const filter = await prisma.filter.create({
    data: {
      name: name.trim(),
      impFilter: impFilter ?? "",
      urgFilter: urgFilter ?? "",
      sizFilter: sizFilter ?? "",
      staFilter: staFilter ?? "",
      schFilter: schFilter ?? "",
      ctxFilter: ctxFilter ?? "",
      flgFilter: flgFilter ?? "",
      userId: user.id,
    },
  });

  return NextResponse.json(filter, { status: 201 });
}
