# Mentor Phase 1: Core (Task View) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, deployable task management app with hierarchical tasks, context/role system, filtering, notes, search, clipboard operations, undo/redo, and user authentication.

**Architecture:** Next.js 14 App Router full-stack app with Prisma ORM on PostgreSQL. Server actions for mutations, API routes for complex queries. Zustand for client state, TanStack Query for server state. shadcn/ui + Tailwind for UI.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth.js, Zustand, TanStack Query, shadcn/ui, Tailwind CSS, Vitest, Docker

---

## File Structure

```
mentor/
  prisma/
    schema.prisma                    # Database schema (all models)
    seed.ts                          # Seed script (default context, test data)
  src/
    app/
      layout.tsx                     # Root layout (providers, fonts)
      page.tsx                       # Redirect to /tasks or /login
      globals.css                    # Tailwind globals
      (auth)/
        login/page.tsx               # Login page
        register/page.tsx            # Registration page
      (app)/
        layout.tsx                   # Authenticated shell (nav tabs, filter bar)
        tasks/page.tsx               # Task View page
        settings/page.tsx            # Preferences page
      api/
        auth/[...nextauth]/route.ts  # NextAuth API route
        tasks/route.ts               # GET (list), POST (create)
        tasks/[tid]/route.ts         # GET, PUT, DELETE single task
        tasks/[tid]/status/route.ts  # PUT status change
        tasks/[tid]/bold/route.ts    # PUT toggle bold
        tasks/[tid]/notes/route.ts   # GET, PUT notes
        tasks/[tid]/composite/route.ts # POST convert to composite
        tasks/[tid]/copy/route.ts    # POST copy task
        tasks/[tid]/move/route.ts    # POST move task
        tasks/search/route.ts        # GET search
        contexts/route.ts            # GET (list), POST (create)
        contexts/[cid]/route.ts      # PUT, DELETE
        filters/route.ts             # GET (list), POST (create)
        filters/[id]/route.ts        # PUT, DELETE
        preferences/route.ts         # GET, PUT
    lib/
      db/prisma.ts                   # Prisma client singleton
      auth/auth.ts                   # NextAuth configuration
      auth/helpers.ts                # getServerUser helper
      types/task.ts                  # Task types and enums
      types/context.ts               # Context types and enums
      types/filter.ts                # Filter types
      types/preferences.ts           # Preferences type with defaults
    components/
      ui/                            # shadcn/ui components (installed via CLI)
      providers.tsx                  # QueryClientProvider, SessionProvider wrapper
      task-view/
        task-list.tsx                # Main task list component
        task-tree-item.tsx           # Single task row with badges
        task-breadcrumb.tsx          # Hierarchy breadcrumb navigation
        task-edit-dialog.tsx         # Create/edit task dialog
        task-notes-editor.tsx        # Notes editor panel
        composite-navigator.tsx      # Composite enter/exit logic
      shared/
        context-picker.tsx           # Context selection dropdown
        filter-bar.tsx               # Active filter display + dropdown
        filter-editor.tsx            # Filter create/edit dialog
        search-dialog.tsx            # Find/Find Next dialog
        app-nav.tsx                  # Tab navigation (Tasks/Schedule/Roles)
    hooks/
      use-tasks.ts                   # TanStack Query hooks for tasks
      use-contexts.ts                # TanStack Query hooks for contexts
      use-filters.ts                 # TanStack Query hooks for filters
      use-preferences.ts             # TanStack Query hooks for preferences
      use-undo-redo.ts               # Undo/redo hook (command pattern)
      use-keyboard-shortcuts.ts      # Global keyboard shortcut handler
      use-clipboard.ts               # Cut/copy/paste hook for tasks
    stores/
      task-store.ts                  # Zustand: selected task, hierarchy position
      filter-store.ts                # Zustand: active filter ID
      ui-store.ts                    # Zustand: zoom, view state, undo stack
  tests/
    api/
      tasks.test.ts                  # Task API route tests
      contexts.test.ts               # Context API route tests
      filters.test.ts                # Filter API route tests
      preferences.test.ts            # Preferences API route tests
      auth.test.ts                   # Auth flow tests
    lib/
      filter-logic.test.ts           # Filter query building tests
    components/
      task-list.test.tsx             # Task list rendering tests
      task-tree-item.test.tsx        # Task row rendering tests
      filter-bar.test.tsx            # Filter bar tests
  docker-compose.yml                 # Dev: PostgreSQL + app
  Dockerfile                         # Production build
  .env.example                       # Environment variable template
  next.config.ts                     # Next.js config (standalone output)
  tailwind.config.ts                 # Tailwind config
  tsconfig.json                      # TypeScript config
  vitest.config.ts                   # Vitest config
  package.json
```

---

### Task 1: Project Scaffolding and Database Setup

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.example`, `docker-compose.yml`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/lib/db/prisma.ts`, `prisma/schema.prisma`, `vitest.config.ts`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /mnt/d/Mentor2.0
npx create-next-app@latest mentor --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Expected: Project created in `mentor/` directory.

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm install prisma @prisma/client next-auth @auth/prisma-adapter bcryptjs zustand @tanstack/react-query
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/bcryptjs
```

- [ ] **Step 3: Initialize Prisma**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 4: Write the Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  createdAt DateTime @default(now())

  tasks               Task[]
  contexts            Context[]
  timeSlots           TimeSlot[]
  filters             Filter[]
  preferences         UserPreferences?
  taskSlotAssignments TaskSlotAssignment[]
  repeatPatterns      RepeatPattern[]
}

model Task {
  id          Int       @id @default(autoincrement())
  parent      Task?     @relation("TaskHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  parentId    Int?
  children    Task[]    @relation("TaskHierarchy")
  type        Int       @default(0)
  context     Context?  @relation(fields: [contextId], references: [id], onDelete: SetNull)
  contextId   Int?
  flags       Int       @default(0)
  importance  Int       @default(0)
  urgency     Int       @default(0)
  size        Int       @default(0)
  sizeCustom  Int?
  status      Int       @default(0)
  schedule    Int       @default(0)
  dateEntered DateTime  @default(now())
  dateUpdated DateTime  @default(now()) @updatedAt
  dateScheduled DateTime?
  dateDue     DateTime?
  description String    @default("")
  crossRef    String    @default("")
  stateText   String    @default("")
  notes       String    @default("")
  sortOrder   Int       @default(0)

  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int

  slotAssignments TaskSlotAssignment[]

  @@index([userId, parentId])
  @@index([userId, status])
  @@index([userId, contextId])
  @@index([userId, dateScheduled])
  @@index([userId, dateDue])
}

model Context {
  id          Int       @id @default(autoincrement())
  parent      Context?  @relation("ContextHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  parentId    Int?
  children    Context[] @relation("ContextHierarchy")
  name        String
  description String    @default("")
  ctxType     Int       @default(0)
  symbolType  Int       @default(0)
  symbolIcon  String    @default("")
  sortOrder   Int       @default(0)

  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int

  tasks     Task[]
  timeSlots TimeSlot[]

  @@index([userId])
}

model TimeSlot {
  id            Int      @id @default(autoincrement())
  type          Int      @default(0)
  context       Context? @relation(fields: [contextId], references: [id], onDelete: SetNull)
  contextId     Int?
  dateScheduled DateTime
  startMinutes  Int      @default(540)
  endMinutes    Int      @default(1020)
  allocated     Int      @default(0)
  scheduled     Int      @default(0)
  count         Int      @default(0)
  overallAlloc  Int      @default(0)
  description   String   @default("")
  crossRef      String   @default("")

  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int

  taskAssignments TaskSlotAssignment[]
  repeatPatterns  RepeatPattern[]

  @@index([userId, dateScheduled])
  @@index([userId, contextId])
}

model RepeatPattern {
  id          Int       @id @default(autoincrement())
  slot        TimeSlot  @relation(fields: [slotId], references: [id], onDelete: Cascade)
  slotId      Int
  type        Int
  intervalVal Int       @default(1)
  dateTo      DateTime?
  dateFrom    DateTime
  occurrences Int       @default(0)
  flags       Int       @default(0)
  priority    Int       @default(1)
  pattern     String    @default("")

  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int
}

model TaskSlotAssignment {
  id     Int      @id @default(autoincrement())
  task   Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  taskId Int
  slot   TimeSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  slotId Int

  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int

  @@unique([taskId, slotId])
  @@index([userId])
}

model Filter {
  id        Int    @id @default(autoincrement())
  name      String
  impFilter String @default("")
  urgFilter String @default("")
  sizFilter String @default("")
  staFilter String @default("")
  schFilter String @default("")
  ctxFilter String @default("")
  flgFilter String @default("")

  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int

  @@index([userId])
}

model UserPreferences {
  id     Int  @id @default(autoincrement())
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int  @unique
  prefs  Json @default("{}")
}
```

- [ ] **Step 5: Create Prisma client singleton**

