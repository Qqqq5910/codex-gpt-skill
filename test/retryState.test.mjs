import test from "node:test";
import assert from "node:assert/strict";
import { buildRetryUpdate } from "../skills/codex-chatgpt-web-review/scripts/retryState.mjs";

test("buildRetryUpdate reuses the same prompt after a web failure", () => {
  const updated = buildRetryUpdate(
    {
      status: "review_failed",
      promptPath: "runs/current/prompt.md",
      failurePath: "runs/current/failure.json",
      failureReason: "stuck thinking",
      failureDetails: "spinner never finished",
      iteration: 3,
    },
    { now: "2026-05-27T03:00:00.000Z" },
  );

  assert.equal(updated.status, "prompt_prepared");
  assert.equal(updated.promptPath, "runs/current/prompt.md");
  assert.equal(updated.retryCount, 1);
  assert.equal(updated.retryOfFailurePath, "runs/current/failure.json");
  assert.equal(updated.lastFailureReason, "stuck thinking");
  assert.equal(updated.iteration, 3);
});

test("buildRetryUpdate requires a prompt path", () => {
  assert.throws(() => buildRetryUpdate({ status: "review_failed" }), /no promptPath/);
});
