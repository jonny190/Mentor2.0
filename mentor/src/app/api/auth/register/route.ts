import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_PREFERENCES } from "@/lib/types/preferences";

type IncomingSecurityQuestion = {
  question?: unknown;
  answer?: unknown;
};

export async function POST(request: Request) {
  const body = await request.json();
  const { email, name, password, securityQuestions } = body as {
    email?: string;
    name?: string;
    password?: string;
    securityQuestions?: IncomingSecurityQuestion[];
  };

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "Email, name, and password are required" },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(securityQuestions) ||
    securityQuestions.length !== 3
  ) {
    return NextResponse.json(
      { error: "Exactly 3 security questions are required" },
      { status: 400 }
    );
  }

  const normalisedQuestions: { question: string; answer: string }[] = [];
  for (const sq of securityQuestions) {
    const question = typeof sq.question === "string" ? sq.question.trim() : "";
    const answer = typeof sq.answer === "string" ? sq.answer.trim() : "";
    if (!question || !answer) {
      return NextResponse.json(
        { error: "All security questions and answers are required" },
        { status: 400 }
      );
    }
    normalisedQuestions.push({ question, answer });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const hashedQuestions = await Promise.all(
    normalisedQuestions.map(async (q, index) => ({
      question: q.question,
      answerHash: await bcrypt.hash(q.answer.toLowerCase(), 12),
      sortOrder: index,
    }))
  );

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        preferences: {
          create: { prefs: DEFAULT_PREFERENCES as unknown as Prisma.InputJsonValue },
        },
        contexts: {
          create: { name: "Undefined", description: "Default context", sortOrder: 0 },
        },
        securityQuestions: {
          create: hashedQuestions,
        },
      },
      select: { id: true, email: true, name: true },
    });
    return created;
  });

  return NextResponse.json({ user }, { status: 201 });
}
