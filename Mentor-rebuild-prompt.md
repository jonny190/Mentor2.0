# Mentor — Modern Rebuild Specification

## Prompt for Rebuilding WuLiSoft Mentor (Psion 5 Task/Schedule/Role Manager)

> **Context**: This specification was reverse-engineered from the original `mentor.sis` EPOC32 installation package (v5.119, © Ben Thornton / WuLiSoft, 1996–2002). Every feature, data field, dialog, preference, and workflow described below was extracted from the OPL bytecode string tables, variable declarations, function names, and embedded release notes within the binary. This is not guesswork — it is a forensic reconstruction of the original application.

---

## 1. Application Overview

**Mentor** is a personal project management and task scheduling application originally built for the Psion Series 5/5mx (EPOC32) in OPL (Open Programming Language). It was a shareware product by Ben Thornton, trading as WuLiSoft (wulisoft.com, support@wulisoft.com).

The application is centred around three integrated views for managing tasks, scheduling work into time slots, and visualising resource allocation across roles/contexts over a calendar. It is NOT a simple to-do list — it is a structured, hierarchical task scheduling engine with time slot allocation, context-based filtering, and a calendar-based resource view.

### Core Philosophy
Mentor treats productivity as a three-layer problem:
1. **What** needs doing (Tasks — hierarchical, with metadata)
2. **When** it gets done (Schedule — tasks allocated to dates/time slots)
3. **Who/Where** it gets done (Roles — contexts/roles mapped to calendar views with usage meters)

---

## 2. Three-View Architecture

### 2.1 Task View (TV)
The primary view for managing the task hierarchy.

**Purpose**: Create, organise, and manage tasks in a hierarchical (tree) structure.

**Features**:
- Flat list display with optional tree indentation showing composite task hierarchy
- Tasks can be **simple** (leaf tasks) or **composite** (container tasks with sub-tasks)
- Hierarchical navigation via a popup tree dialog (spacebar activates)
- Navigate into/out of composite tasks (enter/escape)
- Context-aware header bar showing current position in hierarchy (e.g. `\Project\Phase1\Design`)
- Path display in header is togglable via preference (`MAPREFPATHHEADER`)
- Sortable (Ctrl+S) with persistent sort state
- Find / Find Next with text matching across task descriptions and notes
- Cut / Copy / Paste tasks (including across composite boundaries, with tree complexity warnings)
- Bold toggle (Ctrl+B) for visual emphasis
- Undo/Redo with full state snapshots of task fields
- Filter by context, importance, urgency, size, status, schedule state, and flags
- Advanced filter composition (AND conditions across multiple fields)
- "What's This?" contextual help (Ctrl+Shift+H)
- Toolbar and button bar (togglable via preferences)
- Custom scrollbar implementation

**Task Fields** (from the database schema — `Tasks` table):
| Field | Variable | Type | Description |
|-------|----------|------|-------------|
| TID | Task ID | Integer | Unique identifier |
| PID | Parent ID | Integer | Parent composite task (0 = root) |
| TYP | Type | Integer | Simple task / Composite task |
| CTX | Context | Integer | Context/Role ID reference |
| FLG | Flags | Integer | Bitfield: bold, crossed-out, alarm, archive |
| IMP | Importance | Integer | Importance rating |
| URG | Urgency | Integer | Urgency rating (can be auto-updated) |
| SIZ | Size | Integer | Effort estimate: Minutes / Hour / Half Day / Day / Custom |
| STA | Status | Integer | Status lifecycle (see below) |
| SCH | Schedule | Integer | Schedule state |
| DTE | Date Entered | Integer | Creation date |
| DTU | Date Updated | Integer | Last modification date |
| DTS | Date Scheduled | Integer | Scheduled date |
| DTD | Date Due | Integer | Due date / forecast date |
| RPT | Repeat | Integer | Repeat reference |
| SLT | Slot | Integer | Time slot allocation reference |
| XXX | Reserved | Integer | Extension field |
| DSC | Description | String | Task description (up to 252+ chars) |
| XRF | Cross-reference | String | Cross-reference / external link |
| STT | State text | String | Additional state information |

**Task Status Lifecycle**:
- Active → Done (Shift+Ctrl+X)
- Active → Dropped (Shift+Ctrl+C)
- Active → Deferred
- Active → Delegated
- "Set No Forecast" option (blocked for completed tasks)

