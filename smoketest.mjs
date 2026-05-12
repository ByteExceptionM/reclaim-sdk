// Smoke test: load ESM build, exercise pure-JS surface (no API calls).
import {
  AuthenticationError,
  Changelog,
  DailyHabit,
  EventCategory,
  EventColor,
  EventSubType,
  Hours,
  InvalidRecord,
  PolicyType,
  PriorityLevel,
  ReclaimAPIError,
  ReclaimClient,
  RecordNotFound,
  SignatureVerificationError,
  SnoozeOption,
  Task,
  TaskSource,
  TaskStatus,
  TimeSchemeFeature,
  Webhook,
  Weekday,
  encodeQueryParams,
  isHabitWebhookEvent,
  isTaskWebhookEvent,
  parseWebhookPayload,
  toZuluIso,
  verifySignature,
} from "./dist/index.js";

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    fails++;
  } else {
    console.log("  ok:", msg);
  }
}

// Enums
assert(PriorityLevel.P1 === "P1", "PriorityLevel.P1");
assert(EventCategory.WORK === "WORK", "EventCategory.WORK");
assert(EventColor.BANANA === "BANANA", "EventColor.BANANA");
assert(TaskStatus.IN_PROGRESS === "IN_PROGRESS", "TaskStatus.IN_PROGRESS");
assert(TaskSource.RECLAIM === "RECLAIM", "TaskSource.RECLAIM");
assert(SnoozeOption.TOMORROW === "TOMORROW", "SnoozeOption.TOMORROW");
assert(Weekday.MONDAY === "MONDAY", "Weekday.MONDAY");
assert(PolicyType.CUSTOM === "CUSTOM", "PolicyType.CUSTOM");
assert(TimeSchemeFeature.TASK_ASSIGNMENT === "TASK_ASSIGNMENT", "TimeSchemeFeature.TASK_ASSIGNMENT");
assert(EventSubType.FOCUS === "FOCUS", "EventSubType.FOCUS");

// Exceptions: subclass chain
const apiErr = new ReclaimAPIError("test", 500, { a: 1 });
assert(apiErr instanceof Error, "ReclaimAPIError instanceof Error");
assert(apiErr instanceof ReclaimAPIError, "ReclaimAPIError instanceof self");
assert(apiErr.status === 500, "ReclaimAPIError carries status");
assert(apiErr.body?.a === 1, "ReclaimAPIError carries body");

assert(new RecordNotFound("x") instanceof ReclaimAPIError, "RecordNotFound extends ReclaimAPIError");
assert(new InvalidRecord("x") instanceof ReclaimAPIError, "InvalidRecord extends ReclaimAPIError");
assert(new AuthenticationError("x") instanceof ReclaimAPIError, "AuthenticationError extends ReclaimAPIError");
assert(new SignatureVerificationError("x") instanceof ReclaimAPIError, "SignatureVerificationError extends ReclaimAPIError");

// Client: configure + getInstance returns same instance
ReclaimClient.reset();
const c1 = ReclaimClient.configure({ token: "test-token-1" });
const c2 = ReclaimClient.getInstance();
assert(c1 === c2, "configure returns the singleton; subsequent getInstance returns the same");

// Reconfigure overrides
const c3 = ReclaimClient.configure({ token: "test-token-2", baseUrl: "https://example.test" });
assert(c3 !== c1, "configure replaces the singleton with a fresh instance");

// Missing token raises
ReclaimClient.reset();
delete process.env.RECLAIM_TOKEN;
let threw = false;
try { ReclaimClient.getInstance(); } catch { threw = true; }
assert(threw, "missing token throws");

// Reset config for further tests
ReclaimClient.configure({ token: "smoke" });

// Query encoder: scalars, arrays, dates, undefined
const qs = encodeQueryParams({
  user: 42,
  active: true,
  name: "ä & b",
  tags: ["x", "y"],
  due: new Date("2026-05-12T19:00:00Z"),
  skip: undefined,
  also: null,
});
assert(qs.includes("user=42"), "query encodes scalar");
assert(qs.includes("tags=x&tags=y"), "query encodes repeated keys for arrays");
assert(qs.includes("due=2026-05-12T19%3A00%3A00.000Z"), "query encodes Date as Zulu");
assert(qs.includes("name=%C3%A4%20%26%20b") || qs.includes("name=%C3%A4+%26+b"), "query encodes utf8");
assert(!qs.includes("skip"), "query skips undefined");
assert(!qs.includes("also"), "query skips null");

// toZuluIso
assert(toZuluIso(new Date("2026-01-01T00:00:00Z")) === "2026-01-01T00:00:00.000Z", "toZuluIso");

// Task: construction, chunk accessors, upNext alias
const t = new Task({ title: "x", priority: PriorityLevel.P2 });
t.duration = 3;
assert(t.timeChunksRequired === 12, "duration=3 → 12 chunks");
assert(t.duration === 3, "duration getter mirrors chunks");
t.minWorkDuration = 0.5;
assert(t.minChunkSize === 2, "minWorkDuration=0.5 → 2 chunks");
t.maxWorkDuration = 1.5;
assert(t.maxChunkSize === 6, "maxWorkDuration=1.5 → 6 chunks");
t.upNext = true;
assert(t.onDeck === true, "upNext writes onDeck");
assert(t.upNext === true, "upNext reads onDeck");

