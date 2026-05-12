import {
  toZuluIso,
  type QueryParams,
} from "../client.js";
import {
  EventCategory,
  type EventColor,
  type EventSubType,
  type PriorityLevel,
  type TaskStatus,
} from "../enums.js";
import {
  resolveClient,
  type JsonObject,
  type ResourceOptions,
} from "./base.js";
import { PlannerResource } from "./planner.js";

/**
 * Reclaim's scheduling engine quantises work into 15-minute slots, so every
 * duration on a task is stored as an integer number of slots.
 *
 * The raw fields are `timeChunksRequired`, `minChunkSize` and `maxChunkSize`.
 * The accessors `duration`, `minWorkDuration` and `maxWorkDuration` expose
 * those same values in fractional hours — writing one rewrites the slot count.
 */
const CHUNKS_PER_HOUR = 4;

function hoursToChunks(hours: number): number {
  return Math.round(hours * CHUNKS_PER_HOUR);
}

function chunksToHours(chunks: number): number {
  return chunks / CHUNKS_PER_HOUR;
}

/**
 * Wire shape for the `taskSource` field — a small object whose `type`
 * carries the integration the task came from (Reclaim, Google, Jira, …).
 */
export interface TaskSourceObject {
  type?: string;
  [k: string]: unknown;
}

/**
 * Shape used for batch patch / archive / delete operations against
 * `/api/tasks/batch`.
 */
export interface TaskPatch {
  taskId: number;
  patch?: JsonObject;
  notificationKey?: string;
}

/**
 * Type-only shape used to give `new Task({...})` accurate autocomplete.
 * Mirrors the class fields plus the four hour-based accessor aliases.
 */
export interface TaskInit {
  id?: number;
  title?: string;
  notes?: string;
  eventCategory?: EventCategory;
  eventSubType?: EventSubType;
  timeSchemeId?: string;
  timeChunksRequired?: number;
  minChunkSize?: number;
  maxChunkSize?: number;
  timeChunksSpent?: number;
  timeChunksRemaining?: number;
  priority?: PriorityLevel;
  onDeck?: boolean;
  atRisk?: boolean;
  deleted?: boolean;
  adjusted?: boolean;
  deferred?: boolean;
  alwaysPrivate?: boolean;
  taskSource?: TaskSourceObject;
  readOnlyFields?: string[];
  sortKey?: number;
  prioritizableType?: string;
  type?: string;
  status?: TaskStatus;
  due?: string | Date;
  finished?: string | Date;
  snoozeUntil?: string | Date;
  index?: number;
  eventColor?: EventColor;
  created?: string;
  updated?: string;

  // Hour-based aliases for the chunk fields:
  duration?: number;
  minWorkDuration?: number;
  maxWorkDuration?: number;
  upNext?: boolean;
}

/**
 * The Reclaim **Task** resource — full CRUD against `/api/tasks`, plus
 * planner actions inherited from {@link PlannerResource} (start/stop,
 * snooze, plan work, log work, mark complete, …).
 *
 * Construct a new task with a plain options object and call `save()`; the
 * server-assigned fields (`id`, `created`, `updated`, …) populate the
 * instance after the round-trip.
 *
 * @example
 * ```ts
 * import { Task, PriorityLevel } from "reclaim-sdk";
 *
 * const task = new Task({
 *   title: "Write quarterly report",
 *   priority: PriorityLevel.P2,
 *   due: new Date("2026-06-30"),
 * });
 * task.duration = 3;          // 3 hours = 12 chunks
 * task.minWorkDuration = 0.5; // 30 min minimum split
 * await task.save();
 * ```
 */
export class Task extends PlannerResource<number> {
  public static readonly ENDPOINT = "/api/tasks";
  public static readonly USER_PARAM_REQUIRED = true;
  protected static readonly PLANNER_PATH_SEGMENT = "task" as const;

