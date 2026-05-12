/**
 * Changelog — read recent change events for the account.
 *
 *   RECLAIM_TOKEN=... npx tsx examples/changelog.ts
 */
import { Changelog, Task } from "../src/index.js";

async function main(): Promise<void> {
  // Full feed, recent events first.
  for (const entry of await Changelog.all()) {
    console.log(
      `${entry.changedAt} ${entry.reclaimEventType} ` +
        `assignment=${entry.assignmentId} reason=${entry.reason ?? "-"}`,
    );
  }

  // Scoped to your first 5 tasks.
  const tasks = await Task.list();
  const ids = tasks
    .slice(0, 5)
    .map((t) => t.id)
    .filter((v): v is number => v !== undefined);

  if (ids.length > 0) {
    const entries = await Changelog.tasks(ids);
    for (const e of entries) {
      console.log(`task ${e.assignmentId}: ${e.reclaimEventType} (${e.reason ?? "-"})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