Create `src/lib/db/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 6: Create environment files**

Create `.env.example`:
```
DATABASE_URL=postgresql://mentor:mentor@localhost:5432/mentor
NEXTAUTH_SECRET=change-me-to-a-random-string
NEXTAUTH_URL=http://localhost:3000
```

Copy to `.env`:
```bash
cd /mnt/d/Mentor2.0/mentor
cp .env.example .env
```

- [ ] **Step 7: Create docker-compose.yml for dev database**

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mentor
      POSTGRES_USER: mentor
      POSTGRES_PASSWORD: mentor
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 8: Start database and run initial migration**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
docker compose up -d db
npx prisma migrate dev --name init
```
Expected: Migration created and applied, database tables exist.

- [ ] **Step 9: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `tests/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 10: Update next.config.ts for standalone output**

Replace `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 11: Add test script to package.json**

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 12: Verify project builds**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm run build
```
Expected: Build succeeds.

- [ ] **Step 13: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add -A
git commit -m "feat: scaffold Next.js project with Prisma schema and dev database"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/lib/types/task.ts`, `src/lib/types/context.ts`, `src/lib/types/filter.ts`, `src/lib/types/preferences.ts`

- [ ] **Step 1: Create task types**

Create `src/lib/types/task.ts`:

```typescript
export const TaskType = {
  SIMPLE: 0,
  COMPOSITE: 1,
} as const;

export const TaskStatus = {
  ACTIVE: 0,
  DONE: 1,
  DROPPED: 2,
  DEFERRED: 3,
  DELEGATED: 4,
} as const;

export const TaskSize = {
  UNDEFINED: 0,
  MINUTES: 1,
  HOUR: 2,
  HALF_DAY: 3,
  DAY: 4,
  CUSTOM: 5,
} as const;

export const TaskFlags = {
  BOLD: 1,
  CROSSED_OUT: 2,
  ALARM: 4,
  ARCHIVE: 8,
} as const;

export const TaskSizeLabels: Record<number, string> = {
  0: "Undefined",
  1: "Minutes",
  2: "Hour",
  3: "Half Day",
  4: "Day",
  5: "Custom",
};

export const TaskStatusLabels: Record<number, string> = {
  0: "Active",
  1: "Done",
  2: "Dropped",
  3: "Deferred",
  4: "Delegated",
};

export type TaskWithChildren = {
  id: number;
  parentId: number | null;
  type: number;
  contextId: number | null;
  flags: number;
  importance: number;
  urgency: number;
  size: number;
  sizeCustom: number | null;
  status: number;
  schedule: number;
  dateEntered: string;
  dateUpdated: string;
  dateScheduled: string | null;
  dateDue: string | null;
  description: string;
  crossRef: string;
  stateText: string;
  notes: string;
  sortOrder: number;
  userId: number;
  children: { id: number }[];
  context: { id: number; name: string; symbolIcon: string } | null;
};
```

- [ ] **Step 2: Create context types**

Create `src/lib/types/context.ts`:

```typescript
export const ContextType = {
  ROLE: 0,
  GOAL: 1,
} as const;

export const SymbolType = {
  UNDEFINED: 0,
  STANDARD: 1,
  LABEL: 2,
  SUPERSCRIPT: 3,
} as const;

export const ContextIcons = [
  "structure", "cogs", "factory", "hearts", "family", "bunny",
  "house", "flower", "roller", "smiley", "yinyang", "crown",
  "cup", "first", "star", "plane", "boat", "car", "runner",
  "batball", "book", "letter", "phone", "ladder",
] as const;

export type ContextIcon = typeof ContextIcons[number];

export type ContextWithChildren = {
  id: number;
  parentId: number | null;
  name: string;
  description: string;
  ctxType: number;
  symbolType: number;
  symbolIcon: string;
  sortOrder: number;
  userId: number;
  children: { id: number; name: string }[];
};
```

- [ ] **Step 3: Create filter types**

Create `src/lib/types/filter.ts`:

```typescript
export type FilterData = {
  id: number;
  name: string;
  impFilter: string;
  urgFilter: string;
  sizFilter: string;
  staFilter: string;
  schFilter: string;
  ctxFilter: string;
  flgFilter: string;
  userId: number;
};

export type FilterField = keyof Omit<FilterData, "id" | "name" | "userId">;

/**
 * Parse a comma-separated filter string into an array of numbers.
 * Empty string means "no filter" (show all).
 */
export function parseFilterValues(filterStr: string): number[] {
  if (!filterStr.trim()) return [];
  return filterStr.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

/**
 * Build a Prisma WHERE condition from filter data.
 * Empty filter fields are omitted (no restriction).
 */
export function buildFilterWhere(filter: FilterData): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  const impVals = parseFilterValues(filter.impFilter);
  if (impVals.length > 0) where.importance = { in: impVals };

  const urgVals = parseFilterValues(filter.urgFilter);
  if (urgVals.length > 0) where.urgency = { in: urgVals };

  const sizVals = parseFilterValues(filter.sizFilter);
  if (sizVals.length > 0) where.size = { in: sizVals };

  const staVals = parseFilterValues(filter.staFilter);
  if (staVals.length > 0) where.status = { in: staVals };

  const schVals = parseFilterValues(filter.schFilter);
  if (schVals.length > 0) where.schedule = { in: schVals };

  const ctxVals = parseFilterValues(filter.ctxFilter);
  if (ctxVals.length > 0) where.contextId = { in: ctxVals };

  const flgVals = parseFilterValues(filter.flgFilter);
  if (flgVals.length > 0) {
    // Flags is a bitfield - match any task that has ANY of the specified flags set
    where.OR = flgVals.map((flag) => ({
      flags: { not: 0 },
      AND: [{ flags: { gte: flag } }],
    }));
  }

  return where;
}
```

- [ ] **Step 4: Create preferences types**

Create `src/lib/types/preferences.ts`:

```typescript
export type UserPrefs = {
  toolbar: boolean;
  buttonBar: boolean;
  cursorStyle: "highlight" | "underline";
  pathInHeader: boolean;
  pathInTasks: boolean;
  indentGoals: boolean;
  dueNumerals: boolean;
  rvRows: 1 | 2 | 3;
  treeCalc: boolean;
  asapDays: number;
  soonDays: number;
  sometimeDays: number;
  autoSchedule: boolean;
  incrementalReschedule: boolean;
  suggestAheadDays: number;
  scanAheadDays: number;
  fullDay: boolean;
  sizeMinutes: number;
  sizeHour: number;
  sizeHalfDay: number;
  sizeDay: number;
  zeroDropped: boolean;
  zeroDeferred: boolean;
  zeroDelegated: boolean;
  zoom: "small" | "medium" | "large";
};

export const DEFAULT_PREFERENCES: UserPrefs = {
  toolbar: true,
  buttonBar: true,
  cursorStyle: "highlight",
  pathInHeader: true,
  pathInTasks: false,
  indentGoals: true,
  dueNumerals: false,
  rvRows: 3,
  treeCalc: true,
  asapDays: 1,
  soonDays: 7,
  sometimeDays: 30,
  autoSchedule: false,
  incrementalReschedule: true,
  suggestAheadDays: 90,
  scanAheadDays: 30,
  fullDay: false,
  sizeMinutes: 15,
  sizeHour: 60,
  sizeHalfDay: 240,
  sizeDay: 480,
  zeroDropped: false,
  zeroDeferred: false,
  zeroDelegated: false,
  zoom: "medium",
};
```

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/lib/types/
git commit -m "feat: add type definitions for tasks, contexts, filters, and preferences"
```

---

### Task 3: Authentication

**Files:**
- Create: `src/lib/auth/auth.ts`, `src/lib/auth/helpers.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/api/auth/register/route.ts`, `tests/api/auth.test.ts`
- Create: `src/components/providers.tsx`

- [ ] **Step 1: Write the failing test for registration**

Create `tests/api/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    userPreferences: {
      create: vi.fn(),
    },
    context: {
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import { POST as registerHandler } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user with default preferences and Undefined context", async () => {
    const mockUser = { id: 1, email: "test@example.com", name: "Test User" };
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      }),
    });

    const response = await registerHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.email).toBe("test@example.com");
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("rejects duplicate email", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      email: "test@example.com",
    });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      }),
    });

    const response = await registerHandler(request);
    expect(response.status).toBe(409);
  });

  it("rejects missing fields", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await registerHandler(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/api/auth.test.ts
```
Expected: FAIL - module not found.

- [ ] **Step 3: Implement registration route**

Create `src/app/api/auth/register/route.ts`:

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_PREFERENCES } from "@/lib/types/preferences";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, name, password } = body;

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "Email, name, and password are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      preferences: {
        create: { prefs: DEFAULT_PREFERENCES as unknown as Record<string, unknown> },
      },
      contexts: {
        create: { name: "Undefined", description: "Default context", sortOrder: 0 },
      },
    },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/api/auth.test.ts
```
Expected: PASS.

- [ ] **Step 5: Configure NextAuth**

Create `src/lib/auth/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = parseInt(user.id);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 6: Create auth helper**

Create `src/lib/auth/helpers.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function getServerUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as Record<string, unknown>).id as number,
    email: session.user.email!,
    name: session.user.name!,
  };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

