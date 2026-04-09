import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const format = req.nextUrl.searchParams.get("format") ?? "json";

  const [tasks, contexts, slots, filters] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id },
      include: { context: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.context.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.timeSlot.findMany({
      where: { userId: user.id },
      include: { context: true, taskAssignments: true },
      orderBy: { dateScheduled: "asc" },
    }),
    prisma.filter.findMany({
      where: { userId: user.id },
    }),
  ]);

  if (format === "csv") {
    const headers = [
      "id",
      "description",
      "type",
      "status",
      "importance",
      "urgency",
      "size",
      "schedule",
      "flags",
      "parentId",
      "contextId",
      "contextName",
      "dateEntered",
      "dateUpdated",
      "dateScheduled",
      "dateDue",
      "crossRef",
      "stateText",
      "notes",
      "sortOrder",
    ];

    const escapeCSV = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = tasks.map((t) =>
      [
        t.id,
        t.description,
        t.type,
        t.status,
        t.importance,
        t.urgency,
        t.size,
        t.schedule,
        t.flags,
        t.parentId,
        t.contextId,
        t.context?.name ?? "",
        t.dateEntered?.toISOString() ?? "",
        t.dateUpdated?.toISOString() ?? "",
        t.dateScheduled?.toISOString() ?? "",
        t.dateDue?.toISOString() ?? "",
        t.crossRef,
        t.stateText,
        t.notes,
        t.sortOrder,
      ]
        .map(escapeCSV)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mentor-export-${now}.csv"`,
      },
    });
  }

  // JSON format
  const data = {
    exportDate: new Date().toISOString(),
    tasks,
    contexts,
    slots,
    filters,
  };

  const now = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mentor-export-${now}.json"`,
    },
  });
}
