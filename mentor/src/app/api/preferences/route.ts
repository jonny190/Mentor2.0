import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { DEFAULT_PREFERENCES, UserPrefs } from "@/lib/types/preferences";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const record = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });

  const storedPrefs = record ? (record.prefs as Partial<UserPrefs>) : {};
  const merged = { ...DEFAULT_PREFERENCES, ...storedPrefs };

  return NextResponse.json(merged);
}

export async function PUT(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await req.json();

  const existing = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });

  const existingPrefs = existing ? (existing.prefs as Partial<UserPrefs>) : {};
  const merged = { ...existingPrefs, ...body };

  const record = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: { prefs: merged },
    create: { userId: user.id, prefs: merged },
  });

  const fullPrefs = { ...DEFAULT_PREFERENCES, ...(record.prefs as Partial<UserPrefs>) };

  return NextResponse.json(fullPrefs);
}