- [ ] **Step 7: Create providers wrapper**

Create `src/components/providers.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 8: Update root layout**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mentor",
  description: "Personal project management and task scheduling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/tasks");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">Mentor</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          No account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Create register page**

Create `src/app/(auth)/register/page.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">Mentor</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Run tests**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/api/auth.test.ts
```
Expected: All 3 tests PASS.

- [ ] **Step 12: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/lib/auth/ src/app/api/auth/ src/app/\(auth\)/ src/components/providers.tsx src/app/layout.tsx tests/api/auth.test.ts
git commit -m "feat: add authentication with registration, login, and session management"
```

---

### Task 4: Context/Role API

**Files:**
- Create: `src/app/api/contexts/route.ts`, `src/app/api/contexts/[cid]/route.ts`, `tests/api/contexts.test.ts`

- [ ] **Step 1: Write failing tests for context CRUD**

Create `tests/api/contexts.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    context: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    task: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/helpers", () => ({
  getServerUser: vi.fn().mockResolvedValue({ id: 1, email: "test@example.com", name: "Test" }),
  unauthorizedResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
}));

import { prisma } from "@/lib/db/prisma";
import { GET, POST } from "@/app/api/contexts/route";

describe("GET /api/contexts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all contexts for the authenticated user", async () => {
    const mockContexts = [
      { id: 1, name: "Work", parentId: null, userId: 1, children: [] },
      { id: 2, name: "Personal", parentId: null, userId: 1, children: [] },
    ];
    (prisma.context.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockContexts);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.contexts).toHaveLength(2);
    expect(data.contexts[0].name).toBe("Work");
  });
});

describe("POST /api/contexts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new context", async () => {
    const mockContext = { id: 3, name: "Study", parentId: null, userId: 1 };
    (prisma.context.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockContext);

    const request = new Request("http://localhost/api/contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Study" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.context.name).toBe("Study");
  });

  it("rejects blank name", async () => {
    const request = new Request("http://localhost/api/contexts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/api/contexts.test.ts
```
Expected: FAIL - module not found.

- [ ] **Step 3: Implement contexts list and create routes**

Create `src/app/api/contexts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const contexts = await prisma.context.findMany({
    where: { userId: user.id },
    include: { children: { select: { id: true, name: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ contexts });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { name, description, parentId, ctxType, symbolType, symbolIcon } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name cannot be blank" }, { status: 400 });
  }

  const context = await prisma.context.create({
    data: {
      name: name.trim(),
      description: description || "",
      parentId: parentId || null,
      ctxType: ctxType || 0,
      symbolType: symbolType || 0,
      symbolIcon: symbolIcon || "",
      userId: user.id,
    },
  });

  return NextResponse.json({ context }, { status: 201 });
}
```

- [ ] **Step 4: Implement context update and delete routes**

Create `src/app/api/contexts/[cid]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { cid } = await params;
  const id = parseInt(cid);
  const body = await request.json();

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Name cannot be blank" }, { status: 400 });
  }

  const existing = await prisma.context.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Context not found" }, { status: 404 });
  }

  const context = await prisma.context.update({
    where: { id },
    data: {
      name: body.name?.trim() ?? existing.name,
      description: body.description ?? existing.description,
      parentId: body.parentId !== undefined ? body.parentId : existing.parentId,
      ctxType: body.ctxType ?? existing.ctxType,
      symbolType: body.symbolType ?? existing.symbolType,
      symbolIcon: body.symbolIcon ?? existing.symbolIcon,
      sortOrder: body.sortOrder ?? existing.sortOrder,
    },
  });

  return NextResponse.json({ context });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { cid } = await params;
  const id = parseInt(cid);

  const existing = await prisma.context.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Context not found" }, { status: 404 });
  }

  // Remap tasks to another context if specified
  const url = new URL(request.url);
  const remapTo = url.searchParams.get("remapTo");
  if (remapTo) {
    await prisma.task.updateMany({
      where: { contextId: id, userId: user.id },
      data: { contextId: parseInt(remapTo) },
    });
  } else {
    await prisma.task.updateMany({
      where: { contextId: id, userId: user.id },
      data: { contextId: null },
    });
  }

  await prisma.context.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Run tests**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/api/contexts.test.ts
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/app/api/contexts/ tests/api/contexts.test.ts
git commit -m "feat: add context/role CRUD API with hierarchy and task remapping"
```

---

### Task 5: Task API - CRUD

**Files:**
- Create: `src/app/api/tasks/route.ts`, `src/app/api/tasks/[tid]/route.ts`, `tests/api/tasks.test.ts`

- [ ] **Step 1: Write failing tests for task CRUD**

Create `tests/api/tasks.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    filter: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/helpers", () => ({
  getServerUser: vi.fn().mockResolvedValue({ id: 1, email: "test@example.com", name: "Test" }),
  unauthorizedResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
}));

import { prisma } from "@/lib/db/prisma";
import { GET, POST } from "@/app/api/tasks/route";

describe("GET /api/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns root-level tasks when no parentId specified", async () => {
    const mockTasks = [
      { id: 1, description: "Task 1", parentId: null, type: 0, children: [], context: null },
      { id: 2, description: "Task 2", parentId: null, type: 1, children: [{ id: 3 }], context: { id: 1, name: "Work", symbolIcon: "" } },
    ];
    (prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasks);

    const request = new Request("http://localhost/api/tasks");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toHaveLength(2);
  });

  it("returns children of a composite task", async () => {
    const mockTasks = [
      { id: 3, description: "Sub-task", parentId: 2, type: 0, children: [], context: null },
    ];
    (prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTasks);

    const request = new Request("http://localhost/api/tasks?parentId=2");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].parentId).toBe(2);
  });
});

describe("POST /api/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new task", async () => {
    const mockTask = { id: 1, description: "New task", parentId: null, type: 0, status: 0, userId: 1 };
    (prisma.task.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);
    (prisma.task.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "New task" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.task.description).toBe("New task");
  });

  it("creates a sub-task under a composite", async () => {
    const mockTask = { id: 4, description: "Sub-task", parentId: 2, type: 0, status: 0, userId: 1 };
    (prisma.task.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);
    (prisma.task.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.task.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 2, type: 1, userId: 1 });

    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Sub-task", parentId: 2 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.task.parentId).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/api/tasks.test.ts
```
Expected: FAIL - module not found.

- [ ] **Step 3: Implement task list and create routes**

Create `src/app/api/tasks/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { buildFilterWhere } from "@/lib/types/filter";

export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId");
  const filterId = url.searchParams.get("filterId");

  const where: Record<string, unknown> = { userId: user.id };

  if (parentId) {
    where.parentId = parseInt(parentId);
  } else {
    where.parentId = null;
  }

  if (filterId) {
    const filter = await prisma.filter.findFirst({
      where: { id: parseInt(filterId), userId: user.id },
    });
    if (filter) {
      const filterWhere = buildFilterWhere(filter);
      Object.assign(where, filterWhere);
    }
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      children: { select: { id: true } },
      context: { select: { id: true, name: true, symbolIcon: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { description, parentId, contextId, importance, urgency, size, sizeCustom, dateDue } = body;

  if (!description || !description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  // If adding to a composite parent, verify it exists and belongs to user
  if (parentId) {
    const parent = await prisma.task.findFirst({
      where: { id: parentId, userId: user.id },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }
  }

  // Get next sort order
  const count = await prisma.task.count({
    where: { userId: user.id, parentId: parentId || null },
  });

  const task = await prisma.task.create({
    data: {
      description: description.trim(),
      parentId: parentId || null,
      contextId: contextId || null,
      importance: importance || 0,
      urgency: urgency || 0,
      size: size || 0,
      sizeCustom: sizeCustom || null,
      dateDue: dateDue ? new Date(dateDue) : null,
      sortOrder: count,
      userId: user.id,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
```

- [ ] **Step 4: Implement single task get, update, delete**

Create `src/app/api/tasks/[tid]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const task = await prisma.task.findFirst({
    where: { id: parseInt(tid), userId: user.id },
    include: {
      children: { select: { id: true } },
      context: { select: { id: true, name: true, symbolIcon: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid);
  const body = await request.json();

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (body.description !== undefined && !body.description.trim()) {
    return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      description: body.description?.trim() ?? existing.description,
      contextId: body.contextId !== undefined ? body.contextId : existing.contextId,
      importance: body.importance ?? existing.importance,
      urgency: body.urgency ?? existing.urgency,
      size: body.size ?? existing.size,
      sizeCustom: body.sizeCustom !== undefined ? body.sizeCustom : existing.sizeCustom,
      dateDue: body.dateDue !== undefined ? (body.dateDue ? new Date(body.dateDue) : null) : existing.dateDue,
      sortOrder: body.sortOrder ?? existing.sortOrder,
    },
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid);

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: { children: { select: { id: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Cascade delete handles children via schema
  await prisma.task.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    hadChildren: existing.children.length > 0,
  });
}
```