**Task Operations**:
- New task (with "Advanced" and "Tree" sub-dialogs)
- Edit task
- Delete task (with recursive sub-task deletion warning: "WARNING: This will delete all sub-tasks — no UNDO available")
- Make Composite (convert simple task to composite)
- Flatten (reverse of composite — noted as having had bugs)
- Notes editing (accessed via pen tap or menu; auto-deleted when empty; cursor placed at end when opened)
- Schedule task (triggers intervention dialog if no slot available)
- Copy tree (with warning: "Tree too complex to copy in full — Copy tree in sections")

### 2.2 Schedule View (SV)
The scheduling view — tasks organised by date.

**Purpose**: View and manage tasks in date order, allocate tasks to specific dates, track due dates.

**Features**:
- Tasks displayed with due date column (replaced original "type" column)
- Due date can show as numerals or symbols (togglable preference: `MAPREFDUENUMERALS`)
- "Today" indicator with date display in header (`Today: <date>`)
- Date navigation: Go to dialog with "Date" / "Today" / "Cancel" options
- Spacebar toggles between current and stored dates
- After reschedule, auto-sets to "Today" or accessible via spacebar
- Context-aware symbol display
- Same filter system as Task View (shared filter infrastructure)
- Same Find/Find Next, Sort, Notes access as Task View
- When tapping the "due" column, brings up the Schedule dialog
- Completed time slots displayed in grey
- Path display for tasks (togglable: `MAPREFPATHTASKS`)
- Escape to Agenda integration (togglable: `MAPREFSVESCAGENDA`)
- Appointment display support (`MAPREFSVAPPOINTMENTS`)
- Full tree display option (default OFF): `MAPREFPATHTASKS`

**Schedule Dialog** (intervention when scheduling):
- Context selector
- "Scheduled" date display
- Due date options: Same date / 1 day later / 2 days later / 3 days later / 1 week later / 2 weeks later / 1 month later / On given date...
- Action buttons: Auto / Force / Today / Done / Dropped / Suggest / Cancel
- Warning: "No time slot available as scheduled"
- Warning: "No time slot allocated"

### 2.3 Role View (RV)
The calendar/resource view — a grid showing time slots across dates, grouped by context/role.

**Purpose**: Visualise and manage how time is allocated across roles/contexts on a calendar grid. Think of it as a Gantt-chart-meets-calendar.

**Features**:
- Calendar grid layout: rows = contexts/roles, columns = days
- Configurable display: 1 week, 2 weeks, or 3 weeks visible (preference: `MAPREFRVROWS`)
- Date cursor navigation (up/down/left/right across calendar cells)
- "Today" highlighted distinctly
- Spacebar sets "Today" in Role View
- Usage meters (bars) showing allocation vs. capacity per cell
- Medium zoom shows usage bars
- Time slot entries within cells:
  - Slot cursor for navigating multiple entries per cell
  - Scroll arrows when cell has more entries than visible
  - Calendar cell rendering with colour coding
- Context symbols and masking
- Day headers with day-of-week

**Time Slot Management** (within Role View):
- Create time slot (with validation: "Time slots cannot be created in the past")
- Edit time slot dialog:
  - Context selector (popup list)
  - Allocated Size: Undefined / Minutes / Hour / Half Day / Day / Custom
  - Tasks Scheduled (read-only count)
  - Description
  - Date Scheduled
  - Cancel
- Delete time slot (with repeat handling)
- Complete time slot (with reschedule options: "This slot only" / "All current tasks")
- Slot completion triggers reschedule (configurable: incremental vs. full)

**Repeating Time Slots**:
- Repeat types: No repeat / Daily / Weekly / Monthly by date / Monthly by days / Yearly by date / Yearly by day of week
- Repeat configuration:
  - Weekly: day selection
  - Monthly by date: date picker (1–31)
  - Monthly by days: day-in-week selector (Monday–Sunday)
  - "Repeat on above date/day" toggle
  - "Repeat forever" toggle
  - Priority: Recessive / Normal / Dominant
- Repeat occurrence management (`OCC`, `DTO`, `DTF` date-from/date-to)
- Delete repeat options: "Delete which repeating occurrences?"
- Repeats only settable on "current" and "empty" time slots

