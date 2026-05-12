/**
 * Habits — list, toggle, browse templates.
 *
 * Habits are typically created via the Reclaim web app (the API often rejects
 * direct creation with 409 Conflict due to calendar collisions). Once they
 * exist, the SDK can list and manage them.
 *
 *   RECLAIM_TOKEN=... npx tsx examples/habits.ts
 */
import { DailyHabit } from "../src/index.js";

async function main(): Promise<void> {
  const habits = await DailyHabit.list();
  for (const h of habits) {
    console.log(`${h.id}: ${h.title} (enabled=${h.enabled})`);
  }

  // Pause then resume the first enabled habit.
  const active = habits.find((h) => h.enabled);
  if (active) {
    await active.toggle(false);
    console.log(`paused ${active.title}`);
    await active.toggle(true);
    console.log(`resumed ${active.title}`);
  }

  const templates = await DailyHabit.listTemplates();
  console.log(`${templates.length} habit templates available`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