- [ ] **Step 5: Run tests**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/api/tasks.test.ts
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/app/api/tasks/ tests/api/tasks.test.ts
git commit -m "feat: add task CRUD API with hierarchical support and filtering"
```

---

### Task 6: Task Operations API (Status, Bold, Notes, Composite, Copy, Move, Search)

**Files:**
- Create: `src/app/api/tasks/[tid]/status/route.ts`, `src/app/api/tasks/[tid]/bold/route.ts`, `src/app/api/tasks/[tid]/notes/route.ts`, `src/app/api/tasks/[tid]/composite/route.ts`, `src/app/api/tasks/[tid]/copy/route.ts`, `src/app/api/tasks/[tid]/move/route.ts`, `src/app/api/tasks/search/route.ts`

- [ ] **Step 1: Implement status change route**

Create `src/app/api/tasks/[tid]/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { TaskStatus } from "@/lib/types/task";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid);
  const body = await request.json();
  const { status } = body;

  const validStatuses = Object.values(TaskStatus);
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ task });
}
```

- [ ] **Step 2: Implement bold toggle route**

Create `src/app/api/tasks/[tid]/bold/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { TaskFlags } from "@/lib/types/task";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid);

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const newFlags = existing.flags ^ TaskFlags.BOLD; // XOR toggles the bit

  const task = await prisma.task.update({
    where: { id },
    data: { flags: newFlags },
  });

  return NextResponse.json({ task });
}
```

- [ ] **Step 3: Implement notes routes**

Create `src/app/api/tasks/[tid]/notes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const task = await prisma.task.findFirst({
    where: { id: parseInt(tid), userId: user.id },
    select: { notes: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ notes: task.notes });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid);
  const body = await request.json();

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: { notes: body.notes || "" },
  });

  return NextResponse.json({ notes: task.notes });
}
```

- [ ] **Step 4: Implement make-composite route**

Create `src/app/api/tasks/[tid]/composite/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { TaskType } from "@/lib/types/task";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid);

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (existing.type === TaskType.COMPOSITE) {
    return NextResponse.json({ error: "Task is already composite" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: { type: TaskType.COMPOSITE },
  });

  return NextResponse.json({ task });
}
```

- [ ] **Step 5: Implement copy route**

Create `src/app/api/tasks/[tid]/copy/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

async function copyTaskRecursive(
  taskId: number,
  targetParentId: number | null,
  userId: number
): Promise<number> {
  const source = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { children: { select: { id: true } } },
  });
  if (!source) throw new Error("Task not found");

  const count = await prisma.task.count({
    where: { userId, parentId: targetParentId },
  });

  const copy = await prisma.task.create({
    data: {
      parentId: targetParentId,
      type: source.type,
      contextId: source.contextId,
      flags: source.flags,
      importance: source.importance,
      urgency: source.urgency,
      size: source.size,
      sizeCustom: source.sizeCustom,
      status: 0, // Reset to active
      description: source.description,
      crossRef: source.crossRef,
      notes: source.notes,
      sortOrder: count,
      userId,
    },
  });

  for (const child of source.children) {
    await copyTaskRecursive(child.id, copy.id, userId);
  }

  return copy.id;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const body = await request.json();
  const targetParentId = body.targetParentId ?? null;

  const newId = await copyTaskRecursive(parseInt(tid), targetParentId, user.id);

  const task = await prisma.task.findFirst({
    where: { id: newId, userId: user.id },
    include: {
      children: { select: { id: true } },
      context: { select: { id: true, name: true, symbolIcon: true } },
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
```

- [ ] **Step 6: Implement move route**

Create `src/app/api/tasks/[tid]/move/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { tid } = await params;
  const id = parseInt(tid);
  const body = await request.json();
  const targetParentId = body.targetParentId ?? null;

  const existing = await prisma.task.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Prevent moving a task into itself or its own descendants
  if (targetParentId !== null) {
    let checkId: number | null = targetParentId;
    while (checkId !== null) {
      if (checkId === id) {
        return NextResponse.json(
          { error: "Cannot move a task into itself or its descendants" },
          { status: 400 }
        );
      }
      const parent = await prisma.task.findFirst({
        where: { id: checkId, userId: user.id },
        select: { parentId: true },
      });
      checkId = parent?.parentId ?? null;
    }
  }

  const count = await prisma.task.count({
    where: { userId: user.id, parentId: targetParentId },
  });

  const task = await prisma.task.update({
    where: { id },
    data: { parentId: targetParentId, sortOrder: count },
  });

  return NextResponse.json({ task });
}
```

- [ ] **Step 7: Implement search route**

Create `src/app/api/tasks/search/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const includeNotes = url.searchParams.get("notes") === "1";

  if (!query || !query.trim()) {
    return NextResponse.json({ tasks: [] });
  }

  const searchTerm = query.trim();

  const orConditions: Record<string, unknown>[] = [
    { description: { contains: searchTerm, mode: "insensitive" } },
  ];

  if (includeNotes) {
    orConditions.push({
      notes: { contains: searchTerm, mode: "insensitive" },
    });
  }

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      OR: orConditions,
    },
    include: {
      children: { select: { id: true } },
      context: { select: { id: true, name: true, symbolIcon: true } },
    },
    orderBy: { dateUpdated: "desc" },
    take: 50,
  });

  return NextResponse.json({ tasks });
}
```

- [ ] **Step 8: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/app/api/tasks/
git commit -m "feat: add task operations - status, bold, notes, composite, copy, move, search"
```

---

### Task 7: Filter and Preferences API

**Files:**
- Create: `src/app/api/filters/route.ts`, `src/app/api/filters/[id]/route.ts`, `src/app/api/preferences/route.ts`, `tests/api/filters.test.ts`, `tests/api/preferences.test.ts`, `tests/lib/filter-logic.test.ts`

- [ ] **Step 1: Write failing test for filter query building**

Create `tests/lib/filter-logic.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseFilterValues, buildFilterWhere } from "@/lib/types/filter";
import type { FilterData } from "@/lib/types/filter";

describe("parseFilterValues", () => {
  it("returns empty array for empty string", () => {
    expect(parseFilterValues("")).toEqual([]);
    expect(parseFilterValues("  ")).toEqual([]);
  });

  it("parses comma-separated numbers", () => {
    expect(parseFilterValues("1,2,3")).toEqual([1, 2, 3]);
    expect(parseFilterValues("0, 1, 4")).toEqual([0, 1, 4]);
  });

  it("ignores NaN values", () => {
    expect(parseFilterValues("1,abc,3")).toEqual([1, 3]);
  });
});

describe("buildFilterWhere", () => {
  const emptyFilter: FilterData = {
    id: 1, name: "test", userId: 1,
    impFilter: "", urgFilter: "", sizFilter: "",
    staFilter: "", schFilter: "", ctxFilter: "", flgFilter: "",
  };

  it("returns empty object for empty filters", () => {
    expect(buildFilterWhere(emptyFilter)).toEqual({});
  });

  it("adds importance filter", () => {
    const filter = { ...emptyFilter, impFilter: "1,2" };
    const where = buildFilterWhere(filter);
    expect(where.importance).toEqual({ in: [1, 2] });
  });

  it("adds status filter", () => {
    const filter = { ...emptyFilter, staFilter: "0" };
    const where = buildFilterWhere(filter);
    expect(where.status).toEqual({ in: [0] });
  });

  it("combines multiple filters", () => {
    const filter = { ...emptyFilter, impFilter: "3,4", ctxFilter: "1,5" };
    const where = buildFilterWhere(filter);
    expect(where.importance).toEqual({ in: [3, 4] });
    expect(where.contextId).toEqual({ in: [1, 5] });
  });
});
```

- [ ] **Step 2: Run test to verify it passes (types already implemented)**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run tests/lib/filter-logic.test.ts
```
Expected: PASS (filter logic was implemented in Task 2).

- [ ] **Step 3: Implement filter CRUD routes**

Create `src/app/api/filters/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const filters = await prisma.filter.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ filters });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Filter name is required" }, { status: 400 });
  }

  const filter = await prisma.filter.create({
    data: {
      name: name.trim(),
      impFilter: body.impFilter || "",
      urgFilter: body.urgFilter || "",
      sizFilter: body.sizFilter || "",
      staFilter: body.staFilter || "",
      schFilter: body.schFilter || "",
      ctxFilter: body.ctxFilter || "",
      flgFilter: body.flgFilter || "",
      userId: user.id,
    },
  });

  return NextResponse.json({ filter }, { status: 201 });
}
```

Create `src/app/api/filters/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const body = await request.json();

  const existing = await prisma.filter.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found" }, { status: 404 });
  }

  const filter = await prisma.filter.update({
    where: { id },
    data: {
      name: body.name?.trim() || existing.name,
      impFilter: body.impFilter ?? existing.impFilter,
      urgFilter: body.urgFilter ?? existing.urgFilter,
      sizFilter: body.sizFilter ?? existing.sizFilter,
      staFilter: body.staFilter ?? existing.staFilter,
      schFilter: body.schFilter ?? existing.schFilter,
      ctxFilter: body.ctxFilter ?? existing.ctxFilter,
      flgFilter: body.flgFilter ?? existing.flgFilter,
    },
  });

  return NextResponse.json({ filter });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const { id: idStr } = await params;
  const id = parseInt(idStr);

  const existing = await prisma.filter.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found" }, { status: 404 });
  }

  await prisma.filter.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Implement preferences routes**