**Time Slot Database Schema** (`Slots` table — inferred from variables):
| Field | Variable | Description |
|-------|----------|-------------|
| RID | Slot ID | Unique slot identifier |
| TYP | Type | Slot type (regular / appointment / milestone) |
| CTX | Context | Context/Role reference |
| DTS | Date Scheduled | Date of the slot |
| RPT | Repeat | Repeat master reference |
| SMN | Start Minutes | Start time in minutes from midnight |
| EMN | End Minutes | End time in minutes from midnight |
| ALC | Allocated | Allocated size/duration |
| SCH | Scheduled | Number of tasks scheduled into this slot |
| CNT | Count | Task count |
| OAL | Overall Allocation | Overall allocation tracking |
| XXX | Reserved | Extension field |
| DSC | Description | Slot description |
| XRF | Cross-reference | External reference |

**Repeat Instance Schema** (`Repeats` table):
| Field | Variable | Description |
|-------|----------|-------------|
| XID | Instance ID | Unique repeat instance ID |
| TYP | Type | Repeat type (daily/weekly/monthly/yearly) |
| INT | Interval | Repeat interval |
| DTO | Date To | End date of repeat |
| DTF | Date From | Start date of repeat |
| OCC | Occurrences | Number of occurrences |
| FLG | Flags | Repeat flags |
| XXX | Reserved | Extension field |
| XRF | Cross-reference | Repeat pattern details (weekly day encoding etc.) |

---

## 3. Context/Role System

Contexts are the organisational backbone — they represent areas of responsibility, life roles, or project categories.

**Context/Role Properties**:
- Short Name (display label)
- Description (full description)
- Type: Role or Goal
- Parent context (hierarchical — goals within roles)
- Symbol type: Undefined / Standard / Label / Superscript Icon
- Symbol character (from a set of icons)
- Available icons: Structure, Cogs, Factory, Hearts, Family, Bunny, House, Flower, Roller, Smiley, Yin&Yang, Crown, Cup, 1st, Star, Plane, Boat, Car, Runner, Bat&Ball, Book, Letter, Phone, Ladder

**Context Management Dialog**:
- Add / Edit / Delete / Done buttons
- Context hierarchy popup showing structure
- Editing validates: "Name cannot be blank"
- Deletion handling: "Action for Tasks within this Context" — option to map tasks to another context
- Goals within a deleted context are also removed (with warning)
- Context count tracked (`MACTXCOUNT`)
- "Undefined" is the default context (not last in list)

**Context Database Schema** (`Contexts` table):
| Field | Variable | Description |
|-------|----------|-------------|
| CID | Context ID | Unique identifier |
| PID | Parent ID | Parent context/role |
| DSC | Description | Context name/description |
| GRT | Goal/Role Type | Type flag |
| GRC | Goal/Role Config | Configuration |
| XRF | Cross-reference | External reference |
| FLG | Flags | Context flags |
| XXX | Reserved | Extension field |

---

## 4. Filter System

**Filter Fields** (each filter is a named, saved combination of criteria):
- Filter ID and Name
- Importance filter
- Urgency filter
- Size filter
- Status filter
- Schedule state filter
- Context filter
- Flags filter

**Filter Features**:
- Named filters (saveable, selectable from list)
- Advanced filter composition (extended in v5.055+)
- Filter applied across both Task View and Schedule View
- Context symbol shown in filter header
- "Rebuild/repair removes any duplicate filters"
- Maximum filter string length enforced (`KMDMAXFILTERSTRING`)
- SQL WHERE clause generation for DBMS queries: `"SELECT * FROM Tasks WHERE ..."`

---

## 5. Scheduling Engine

The scheduling engine is the heart of Mentor — it matches tasks to available time slots.

**Key Scheduling Concepts**:
- Tasks have a Size (effort estimate: Minutes / Hour / Half Day / Day / Custom)
- Size preferences are configurable: minutes value for each size (`MAPREFSIZMINS`, `MAPREFSIZHOUR`, `MAPREFSIZHALFDAY`, `MAPREFSIZDAY`)
- Time slots have allocated capacity
- The scheduler finds suitable slots for tasks based on context and available capacity
- "Suggest" feature scans ahead to find the next available slot (`MAPREFSCANAHEAD`, `MAPREFSUGGESTAHEAD`)
- Full vs. Incremental reschedule (togglable: `MAPREFINCREMENTAL`)
- Auto-schedule on task entry (togglable: `MAPREFAUTOSCHEDULE`)
- ASAP/Soon/Sometime urgency-based scheduling priorities
- Date-change triggers reschedule (full by default since v5.38)
- Intervention dialog when automatic scheduling fails

