import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const questions = await prisma.securityQuestion.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, question: true, sortOrder: true },
  });

  return NextResponse.json({ questions });
}

type IncomingQuestion = {
  question?: unknown;
  answer?: unknown;
};

export async function PUT(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { questions } = body as { questions?: IncomingQuestion[] };

  if (!Array.isArray(questions) || questions.length !== 3) {
    return NextResponse.json(
      { error: "Exactly 3 security questions are required" },
      { status: 400 }
    );
  }

  const normalised: { question: string; answer: string }[] = [];
  for (const q of questions) {
    const question = typeof q.question === "string" ? q.question.trim() : "";
    const answer = typeof q.answer === "string" ? q.answer.trim() : "";
    if (!question || !answer) {
      return NextResponse.json(
        { error: "All security questions and answers are required" },
        { status: 400 }
      );
    }
    normalised.push({ question, answer });
  }

  const hashed = await Promise.all(
    normalised.map(async (q, index) => ({
      question: q.question,
      answerHash: await bcrypt.hash(q.answer.toLowerCase(), 12),
      sortOrder: index,
      userId: user.id,
    }))
  );

  await prisma.$transaction([
    prisma.securityQuestion.deleteMany({ where: { userId: user.id } }),
    prisma.securityQuestion.createMany({ data: hashed }),
  ]);

  return NextResponse.json({ success: true });
}