  declare public title?: string;
  declare public notes?: string;
  declare public eventCategory?: EventCategory;
  declare public eventSubType?: EventSubType;
  declare public timeSchemeId?: string;
  declare public timeChunksRequired?: number;
  declare public minChunkSize?: number;
  declare public maxChunkSize?: number;
  declare public timeChunksSpent?: number;
  declare public timeChunksRemaining?: number;
  declare public priority?: PriorityLevel;
  declare public onDeck?: boolean;
  declare public atRisk?: boolean;
  declare public deleted?: boolean;
  declare public adjusted?: boolean;
  declare public deferred?: boolean;
  declare public alwaysPrivate?: boolean;
  declare public taskSource?: TaskSourceObject;
  declare public readOnlyFields?: string[];
  declare public sortKey?: number;
  declare public prioritizableType?: string;
  declare public type?: string;
  declare public status?: TaskStatus;
  declare public due?: string | Date;
  declare public finished?: string | Date;
  declare public snoozeUntil?: string | Date;
  declare public index?: number;
  declare public eventColor?: EventColor;

  constructor(data: TaskInit & JsonObject = {}, options: ResourceOptions = {}) {
    super(data, options);
    if (this.eventCategory === undefined) this.eventCategory = EventCategory.WORK;
    if (this.prioritizableType === undefined) this.prioritizableType = "TASK";
    if (this.type === undefined) this.type = "TASK";
    if (this.readOnlyFields === undefined) this.readOnlyFields = [];
    if (this.sortKey === undefined) this.sortKey = 0;
    if (this.onDeck === undefined) this.onDeck = false;
    if (this.atRisk === undefined) this.atRisk = false;
    if (this.deleted === undefined) this.deleted = false;
    if (this.adjusted === undefined) this.adjusted = false;
    if (this.deferred === undefined) this.deferred = false;
    if (this.alwaysPrivate === undefined) this.alwaysPrivate = false;
  }

  /** Total work needed, in hours. Backed by `timeChunksRequired` (15-min chunks). */
  public get duration(): number | undefined {
    return this.timeChunksRequired === undefined
      ? undefined
      : chunksToHours(this.timeChunksRequired);
  }
  public set duration(hours: number | undefined) {
    this.timeChunksRequired = hours === undefined ? undefined : hoursToChunks(hours);
  }

  /** Minimum chunk the planner will schedule, in hours. Backed by `minChunkSize`. */
  public get minWorkDuration(): number | undefined {
    return this.minChunkSize === undefined ? undefined : chunksToHours(this.minChunkSize);
  }
  public set minWorkDuration(hours: number | undefined) {
    this.minChunkSize = hours === undefined ? undefined : hoursToChunks(hours);
  }

  /** Maximum chunk the planner will schedule, in hours. Backed by `maxChunkSize`. */
  public get maxWorkDuration(): number | undefined {
    return this.maxChunkSize === undefined ? undefined : chunksToHours(this.maxChunkSize);
  }
  public set maxWorkDuration(hours: number | undefined) {
    this.maxChunkSize = hours === undefined ? undefined : hoursToChunks(hours);
  }

  /** Mirror of `onDeck` — whether the task is pinned to the Up Next list. */
  public get upNext(): boolean | undefined {
    return this.onDeck;
  }
  public set upNext(value: boolean | undefined) {
    this.onDeck = value;
  }

  /**
   * Force a re-prioritisation pass on the planner. The server returns the
   * updated record, which is folded back onto this instance.
   */
  public async prioritize(): Promise<void> {
    return this._plannerCall("POST", `/api/planner/prioritize/task/${this.id}`);
  }

  /**
   * Add work-time to this task in fractional hours. Rounded to nearest 15 min.
   */
  public async addTime(hours: number): Promise<void> {
    const minutes = Math.round((hours * 60) / 15) * 15;
    return this._plannerCall(
      "POST",
      `/api/planner/add-time/task/${this.id}`,
      { minutes },
    );
  }

