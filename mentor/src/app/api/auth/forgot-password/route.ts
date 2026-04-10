import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ questions: [] });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      securityQuestions: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, question: true },
      },
    },
  });

  if (!user) {
    // Don't leak whether the user exists.
    return NextResponse.json({ questions: [] });
  }

  return NextResponse.json({ questions: user.securityQuestions });
}

type IncomingAnswer = {
  questionId?: unknown;
  answer?: unknown;
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, answers, newPassword } = body as {
    email?: string;
    answers?: IncomingAnswer[];
    newPassword?: string;
  };

  if (!email || !newPassword || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Email, answers, and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      securityQuestions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!user || user.securityQuestions.length !== 3) {
    return NextResponse.json(
      { error: "Unable to verify identity" },
      { status: 400 }
    );
  }

  if (answers.length !== 3) {
    return NextResponse.json(
      { error: "All 3 answers are required" },
      { status: 400 }
    );
  }

  for (const stored of user.securityQuestions) {
    const match = answers.find(
      (a) => typeof a.questionId === "number" && a.questionId === stored.id
    );
    const answer = match && typeof match.answer === "string" ? match.answer : "";
    if (!answer) {
      return NextResponse.json(
        { error: "Unable to verify identity" },
        { status: 400 }
      );
    }
    const normalised = answer.toLowerCase().trim();
    const ok = await bcrypt.compare(normalised, stored.answerHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Unable to verify identity" },
        { status: 400 }
      );
    }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ success: true });
}
