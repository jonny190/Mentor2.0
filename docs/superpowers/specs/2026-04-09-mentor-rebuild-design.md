# Mentor - Modern Rebuild Design Spec

## Overview

Mentor is a personal project management and task scheduling application, originally built for the Psion Series 5 (EPOC32). This spec defines the modern web rebuild - a faithful reinterpretation of the original's three-view architecture with modern UX patterns.

The original treats productivity as a three-layer problem:
1. **What** needs doing (Tasks - hierarchical, with metadata)
2. **When** it gets done (Schedule - tasks allocated to dates/time slots)
3. **Who/Where** it gets done (Roles - contexts mapped to calendar views with usage meters)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js (App Router, full-stack) | Single deployable unit, shared types, server actions |
| Database | PostgreSQL + Prisma ORM | Matches original's SQL heritage, great migrations and type safety |
| UI | Tailwind CSS + shadcn/ui | Customizable, lightweight, accessible components |
| Auth | NextAuth.js (credentials) | Simple email/password, JWT sessions |
| State | Zustand + TanStack Query | Cross-view reactivity with server cache invalidation |
| Deployment | Docker on Coolify | Single container, PostgreSQL as separate service |
| Design | Responsive-first | Works mobile through desktop |
| Fidelity | Faithful reinterpretation | Keep all original concepts, modernize the UX patterns |
| Architecture | Monolithic now, extractable later | Business logic in `lib/engine/` for future API service extraction |
| Scope | All 4 phases | Built incrementally, designed holistically |

## Architecture

### Project Structure

```
mentor/
  src/
    app/                        # Next.js App Router
      (auth)/                   # Auth pages (login, register)
        login/page.tsx
        register/page.tsx
      (app)/                    # Authenticated app shell
        layout.tsx              # Shared shell: tab nav, filter bar, context
        tasks/page.tsx          # Task View
        schedule/page.tsx       # Schedule View
        roles/page.tsx          # Role View
        settings/page.tsx       # Preferences
      api/                      # REST API routes
        auth/[...nextauth]/
        tasks/
        contexts/
        slots/
        schedule/
        filters/
        preferences/
        export/
    lib/
      engine/                   # Business logic (extraction boundary)
        scheduler.ts            # Core scheduling engine
        reschedule.ts           # Reschedule logic (incremental + full)
        suggest.ts              # Slot suggestion algorithm
        repeat.ts               # Repeat pattern generator
        types.ts                # Engine-specific types
      db/
        prisma.ts               # Prisma client singleton
      auth/
        auth.ts                 # NextAuth configuration
      types/                    # Shared TypeScript types
        task.ts
        slot.ts
        context.ts
        filter.ts
        preferences.ts
    components/
      ui/                       # shadcn/ui base components
      task-view/                # Task View components
        task-list.tsx
        task-tree-item.tsx
        task-breadcrumb.tsx
        task-edit-dialog.tsx
        task-notes-editor.tsx
        composite-navigator.tsx
      schedule-view/            # Schedule View components
        schedule-list.tsx
        schedule-date-group.tsx
        schedule-dialog.tsx
        date-navigator.tsx
      role-view/                # Role View components
        calendar-grid.tsx
        calendar-cell.tsx
        usage-meter.tsx
        slot-editor.tsx
        repeat-pattern-dialog.tsx
      shared/                   # Cross-view components
        context-picker.tsx
        filter-bar.tsx
        filter-editor.tsx
        intervention-dialog.tsx
        keyboard-shortcut-handler.tsx
        search-dialog.tsx
    hooks/
      use-undo-redo.ts
      use-keyboard-shortcuts.ts
      use-task-mutations.ts
      use-slot-mutations.ts
      use-scheduling.ts
    stores/
      task-store.ts
      schedule-store.ts
      slot-store.ts
      context-store.ts
      filter-store.ts
      ui-store.ts
  prisma/
    schema.prisma
    migrations/
    seed.ts
  public/
  docker-compose.yml
  Dockerfile
```

### Extraction Boundary

The `lib/engine/` directory contains all business logic with no Next.js dependencies. Functions accept database operations as injected parameters (repository pattern). When extracting to a separate API service later:

1. `lib/engine/` becomes the core of the new service
2. API routes become thin proxies to the external service
3. The REST endpoint contract stays identical
4. No frontend changes required

## Data Model

### Entity Relationship

