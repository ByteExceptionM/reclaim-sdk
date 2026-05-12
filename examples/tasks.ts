/**
 * Tasks — create, update, run planner actions, complete, delete.
 *
 *   RECLAIM_TOKEN=... npx tsx examples/tasks.ts
 */
import {
  EventColor,
  Hours,
  InvalidRecord,
  PriorityLevel,
  RecordNotFound,
  ReclaimAPIError,
  Task,
} from "../src/index.js";

async function main(): Promise<void> {
  let task: Task | undefined;

  try {
    task = new Task({
      title: "Demo task from reclaim-sdk",
      due: new Date("2026-12-31T23:59:59Z"),
      priority: PriorityLevel.P3,
    });
    task.duration = 3;
    task.minWorkDuration = 0.5;
    task.maxWorkDuration = 1.5;
    await task.save();
    console.log("created", task.id);

    task.notes = "Updated from the SDK example";
    task.eventColor = EventColor.BANANA;
    await task.save();

    const allHours = await Hours.list();
    if (allHours.length > 2) {
      task.timeSchemeId = allHours[2]!.id;
      await task.save();
      console.log("re-bound to time scheme", task.timeSchemeId);
    }

    await task.addTime(0.5);
    task.upNext = true;
    await task.save();

    await task.start();
    await task.logWork(60, new Date());
    await task.stop();

    await task.markComplete();
    await task.markIncomplete();

    const all = await Task.list();
    console.log(`account has ${all.length} tasks`);
  } catch (err) {
    if (err instanceof RecordNotFound) console.error("not found:", err.message);
    else if (err instanceof InvalidRecord) console.error("invalid:", err.message);
    else if (err instanceof ReclaimAPIError) console.error("api error:", err.message);
    else throw err;
  } finally {
    if (task?.id) await task.delete();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
