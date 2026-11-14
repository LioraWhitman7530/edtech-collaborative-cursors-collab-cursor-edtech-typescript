import test from "node:test";
import assert from "node:assert/strict";
import { accessDecision } from "./course-cutover.ts";

test("a learner past the deadline cannot publish a cursor", () => {
  const result = accessDecision({ deadline: "2026-01-10T00:00:00Z", now: "2026-01-10T00:00:01Z" });
  assert.deepEqual(result, { canEdit: false, reason: "deadline-closed" });
});