**Scheduling Preferences**:
- `MAPREFASAP` — ASAP urgency threshold
- `MAPREFSOON` — Soon urgency threshold
- `MAPREFSOMETIME` — Sometime urgency threshold
- `MAPREFAUTOSCHEDULE` — Auto-schedule new tasks
- `MAPREFINCREMENTAL` — Incremental vs. full reschedule
- `MAPREFSUGGESTAHEAD` — How far ahead to scan for suggestions
- `MAPREFSCANAHEAD` — Scan range for available slots
- `MAPREFFULLDAY` — Full day scheduling preference
- `MAPREFUPDATEDTS` — Update date-scheduled on changes

---

## 6. Agenda Synchronisation

Mentor can sync with the Psion's built-in Agenda (calendar) application.

**Sync Features**:
- Two-way synchronisation between Mentor time slots and Agenda entries
- Task sync: shows today's tasks in Agenda (`MAPREFSYNCHTASKS`)
- Sync date range: from/to (`MAPREFSYNCHFROM`, `MAPREFSYNCHTO`)
- Auto-sync option (`MAPREFSYNCHAUTO`)
- Sync on schedule toggle (`MAPREFSYNCHONSCHEDULE`)
- Appointment start/end time handling (`MAPREFAPPTSTARTEND`)
- Task synch warning toggle (`MAPREFTASKSYNCHWARNING`)
- Progress bar during sync: "Tidying up..." / "Identifying tasks..." / "Rescheduling..." / "Unscheduling..."
- Agenda file reference stored (`MASYNCHAGENDAFILE`)

**Appointments** (added in v5.087):
- Appointments are a special type of time slot
- Can contain notes (objects)
- Read-only if they contain notes
- Beyond-midnight handling
- Type preference: `MAPREFTYPEAPPOINTMENT`
- Agenda time display toggle: `MAPREFSHOWAGENDATIME`
- Toggle between Schedule View and Agenda

---

## 7. Notes System

- Rich text notes attached to individual tasks
- Notes auto-deleted when emptied
- Cursor placed at end when opening (not highlighted/selected)
- Accessible via pen tap or menu
- Notes included in Find/Find Next search (`MAFINDNOTES`)
- Notes stored in a buffer (`MANOTESBUFFER`)
- Copy notes between tasks during paste operations

---

## 8. Export System

- Export implemented (since v5.095)
- Extended to include filters (for diagnostics)
- Likely CSV/text-based export of task data

---

## 9. File Management

**File Operations**:
- New file
- Open file (with "Mentor File" dialog showing description)
- Tidy file (with option to create new file; compression after major DB changes)
- Database rebuild (from error dialog)
- Database repair (Ctrl+Shift+J — fixes various corruption issues)
- Backup awareness: "checks for existing .bak file"
- Archive file recognition (prevents rescheduling of archived data)
- File security with compression after major DB changes
- Database state tracking (`MDDATABASESTATE`)

**Error Recovery**:
- Auto-repair on file open
- Ctrl+Shift+J repair: fixes filters, time slot problems, invalid context IDs, duplicate filters, array bounds issues, index corruptions
- Rebuild option from error dialog (exits and rebuilds on next open)
- Progress feedback: "Deleting..." / "Searching..." / "Clearing slots..." / "Tidying up..."
- Error reporting: source, action, error code — with email to support@wulisoft.com

---

## 10. Preferences System

**All known preferences** (from variable names):

### Display Preferences
| Preference | Variable | Description |
|-----------|----------|-------------|
| Toolbar | `MAPREFTBAR` | Show/hide toolbar |
| Button Bar | `MAPREFBBAR` | Show/hide button bar |
| Cursor Style | `MAPREFCURSOR` | Cursor display style |
| Path in Header | `MAPREFPATHHEADER` | Show hierarchy path in header |
| Path in Tasks | `MAPREFPATHTASKS` | Show tree path for tasks |
| Indent Goals | `MAPREFINDENTGOALS` | Indent goals in hierarchy |
| Due Numerals | `MAPREFDUENUMERALS` | Show due dates as numbers vs. symbols |
| RV Rows | `MAPREFRVROWS` | Number of rows in Role View (default 3 = 3 weeks) |
| Pen Mode | `MAPREFPEN` | Pen/stylus interaction mode |
| Tree Calc | `MAPREFTREECALC` | Auto-calculate tree display |

