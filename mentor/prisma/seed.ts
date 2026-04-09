import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@mentor.app" },
    update: {},
    create: {
      email: "demo@mentor.app",
      name: "Demo User",
      password: passwordHash,
    },
  });
  console.log("Created user:", user.email);

  // Create default preferences
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      prefs: {},
    },
  });
  console.log("Created user preferences");

  // Create contexts
  const workCtx = await prisma.context.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Work",
      symbolIcon: "cogs",
      userId: user.id,
      sortOrder: 0,
    },
  });

  const personalCtx = await prisma.context.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Personal",
      symbolIcon: "house",
      userId: user.id,
      sortOrder: 1,
    },
  });

  const studyCtx = await prisma.context.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Study",
      symbolIcon: "book",
      userId: user.id,
      sortOrder: 2,
    },
  });

  console.log("Created contexts: Work, Personal, Study");

  // Create composite task "Website Redesign" under Work
  const websiteTask = await prisma.task.create({
    data: {
      description: "Website Redesign",
      type: 1,
      contextId: workCtx.id,
      userId: user.id,
      sortOrder: 0,
    },
  });

  // Sub-tasks
  await prisma.task.createMany({
    data: [
      {
        description: "Wireframes",
        type: 0,
        contextId: workCtx.id,
        parentId: websiteTask.id,
        userId: user.id,
        status: 0,
        sortOrder: 0,
      },
      {
        description: "Visual Design",
        type: 0,
        contextId: workCtx.id,
        parentId: websiteTask.id,
        userId: user.id,
        status: 0,
        sortOrder: 1,
      },
      {
        description: "Code Prototype",
        type: 0,
        contextId: workCtx.id,
        parentId: websiteTask.id,
        userId: user.id,
        status: 2,
        sortOrder: 2,
      },
    ],
  });

  console.log("Created composite task: Website Redesign with 3 sub-tasks");

  // Standalone tasks
  await prisma.task.createMany({
    data: [
      {
        description: "Grocery shopping",
        type: 0,
        contextId: personalCtx.id,
        userId: user.id,
        status: 0,
        sortOrder: 0,
      },
      {
        description: "Read chapter 5",
        type: 0,
        contextId: studyCtx.id,
        userId: user.id,
        status: 0,
        sortOrder: 0,
      },
      {
        description: "Fix login bug",
        type: 0,
        contextId: workCtx.id,
        userId: user.id,
        status: 0,
        flags: 1,
        urgency: 2,
        sortOrder: 1,
      },
    ],
  });

  console.log("Created 3 standalone tasks");

  // Saved filters
  await prisma.filter.createMany({
    data: [
      {
        name: "Active Only",
        staFilter: "0",
        userId: user.id,
      },
      {
        name: "Work Tasks",
        ctxFilter: String(workCtx.id),
        userId: user.id,
      },
    ],
  });

  console.log("Created 2 saved filters");
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
