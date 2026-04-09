-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER,
    "type" INTEGER NOT NULL DEFAULT 0,
    "contextId" INTEGER,
    "flags" INTEGER NOT NULL DEFAULT 0,
    "importance" INTEGER NOT NULL DEFAULT 0,
    "urgency" INTEGER NOT NULL DEFAULT 0,
    "size" INTEGER NOT NULL DEFAULT 0,
    "sizeCustom" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 0,
    "schedule" INTEGER NOT NULL DEFAULT 0,
    "dateEntered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateScheduled" TIMESTAMP(3),
    "dateDue" TIMESTAMP(3),
    "description" TEXT NOT NULL DEFAULT '',
    "crossRef" TEXT NOT NULL DEFAULT '',
    "stateText" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Context" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ctxType" INTEGER NOT NULL DEFAULT 0,
    "symbolType" INTEGER NOT NULL DEFAULT 0,
    "symbolIcon" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" SERIAL NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "contextId" INTEGER,
    "dateScheduled" TIMESTAMP(3) NOT NULL,
    "startMinutes" INTEGER NOT NULL DEFAULT 540,
    "endMinutes" INTEGER NOT NULL DEFAULT 1020,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "scheduled" INTEGER NOT NULL DEFAULT 0,
    "count" INTEGER NOT NULL DEFAULT 0,
    "overallAlloc" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "crossRef" TEXT NOT NULL DEFAULT '',
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepeatPattern" (
    "id" SERIAL NOT NULL,
    "slotId" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "intervalVal" INTEGER NOT NULL DEFAULT 1,
    "dateTo" TIMESTAMP(3),
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "flags" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "pattern" TEXT NOT NULL DEFAULT '',
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RepeatPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSlotAssignment" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TaskSlotAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "impFilter" TEXT NOT NULL DEFAULT '',
    "urgFilter" TEXT NOT NULL DEFAULT '',
    "sizFilter" TEXT NOT NULL DEFAULT '',
    "staFilter" TEXT NOT NULL DEFAULT '',
    "schFilter" TEXT NOT NULL DEFAULT '',
    "ctxFilter" TEXT NOT NULL DEFAULT '',
    "flgFilter" TEXT NOT NULL DEFAULT '',
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "prefs" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Task_userId_parentId_idx" ON "Task"("userId", "parentId");
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_contextId_idx" ON "Task"("userId", "contextId");
CREATE INDEX "Task_userId_dateScheduled_idx" ON "Task"("userId", "dateScheduled");
CREATE INDEX "Task_userId_dateDue_idx" ON "Task"("userId", "dateDue");

-- CreateIndex
CREATE INDEX "Context_userId_idx" ON "Context"("userId");

-- CreateIndex
CREATE INDEX "TimeSlot_userId_dateScheduled_idx" ON "TimeSlot"("userId", "dateScheduled");
CREATE INDEX "TimeSlot_userId_contextId_idx" ON "TimeSlot"("userId", "contextId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSlotAssignment_taskId_slotId_key" ON "TaskSlotAssignment"("taskId", "slotId");
CREATE INDEX "TaskSlotAssignment_userId_idx" ON "TaskSlotAssignment"("userId");

-- CreateIndex
CREATE INDEX "Filter_userId_idx" ON "Filter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Context" ADD CONSTRAINT "Context_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Context"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Context" ADD CONSTRAINT "Context_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_contextId_fkey" FOREIGN KEY ("contextId") REFERENCES "Context"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepeatPattern" ADD CONSTRAINT "RepeatPattern_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepeatPattern" ADD CONSTRAINT "RepeatPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSlotAssignment" ADD CONSTRAINT "TaskSlotAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskSlotAssignment" ADD CONSTRAINT "TaskSlotAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskSlotAssignment" ADD CONSTRAINT "TaskSlotAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filter" ADD CONSTRAINT "Filter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
