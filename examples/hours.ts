/**
 * Hours / time schemes — list, create a custom Mon-Fri 9-5, update, delete.
 *
 *   RECLAIM_TOKEN=... npx tsx examples/hours.ts
 */
import {
  Hours,
  PolicyType,
  TimeSchemeFeature,
  Weekday,
  type DayIntervals,
} from "../src/index.js";

async function main(): Promise<void> {
  console.log("existing schemes:");
  for (const s of await Hours.list()) {
    console.log(`  ${s.id}  [${s.policyType}]  ${s.title}`);
  }

  const workday: DayIntervals = {
    intervals: [{ start: "09:00:00", end: "17:00:00" }],
  };

  const scheme = new Hours({
    title: "Demo Hours",
    description: "Created by the reclaim-sdk example",
    taskCategory: "WORK",
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
  console.log("created:", scheme.id, scheme.title);

  scheme.description = "Updated by the reclaim-sdk example";
  await scheme.save();
  console.log("updated description:", scheme.description);

  await scheme.delete();
  console.log("deleted:", scheme.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
