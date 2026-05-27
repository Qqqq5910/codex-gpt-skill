import test from "node:test";
import assert from "node:assert/strict";
import { buildSavedReviewUpdate } from "../skills/codex-chatgpt-web-review/scripts/saveState.mjs";

test("buildSavedReviewUpdate clears active failure fields after a successful retry", () => {
  const updated = buildSavedReviewUpdate(
    {
      status: "prompt_prepared",
      runDir: "runs/current",
      failureReason: "stuck thinking",
      failureDetails: "spinner",
      failurePath: "runs/current/failure.json",
      failedAt: "2026-05-27T03:00:00.000Z",
      failedRunDir: "runs/current",
    },
    {
      verdict: "DELIVER",
      summary: ["Summary"],
      why: ["Ready"],
      changeRequests: ["None"],
      improvementIdeas: ["Add docs later"],
      risks: ["Web UI can change"],
      nextActions: ["None"],
      acceptanceChecks: ["node --test"],
      deliveryNote: "Done",
    },
    {
      reviewPath: "runs/current/review.md",
      parsedPath: "runs/current/review.json",
      savedAt: "2026-05-27T04:00:00.000Z",
    },
  );

  assert.equal(updated.status, "review_saved");
  assert.equal(updated.verdict, "DELIVER");
  assert.deepEqual(updated.changeRequests, ["None"]);
  assert.deepEqual(updated.improvementIdeas, ["Add docs later"]);
  assert.deepEqual(updated.risks, ["Web UI can change"]);
  assert.equal(updated.lastFailureReason, "stuck thinking");
  assert.equal(updated.lastFailurePath, "runs/current/failure.json");
  assert.equal("failureReason" in updated, false);
  assert.equal("failurePath" in updated, false);
});

test("buildSavedReviewUpdate defaults new review arrays for old parser output", () => {
  const updated = buildSavedReviewUpdate(
    {},
    {
      verdict: "ITERATE",
      nextActions: ["Do work"],
      acceptanceChecks: ["node --test"],
      deliveryNote: "Continue",
    },
    {},
  );

  assert.deepEqual(updated.summary, []);
  assert.deepEqual(updated.why, []);
  assert.deepEqual(updated.changeRequests, []);
  assert.deepEqual(updated.improvementIdeas, []);
  assert.deepEqual(updated.risks, []);
});