Create `src/app/api/preferences/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerUser, unauthorizedResponse } from "@/lib/auth/helpers";
import { DEFAULT_PREFERENCES, UserPrefs } from "@/lib/types/preferences";

export async function GET() {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });

  const merged = { ...DEFAULT_PREFERENCES, ...(prefs?.prefs as Partial<UserPrefs> || {}) };

  return NextResponse.json({ preferences: merged });
}

export async function PUT(request: Request) {
  const user = await getServerUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();

  const existing = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });

  const currentPrefs = (existing?.prefs as Partial<UserPrefs>) || {};
  const merged = { ...DEFAULT_PREFERENCES, ...currentPrefs, ...body };

  if (existing) {
    await prisma.userPreferences.update({
      where: { userId: user.id },
      data: { prefs: merged as unknown as Record<string, unknown> },
    });
  } else {
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        prefs: merged as unknown as Record<string, unknown>,
      },
    });
  }

  return NextResponse.json({ preferences: merged });
}
```

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/app/api/filters/ src/app/api/preferences/ tests/lib/filter-logic.test.ts
git commit -m "feat: add filter CRUD, preferences API, and filter query logic"
```

---

### Task 8: Install shadcn/ui and Create Base Components

**Files:**
- Create: `components.json` (via shadcn init), `src/components/ui/` (via shadcn add), `src/lib/utils.ts`

- [ ] **Step 1: Initialize shadcn/ui**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx shadcn@latest init -d
```

- [ ] **Step 2: Install required shadcn components**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx shadcn@latest add button dialog dropdown-menu input label select badge separator sheet popover command toast textarea scroll-area tooltip breadcrumb
```

- [ ] **Step 3: Verify build**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add -A
git commit -m "feat: install shadcn/ui with core components"
```

---

### Task 9: Zustand Stores and TanStack Query Hooks

**Files:**
- Create: `src/stores/task-store.ts`, `src/stores/filter-store.ts`, `src/stores/ui-store.ts`, `src/hooks/use-tasks.ts`, `src/hooks/use-contexts.ts`, `src/hooks/use-filters.ts`, `src/hooks/use-preferences.ts`

- [ ] **Step 1: Create task store**

Create `src/stores/task-store.ts`:

```typescript
import { create } from "zustand";

type TaskStore = {
  selectedTaskId: number | null;
  currentParentId: number | null;
  parentPath: { id: number; description: string }[];
  setSelectedTask: (id: number | null) => void;
  navigateInto: (taskId: number, description: string) => void;
  navigateUp: () => void;
  navigateToRoot: () => void;
  navigateTo: (index: number) => void;
};

export const useTaskStore = create<TaskStore>((set) => ({
  selectedTaskId: null,
  currentParentId: null,
  parentPath: [],

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  navigateInto: (taskId, description) =>
    set((state) => ({
      currentParentId: taskId,
      parentPath: [...state.parentPath, { id: taskId, description }],
      selectedTaskId: null,
    })),

  navigateUp: () =>
    set((state) => {
      const newPath = state.parentPath.slice(0, -1);
      return {
        currentParentId: newPath.length > 0 ? newPath[newPath.length - 1].id : null,
        parentPath: newPath,
        selectedTaskId: null,
      };
    }),

  navigateToRoot: () =>
    set({ currentParentId: null, parentPath: [], selectedTaskId: null }),

  navigateTo: (index) =>
    set((state) => {
      const newPath = state.parentPath.slice(0, index + 1);
      return {
        currentParentId: newPath.length > 0 ? newPath[newPath.length - 1].id : null,
        parentPath: newPath,
        selectedTaskId: null,
      };
    }),
}));
```

- [ ] **Step 2: Create filter store**

Create `src/stores/filter-store.ts`:

```typescript
import { create } from "zustand";

type FilterStore = {
  activeFilterId: number | null;
  setActiveFilter: (id: number | null) => void;
};

export const useFilterStore = create<FilterStore>((set) => ({
  activeFilterId: null,
  setActiveFilter: (id) => set({ activeFilterId: id }),
}));
```

- [ ] **Step 3: Create UI store with undo/redo stack**

Create `src/stores/ui-store.ts`:

```typescript
import { create } from "zustand";

export type UndoableAction = {
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

type UiStore = {
  zoom: "small" | "medium" | "large";
  setZoom: (zoom: "small" | "medium" | "large") => void;
  undoStack: UndoableAction[];
  redoStack: UndoableAction[];
  pushUndo: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export const useUiStore = create<UiStore>((set, get) => ({
  zoom: "medium",
  setZoom: (zoom) => set({ zoom }),

  undoStack: [],
  redoStack: [],

  pushUndo: (action) =>
    set((state) => ({
      undoStack: [...state.undoStack, action],
      redoStack: [],
    })),

  undo: async () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    await action.undo();
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, action],
    });
  },

  redo: async () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    await action.redo();
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, action],
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));
```

- [ ] **Step 4: Create TanStack Query hooks for tasks**

Create `src/hooks/use-tasks.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskWithChildren } from "@/lib/types/task";

export function useTasks(parentId: number | null, filterId: number | null) {
  const params = new URLSearchParams();
  if (parentId !== null) params.set("parentId", String(parentId));
  if (filterId !== null) params.set("filterId", String(filterId));

  return useQuery<TaskWithChildren[]>({
    queryKey: ["tasks", parentId, filterId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      return data.tasks;
    },
  });
}

export function useTask(taskId: number | null) {
  return useQuery<TaskWithChildren>({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      const data = await res.json();
      return data.task;
    },
    enabled: taskId !== null,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useToggleBold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tasks/${id}/bold`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to toggle bold");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: number }) => {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to change status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useSearchTasks() {
  return useMutation({
    mutationFn: async ({ query, includeNotes }: { query: string; includeNotes: boolean }) => {
      const params = new URLSearchParams({ q: query });
      if (includeNotes) params.set("notes", "1");
      const res = await fetch(`/api/tasks/search?${params}`);
      if (!res.ok) throw new Error("Failed to search");
      const data = await res.json();
      return data.tasks as TaskWithChildren[];
    },
  });
}

export function useCopyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetParentId }: { id: number; targetParentId: number | null }) => {
      const res = await fetch(`/api/tasks/${id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetParentId }),
      });
      if (!res.ok) throw new Error("Failed to copy task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetParentId }: { id: number; targetParentId: number | null }) => {
      const res = await fetch(`/api/tasks/${id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetParentId }),
      });
      if (!res.ok) throw new Error("Failed to move task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
```

- [ ] **Step 5: Create TanStack Query hooks for contexts**

Create `src/hooks/use-contexts.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContextWithChildren } from "@/lib/types/context";

export function useContexts() {
  return useQuery<ContextWithChildren[]>({
    queryKey: ["contexts"],
    queryFn: async () => {
      const res = await fetch("/api/contexts");
      if (!res.ok) throw new Error("Failed to fetch contexts");
      const data = await res.json();
      return data.contexts;
    },
  });
}

export function useCreateContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create context");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contexts"] });
    },
  });
}

export function useUpdateContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      const res = await fetch(`/api/contexts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update context");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contexts"] });
    },
  });
}

export function useDeleteContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remapTo }: { id: number; remapTo?: number }) => {
      const params = remapTo ? `?remapTo=${remapTo}` : "";
      const res = await fetch(`/api/contexts/${id}${params}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete context");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contexts"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
```

- [ ] **Step 6: Create TanStack Query hooks for filters and preferences**

Create `src/hooks/use-filters.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FilterData } from "@/lib/types/filter";

export function useFilters() {
  return useQuery<FilterData[]>({
    queryKey: ["filters"],
    queryFn: async () => {
      const res = await fetch("/api/filters");
      if (!res.ok) throw new Error("Failed to fetch filters");
      const data = await res.json();
      return data.filters;
    },
  });
}

export function useCreateFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create filter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}

