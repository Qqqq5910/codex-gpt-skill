import test from "node:test";
import assert from "node:assert/strict";
import { buildContinuationPromptInput, canPrepareNextReview } from "../skills/codex-chatgpt-web-review/scripts/webLoop.mjs";

test("canPrepareNextReview allows saved iterate reviews", () => {
  const result = canPrepareNextReview({ status: "review_saved", verdict: "ITERATE" });

  assert.equal(result.ok, true);
});

test("canPrepareNextReview stops after deliver unless forced", () => {
  const latest = { status: "review_saved", verdict: "DELIVER" };

  assert.equal(canPrepareNextReview(latest).ok, false);
  assert.equal(canPrepareNextReview(latest, { force: true }).ok, true);
});

test("buildContinuationPromptInput carries previous GPT advice", () => {
  const input = buildContinuationPromptInput({
    latest: {
      runDir: "/tmp/run",
      verdict: "ITERATE",
      summary: ["The retry state exists."],
      why: ["Persistence was missing."],
      changeRequests: ["Persist retry metadata."],
      improvementIdeas: ["Add clearer docs."],
      risks: ["Browser UI may hang."],
      nextActions: ["Add a retry path."],
      acceptanceChecks: ["node --test"],
      deliveryNote: "- Keep iterating.",
    },
    summary: "Added retry state.",
    changedFiles: ["src/example.mjs"],
    verification: ["manual web round trip"],
  });

  assert.match(input.artifactSummary, /Added retry state/);
  assert.match(input.artifactSummary, /Previous run: run/);
  assert.doesNotMatch(input.artifactSummary, /\/tmp\/run/);
  assert.match(input.artifactSummary, /Previous verdict: ITERATE/);
  assert.deepEqual(input.changedFiles, ["src/example.mjs"]);
  assert.deepEqual(input.verification, ["manual web round trip"]);
  assert.match(input.priorAdvice, /Add a retry path/);
  assert.match(input.priorAdvice, /Persist retry metadata/);
  assert.match(input.priorAdvice, /Add clearer docs/);
  assert.match(input.priorAdvice, /Browser UI may hang/);
  assert.match(input.priorAdvice, /node --test/);
});
