import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const q = req.nextUrl.searchParams.get("q");
  const includeNotes = req.nextUrl.searchParams.get("notes") === "1";

  if (!q || !q.trim()) {
    return NextResponse.json([]);
  }

  const searchConditions: Record<string, unknown>[] = [
    { description: { contains: q, mode: "insensitive" } },
  ];

  if (includeNotes) {
    searchConditions.push({ notes: { contains: q, mode: "insensitive" } });
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      OR: searchConditions,
    },
    orderBy: { dateUpdated: "desc" },
    take: 50,
    include: {
      context: true,
    },
  });

  return NextResponse.json(tasks);
}
