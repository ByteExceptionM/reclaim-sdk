import { type Weekday } from "../enums.js";
import {
  BaseResource,
  type JsonObject,
  type ResourceOptions,
} from "./base.js";

/**
 * Recurrence policy on a SmartHabit series.
 */
export interface SmartHabitRecurrence {
  /** `"WEEKLY"`, `"DAILY"`, `"MONTHLY"`, … — server-defined string set. */
  frequency?: "WEEKLY" | "DAILY" | "MONTHLY" | (string & {});
  /** Preferred weekdays for placement. */
  idealDays?: Weekday[];
  /** Recurrence interval (e.g. `1` = every period, `2` = every other). */
  interval?: number;
  /** Minimum gap between scheduled instances. */
  daysBetweenPeriods?: number;
  [k: string]: unknown;
}

/**
 * Timezone metadata as returned by the API on every attendee.
 */
export interface SmartHabitTimezone {
  id?: string;
  displayName?: string;
  abbreviation?: string;
  [k: string]: unknown;
}

/**
 * One participant in a habit series. The owner is always present with
 * `role: "ORGANIZER"`; additional attendees can be invited for shared habits.
 */
export interface SmartHabitAttendee {
  attendee?: {
    userId?: string;
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    reclaimUser?: boolean;
    [k: string]: unknown;
  };
  required?: boolean;
  role?: string;
  timezone?: SmartHabitTimezone;
  timePolicyType?: string;
  oneOffPolicy?: JsonObject;
  timeSchemeId?: string;
  priority?: string;
  responseStatus?: string;
  visibility?: string;
  [k: string]: unknown;
}

/**
 * A single version of the habit. Each habit lineage may have several series
 * (one per time the user changed substantive settings — title, timing,
 * recurrence …). The `activeSeries` is the current one; older entries live
 * on the lineage's `series` array.
 */
export interface SmartHabitSeries {
  id?: number;
  calendarId?: number;
  eventId?: string;
  title?: string;
  recurrence?: SmartHabitRecurrence;
  starting?: string;
  idealTime?: string;
  durationMinMins?: number;
  durationMaxMins?: number;
  eventType?: "SOLO_WORK" | (string & {});
  defenseAggression?: string;
  visibility?: "DEFAULT" | "RECLAIM" | (string & {});
  defendedDescription?: string;
  attendees?: SmartHabitAttendee[];
  resources?: JsonObject[];
  [k: string]: unknown;
}

/**
 * A scheduling window — the API exposes one or more `periods` on every
 * lineage describing where instances may land.
 */
export interface SmartHabitPeriod {
  id?: number;
  starting?: string;
  ending?: string;
  [k: string]: unknown;
}

/**
 * Type-only shape for `new SmartHabit({...})` autocomplete. Read-only release:
 * the SDK doesn't yet expose write operations, so this is primarily useful
 * for test fixtures and webhook payload rehydration.
 */
export interface SmartHabitInit {
  id?: number;
  lineageId?: number;
  calendarId?: number;
  type?: "HABIT" | (string & {});
  status?: string;
  enabled?: boolean;
  restorable?: boolean;
  recurrenceType?: string;
  activeSeries?: SmartHabitSeries;
  series?: SmartHabitSeries[];
  periods?: SmartHabitPeriod[];
  created?: string;
  updated?: string;
}

/**
 * Reclaim's **Smart Habit** — the newer recurring-block model replacing
 * legacy {@link DailyHabit} for accounts onboarded since the smart-series
 * rollout.
 *
 * Backed by `/api/smart-habits`. Each record is a **lineage** that wraps:
 *
 * - `activeSeries` — the current configuration (title, recurrence, timing)
 * - `series` — every prior version of the lineage
 * - `periods` — the time windows the planner currently uses for placement
 *
 * The resource id is `lineageId` (not a separate `id` field). The `id`
 * getter on this class is aliased to `lineageId` so generic `BaseResource`
 * methods (`get`, `refresh`, …) work out of the box.
 *
 * @example
 * ```ts
 * import { SmartHabit } from "reclaim-sdk";
 *
 * const habits = await SmartHabit.list();
 * for (const h of habits) {
 *   const s = h.activeSeries;
 *   console.log(h.lineageId, s?.title, `${s?.durationMaxMins}min @ ${s?.idealTime}`);
 * }
 * ```
 *
 * ### Write operations
 *
 * The SDK currently exposes read-only access. Smart-habit creation,
 * mutation, and planner actions (pause / resume / skip-series) live behind
 * `/api/smart-habits/*` endpoints whose write semantics are not yet
 * verified — they may surface in a later release. Open an issue if you need
 * a specific operation sooner.
 */
export class SmartHabit extends BaseResource<number> {
  public static readonly ENDPOINT = "/api/smart-habits";

  declare public lineageId?: number;
  declare public calendarId?: number;
  declare public type?: "HABIT" | (string & {});
  declare public status?: string;
  declare public enabled?: boolean;
  declare public restorable?: boolean;
  declare public recurrenceType?: string;
  declare public activeSeries?: Readonly<SmartHabitSeries>;
  declare public series?: readonly Readonly<SmartHabitSeries>[];
  declare public periods?: readonly Readonly<SmartHabitPeriod>[];

  constructor(data: SmartHabitInit & JsonObject = {}, options: ResourceOptions = {}) {
    super(data, options);
  }

  /** Convenience pass-throughs to the current series. Read-only. */
  public get title(): string | undefined {
    return this.activeSeries?.title;
  }
  public get idealTime(): string | undefined {
    return this.activeSeries?.idealTime;
  }
  public get durationMinMins(): number | undefined {
    return this.activeSeries?.durationMinMins;
  }
  public get durationMaxMins(): number | undefined {
    return this.activeSeries?.durationMaxMins;
  }
  public get recurrence(): SmartHabitRecurrence | undefined {
    return this.activeSeries?.recurrence;
  }

  /**
   * Identifier alias. Smart habits use `lineageId` as their key; `id` is
   * provided so generic `BaseResource` machinery (`get(id)`, `refresh()`,
   * …) works without per-resource overrides.
   */
  public get id(): number | undefined {
    return this.lineageId;
  }
  public set id(value: number | undefined) {
    this.lineageId = value;
  }
}
