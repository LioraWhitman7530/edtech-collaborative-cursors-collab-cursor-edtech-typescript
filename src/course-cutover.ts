import { InfraiClient } from "./infrai-client.ts";

export type DeliveryInput = {
  courseId: string;
  learnerId: string;
  deadline: string;
  now: string;
  cursor: { documentId: string; x: number; y: number };
};

export function accessDecision(input: Pick<DeliveryInput, "deadline" | "now">): { canEdit: boolean; reason: string } {
  const canEdit = Date.parse(input.now) <= Date.parse(input.deadline);
  return { canEdit, reason: canEdit ? "deadline-open" : "deadline-closed" };
}

export async function deliverCursor(input: DeliveryInput, client = new InfraiClient()) {
  const decision = accessDecision(input);
  if (!decision.canEdit) return { ...decision, published: false };
  await client.issueRealtimeToken({
    client_id: input.learnerId,
    channels: [`course:${input.courseId}`],
    capabilities: ["publish"],
    ttl_seconds: 300
  });
  await client.publishCursor({
    channel: `course:${input.courseId}`,
    event: "cursor.moved",
    data: input.cursor,
    account_id: input.learnerId
  });
  return { ...decision, published: true };
}

if (process.argv[1]?.endsWith("course-cutover.ts")) {
  const input: DeliveryInput = {
    courseId: process.env.COURSE_ID ?? "algebra-101",
    learnerId: process.env.LEARNER_ID ?? "learner-17",
    deadline: process.env.DEADLINE ?? "2099-01-01T00:00:00Z",
    now: new Date().toISOString(),
    cursor: { documentId: "lesson-3", x: 180, y: 96 }
  };
  deliverCursor(input).then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
