import { type QueryParams } from "../client.js";
import {
  EventCategory,
  type EventColor,
  type EventSubType,
  type PriorityLevel,
} from "../enums.js";
import { resolveClient, type JsonObject, type ResourceOptions } from "./base.js";
import { PlannerResource } from "./planner.js";

/**
 * Type-only shape for `new DailyHabit({...})` autocomplete.
 */
export interface DailyHabitInit {
  id?: number;
  title?: string;
  description?: string;
  priority?: PriorityLevel;
  eventCategory?: EventCategory;
  eventSubType?: EventSubType;
  eventColor?: EventColor;
  alwaysPrivate?: boolean;
  enabled?: boolean;
  type?: string;
  snoozeUntil?: string | Date;
  defenseAggression?: string;
  defendedDescription?: string;
  recurringAssignmentType?: string;
  invitees?: JsonObject[];
  durationMin?: number;
  durationMax?: number;
  idealTime?: string;
  idealDay?: string;
  recurrence?: string;
  timesPerPeriod?: number;
  additionalDescription?: string;
  index?: number;
  elevated?: boolean;
  reservedWords?: string[];
  notification?: boolean;
  timePolicyType?: string;
  oneOffPolicy?: JsonObject;
  timeSchemeId?: string;
  autoDecline?: boolean;
  autoDeclineText?: string;
  adjusted?: boolean;
  prioritizableType?: string;
  created?: string;
  updated?: string;
}

/**
 * Reclaim's **DailyHabit** — recurring time blocks that the planner protects
 * on the user's calendar (e.g. "30 min focused work each weekday morning").
 *
 * Backed by `/api/assist/habits/daily`. Habits share start/stop/restart and
 * clear-exceptions with tasks (via {@link PlannerResource}), and add habit-
 * specific actions:
 *
 * - {@link DailyHabit.toggle}  — enable / disable
 * - {@link DailyHabit.rescheduleEvent} / {@link DailyHabit.skipEvent}
 * - {@link DailyHabit.deletePolicy}
 * - {@link DailyHabit.migrateToSmartSeries}
 *
 * @example
 * ```ts
 * import { DailyHabit } from "reclaim-sdk";
 *
 * const habits = await DailyHabit.list();
 * const focus = habits.find(h => h.title === "Focus");
 * if (focus) await focus.toggle(false); // pause
 * ```
 */
export class DailyHabit extends PlannerResource<number> {
  public static readonly ENDPOINT = "/api/assist/habits/daily";
  protected static readonly PLANNER_PATH_SEGMENT = "habit" as const;

  declare public title?: string;
  declare public description?: string;
  declare public priority?: PriorityLevel;
  declare public eventCategory?: EventCategory;
  declare public eventSubType?: EventSubType;
  declare public eventColor?: EventColor;
  declare public alwaysPrivate?: boolean;
  declare public enabled?: boolean;
  declare public type?: string;
  declare public snoozeUntil?: string | Date;
  declare public defenseAggression?: string;
  declare public defendedDescription?: string;
  declare public recurringAssignmentType?: string;
  declare public invitees?: JsonObject[];
  declare public durationMin?: number;
  declare public durationMax?: number;
  declare public idealTime?: string;
  declare public idealDay?: string;
  declare public recurrence?: string;
  declare public timesPerPeriod?: number;
  declare public additionalDescription?: string;
  declare public index?: number;
  declare public elevated?: boolean;
  declare public reservedWords?: string[];
  declare public notification?: boolean;
  declare public timePolicyType?: string;
  declare public oneOffPolicy?: JsonObject;
  declare public timeSchemeId?: string;
  declare public autoDecline?: boolean;
  declare public autoDeclineText?: string;
  declare public adjusted?: boolean;
  declare public prioritizableType?: string;

  constructor(data: DailyHabitInit & JsonObject = {}, options: ResourceOptions = {}) {
    super(data, options);
    if (this.eventCategory === undefined) this.eventCategory = EventCategory.PERSONAL;
    if (this.alwaysPrivate === undefined) this.alwaysPrivate = false;
    if (this.enabled === undefined) this.enabled = true;
    if (this.type === undefined) this.type = "CUSTOM_DAILY";
  }

  /**
   * Enable or disable the habit. With no argument, toggles current state.
   * Toggling to the current state returns 409 Conflict.
   */
  public async toggle(enable?: boolean): Promise<void> {
    const params: QueryParams = {};
    if (enable !== undefined) params.enable = String(enable);
    return this._plannerCall("POST", `/api/planner/toggle/habit/${this.id}`, params);
  }

  /** Reschedule a single recurring instance back to a planner-chosen slot. */
  public async rescheduleEvent(eventId: string): Promise<void> {
    return this._plannerCall("POST", `/api/planner/reschedule/habit/event/${eventId}`);
  }

  /** Skip a single recurring instance entirely. */
  public async skipEvent(eventId: string): Promise<void> {
    return this._plannerCall("POST", `/api/planner/skip/habit/event/${eventId}`);
  }

  /**
   * Migrate this daily habit into the newer "smart series" pipeline.
   * Server-side one-way operation.
   */
  public async migrateToSmartSeries(): Promise<void> {
    await this._client.post(`${DailyHabit.ENDPOINT}/${this.id}/migrate-to-smart-series`);
  }

  /** Drop any manual scheduling policy applied to this habit. */
  public async deletePolicy(): Promise<void> {
    return this._plannerCall("DELETE", `/api/planner/policy/habit/${this.id}`);
  }

  /**
   * Fetch the server's default habit template (used as a starting point in
   * the create-habit flow).
   */
  public static async getTemplate(options: ResourceOptions = {}): Promise<JsonObject> {
    return resolveClient(options).get<JsonObject>("/api/assist/habits/template");
  }

  /**
   * Browse the catalogue of habit templates, optionally filtered by role
   * or department.
   */
  public static async listTemplates(
    filter: { role?: string; department?: string } = {},
    options: ResourceOptions = {},
  ): Promise<JsonObject[]> {
    const params: QueryParams = {};
    if (filter.role) params.role = filter.role;
    if (filter.department) params.department = filter.department;
    return resolveClient(options).get<JsonObject[]>("/api/assist/habits/templates", {
      params,
    });
  }

  /**
   * Create a habit from a template id.
   *
   * @deprecated  Reclaim has deprecated template-based creation server-side.
   *   Use the normal `new DailyHabit({...}).save()` flow instead.
   */
  public static async createFromTemplate(
    templateId: string,
    options: ResourceOptions = {},
  ): Promise<DailyHabit> {
    const client = resolveClient(options);
    const data = await client.post<JsonObject>(
      "/api/assist/habits/template/create",
      { params: { templateId } },
    );
    return new DailyHabit(data ?? {}, { client });
  }
}