  /**
   * Update this task's manual sort position.
   */
  public async reindex(sortKey: number): Promise<void> {
    const response = await this._client.patch<unknown>(
      `${Task.ENDPOINT}/${this.id}/reindex`,
      { json: { sortKey } },
    );
    this._assignFromResponse(response);
  }

  /**
   * Reschedule a single scheduled event back to the planner's preferred slot.
   *
   * @param eventId  Reclaim event id (string).
   */
  public async rescheduleEvent(eventId: string): Promise<void> {
    return this._plannerCall("POST", `/api/planner/reschedule/task/event/${eventId}`);
  }

  /**
   * Drop any manual scheduling policy applied to this task, letting the
   * planner choose freely again.
   */
  public async deletePolicy(): Promise<void> {
    return this._plannerCall("DELETE", `/api/planner/policy/task/${this.id}`);
  }

  /**
   * Re-prioritise all of the user's tasks by due date. Returns the updated list.
   */
  public static async prioritizeByDue(options: ResourceOptions = {}): Promise<Task[]> {
    const client = resolveClient(options);
    const data = await client.patch<JsonObject[]>("/api/tasks/reindex-by-due");
    return (data ?? []).map((item) => new Task(item, { client }));
  }

  /**
   * Create a task pinned to a specific start time. Use this when you want
   * Reclaim to leave the task at the slot you nominate rather than re-plan it.
   */
  public static async createAtTime(
    task: Task,
    startTime: Date,
    options: ResourceOptions = {},
  ): Promise<Task> {
    const client = resolveClient(options);
    const params: QueryParams = { startTime: toZuluIso(startTime) };
    const data = await client.post<JsonObject>(`${Task.ENDPOINT}/at-time`, {
      params,
      json: task.toApiData(),
    });
    const payload =
      data && typeof data === "object" && !Array.isArray(data) && "task" in data
        ? (data["task"] as JsonObject)
        : (data as JsonObject | null | undefined);
    return new Task(payload ?? {}, { client });
  }

  /**
   * Returns the lowest manual sort index currently in use.
   * Useful when inserting a new task at the top of the list.
   */
  public static async findMinIndex(
    options: ResourceOptions = {},
  ): Promise<number | null> {
    const client = resolveClient(options);
    const user = await client.currentUser();
    const params: QueryParams = {};
    if (typeof user.id === "string" || typeof user.id === "number") {
      params.user = user.id;
    }
    return client.get<number | null>(`${Task.ENDPOINT}/min-index`, { params });
  }

  /**
   * Batch-update many tasks atomically.
   */
  public static async batchPatch(
    patches: TaskPatch[],
    options: ResourceOptions = {},
  ): Promise<JsonObject> {
    return resolveClient(options).patch<JsonObject>(`${Task.ENDPOINT}/batch`, {
      json: patches,
    });
  }

  /**
   * Batch-delete many tasks atomically.
   */
  public static async batchDelete(
    patches: TaskPatch[],
    options: ResourceOptions = {},
  ): Promise<JsonObject> {
    return resolveClient(options).delete<JsonObject>(`${Task.ENDPOINT}/batch`, {
      json: patches,
    });
  }

  /**
   * Batch-archive many tasks atomically.
   */
  public static async batchArchive(
    patches: TaskPatch[],
    options: ResourceOptions = {},
  ): Promise<JsonObject> {
    return resolveClient(options).patch<JsonObject>(`${Task.ENDPOINT}/batch/archive`, {
      json: patches,
    });
  }

  /**
   * Register an "interest" record for a user — used to signal that someone
   * has expressed intent toward a task they don't yet own.
   */
  public static async registerInterest(
    user: JsonObject,
    options: ResourceOptions = {},
  ): Promise<void> {
    await resolveClient(options).post(`${Task.ENDPOINT}/interest`, { json: { user } });
  }
}
