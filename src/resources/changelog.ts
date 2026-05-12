import { resolveClient, type ResourceOptions } from "./base.js";

/**
 * Single entry returned by Reclaim's `/api/changelog/*` endpoints.
 *
 * The server may return additional fields not modelled here — they pass
 * through verbatim as untyped object keys. The keys typed below are stable.
 */
export interface ChangeLogEntryView {
  id?: number;
  changedAt?: string;
  reclaimEventType?: string;
  assignmentId?: number;
  eventId?: string;
  organizerId?: string;
  actorId?: string;
  reason?: string;
  [k: string]: unknown;
}

/**
 * Read-only access to Reclaim's change feeds.
 *
 * Each feed returns a list of {@link ChangeLogEntryView} entries describing
 * the events that have happened to a given set of resources. Typical use is
 * polling — pass the IDs you care about and inspect the entries newer than
 * your last checkpoint.
 *
 * @example
 * ```ts
 * import { Changelog, Task } from "reclaim-sdk";
 *
 * const tasks = await Task.list();
 * const ids = tasks.slice(0, 5).map(t => t.id!).filter((v): v is number => !!v);
 * const entries = await Changelog.tasks(ids);
 * for (const e of entries) {
 *   console.log(e.changedAt, e.reclaimEventType, e.reason);
 * }
 * ```
 */
export const Changelog = {
  /** Recent change events for a specific list of task ids. */
  async tasks(
    taskIds: number[],
    options: ResourceOptions = {},
  ): Promise<ChangeLogEntryView[]> {
    const data = await resolveClient(options).get<ChangeLogEntryView[]>(
      "/api/changelog/tasks",
      { params: { taskIds } },
    );
    return data ?? [];
  },

  /** Recent change events for a specific list of calendar event ids. */
  async events(
    eventIds: string[],
    options: ResourceOptions = {},
  ): Promise<ChangeLogEntryView[]> {
    const data = await resolveClient(options).get<ChangeLogEntryView[]>(
      "/api/changelog/events",
      { params: { eventIds } },
    );
    return data ?? [];
  },

  /** Recent change events for a specific list of smart-habit ids. */
  async smartHabits(
    ids: number[],
    options: ResourceOptions = {},
  ): Promise<ChangeLogEntryView[]> {
    const data = await resolveClient(options).get<ChangeLogEntryView[]>(
      "/api/changelog/smart-habits",
      { params: { ids } },
    );
    return data ?? [];
  },

  /** Recent change events for a specific list of smart-meeting ids. */
  async smartMeetings(
    ids: number[],
    options: ResourceOptions = {},
  ): Promise<ChangeLogEntryView[]> {
    const data = await resolveClient(options).get<ChangeLogEntryView[]>(
      "/api/changelog/smart-meetings",
      { params: { ids } },
    );
    return data ?? [];
  },

  /** Recent change events for a specific list of scheduling-link ids. */
  async schedulingLinks(
    ids: string[],
    options: ResourceOptions = {},
  ): Promise<ChangeLogEntryView[]> {
    const data = await resolveClient(options).get<ChangeLogEntryView[]>(
      "/api/changelog/scheduling-links",
      { params: { ids } },
    );
    return data ?? [];
  },

  /** Full unfiltered changelog (all resources, recent events first). */
  async all(options: ResourceOptions = {}): Promise<ChangeLogEntryView[]> {
    const data = await resolveClient(options).get<ChangeLogEntryView[]>(
      "/api/changelog",
    );
    return data ?? [];
  },
};