export function useUpdateFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      const res = await fetch(`/api/filters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update filter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}

export function useDeleteFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/filters/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete filter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
    },
  });
}
```

Create `src/hooks/use-preferences.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserPrefs } from "@/lib/types/preferences";

export function usePreferences() {
  return useQuery<UserPrefs>({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await fetch("/api/preferences");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const data = await res.json();
      return data.preferences;
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<UserPrefs>) => {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data.preferences);
    },
  });
}
```

- [ ] **Step 7: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/stores/ src/hooks/
git commit -m "feat: add Zustand stores and TanStack Query hooks for all entities"
```

---

### Task 10: App Shell and Navigation

**Files:**
- Create: `src/components/shared/app-nav.tsx`, `src/app/(app)/layout.tsx`, `src/app/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx` (already exists)

- [ ] **Step 1: Create app navigation component**

Create `src/components/shared/app-nav.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/tasks", label: "Tasks" },
  { href: "/schedule", label: "Schedule" },
  { href: "/roles", label: "Roles" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center px-4">
        <Link href="/tasks" className="mr-8 text-xl font-bold text-gray-900">
          Mentor
        </Link>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/settings"
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create authenticated app layout**

Create `src/app/(app)/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { AppNav } from "@/components/shared/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AppNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Update root page to redirect**

Replace `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/tasks");
  redirect("/login");
}
```

- [ ] **Step 4: Create placeholder pages for Schedule and Roles**

Create `src/app/(app)/schedule/page.tsx`:

```typescript
export default function SchedulePage() {
  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-gray-500">Schedule View - coming in Phase 2</p>
    </div>
  );
}
```

Create `src/app/(app)/roles/page.tsx`:

```typescript
export default function RolesPage() {
  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-gray-500">Role View - coming in Phase 3</p>
    </div>
  );
}
```

Create `src/app/(app)/settings/page.tsx`:

```typescript
export default function SettingsPage() {
  return (
    <div className="flex items-center justify-center p-8">
      <p className="text-gray-500">Settings - coming in Phase 4</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm run build
```
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/components/shared/app-nav.tsx src/app/\(app\)/ src/app/page.tsx
git commit -m "feat: add authenticated app shell with tab navigation"
```

---

### Task 11: Task View - Core List Component

**Files:**
- Create: `src/components/task-view/task-tree-item.tsx`, `src/components/task-view/task-breadcrumb.tsx`, `src/components/task-view/task-list.tsx`, `src/app/(app)/tasks/page.tsx`

- [ ] **Step 1: Create task breadcrumb component**

Create `src/components/task-view/task-breadcrumb.tsx`:

```typescript
"use client";

import { useTaskStore } from "@/stores/task-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

export function TaskBreadcrumb() {
  const { parentPath, navigateTo, navigateToRoot } = useTaskStore();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToRoot(); }}
            className="text-sm"
          >
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        {parentPath.map((item, index) => (
          <Fragment key={item.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                onClick={(e) => { e.preventDefault(); navigateTo(index); }}
                className="text-sm"
              >
                {item.description}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
```

- [ ] **Step 2: Create task tree item component**

Create `src/components/task-view/task-tree-item.tsx`:

```typescript
"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TaskFlags, TaskSizeLabels, TaskStatusLabels, TaskType } from "@/lib/types/task";
import type { TaskWithChildren } from "@/lib/types/task";
import { useTaskStore } from "@/stores/task-store";
import { ChevronRight, FileText } from "lucide-react";

type TaskTreeItemProps = {
  task: TaskWithChildren;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onDoubleClick: (task: TaskWithChildren) => void;
  onContextMenu: (e: React.MouseEvent, task: TaskWithChildren) => void;
};

const statusColors: Record<number, string> = {
  0: "bg-green-100 text-green-800",
  1: "bg-amber-100 text-amber-800",
  2: "bg-red-100 text-red-800",
  3: "bg-blue-100 text-blue-800",
  4: "bg-purple-100 text-purple-800",
};

export function TaskTreeItem({
  task,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}: TaskTreeItemProps) {
  const isBold = (task.flags & TaskFlags.BOLD) !== 0;
  const isCrossedOut = (task.flags & TaskFlags.CROSSED_OUT) !== 0;
  const isComposite = task.type === TaskType.COMPOSITE;
  const hasNotes = task.notes.length > 0;
  const childCount = task.children.length;

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        isSelected ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-gray-50"
      )}
      onClick={() => onSelect(task.id)}
      onDoubleClick={() => onDoubleClick(task)}
      onContextMenu={(e) => onContextMenu(e, task)}
    >
      {isComposite ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <div className="h-4 w-4 shrink-0" />
      )}

      <span
        className={cn(
          "flex-1 truncate",
          isBold && "font-bold",
          isCrossedOut && "line-through text-gray-400",
          task.status === 1 && "line-through text-gray-400"
        )}
      >
        {task.description}
      </span>

      {hasNotes && <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />}

      {isComposite && childCount > 0 && (
        <span className="shrink-0 text-xs text-gray-400">
          {childCount} sub-task{childCount !== 1 ? "s" : ""}
        </span>
      )}

      {task.context && (
        <Badge variant="outline" className="shrink-0 text-xs">
          {task.context.name}
        </Badge>
      )}

      {task.size > 0 && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          {TaskSizeLabels[task.size]}
        </Badge>
      )}

      {task.dateDue && (
        <span className="shrink-0 text-xs text-gray-500">
          {new Date(task.dateDue).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      )}

      <Badge className={cn("shrink-0 text-xs", statusColors[task.status])}>
        {TaskStatusLabels[task.status]}
      </Badge>
    </div>
  );
}
```

- [ ] **Step 3: Create task list component**

Create `src/components/task-view/task-list.tsx`:

```typescript
"use client";

import { useTaskStore } from "@/stores/task-store";
import { useFilterStore } from "@/stores/filter-store";
import { useTasks } from "@/hooks/use-tasks";
import { TaskTreeItem } from "./task-tree-item";
import { TaskBreadcrumb } from "./task-breadcrumb";
import { TaskType } from "@/lib/types/task";
import type { TaskWithChildren } from "@/lib/types/task";
import { ScrollArea } from "@/components/ui/scroll-area";

type TaskListProps = {
  onEditTask: (task: TaskWithChildren) => void;
  onContextMenu: (e: React.MouseEvent, task: TaskWithChildren) => void;
};

export function TaskList({ onEditTask, onContextMenu }: TaskListProps) {
  const { selectedTaskId, setSelectedTask, currentParentId, navigateInto, navigateUp } =
    useTaskStore();
  const { activeFilterId } = useFilterStore();
  const { data: tasks, isLoading } = useTasks(currentParentId, activeFilterId);

  function handleDoubleClick(task: TaskWithChildren) {
    if (task.type === TaskType.COMPOSITE) {
      navigateInto(task.id, task.description);
    } else {
      onEditTask(task);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!tasks || tasks.length === 0) return;

    if (e.key === "Enter" && selectedTaskId) {
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task) handleDoubleClick(task);
    }

    if (e.key === "Escape" && currentParentId !== null) {
      navigateUp();
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = tasks.findIndex((t) => t.id === selectedTaskId);
      const next = idx < tasks.length - 1 ? tasks[idx + 1] : tasks[0];
      setSelectedTask(next.id);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = tasks.findIndex((t) => t.id === selectedTaskId);
      const prev = idx > 0 ? tasks[idx - 1] : tasks[tasks.length - 1];
      setSelectedTask(prev.id);
    }
  }

  return (
    <div className="flex flex-1 flex-col" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="border-b bg-white px-4 py-2">
        <TaskBreadcrumb />
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {currentParentId ? "No sub-tasks. Add one to get started." : "No tasks yet. Create your first task."}
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {tasks.map((task) => (
              <TaskTreeItem
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={setSelectedTask}
                onDoubleClick={handleDoubleClick}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 4: Create tasks page**

Create `src/app/(app)/tasks/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { TaskList } from "@/components/task-view/task-list";
import { TaskEditDialog } from "@/components/task-view/task-edit-dialog";
import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/stores/task-store";
import { useCreateTask } from "@/hooks/use-tasks";
import type { TaskWithChildren } from "@/lib/types/task";
import { Plus } from "lucide-react";

export default function TasksPage() {
  const [editingTask, setEditingTask] = useState<TaskWithChildren | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { currentParentId } = useTaskStore();

  function handleContextMenu(e: React.MouseEvent, task: TaskWithChildren) {
    e.preventDefault();
    // Context menu will be implemented in Task 13
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
        <Button size="sm" onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Task
        </Button>
      </div>

      <TaskList
        onEditTask={setEditingTask}
        onContextMenu={handleContextMenu}
      />

      <TaskEditDialog
        open={showNewDialog || editingTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewDialog(false);
            setEditingTask(null);
          }
        }}
        task={editingTask}
        parentId={currentParentId}
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/components/task-view/task-tree-item.tsx src/components/task-view/task-breadcrumb.tsx src/components/task-view/task-list.tsx src/app/\(app\)/tasks/page.tsx
git commit -m "feat: add Task View with hierarchical list, breadcrumb, and tree items"
```

---

### Task 12: Task Edit Dialog and Context Picker

**Files:**
- Create: `src/components/task-view/task-edit-dialog.tsx`, `src/components/shared/context-picker.tsx`, `src/components/task-view/task-notes-editor.tsx`

- [ ] **Step 1: Create context picker component**

Create `src/components/shared/context-picker.tsx`:

```typescript
"use client";

import { useContexts } from "@/hooks/use-contexts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ContextPickerProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

export function ContextPicker({ value, onChange }: ContextPickerProps) {
  const { data: contexts } = useContexts();

  return (
    <Select
      value={value !== null ? String(value) : "none"}
      onValueChange={(v) => onChange(v === "none" ? null : parseInt(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder="No context" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No context</SelectItem>
        {contexts?.map((ctx) => (
          <SelectItem key={ctx.id} value={String(ctx.id)}>
            {ctx.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Create task edit dialog**

Create `src/components/task-view/task-edit-dialog.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContextPicker } from "@/components/shared/context-picker";
import { useCreateTask, useUpdateTask } from "@/hooks/use-tasks";
import { useUiStore } from "@/stores/ui-store";
import { TaskSizeLabels } from "@/lib/types/task";
import type { TaskWithChildren } from "@/lib/types/task";

type TaskEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithChildren | null;
  parentId: number | null;
};

export function TaskEditDialog({ open, onOpenChange, task, parentId }: TaskEditDialogProps) {
  const isEditing = task !== null;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const pushUndo = useUiStore((s) => s.pushUndo);

  const [description, setDescription] = useState("");
  const [contextId, setContextId] = useState<number | null>(null);
  const [importance, setImportance] = useState(0);
  const [urgency, setUrgency] = useState(0);
  const [size, setSize] = useState(0);
  const [dateDue, setDateDue] = useState("");

  useEffect(() => {
    if (task) {
      setDescription(task.description);
      setContextId(task.contextId);
      setImportance(task.importance);
      setUrgency(task.urgency);
      setSize(task.size);
      setDateDue(task.dateDue ? new Date(task.dateDue).toISOString().split("T")[0] : "");
    } else {
      setDescription("");
      setContextId(null);
      setImportance(0);
      setUrgency(0);
      setSize(0);
      setDateDue("");
    }
  }, [task, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    const data = {
      description,
      contextId,
      importance,
      urgency,
      size,
      dateDue: dateDue || null,
      parentId,
    };

    if (isEditing) {
      const previousState = { ...task };
      await updateTask.mutateAsync({ id: task.id, ...data });
      pushUndo({
        description: `Edit task "${task.description}"`,
        undo: async () => {
          await updateTask.mutateAsync({
            id: task.id,
            description: previousState.description,
            contextId: previousState.contextId,
            importance: previousState.importance,
            urgency: previousState.urgency,
            size: previousState.size,
            dateDue: previousState.dateDue,
          });
        },
        redo: async () => {
          await updateTask.mutateAsync({ id: task.id, ...data });
        },
      });
    } else {
      await createTask.mutateAsync(data);
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              autoFocus
            />
          </div>

          <div>
            <Label>Context</Label>
            <ContextPicker value={contextId} onChange={setContextId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Importance</Label>
              <Select value={String(importance)} onValueChange={(v) => setImportance(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <SelectItem key={v} value={String(v)}>{v === 0 ? "None" : String(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgency</Label>
              <Select value={String(urgency)} onValueChange={(v) => setUrgency(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <SelectItem key={v} value={String(v)}>{v === 0 ? "None" : String(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Size</Label>
              <Select value={String(size)} onValueChange={(v) => setSize(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TaskSizeLabels).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dateDue}
                onChange={(e) => setDateDue(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!description.trim()}>
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create notes editor component**

Create `src/components/task-view/task-notes-editor.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type TaskNotesEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number | null;
  taskDescription: string;
  initialNotes: string;
};

export function TaskNotesEditor({
  open,
  onOpenChange,
  taskId,
  taskDescription,
  initialNotes,
}: TaskNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const queryClient = useQueryClient();

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, taskId]);

  const saveNotes = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function handleClose() {
    if (notes !== initialNotes) {
      saveNotes.mutate();
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Notes: {taskDescription}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-1 flex-col gap-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            className="min-h-[300px] flex-1 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleClose}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Verify build**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm run build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/components/task-view/task-edit-dialog.tsx src/components/shared/context-picker.tsx src/components/task-view/task-notes-editor.tsx
git commit -m "feat: add task edit dialog, context picker, and notes editor"
```

---

### Task 13: Task View - Context Menu, Toolbar, and Filter Bar

**Files:**
- Create: `src/components/shared/filter-bar.tsx`, `src/components/shared/search-dialog.tsx`
- Modify: `src/app/(app)/tasks/page.tsx`

- [ ] **Step 1: Create filter bar component**

Create `src/components/shared/filter-bar.tsx`:

```typescript
"use client";

import { useFilters } from "@/hooks/use-filters";
import { useFilterStore } from "@/stores/filter-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterBar() {
  const { data: filters } = useFilters();
  const { activeFilterId, setActiveFilter } = useFilterStore();

  return (
    <Select
      value={activeFilterId !== null ? String(activeFilterId) : "all"}
      onValueChange={(v) => setActiveFilter(v === "all" ? null : parseInt(v))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All tasks" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All tasks</SelectItem>
        {filters?.map((filter) => (
          <SelectItem key={filter.id} value={String(filter.id)}>
            {filter.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Create search dialog**

Create `src/components/shared/search-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchTasks } from "@/hooks/use-tasks";
import type { TaskWithChildren } from "@/lib/types/task";

type SearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTask: (task: TaskWithChildren) => void;
};

export function SearchDialog({ open, onOpenChange, onSelectTask }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [includeNotes, setIncludeNotes] = useState(false);
  const search = useSearchTasks();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      search.mutate({ query, includeNotes });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Find Tasks</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="flex-1"
            />
            <Button type="submit">Find</Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
            />
            Include notes
          </label>
        </form>
        {search.data && (
          <ScrollArea className="mt-4 max-h-64">
            {search.data.length === 0 ? (
              <p className="text-sm text-gray-500">No results found.</p>
            ) : (
              <div className="space-y-1">
                {search.data.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => { onSelectTask(task); onOpenChange(false); }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {task.description}
                    {task.context && (
                      <span className="ml-2 text-xs text-gray-400">{task.context.name}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Update tasks page with full toolbar and context menu**

Replace `src/app/(app)/tasks/page.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { TaskList } from "@/components/task-view/task-list";
import { TaskEditDialog } from "@/components/task-view/task-edit-dialog";
import { TaskNotesEditor } from "@/components/task-view/task-notes-editor";
import { FilterBar } from "@/components/shared/filter-bar";
import { SearchDialog } from "@/components/shared/search-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskStore } from "@/stores/task-store";
import { useUiStore } from "@/stores/ui-store";
import {
  useDeleteTask,
  useToggleBold,
  useChangeStatus,
  useCopyTask,
  useMoveTask,
} from "@/hooks/use-tasks";
import { TaskStatus } from "@/lib/types/task";
import type { TaskWithChildren } from "@/lib/types/task";
import { Plus, Search, Undo2, Redo2 } from "lucide-react";

export default function TasksPage() {
  const [editingTask, setEditingTask] = useState<TaskWithChildren | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notesTask, setNotesTask] = useState<TaskWithChildren | null>(null);
  const [contextMenuTask, setContextMenuTask] = useState<TaskWithChildren | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [clipboardTask, setClipboardTask] = useState<{ id: number; mode: "cut" | "copy" } | null>(null);

  const { currentParentId } = useTaskStore();
  const { undo, redo, canUndo, canRedo } = useUiStore();

  const deleteTask = useDeleteTask();
  const toggleBold = useToggleBold();
  const changeStatus = useChangeStatus();
  const copyTask = useCopyTask();
  const moveTask = useMoveTask();

  const handleContextMenu = useCallback((e: React.MouseEvent, task: TaskWithChildren) => {
    e.preventDefault();
    setContextMenuTask(task);
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  async function handlePaste() {
    if (!clipboardTask) return;
    if (clipboardTask.mode === "copy") {
      await copyTask.mutateAsync({ id: clipboardTask.id, targetParentId: currentParentId });
    } else {
      await moveTask.mutateAsync({ id: clipboardTask.id, targetParentId: currentParentId });
      setClipboardTask(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      setShowSearch(true);
    }
    if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "Z") {
      e.preventDefault();
      redo();
    }
    if (e.ctrlKey && e.key === "b" && contextMenuTask) {
      e.preventDefault();
      toggleBold.mutate(contextMenuTask.id);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
        <Button size="sm" onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Task
        </Button>
        <FilterBar />
        <Button size="sm" variant="outline" onClick={() => setShowSearch(true)}>
          <Search className="mr-1 h-4 w-4" />
          Find
        </Button>
        {clipboardTask && (
          <Button size="sm" variant="outline" onClick={handlePaste}>
            Paste
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => undo()} disabled={!canUndo()}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => redo()} disabled={!canRedo()}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TaskList onEditTask={setEditingTask} onContextMenu={handleContextMenu} />

      {showContextMenu && contextMenuTask && (
        <div
          className="fixed z-50"
          style={{ left: menuPosition.x, top: menuPosition.y }}
        >
          <DropdownMenu open onOpenChange={() => setShowContextMenu(false)}>
            <DropdownMenuTrigger asChild>
              <div />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom">
              <DropdownMenuItem onClick={() => { setEditingTask(contextMenuTask); setShowContextMenu(false); }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNotesTask(contextMenuTask); setShowContextMenu(false); }}>
                Notes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { toggleBold.mutate(contextMenuTask.id); setShowContextMenu(false); }}>
                Toggle Bold
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setClipboardTask({ id: contextMenuTask.id, mode: "cut" }); setShowContextMenu(false); }}>
                Cut
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setClipboardTask({ id: contextMenuTask.id, mode: "copy" }); setShowContextMenu(false); }}>
                Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { changeStatus.mutate({ id: contextMenuTask.id, status: TaskStatus.DONE }); setShowContextMenu(false); }}>
                Mark Done
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { changeStatus.mutate({ id: contextMenuTask.id, status: TaskStatus.DROPPED }); setShowContextMenu(false); }}>
                Mark Dropped
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { changeStatus.mutate({ id: contextMenuTask.id, status: TaskStatus.DEFERRED }); setShowContextMenu(false); }}>
                Mark Deferred
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { changeStatus.mutate({ id: contextMenuTask.id, status: TaskStatus.DELEGATED }); setShowContextMenu(false); }}>
                Mark Delegated
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  if (confirm(contextMenuTask.children?.length > 0
                    ? "WARNING: This will delete all sub-tasks. Continue?"
                    : "Delete this task?")) {
                    deleteTask.mutate(contextMenuTask.id);
                  }
                  setShowContextMenu(false);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <TaskEditDialog
        open={showNewDialog || editingTask !== null}
        onOpenChange={(open) => {
          if (!open) { setShowNewDialog(false); setEditingTask(null); }
        }}
        task={editingTask}
        parentId={currentParentId}
      />

      <TaskNotesEditor
        open={notesTask !== null}
        onOpenChange={(open) => { if (!open) setNotesTask(null); }}
        taskId={notesTask?.id ?? null}
        taskDescription={notesTask?.description ?? ""}
        initialNotes={notesTask?.notes ?? ""}
      />

      <SearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        onSelectTask={(task) => setEditingTask(task)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm run build
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/components/shared/filter-bar.tsx src/components/shared/search-dialog.tsx src/app/\(app\)/tasks/page.tsx
git commit -m "feat: add toolbar, context menu, filter bar, search, clipboard, and undo/redo"
```

---

### Task 14: Keyboard Shortcuts

**Files:**
- Create: `src/hooks/use-keyboard-shortcuts.ts`
- Modify: `src/app/(app)/tasks/page.tsx`

- [ ] **Step 1: Create keyboard shortcuts hook**

Create `src/hooks/use-keyboard-shortcuts.ts`:

```typescript
import { useEffect } from "react";

type ShortcutMap = Record<string, () => void>;

function getShortcutKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  parts.push(e.key.toLowerCase());
  return parts.join("+");
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = getShortcutKey(e);
      const action = shortcuts[key];
      if (action) {
        e.preventDefault();
        action();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
```

- [ ] **Step 2: Integrate keyboard shortcuts into tasks page**

Add to the top of the `TasksPage` component in `src/app/(app)/tasks/page.tsx`, after the existing state declarations, add the `useKeyboardShortcuts` import and call:

Add import at top of file:
```typescript
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
```

Add inside the component, after the mutation hooks:
```typescript
  useKeyboardShortcuts({
    "ctrl+f": () => setShowSearch(true),
    "ctrl+z": () => undo(),
    "ctrl+shift+z": () => redo(),
    "ctrl+n": () => setShowNewDialog(true),
  });
```

Remove the duplicate `handleKeyDown` function and `onKeyDown` prop from the outer div (the hook handles it globally now).

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add src/hooks/use-keyboard-shortcuts.ts src/app/\(app\)/tasks/page.tsx
git commit -m "feat: add global keyboard shortcut handler"
```

---

### Task 15: Dockerfile and Deployment Config

**Files:**
- Create: `Dockerfile`, update `docker-compose.yml`

- [ ] **Step 1: Create production Dockerfile**

Create `mentor/Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

- [ ] **Step 2: Update docker-compose for full-stack deployment**

Replace `mentor/docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://mentor:${DB_PASSWORD:-mentor}@db:5432/mentor
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-change-me-in-production}
      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3000}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mentor
      POSTGRES_USER: mentor
      POSTGRES_PASSWORD: ${DB_PASSWORD:-mentor}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mentor"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 3: Create .dockerignore**

Create `mentor/.dockerignore`:

```
node_modules
.next
.env
.env.local
.git
README.md
docs/
tests/
```

- [ ] **Step 4: Verify Docker build**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
docker build -t mentor .
```
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add Dockerfile and docker-compose for production deployment"
```

---

### Task 16: Seed Data and End-to-End Verification

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Create seed script**

Create `mentor/prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@mentor.app" },
    update: {},
    create: {
      email: "demo@mentor.app",
      name: "Demo User",
      password: hashedPassword,
    },
  });

  // Create default preferences
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      prefs: {
        toolbar: true,
        buttonBar: true,
        pathInHeader: true,
        zoom: "medium",
      },
    },
  });

  // Create contexts
  const work = await prisma.context.create({
    data: { name: "Work", description: "Work tasks", symbolIcon: "cogs", userId: user.id, sortOrder: 0 },
  });

  const personal = await prisma.context.create({
    data: { name: "Personal", description: "Personal tasks", symbolIcon: "house", userId: user.id, sortOrder: 1 },
  });

  const study = await prisma.context.create({
    data: { name: "Study", description: "Learning and study", symbolIcon: "book", userId: user.id, sortOrder: 2 },
  });

  // Create composite task with sub-tasks
  const project = await prisma.task.create({
    data: {
      description: "Website Redesign",
      type: 1, // composite
      contextId: work.id,
      importance: 4,
      urgency: 3,
      size: 4, // day
      userId: user.id,
      sortOrder: 0,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        description: "Wireframes",
        parentId: project.id,
        contextId: work.id,
        importance: 3,
        size: 3, // half day
        dateDue: new Date("2026-04-15"),
        userId: user.id,
        sortOrder: 0,
      },
      {
        description: "Visual Design",
        parentId: project.id,
        contextId: work.id,
        importance: 3,
        size: 4, // day
        dateDue: new Date("2026-04-20"),
        userId: user.id,
        sortOrder: 1,
      },
      {
        description: "Code Prototype",
        parentId: project.id,
        contextId: work.id,
        importance: 2,
        size: 4,
        dateDue: new Date("2026-04-30"),
        status: 3, // deferred
        userId: user.id,
        sortOrder: 2,
      },
    ],
  });

  // Create standalone tasks
  await prisma.task.createMany({
    data: [
      {
        description: "Grocery shopping",
        contextId: personal.id,
        importance: 1,
        size: 2, // hour
        dateDue: new Date("2026-04-10"),
        userId: user.id,
        sortOrder: 1,
      },
      {
        description: "Read chapter 5 of database textbook",
        contextId: study.id,
        importance: 2,
        size: 2,
        userId: user.id,
        sortOrder: 2,
      },
      {
        description: "Fix login bug on staging",
        contextId: work.id,
        importance: 5,
        urgency: 5,
        size: 1, // minutes
        flags: 1, // bold
        dateDue: new Date("2026-04-09"),
        userId: user.id,
        sortOrder: 3,
      },
    ],
  });

  // Create a filter
  await prisma.filter.create({
    data: {
      name: "Active Only",
      staFilter: "0",
      userId: user.id,
    },
  });

  await prisma.filter.create({
    data: {
      name: "Work Tasks",
      ctxFilter: String(work.id),
      userId: user.id,
    },
  });

  console.log("Seed complete. Login: demo@mentor.app / password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed config to package.json**

Add to `package.json`:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Install tsx:
```bash
cd /mnt/d/Mentor2.0/mentor
npm install -D tsx
```

- [ ] **Step 3: Run seed**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx prisma db seed
```
Expected: "Seed complete. Login: demo@mentor.app / password123"

- [ ] **Step 4: Run all tests**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 5: Run dev server and verify manually**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm run dev
```
Open http://localhost:3000. Verify:
- Redirect to login page
- Register a new user
- Login with demo@mentor.app / password123
- See task list with seeded data
- Navigate into composite task
- Create a new task
- Edit a task
- Right-click context menu works
- Filter bar works
- Search works

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add seed data and complete Phase 1 core task view"
```

---

### Task 17: Add .gitignore and Final Cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Ensure .gitignore includes superpowers directory**

Add to the project root `.gitignore`:
```
.superpowers/
```

- [ ] **Step 2: Run final build verification**

Run:
```bash
cd /mnt/d/Mentor2.0/mentor
npm run build && npx vitest run
```
Expected: Build and all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /mnt/d/Mentor2.0/mentor
git add .gitignore
git commit -m "chore: add .superpowers to gitignore"
```