```
users 1--* tasks
users 1--* contexts
users 1--* time_slots
users 1--* filters
users 1--1 user_preferences

tasks *--1 tasks (parent/child hierarchy)
tasks *--1 contexts
tasks *--* time_slots (via task_slot_assignments)

contexts *--1 contexts (parent/child for goals within roles)

time_slots *--1 contexts
time_slots 1--* repeat_patterns

task_slot_assignments links tasks <-> time_slots
```

### Prisma Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String   // bcrypt hashed
  createdAt DateTime @default(now())

  tasks       Task[]
  contexts    Context[]
  timeSlots   TimeSlot[]
  filters     Filter[]
  preferences UserPreferences?
  taskSlotAssignments TaskSlotAssignment[]
  repeatPatterns RepeatPattern[]
}

model Task {
  id          Int       @id @default(autoincrement())
  parent      Task?     @relation("TaskHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  parentId    Int?      // NULL = root level
  children    Task[]    @relation("TaskHierarchy")
  type        Int       @default(0)  // 0=simple, 1=composite
  context     Context?  @relation(fields: [contextId], references: [id])
  contextId   Int?
  flags       Int       @default(0)  // bitfield: bold(1), crossed-out(2), alarm(4), archive(8)
  importance  Int       @default(0)  // 0-5 scale
  urgency     Int       @default(0)  // 0-5 scale, auto-calculable
  size        Int       @default(0)  // 0=undefined,1=minutes,2=hour,3=half-day,4=day,5=custom
  sizeCustom  Int?      // custom size in minutes (when size=5)
  status      Int       @default(0)  // 0=active,1=done,2=dropped,3=deferred,4=delegated
  schedule    Int       @default(0)  // schedule state
  dateEntered DateTime  @default(now())
  dateUpdated DateTime  @default(now()) @updatedAt
  dateScheduled DateTime?
  dateDue     DateTime?
  description String    @default("")
  crossRef    String    @default("")
  stateText   String    @default("")
  notes       String    @default("")
  sortOrder   Int       @default(0)

  user        User      @relation(fields: [userId], references: [id])
  userId      Int

  slotAssignments TaskSlotAssignment[]

  @@index([userId, parentId])
  @@index([userId, status])
  @@index([userId, contextId])
  @@index([userId, dateScheduled])
  @@index([userId, dateDue])
}

model Context {
  id          Int       @id @default(autoincrement())
  parent      Context?  @relation("ContextHierarchy", fields: [parentId], references: [id])
  parentId    Int?      // NULL = top-level role
  children    Context[] @relation("ContextHierarchy")
  name        String
  description String    @default("")
  ctxType     Int       @default(0)  // 0=role, 1=goal
  symbolType  Int       @default(0)  // 0=undefined, 1=standard, 2=label, 3=superscript
  symbolIcon  String    @default("")
  sortOrder   Int       @default(0)

  user        User      @relation(fields: [userId], references: [id])
  userId      Int

  tasks       Task[]
  timeSlots   TimeSlot[]

  @@index([userId])
}

model TimeSlot {
  id          Int       @id @default(autoincrement())
  type        Int       @default(0)  // 0=regular, 1=appointment, 2=milestone
  context     Context?  @relation(fields: [contextId], references: [id])
  contextId   Int?
  dateScheduled DateTime
  startMinutes Int      @default(540)   // 9:00 AM
  endMinutes  Int       @default(1020)  // 5:00 PM
  allocated   Int       @default(0)     // allocated size in minutes
  scheduled   Int       @default(0)     // scheduled task count
  count       Int       @default(0)     // total task count
  overallAlloc Int      @default(0)     // overall allocation tracking
  description String    @default("")
  crossRef    String    @default("")

  user        User      @relation(fields: [userId], references: [id])
  userId      Int

  taskAssignments TaskSlotAssignment[]
  repeatPatterns  RepeatPattern[]

  @@index([userId, dateScheduled])
  @@index([userId, contextId])
}

model RepeatPattern {
  id          Int       @id @default(autoincrement())
  slot        TimeSlot  @relation(fields: [slotId], references: [id], onDelete: Cascade)
  slotId      Int
  type        Int       // 0=none,1=daily,2=weekly,3=monthly-date,4=monthly-day,5=yearly-date,6=yearly-day
  intervalVal Int       @default(1)
  dateTo      DateTime? // end date (NULL = forever)
  dateFrom    DateTime  // start date
  occurrences Int       @default(0) // 0=forever
  flags       Int       @default(0)
  priority    Int       @default(1) // 0=recessive,1=normal,2=dominant
  pattern     String    @default("") // day-of-week bitmask for weekly, etc.

  user        User      @relation(fields: [userId], references: [id])
  userId      Int
}

model TaskSlotAssignment {
  id     Int      @id @default(autoincrement())
  task   Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  taskId Int
  slot   TimeSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  slotId Int

  user   User     @relation(fields: [userId], references: [id])
  userId Int

  @@unique([taskId, slotId])
  @@index([userId])
}

model Filter {
  id         Int    @id @default(autoincrement())
  name       String
  impFilter  String @default("")  // comma-separated values, e.g. "1,2,3" -> WHERE imp IN (1,2,3)
  urgFilter  String @default("")  // empty string = no filter on this field
  sizFilter  String @default("")
  staFilter  String @default("")
  schFilter  String @default("")
  ctxFilter  String @default("")  // context IDs, e.g. "1,5,8"
  flgFilter  String @default("")  // flag bitmask values

  user       User   @relation(fields: [userId], references: [id])
  userId     Int

  @@index([userId])
}

model UserPreferences {
  id     Int  @id @default(autoincrement())
  user   User @relation(fields: [userId], references: [id])
  userId Int  @unique
  prefs  Json @default("{}")
}
```

### Default Preferences

```json
{
  "toolbar": true,
  "buttonBar": true,
  "cursorStyle": "highlight",
  "pathInHeader": true,
  "pathInTasks": false,
  "indentGoals": true,
  "dueNumerals": false,
  "rvRows": 3,
  "treeCalc": true,
  "asapDays": 1,
  "soonDays": 7,
  "sometimeDays": 30,
  "autoSchedule": false,
  "incrementalReschedule": true,
  "suggestAheadDays": 90,
  "scanAheadDays": 30,
  "fullDay": false,
  "sizeMinutes": 15,
  "sizeHour": 60,
  "sizeHalfDay": 240,
  "sizeDay": 480,
  "zeroDropped": false,
  "zeroDeferred": false,
  "zeroDelegated": false,
  "zoom": "medium"
}
```

## Scheduling Engine

The scheduling engine lives in `lib/engine/` and is the core of Mentor.

### Core Concepts

- Tasks have a **size** (effort estimate in minutes) and a **context** (role)
- Time slots have **allocated capacity** (minutes) and belong to a **context** and **date**
- The scheduler matches tasks to slots based on context and available capacity

### Scheduling Flow

1. User creates/edits a task and triggers "Schedule"
2. Engine searches for slots matching the task's context with enough remaining capacity
3. If a slot is found: assign task to slot, update slot's scheduled count and allocation
4. If no slot found: show **intervention dialog**
5. User chooses: force-assign, pick different date, accept suggestion, or cancel

### Suggest Algorithm

`suggestSlot(task, options)`:
1. Determine task's context and size in minutes
2. Starting from today (or specified date), scan forward up to `scanAheadDays`
3. For each day, find slots matching context
4. For each slot, check: `slot.allocated - slot.overallAlloc >= task.sizeMinutes`
5. Return the first slot with sufficient remaining capacity
6. If none found within range, extend to `suggestAheadDays` and return best partial match

### Reschedule Modes

**Incremental:** Only reschedules the affected task and tasks in the same slot. Triggered by individual task edits.

**Full:** Recalculates all task-to-slot assignments for the user. Triggered by:
- Date change (crossing midnight)
- Slot completion
- Manual "Reschedule All" action
- Preference changes affecting scheduling

### Slot Completion Flow

1. User completes a time slot in Role View
2. Tasks in that slot checked: completed tasks stay, active tasks flagged
3. Options presented: "This slot only" / "All current tasks"
4. "This slot only": reschedule only tasks from this slot
5. "All current tasks": trigger full reschedule

### Engine API

```typescript
// lib/engine/scheduler.ts
interface SchedulerContext {
  // Injected database operations (repository pattern)
  findSlots(query: SlotQuery): Promise<TimeSlot[]>
  findTasks(query: TaskQuery): Promise<Task[]>
  assignTask(taskId: number, slotId: number): Promise<void>
  unassignTask(taskId: number): Promise<void>
  updateSlot(slotId: number, data: Partial<TimeSlot>): Promise<void>
  updateTask(taskId: number, data: Partial<Task>): Promise<void>
}

function suggestSlot(ctx: SchedulerContext, task: Task, options: SuggestOptions): Promise<TimeSlot | null>
function scheduleTask(ctx: SchedulerContext, taskId: number, slotId: number): Promise<void>
function unscheduleTask(ctx: SchedulerContext, taskId: number): Promise<void>
function reschedule(ctx: SchedulerContext, mode: 'incremental' | 'full', scope: RescheduleScope): Promise<RescheduleResult>
function completeSlot(ctx: SchedulerContext, slotId: number, options: CompleteOptions): Promise<void>
function generateRepeats(pattern: RepeatPattern, dateRange: DateRange): DateTime[]
```

## Intervention Dialog

Shown when automatic scheduling fails (no available slot for a task).

**Displays:**
- Task description, context, and size
- Scheduled date (if any)
- Reason for failure ("No time slot available as scheduled")

**Due date options:**
- Same date
- +1 day / +2 days / +3 days
- +1 week / +2 weeks
- +1 month
- Custom date picker

**Actions:**
- **Auto** - let the engine try with the new due date
- **Force** - assign to the selected date regardless of capacity
- **Today** - schedule for today
- **Done** - mark the task as done instead
- **Dropped** - mark the task as dropped instead
- **Suggest** - ask the engine to suggest the next available slot
- **Cancel** - cancel scheduling

## State Management

### Zustand Stores

```
taskStore      - current task list, selected task, hierarchy position, sort state
scheduleStore  - current date range, date cursor, visible scheduled tasks
slotStore      - time slots for current view range, slot cursor
contextStore   - contexts/roles list (shared across all views)
filterStore    - active filter, saved filters list
uiStore        - active view, zoom level, preferences, undo/redo stack
```

### Cross-View Reactivity

TanStack Query handles server state with cache invalidation. Mutations in one view invalidate related queries across all views:

- Schedule a task (Task View) -> invalidates schedule queries + slot queries
- Complete a slot (Role View) -> triggers reschedule, invalidates task + schedule queries
- Change a filter -> applies to both Task View and Schedule View
- Create/edit a context -> invalidates all views

### Undo/Redo

Command pattern: each mutation creates an `UndoableAction` with `execute()` and `undo()` methods. The undo stack is stored in `uiStore` and shared across views. Each action stores the previous state of the changed entity (matching the original's full-field snapshot approach).

## Authentication

- NextAuth.js with credentials provider
- Email + password registration and login
- Passwords hashed with bcrypt
- JWT session tokens (stateless)
- All database queries filtered by `userId` for complete data isolation
- On registration: seed default preferences and an "Undefined" context

## API Endpoints

All endpoints require authentication. All queries scoped to the authenticated user.

### Tasks
```
GET    /api/tasks?parentId=&filterId=    List tasks (with optional filter)
POST   /api/tasks                         Create task
PUT    /api/tasks/[tid]                   Update task
DELETE /api/tasks/[tid]                   Delete task (recursive for composite)
POST   /api/tasks/[tid]/composite         Convert to composite
POST   /api/tasks/[tid]/schedule          Schedule task to slot
PUT    /api/tasks/[tid]/status            Change status
PUT    /api/tasks/[tid]/bold              Toggle bold
POST   /api/tasks/[tid]/copy              Copy task
POST   /api/tasks/[tid]/move              Move task
GET    /api/tasks/[tid]/notes             Get notes
PUT    /api/tasks/[tid]/notes             Update notes
GET    /api/tasks/search?q=&notes=        Search tasks
```

### Contexts
```
GET    /api/contexts                      List all contexts/roles
POST   /api/contexts                      Create context
PUT    /api/contexts/[cid]                Update context
DELETE /api/contexts/[cid]                Delete (with task remapping option)
```

### Time Slots
```
GET    /api/slots?from=&to=               Get slots for date range
POST   /api/slots                         Create time slot
PUT    /api/slots/[rid]                   Update slot
DELETE /api/slots/[rid]                   Delete slot
POST   /api/slots/[rid]/complete          Complete slot
POST   /api/slots/[rid]/repeat            Set repeat pattern
```

### Schedule Engine
```
POST   /api/schedule/suggest              Suggest next available slot
POST   /api/schedule/reschedule           Full reschedule
POST   /api/schedule/reschedule-slot      Reschedule from specific slot
```

### Filters
```
GET    /api/filters                       List saved filters
POST   /api/filters                       Create filter
PUT    /api/filters/[id]                  Update filter
DELETE /api/filters/[id]                  Delete filter
```

### Other
```
GET    /api/preferences                   Get user preferences
PUT    /api/preferences                   Update preferences
GET    /api/export?format=csv|json        Export data
```

## Three Views

### Task View

The primary view. A hierarchical task list with tree navigation.

**Layout:**
- Breadcrumb header showing current position in hierarchy (e.g. Home / Work Projects / Website Redesign)
- Toolbar: New task, filter dropdown, sort, find
- Task list with indentation for hierarchy depth
- Each task row shows: expand/collapse indicator (composite), description, sub-task count (composite), size badge, status badge, due date, context icon

**Interactions:**
- Click to select, double-click or Enter to edit
- Right-click context menu: Edit, Delete, Notes, Schedule, Make Composite, Cut, Copy, Paste, Bold, Status changes
- Enter on composite task navigates into it; Escape navigates back up
- Drag-and-drop for reordering and moving between composites
- Breadcrumb segments are clickable for fast navigation

### Schedule View

Tasks organised by date with time slot information.

**Layout:**
- Date header with "Today" button and date navigation
- Tasks grouped by date, showing time slot info (start-end times)
- Due date column with countdown indicators
- Completed slots greyed out

**Interactions:**
- Same task editing capabilities as Task View
- Click due date column to open schedule dialog
- Date navigation via Go To dialog or keyboard
- Space toggles between current position and today

### Role View

Calendar grid showing time allocation across roles.

**Layout:**
- Rows = contexts/roles, columns = days
- Configurable: 1, 2, or 3 week views (default 3)
- Each cell shows: usage meter (progress bar of allocated vs capacity), task count, slot entries
- Today column highlighted
- Scroll indicators when cells have more entries than visible

**Interactions:**
- Click empty cell to create new time slot
- Click slot entry to edit
- Drag time slots between days
- Complete slot via context menu or keyboard
- Repeat pattern indicators on recurring slots

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Sort |
| Ctrl+G | Go to (date/task) |
| Ctrl+B | Toggle Bold |
| Ctrl+F | Find |
| Ctrl+Shift+F | Find Next |
| Ctrl+Shift+X | Mark as Done |
| Ctrl+Shift+C | Mark as Dropped |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+X | Cut |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Enter | Enter composite / Edit entry |
| Escape | Exit composite / Go back |
| Space | Hierarchy popup (TV) / Toggle Today (SV/RV) |
| Delete | Delete selected |

## Deployment

### Docker

Single Dockerfile for Next.js app. PostgreSQL as a separate Coolify-managed service.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

### Environment Variables

```
DATABASE_URL=postgresql://mentor:password@db:5432/mentor
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://mentor.yourdomain.com
```

Domain served over HTTP - Cloudflare tunnel handles HTTPS.

## Phase Plan

### Phase 1 - Core (Task View)
- User authentication (register, login, session)
- Task CRUD with hierarchical composite support
- Context/Role management (CRUD, hierarchy, icons)
- Basic filtering (by status, context, importance, urgency, size)
- Notes (rich text per task)
- Find/search across tasks and notes
- Cut/Copy/Paste (within and across composites)
- Undo/Redo (command pattern)
- Bold toggle
- Status lifecycle (Active -> Done/Dropped/Deferred/Delegated)
- Preferences foundation (JSONB store, default values)
- Deployment to Coolify

### Phase 2 - Scheduling (Schedule View)
- Schedule View UI with date-ordered task display
- Time slot CRUD
- Manual task-to-slot assignment
- Scheduling engine with suggest algorithm
- Intervention dialog
- Due date tracking and countdown display
- Reschedule engine (incremental and full modes)
- Auto-schedule preference

### Phase 3 - Resource View (Role View)
- Calendar grid component (1/2/3 week views)
- Usage meters per cell (allocated vs capacity)
- Time slot visual management within cells
- Repeating time slots (all pattern types)
- Slot completion flow with reschedule triggers
- Appointments (special slot type)
- Multi-week configuration

### Phase 4 - Polish
- Export (CSV, JSON)
- Full preferences UI
- Complete keyboard shortcut system
- Mobile responsive refinements
- PWA support for offline use
- Data backup/restore
- Data model preparation for future calendar sync (CalDAV/Google)
- Code preparation for API service extraction