### Scheduling Preferences
| Preference | Variable | Description |
|-----------|----------|-------------|
| ASAP | `MAPREFASAP` | ASAP urgency threshold |
| Soon | `MAPREFSOON` | Soon urgency threshold |
| Sometime | `MAPREFSOMETIME` | Sometime urgency threshold |
| Auto Schedule | `MAPREFAUTOSCHEDULE` | Auto-schedule on task creation |
| Fix on Tab | `MAPREFFIXONTAB` | Fix date on tab |
| Fix on Edit | `MAPREFFIXONEDIT` | Fix date on edit |
| Update DTS | `MAPREFUPDATEDTS` | Update scheduled date on changes |
| Incremental | `MAPREFINCREMENTAL` | Incremental vs. full reschedule |
| Suggest Ahead | `MAPREFSUGGESTAHEAD` | Suggestion scan range |
| Scan Ahead | `MAPREFSCANAHEAD` | Available slot scan range |
| Full Day | `MAPREFFULLDAY` | Full day scheduling |

### Size Preferences (Effort Definitions)
| Preference | Variable | Description |
|-----------|----------|-------------|
| Minutes | `MAPREFSIZMINS` | Duration for "Minutes" size |
| Hour | `MAPREFSIZHOUR` | Duration for "Hour" size |
| Half Day | `MAPREFSIZHALFDAY` | Duration for "Half Day" size |
| Day | `MAPREFSIZDAY` | Duration for "Day" size |

### Agenda Sync Preferences
| Preference | Variable | Description |
|-----------|----------|-------------|
| Sync on Schedule | `MAPREFSYNCHONSCHEDULE` | Sync when scheduling |
| Sync Tasks | `MAPREFSYNCHTASKS` | Sync tasks to Agenda |
| Sync From | `MAPREFSYNCHFROM` | Sync start date |
| Sync To | `MAPREFSYNCHTO` | Sync end date |
| Auto Sync | `MAPREFSYNCHAUTO` | Automatic synchronisation |
| Appt Start/End | `MAPREFAPPTSTARTEND` | Appointment time handling |
| Type Appointment | `MAPREFTYPEAPPOINTMENT` | Appointment type |
| Show Agenda Time | `MAPREFSHOWAGENDATIME` | Show Agenda times |
| SV Appointments | `MAPREFSVAPPOINTMENTS` | Show appointments in SV |
| SV Esc Agenda | `MAPREFSVESCAGENDA` | Escape to Agenda from SV |
| SV Esc Set Date | `MAPREFSVESCSETDATE` | Set date on Escape |
| Task Synch Warning | `MAPREFTASKSYNCHWARNING` | Warn on task sync |

### Filter/Display Preferences
| Preference | Variable | Description |
|-----------|----------|-------------|
| Zero Dropped | `MAPREFZERODROPPED` | Hide/show dropped tasks |
| Zero Deferred | `MAPREFZERODEFERRED` | Hide/show deferred tasks |
| Zero Delegated | `MAPREFZERODELEGATED` | Hide/show delegated tasks |

---

## 11. Zoom Levels

Three zoom levels across all views:
- **Small** — compact, more items visible
- **Medium** — balanced (usage bars visible in Role View at this level)
- **Large** — detailed, fewer items

---

## 12. Keyboard Shortcuts (Original)

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Sort |
| Ctrl+G | Go to (date/task) |
| Ctrl+B | Toggle Bold |
| Ctrl+Q / Ctrl+Shift+Q | Navigate forwards/backwards |
| Ctrl+F | Find |
| Ctrl+Shift+F | Find Next |
| Shift+Ctrl+X | Mark as Done |
| Shift+Ctrl+C | Mark as Dropped |
| Ctrl+Shift+H | "What's This?" contextual help |
| Ctrl+Shift+J | Database repair |
| Space | Toggle Today / Navigate hierarchy popup |
| Enter | Enter composite / Edit entry |
| Escape | Exit composite / Go back |

---

## 13. Licensing System

The original was shareware with a customer ID and license key system.

