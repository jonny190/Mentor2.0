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

  // Create time slots for the next 5 business days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use short aliases to avoid TS shadowing issues with the upsert vars above
  const work = workCtx;
  const personal = personalCtx;

  const slots = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const slot = await prisma.timeSlot.create({
      data: {
        contextId: work.id,
        dateScheduled: date,
        startMinutes: 540,
        endMinutes: 1020,
        allocated: 480,
        description: `Work day`,
        userId: user.id,
      },
    });
    slots.push(slot);
  }

  const personalSlot = await prisma.timeSlot.create({
    data: {
      contextId: personal.id,
      dateScheduled: new Date(today.getTime() + 86400000),
      startMinutes: 1080,
      endMinutes: 1200,
      allocated: 120,
      description: "Personal evening",
      userId: user.id,
    },
  });

  if (slots.length > 0) {
    const wireframes = await prisma.task.findFirst({
      where: { description: "Wireframes", userId: user.id },
    });
    const fixBug = await prisma.task.findFirst({
      where: { description: "Fix login bug", userId: user.id },
    });

    if (wireframes) {
      await prisma.taskSlotAssignment.create({
        data: { taskId: wireframes.id, slotId: slots[0].id, userId: user.id },
      });
      await prisma.task.update({
        where: { id: wireframes.id },
        data: { schedule: 1, dateScheduled: slots[0].dateScheduled },
      });
    }

    if (fixBug) {
      await prisma.taskSlotAssignment.create({
        data: { taskId: fixBug.id, slotId: slots[0].id, userId: user.id },
      });
      await prisma.task.update({
        where: { id: fixBug.id },
        data: { schedule: 1, dateScheduled: slots[0].dateScheduled },
      });
    }

    if (wireframes || fixBug) {
      const assignmentCount = (wireframes ? 1 : 0) + (fixBug ? 1 : 0);
      await prisma.timeSlot.update({
        where: { id: slots[0].id },
        data: { scheduled: assignmentCount, count: assignmentCount },
      });
    }
  }

  console.log("Created time slots and schedule seed data.");
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
