import test from "node:test";
import assert from "node:assert/strict";
import { buildFailureUpdate } from "../skills/codex-chatgpt-web-review/scripts/failureState.mjs";

test("buildFailureUpdate downgrades failed full prompts to compact", () => {
  const failure = buildFailureUpdate(
    {
      status: "prompt_prepared",
      mode: "full",
      runDir: "runs/current",
      previousRunDir: "runs/good",
      previousVerdict: "ITERATE",
    },
    { reason: "web error", now: "2026-05-27T00:00:00.000Z" },
  );

  assert.equal(failure.status, "review_failed");
  assert.equal(failure.recommendedMode, "compact");
  assert.equal(failure.failedRunDir, "runs/current");
  assert.equal(failure.lastGoodRunDir, "runs/good");
  assert.equal(failure.lastGoodVerdict, "ITERATE");
  assert.equal(failure.failureReason, "web error");
});

test("buildFailureUpdate preserves current saved review as last good", () => {
  const failure = buildFailureUpdate(
    {
      status: "review_saved",
      mode: "compact",
      runDir: "runs/review",
      verdict: "DELIVER",
      savedAt: "2026-05-27T01:00:00.000Z",
    },
    { now: "2026-05-27T02:00:00.000Z" },
  );

  assert.equal(failure.recommendedMode, "compact");
  assert.equal(failure.lastGoodRunDir, "runs/review");
  assert.equal(failure.lastGoodVerdict, "DELIVER");
  assert.equal(failure.lastGoodSavedAt, "2026-05-27T01:00:00.000Z");
});