- Customer ID generation and validation
- License key generation from customer ID (`WULIBGENERATELICENSEFROMCUSTID`)
- License validation (`WULIBCHECKLICENSEVALID`)
- "Pretty" display formatting for license and customer ID
- Character set for keys: `1234567890abcdefghijkmnpqrstuvwxyz` (no 'l' to avoid confusion with '1')
- Obfuscation mapping: `bkqmcsf98xe15da7vhij2l4nop3r6tugw0yz`
- Random seed-based generation

---

## 14. Modern Rebuild — Technical Requirements

### Target Stack
- **Frontend**: React/Next.js (or similar modern SPA framework)
- **Backend**: Node.js or Python (FastAPI/Django)
- **Database**: PostgreSQL (to honour the original's SQL/DBMS heritage)
- **Deployment**: Docker container, deployable on Coolify
- **Authentication**: Simple user auth (replaces shareware licensing)

### Architecture Principles
1. **Preserve the three-view paradigm** — Task View, Schedule View, Role View are the soul of the app
2. **Keep the hierarchical task model** — composite tasks containing sub-tasks is fundamental
3. **Maintain the scheduling engine** — automatic task-to-slot allocation with intervention dialogs
4. **Context/Role system** — the organisational taxonomy that ties everything together
5. **Responsive design** — the original ran on a 640×240 screen; the modern version should work on mobile through desktop

### Data Model (PostgreSQL)

```sql
-- Core tables matching the original schema

CREATE TABLE tasks (
    tid SERIAL PRIMARY KEY,
    pid INTEGER REFERENCES tasks(tid) ON DELETE CASCADE DEFAULT 0,  -- parent composite
    typ INTEGER NOT NULL DEFAULT 0,       -- 0=simple, 1=composite
    ctx INTEGER REFERENCES contexts(cid), -- context/role
    flg INTEGER DEFAULT 0,               -- bitfield: bold, crossed-out, alarm, archive
    imp INTEGER DEFAULT 0,               -- importance (0-5 or similar scale)
    urg INTEGER DEFAULT 0,               -- urgency (auto-calculable)
    siz INTEGER DEFAULT 0,               -- effort: 0=undefined,1=minutes,2=hour,3=half-day,4=day,5=custom
    sta INTEGER DEFAULT 0,               -- status: 0=active,1=done,2=dropped,3=deferred,4=delegated
    sch INTEGER DEFAULT 0,               -- schedule state
    dte TIMESTAMP DEFAULT NOW(),         -- date entered
    dtu TIMESTAMP DEFAULT NOW(),         -- date updated
    dts DATE,                            -- date scheduled
    dtd DATE,                            -- date due/forecast
    rpt INTEGER DEFAULT 0,              -- repeat reference
    slt INTEGER DEFAULT 0,              -- slot reference
    dsc TEXT NOT NULL DEFAULT '',        -- description
    xrf TEXT DEFAULT '',                -- cross-reference
    stt TEXT DEFAULT '',                -- state text
    notes TEXT DEFAULT '',              -- rich text notes (was separate buffer in original)
    sort_order INTEGER DEFAULT 0,       -- for manual ordering
    user_id INTEGER NOT NULL            -- multi-user support
);

CREATE TABLE contexts (
    cid SERIAL PRIMARY KEY,
    pid INTEGER REFERENCES contexts(cid) DEFAULT 0,  -- parent (for goal hierarchy)
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    ctx_type INTEGER DEFAULT 0,         -- 0=role, 1=goal
    symbol_type INTEGER DEFAULT 0,      -- 0=undefined, 1=standard, 2=label, 3=superscript
    symbol_icon VARCHAR(50) DEFAULT '', -- icon identifier
    sort_order INTEGER DEFAULT 0,
    user_id INTEGER NOT NULL
);

CREATE TABLE time_slots (
    rid SERIAL PRIMARY KEY,
    typ INTEGER DEFAULT 0,              -- 0=regular, 1=appointment, 2=milestone
    ctx INTEGER REFERENCES contexts(cid),
    dts DATE NOT NULL,                  -- date of slot
    rpt INTEGER DEFAULT 0,             -- repeat master reference
    smn INTEGER DEFAULT 540,           -- start minutes (default 9:00)
    emn INTEGER DEFAULT 1020,          -- end minutes (default 17:00)
    alc INTEGER DEFAULT 0,             -- allocated size in minutes
    sch INTEGER DEFAULT 0,             -- scheduled task count
    cnt INTEGER DEFAULT 0,             -- total task count
    oal INTEGER DEFAULT 0,             -- overall allocation
    dsc TEXT DEFAULT '',               -- description
    xrf TEXT DEFAULT '',               -- cross-reference
    user_id INTEGER NOT NULL
);

CREATE TABLE repeat_patterns (
    xid SERIAL PRIMARY KEY,
    rid INTEGER REFERENCES time_slots(rid) ON DELETE CASCADE,
    typ INTEGER NOT NULL,               -- 0=none,1=daily,2=weekly,3=monthly-date,4=monthly-day,5=yearly-date,6=yearly-day
    interval_val INTEGER DEFAULT 1,
    dto DATE,                           -- date to (end)
    dtf DATE,                           -- date from (start)
    occ INTEGER DEFAULT 0,             -- occurrences (0=forever)
    flg INTEGER DEFAULT 0,            -- flags
    priority INTEGER DEFAULT 1,        -- 0=recessive,1=normal,2=dominant
    xrf TEXT DEFAULT '',               -- pattern encoding (day-of-week bitmask for weekly, etc.)
    user_id INTEGER NOT NULL
);

CREATE TABLE task_slot_assignments (
    id SERIAL PRIMARY KEY,
    tid INTEGER REFERENCES tasks(tid) ON DELETE CASCADE,
    rid INTEGER REFERENCES time_slots(rid) ON DELETE CASCADE,
    user_id INTEGER NOT NULL
);

CREATE TABLE filters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    imp_filter TEXT DEFAULT '',
    urg_filter TEXT DEFAULT '',
    siz_filter TEXT DEFAULT '',
    sta_filter TEXT DEFAULT '',
    sch_filter TEXT DEFAULT '',
    ctx_filter TEXT DEFAULT '',
    flg_filter TEXT DEFAULT '',
    user_id INTEGER NOT NULL
);

CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    prefs JSONB NOT NULL DEFAULT '{}'  -- all preferences as JSON
);
```

### Default Preference Values
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

### API Endpoints (REST)

```
# Tasks
GET    /api/tasks?pid=0&filter_id=1     # List tasks (with filter)
POST   /api/tasks                        # Create task
PUT    /api/tasks/:tid                   # Update task
DELETE /api/tasks/:tid                   # Delete task (recursive for composite)
POST   /api/tasks/:tid/composite         # Convert to composite
POST   /api/tasks/:tid/schedule          # Schedule task to slot
PUT    /api/tasks/:tid/status            # Change status (done/dropped/deferred)
PUT    /api/tasks/:tid/bold              # Toggle bold
POST   /api/tasks/:tid/copy              # Copy task
POST   /api/tasks/:tid/move              # Move task (cut+paste)
GET    /api/tasks/:tid/notes             # Get notes
PUT    /api/tasks/:tid/notes             # Update notes
GET    /api/tasks/search?q=...&notes=1   # Find tasks

# Contexts
GET    /api/contexts                     # List all contexts/roles
POST   /api/contexts                     # Create context
PUT    /api/contexts/:cid                # Update context
DELETE /api/contexts/:cid                # Delete (with task remapping)

# Time Slots
GET    /api/slots?from=...&to=...        # Get slots for date range
POST   /api/slots                        # Create time slot
PUT    /api/slots/:rid                   # Update slot
DELETE /api/slots/:rid                   # Delete slot
POST   /api/slots/:rid/complete          # Complete slot (triggers reschedule)
POST   /api/slots/:rid/repeat            # Set repeat pattern

# Schedule Engine
POST   /api/schedule/suggest             # Suggest next available slot for task
POST   /api/schedule/reschedule          # Full reschedule
POST   /api/schedule/reschedule-slot     # Reschedule from specific slot

# Filters
GET    /api/filters                      # List saved filters
POST   /api/filters                      # Create filter
PUT    /api/filters/:id                  # Update filter
DELETE /api/filters/:id                  # Delete filter

# Preferences
GET    /api/preferences                  # Get user preferences
PUT    /api/preferences                  # Update preferences

# Export
GET    /api/export?format=csv            # Export data
GET    /api/export?format=json           # Export as JSON
```

### Frontend Views

#### Task View Component
- Tree/list display with indentation for hierarchy depth
- Click to select, double-click or Enter to edit
- Right-click context menu: Edit, Delete, Notes, Schedule, Make Composite, Cut, Copy, Paste, Bold
- Breadcrumb header showing current path in hierarchy
- Filter dropdown in toolbar
- Context icon badges on each task
- Status indicators: importance/urgency/size badges, due date, schedule state
- Drag-and-drop for reordering and moving between composites
- Keyboard shortcuts matching the original

#### Schedule View Component
- Date-focused list: tasks grouped or sorted by scheduled date
- Date navigation header with Today button
- Due date column with countdown indicators
- Context filtering
- Quick date assignment: drag to date or use dialog
- Same task editing capabilities as Task View

#### Role View Component
- Calendar grid: horizontal = days, vertical = contexts/roles
- Configurable: 1/2/3 week views
- Each cell shows:
  - Time slot entries (with icons)
  - Usage meter (progress bar: allocated vs. capacity)
  - Scroll indicators if multiple entries
- Click cell to create new time slot
- Click entry to edit time slot
- Today column highlighted
- Drag time slots between days
- Repeat pattern indicators

### Coolify Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://mentor:${DB_PASSWORD}@db:5432/mentor
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: mentor
      POSTGRES_USER: mentor
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  pgdata:
```

### Key Implementation Notes

1. **The scheduling engine is the hardest part** — it needs to scan time slots for available capacity matching the task's context and size, suggest dates, handle conflicts, and trigger intervention dialogs when automatic scheduling fails.

2. **Hierarchical tasks are fundamental** — use recursive CTEs in PostgreSQL for tree operations. The original used OPL's DBMS with manual recursion (`MDATRECURSIVEDELETE`, `MDATCLEARHIERARCHYTABLE`).

3. **Context popup hierarchy** — the original had a popup tree showing the full context/goal structure for quick navigation. This should be a modern tree-select component.

4. **Undo/Redo** — the original stored full pre-edit snapshots of every task field. Use a command pattern or event sourcing approach.

5. **The three views are not separate apps** — they are deeply integrated. Scheduling a task in Task View immediately affects Schedule View and Role View. Completing a slot in Role View triggers rescheduling of tasks visible in Schedule View.

6. **Calendar sync** — the original's Agenda sync maps to modern CalDAV/Google Calendar integration. This is a nice-to-have for v2.

7. **The original was single-user, single-file** — the modern version should support multi-user with user isolation at the database level.

8. **Progressive enhancement** — start with Task View (it's the most self-contained), then add Schedule View, then Role View. The Role View's calendar grid with usage meters is the most complex UI component.

---

## 15. Feature Priority for MVP

### Phase 1 — Core (Task View)
- [ ] User authentication
- [ ] Task CRUD with hierarchical (composite) support
- [ ] Context/Role management
- [ ] Basic filtering
- [ ] Notes
- [ ] Find/search
- [ ] Cut/Copy/Paste
- [ ] Undo/Redo
- [ ] Bold toggle
- [ ] Status lifecycle (Active → Done/Dropped/Deferred/Delegated)

### Phase 2 — Scheduling (Schedule View)
- [ ] Schedule View with date-ordered task display
- [ ] Time slot creation and management
- [ ] Manual task-to-slot assignment
- [ ] Automatic scheduling engine with "Suggest"
- [ ] Intervention dialog
- [ ] Due date tracking and countdown
- [ ] Reschedule (incremental and full)

### Phase 3 — Resource View (Role View)
- [ ] Calendar grid component
- [ ] Usage meters per cell
- [ ] Time slot visual management
- [ ] Repeating time slots
- [ ] Multi-week view configuration
- [ ] Appointments

### Phase 4 — Polish
- [ ] Export (CSV, JSON, iCal)
- [ ] Calendar integration (CalDAV/Google)
- [ ] Preferences system
- [ ] Keyboard shortcuts
- [ ] Mobile responsive design
- [ ] PWA support for offline use
- [ ] Data backup/restore

---

*This specification was reconstructed from the binary analysis of mentor.sis v5.119 by WuLiSoft (Ben Thornton, 1996–2002). The original application contained approximately 12,000+ readable strings across its OPL modules (WuLib.opo, MtrTask.opo, MtrSched.opo, MtrRole.opo, Mentor.app) and bundled three Symbian OPX dependencies (Sysram1, Agenda2, DbUtils). The PopUp scrollable menu component (v2.3) was by Mark O'Neill (i27.com), released as freeware.*