// Accessor-aliases must also flow through _assign() during construction:
const t2 = new Task({ title: "y", duration: 2, minWorkDuration: 0.25, maxWorkDuration: 1, upNext: true });
assert(t2.timeChunksRequired === 8, "constructor data.duration → 8 chunks");
assert(t2.minChunkSize === 1, "constructor data.minWorkDuration → 1 chunk");
assert(t2.maxChunkSize === 4, "constructor data.maxWorkDuration → 4 chunks");
assert(t2.onDeck === true, "constructor data.upNext → onDeck");
assert(t2.title === "y", "constructor preserves title");
assert(t.eventCategory === EventCategory.WORK, "default eventCategory=WORK");
assert(t.type === "TASK", "default type=TASK");
assert(t.prioritizableType === "TASK", "default prioritizableType=TASK");
assert(Array.isArray(t.readOnlyFields) && t.readOnlyFields.length === 0, "default readOnlyFields=[]");

// toApiData excludes internal _client
const wire = t.toApiData();
assert(!Object.keys(wire).some(k => k.startsWith("_")), "toApiData omits _ keys");
assert(wire.timeChunksRequired === 12, "toApiData includes chunk field");
assert(wire.title === "x", "toApiData preserves field values");

// DailyHabit defaults
const h = new DailyHabit({ title: "morning routine" });
assert(h.eventCategory === EventCategory.PERSONAL, "Habit default eventCategory=PERSONAL");
assert(h.enabled === true, "Habit default enabled=true");
assert(h.alwaysPrivate === false, "Habit default alwaysPrivate=false");
assert(h.type === "CUSTOM_DAILY", "Habit default type=CUSTOM_DAILY");

// Hours defaults
const hr = new Hours({ title: "x" });
assert(Array.isArray(hr.features) && hr.features.length === 0, "Hours default features=[]");

// Webhook
const wh = new Webhook({ url: "https://x", events: ["task.created"], status: "ACTIVE" });
assert(wh.events.length === 1, "Webhook events");

// Webhook signature: HMAC-SHA256 hex of body, timing-safe compare
import { createHmac } from "node:crypto";
const SECRET = "secret-shhh";
const body = Buffer.from(JSON.stringify({ hello: "world" }), "utf8");
const goodSig = createHmac("sha256", SECRET).update(body).digest("hex");

assert(verifySignature(body, goodSig, SECRET) === true, "verifySignature good sig");

threw = false;
try { verifySignature(body, "deadbeef", SECRET); } catch (e) { threw = e instanceof SignatureVerificationError; }
assert(threw, "verifySignature bad sig throws");

threw = false;
try { verifySignature(body, "", SECRET); } catch (e) { threw = e instanceof SignatureVerificationError; }
assert(threw, "verifySignature empty header throws");

// Webhook payload parsing → typed instances
const taskEvent = parseWebhookPayload(JSON.stringify({
  type: "task.completed",
  eventId: "evt-1",
  created: "2026-05-12T19:00:00Z",
  task: { id: 5, title: "demo" },
}));
assert(isTaskWebhookEvent(taskEvent), "task.completed → isTaskWebhookEvent");
assert(!isHabitWebhookEvent(taskEvent), "task.completed → !isHabitWebhookEvent");
assert(taskEvent.task instanceof Task, "task field is Task instance");
assert(taskEvent.task.id === 5, "task field preserves id");

const habitEvent = parseWebhookPayload(JSON.stringify({
  type: "habit.updated",
  eventId: "evt-2",
  created: "2026-05-12T19:00:00Z",
  habit: { id: 7, title: "stretch" },
}));
assert(isHabitWebhookEvent(habitEvent), "habit.updated → isHabitWebhookEvent");
assert(habitEvent.habit instanceof DailyHabit, "habit field is DailyHabit instance");

threw = false;
try { parseWebhookPayload(JSON.stringify({ type: "bogus.event" })); } catch { threw = true; }
assert(threw, "parseWebhookPayload rejects unknown type");

// Changelog is an object with the expected method names
assert(typeof Changelog.tasks === "function", "Changelog.tasks");
assert(typeof Changelog.events === "function", "Changelog.events");
assert(typeof Changelog.smartHabits === "function", "Changelog.smartHabits");
assert(typeof Changelog.smartMeetings === "function", "Changelog.smartMeetings");
assert(typeof Changelog.schedulingLinks === "function", "Changelog.schedulingLinks");
assert(typeof Changelog.all === "function", "Changelog.all");

// ENDPOINT constants are wired
assert(Task.ENDPOINT === "/api/tasks", "Task.ENDPOINT");
assert(DailyHabit.ENDPOINT === "/api/assist/habits/daily", "DailyHabit.ENDPOINT");
assert(Hours.ENDPOINT === "/api/timeschemes", "Hours.ENDPOINT");
assert(Webhook.ENDPOINT === "/api/team/current/webhooks", "Webhook.ENDPOINT");

if (fails > 0) {
  console.error(`\n${fails} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke assertions passed.");
