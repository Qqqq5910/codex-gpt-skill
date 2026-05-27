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
      why: ["Ready"],
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
  assert.equal(updated.lastFailureReason, "stuck thinking");
  assert.equal(updated.lastFailurePath, "runs/current/failure.json");
  assert.equal("failureReason" in updated, false);
  assert.equal("failurePath" in updated, false);
});
