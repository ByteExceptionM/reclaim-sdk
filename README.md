# reclaim-sdk

> **Unofficial** Node.js SDK for the [Reclaim.ai](https://reclaim.ai) API — tasks, habits, hours, webhooks and the changelog feed, all behind a single, fully-typed surface.

```bash
npm install reclaim-sdk
```

Requires Node 20 or newer. Zero runtime dependencies (uses the built-in `fetch` and `node:crypto`).

> ⚠️ This package is not affiliated with Reclaim.ai. It is reverse-engineered from the public web app plus the partial Swagger spec at `https://api.app.reclaim.ai/swagger/reclaim-api-0.1.yml`. The Reclaim API is not formally versioned for third-party use, so things may break without warning. Pin a version and watch the changelog.

---

## Contents

- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Tasks](#tasks)
- [Daily habits](#daily-habits)
- [Hours / time schemes](#hours--time-schemes)
- [Changelog feed](#changelog-feed)
- [Webhooks](#webhooks)
- [Errors](#errors)
- [Coverage matrix](#coverage-matrix)
- [TypeScript](#typescript)
- [Enum reference](#enum-reference)
- [License](#license)
- [Credits](#credits)

---

## Quick start

```ts
import { ReclaimClient, Task, PriorityLevel } from "reclaim-sdk";

ReclaimClient.configure({ token: process.env.RECLAIM_TOKEN! });

const task = new Task({
  title: "Write Q3 wrap-up",
  priority: PriorityLevel.P2,
  due: new Date("2026-09-30"),
});
task.duration = 2;            // 2h of work
task.minWorkDuration = 0.5;   // 30 min min slot
await task.save();

await task.start();
await task.logWork(45);       // log 45 minutes
await task.stop();
await task.markComplete();
```

`reclaim-sdk` ships in both **ESM** and **CommonJS** flavours with complete `.d.ts` types — `import` and `require` both work.

---

## Configuration

Grab an API token from <https://app.reclaim.ai/settings/developer>.

Pick **one** of:

```ts
// Option A — pass it explicitly.
import { ReclaimClient } from "reclaim-sdk";
ReclaimClient.configure({ token: "rec_..." });
```

```bash
# Option B — set an env var; the SDK picks it up on first use.
export RECLAIM_TOKEN=rec_...
```

`ReclaimClient` is a singleton — call `configure` once at boot and every resource picks it up automatically. To override per-call (e.g. multi-tenant workers), pass a `{ client }` option to any static method.

### Custom base URL or fetch

```ts
ReclaimClient.configure({
  token: "rec_...",
  baseUrl: "https://api.app.reclaim.ai", // default
  fetch: customFetch,                     // optional — for tests / proxies
});
```

---

## Tasks

Full CRUD against `/api/tasks` plus every planner action.

```ts
import { Task, PriorityLevel, EventColor } from "reclaim-sdk";

// List
const tasks = await Task.list();

// Fetch one
const t = await Task.get(12345);

// Create
const draft = new Task({
  title: "Migrate auth middleware",
  priority: PriorityLevel.P1,
  notes: "Per legal/compliance review",
});
draft.duration = 4;             // 4 hours, rounded to 15-min chunks
draft.eventColor = EventColor.GRAPE;
await draft.save();

// Update — patch only the touched fields
draft.notes = "Updated scope after standup";
await draft.save();

// Planner actions
await draft.start();
await draft.logWork(60);
await draft.stop();
await draft.markComplete();
await draft.markIncomplete();   // un-archive

await draft.snooze({ option: "TOMORROW" });
await draft.clearSnooze();

await draft.planWork({
  dateTime: new Date("2026-06-01T09:00:00Z"),
  durationMinutes: 90,
});
await draft.addTime(0.5);       // add 30 min

await draft.delete();
```

### Batch operations

```ts
import { Task, type TaskPatch } from "reclaim-sdk";

const patches: TaskPatch[] = [
  { taskId: 11, patch: { priority: "P1" } },
  { taskId: 12, patch: { priority: "P2" } },
];
await Task.batchPatch(patches);
await Task.batchArchive(patches);
await Task.batchDelete(patches);

// One-shot reorder by due date:
const reordered = await Task.prioritizeByDue();
```

### Pin to a specific start time

```ts
import { Task } from "reclaim-sdk";

const pinned = new Task({ title: "Pair-programming with @b", priority: "P2" });
pinned.duration = 1;
const result = await Task.createAtTime(pinned, new Date("2026-06-02T15:00:00Z"));
```

### Time chunks

Reclaim's planner thinks in 15-minute increments. Use the human-friendly accessors:

| Hours accessor    | Underlying chunk field |
| ----------------- | ---------------------- |
| `duration`        | `timeChunksRequired`   |
| `minWorkDuration` | `minChunkSize`         |
| `maxWorkDuration` | `maxChunkSize`         |
| `upNext`          | `onDeck`               |

Setting an hours value rewrites the chunk count; reading it returns `chunks / 4`.

---

## Daily habits

```ts
import { DailyHabit } from "reclaim-sdk";

const habits = await DailyHabit.list();

const focus = habits.find(h => h.title === "Deep work");
if (focus) {
  await focus.toggle(false);         // pause
  await focus.toggle(true);          // resume
}

// Habit templates (read-only catalogue)
const tpl = await DailyHabit.getTemplate();
const examples = await DailyHabit.listTemplates({ role: "engineer" });
```

> Creating habits directly via API frequently returns 409 (calendar collisions, plan-tier limits). In practice, create habits in the web app and manage them — toggle / reschedule / skip — through the SDK.

---

## Hours / time schemes

A *time scheme* is a named working-hours profile (`/api/timeschemes`). You can create custom schemes with per-weekday intervals and bind them to specific tasks or habits.

```ts
import { EventCategory, Hours, PolicyType, TimeSchemeFeature, Weekday } from "reclaim-sdk";

const workday = { intervals: [{ start: "09:00:00", end: "17:00:00" }] };

const scheme = new Hours({
  title: "Demo Hours",
  description: "Custom 9-5 Mon-Fri",
  taskCategory: EventCategory.WORK,
  policyType: PolicyType.CUSTOM,
  policy: {
    dayHours: {
      [Weekday.MONDAY]: workday,
      [Weekday.TUESDAY]: workday,
      [Weekday.WEDNESDAY]: workday,
      [Weekday.THURSDAY]: workday,
      [Weekday.FRIDAY]: workday,
    },
  },
  features: [
    TimeSchemeFeature.TASK_ASSIGNMENT,
    TimeSchemeFeature.HABIT_ASSIGNMENT,
  ],
});
await scheme.save();

// Bind a task to this scheme
const t = await Task.get(123);
t.timeSchemeId = scheme.id;
await t.save();

// Update
scheme.description = "Updated";
await scheme.save();

// Delete
await scheme.delete();
```

`policyType: "CUSTOM"` is required when you want to send your own `policy.dayHours`. The other policy values (`WORK`, `PERSONAL`, `MEETING`) bind the scheme to a user's main profile.

---

## Changelog feed

A read-only stream of change events across Reclaim resources. Useful for polling sync workers.

```ts
import { Changelog, Task } from "reclaim-sdk";

// Everything
const all = await Changelog.all();

// Scoped to specific ids
const tasks = await Task.list();
const ids = tasks.slice(0, 5).map(t => t.id!).filter((v): v is number => !!v);
const taskEvents = await Changelog.tasks(ids);

// Other feeds
await Changelog.events(["abc", "def"]);
await Changelog.smartHabits([1, 2]);
await Changelog.smartMeetings([3, 4]);
await Changelog.schedulingLinks(["link-1", "link-2"]);
```

---

## Webhooks

### Subscribing

```ts
import { Webhook } from "reclaim-sdk";

// List existing subscriptions
for (const wh of await Webhook.list()) {
  console.log(wh.id, wh.url, wh.status, wh.events);
}

// Create a new one
const wh = new Webhook({
  url: "https://yourapp.example.com/reclaim-hook",
  events: ["task.created", "task.updated", "task.completed"],
  status: "ACTIVE",
  apiVersion: "v2026-04-13",
  name: "my-integration",
});
await wh.save();
```

> Subscribing requires an `apiVersion` value. The webhook feature may need to be provisioned by Reclaim before `POST` succeeds — contact support if you see 500 errors on create.

### Receiving

```ts
import express from "express";
import {
  parseWebhookPayload,
  verifySignature,
  isTaskWebhookEvent,
  isHabitWebhookEvent,
  SignatureVerificationError,
} from "reclaim-sdk";

const app = express();

app.post(
  "/reclaim-hook",
  express.raw({ type: "application/json" }),    // raw body, not parsed JSON
  (req, res) => {
    try {
      verifySignature(
        req.body,
        req.header("X-Reclaim-Signature"),
        process.env.RECLAIM_WEBHOOK_SECRET!,
      );
    } catch (err) {
      if (err instanceof SignatureVerificationError) return res.sendStatus(401);
      throw err;
    }

    const event = parseWebhookPayload(req.body);
    if (isTaskWebhookEvent(event)) {
      console.log("task", event.type, event.task.id, event.task.title);
    } else if (isHabitWebhookEvent(event)) {
      console.log("habit", event.type, event.habit.id, event.habit.title);
    }
    res.sendStatus(200);
  },
);
```

`parseWebhookPayload` rehydrates the inner `task` / `habit` field into a full `Task` / `DailyHabit` instance, so you can immediately call methods on it (e.g. `event.task.markComplete()`).

> Always pass the **raw** body to `verifySignature`. Parsing and re-stringifying JSON changes whitespace and breaks the HMAC digest.

---

## Errors

Every API failure throws a typed error. Catch the base class to handle them generically, or the subclass for fine-grained recovery:

```ts
import {
  ReclaimAPIError,
  RecordNotFound,
  InvalidRecord,
  AuthenticationError,
  SignatureVerificationError,
} from "reclaim-sdk";

try {
  await Task.get(99999999);
} catch (err) {
  if (err instanceof RecordNotFound)        // 404
    return null;
  if (err instanceof InvalidRecord)         // 400 / 422
    console.warn("bad payload", err.body);
  if (err instanceof AuthenticationError)   // 401
    process.exit(1);
  if (err instanceof ReclaimAPIError)       // anything else
    throw err;
}
```

Every `ReclaimAPIError` carries `.status` (the HTTP status code) and `.body` (the parsed error body, if any).

---

## Coverage matrix

| Resource              | Supported                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Tasks                 | CRUD, batch ops, planner actions (start/stop/snooze/plan-work/log-work/complete/add-time/reindex/…) |
| Daily habits          | CRUD, toggle, reschedule / skip events, templates, smart-series migration                            |
| Hours / time schemes  | Full CRUD, custom `dayHours` policies, features, target calendars                                    |
| Webhooks              | CRUD subscriptions, typed payloads, HMAC-SHA256 signature verification                                |
| Changelog             | All feeds (tasks, events, smart habits, smart meetings, scheduling links, full feed)                 |

Not yet covered — open a PR if you need them: Events, Calendars, Scheduling Links, One-on-Ones, Analytics, Focus Settings, Integrations, API-key management, Admin / delegated access.

---

## TypeScript

The package is written in TypeScript and ships full `.d.ts` types. All enums are exported both as **value namespaces** and as **type aliases** so you can write `priority: PriorityLevel.P1` or `priority: "P1"` interchangeably:

```ts
import { PriorityLevel } from "reclaim-sdk";

let p: PriorityLevel;
p = PriorityLevel.P1;   // ✓
p = "P2";               // ✓
p = "P5";               // ✗ — TS error
```

### Init shapes

Each resource exports a matching `*Init` interface — useful for typing partial drafts you build up before saving:

```ts
import { type TaskInit, type WebhookEventName, Task } from "reclaim-sdk";

function buildTask(overrides: TaskInit): Task {
  return new Task({ title: "Default", priority: "P3", ...overrides });
}

const subscribedEvents: WebhookEventName[] = ["task.created", "habit.deleted"];
```

Available: `TaskInit`, `DailyHabitInit`, `HoursInit`, `WebhookInit`, `WebhookEventName`.

---

## Enum reference

All enums are exported as `const` objects + matching string-literal type. Use either form interchangeably.

### `PriorityLevel`

Task / habit priority bucket. Lower number = higher priority.

`P1` · `P2` · `P3` · `P4`

### `EventCategory`

Top-level category. Drives which working-hours profile the planner consults.

`WORK` · `PERSONAL` · `BOTH`

### `EventColor`

Calendar event colour (mirrors Google Calendar's palette).

`NONE` · `LAVENDER` · `SAGE` · `GRAPE` · `FLAMINGO` · `BANANA` · `TANGERINE` · `PEACOCK` · `GRAPHITE` · `BLUEBERRY` · `BASIL` · `TOMATO`

### `EventSubType`

Detailed event sub-category as understood by the scheduling engine.

`ONE_ON_ONE` · `STAFF_MEETING` · `OP_REVIEW` · `EXTERNAL` · `IDEATION` · `FOCUS` · `PRODUCTIVITY` · `TRAVEL` · `FLIGHT` · `TRAIN` · `RECLAIM` · `VACATION` · `HEALTH` · `ERRAND` · `OTHER_PERSONAL` · `UNKNOWN`

### `TaskStatus`

Lifecycle state of a task. Read-only — set by the server.

`NEW` · `SCHEDULED` · `IN_PROGRESS` · `COMPLETE` · `CANCELLED` · `ARCHIVED`

### `TaskSource`

Where a task originated. Reclaim's own tasks use `RECLAIM`; integrations carry their own value.

`RECLAIM` · `GOOGLE` · `ASANA` · `CLICKUP` · `JIRA` · `TODOIST` · `LINEAR`

### `SnoozeOption`

Built-in snooze presets accepted by `task.snooze({ option })` / `habit.snooze({ option })`. Combine with `relativeFrom` to shift the reference point away from "now".

| Value | Meaning |
| --- | --- |
| `FROM_NOW_15M` | +15 minutes |
| `FROM_NOW_30M` | +30 minutes |
| `FROM_NOW_1H` | +1 hour |
| `FROM_NOW_2H` | +2 hours |
| `FROM_NOW_4H` | +4 hours |
| `TOMORROW` | next morning |
| `IN_TWO_DAYS` | the day after tomorrow |
| `NEXT_WEEK` | start of next week |

```ts
import { SnoozeOption } from "reclaim-sdk";

await task.snooze({ option: SnoozeOption.TOMORROW });

// Custom reference point — snooze starts 2h after a given timestamp:
await task.snooze({
  option: SnoozeOption.FROM_NOW_2H,
  relativeFrom: new Date("2026-05-13T14:00:00Z"),
});

await task.clearSnooze();
```

### `Weekday`

Used as the key type for `TimeSchemePolicy.dayHours`.

`MONDAY` · `TUESDAY` · `WEDNESDAY` · `THURSDAY` · `FRIDAY` · `SATURDAY` · `SUNDAY`

### `TimeSchemeFeature`

Which Reclaim flows are allowed to consume a given time scheme.

| Value | Used by |
| --- | --- |
| `TASK_ASSIGNMENT` | Tasks |
| `HABIT_ASSIGNMENT` | Daily habits |
| `SMART_HABIT` | Smart habits |
| `ONE_ON_ONE_ASSIGNMENT` | 1:1 meetings |
| `SMART_MEETING` | Smart meetings |
| `SCHEDULING_LINK_MEETING` | Scheduling-link bookings |

### `PolicyType`

Time-scheme policy mode. `CUSTOM` is required to send your own `policy.dayHours`; the others bind the scheme to the user's main profile.

`CUSTOM` · `WORK` · `PERSONAL` · `MEETING`

---

## License

MIT — see [`LICENSE`](./LICENSE).

---

## Credits

Big thanks to the team behind the original [labiso-gmbh/reclaim-sdk](https://github.com/labiso-gmbh/reclaim-sdk) (Python) — the work they put into reverse-engineering the Reclaim API and keeping it documented made building alternative clients in other languages possible. If you also work in Python, go check it out.

