import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewPrompt, parseReview } from "../skills/codex-chatgpt-web-review/scripts/reviewPrompt.mjs";

test("buildReviewPrompt includes required sections", () => {
  const prompt = buildReviewPrompt({
    artifactSummary: "Connected to ChatGPT web UI.",
    changedFiles: ["src/example.mjs"],
    verification: ["manual browser round trip"],
    reviewFocus: ["implementation quality"],
    reviewDepth: "thorough",
  });

  assert.match(prompt, /External Review Request/);
  assert.match(prompt, /Connected to ChatGPT web UI/);
  assert.match(prompt, /VERDICT: ITERATE \| DELIVER \| BLOCKED/);
  assert.match(prompt, /CHANGE_REQUESTS/);
  assert.match(prompt, /IMPROVEMENT_IDEAS/);
  assert.match(prompt, /implementation quality/);
});

test("buildReviewPrompt supports compact web mode", () => {
  const prompt = buildReviewPrompt({
    artifactSummary: "Round trip works.",
    changedFiles: ["src/prepareWebReview.mjs"],
    compact: true,
  });

  assert.match(prompt, /严格外部审查员/);
  assert.match(prompt, /具体修改意见/);
  assert.match(prompt, /Round trip works/);
  assert.match(prompt, /CHANGE_REQUESTS/);
  assert.match(prompt, /VERDICT: ITERATE \| DELIVER \| BLOCKED/);
});

test("parseReview extracts explicit verdict, requested changes, and ideas", () => {
  const parsed = parseReview(`
VERDICT: ITERATE
SUMMARY:
- Web loop works but needs persistence.
WHY:
- Missing persistence.
CHANGE_REQUESTS:
- Save GPT review to disk.
IMPROVEMENT_IDEAS:
- Add a dashboard view later.
RISKS:
- Browser UI can change.
NEXT_ACTIONS:
- Save GPT review to disk.
- Parse the verdict.
ACCEPTANCE_CHECKS:
- node --test
DELIVERY_NOTE:
- Continue after persistence is working.
`);

  assert.equal(parsed.verdict, "ITERATE");
  assert.deepEqual(parsed.summary, ["Web loop works but needs persistence."]);
  assert.deepEqual(parsed.why, ["Missing persistence."]);
  assert.deepEqual(parsed.changeRequests, ["Save GPT review to disk."]);
  assert.deepEqual(parsed.improvementIdeas, ["Add a dashboard view later."]);
  assert.deepEqual(parsed.risks, ["Browser UI can change."]);
  assert.deepEqual(parsed.nextActions, ["Save GPT review to disk.", "Parse the verdict."]);
  assert.deepEqual(parsed.acceptanceChecks, ["node --test"]);
  assert.equal(parsed.deliveryNote, "Continue after persistence is working.");
});

test("parseReview handles deliver verdict", () => {
  const parsed = parseReview(`
VERDICT: DELIVER
WHY:
- Ready.
NEXT_ACTIONS:
- None
ACCEPTANCE_CHECKS:
- node --test
DELIVERY_NOTE:
- Ship it.
`);

  assert.equal(parsed.verdict, "DELIVER");
  assert.deepEqual(parsed.nextActions, ["None"]);
  assert.deepEqual(parsed.acceptanceChecks, ["node --test"]);
});

test("parseReview handles blocked verdict", () => {
  const parsed = parseReview(`
VERDICT: BLOCKED
WHY:
- Browser login required.
NEXT_ACTIONS:
- Ask user to log in.
ACCEPTANCE_CHECKS:
- Retry after login.
DELIVERY_NOTE:
- Waiting for browser login.
`);

  assert.equal(parsed.verdict, "BLOCKED");
  assert.deepEqual(parsed.nextActions, ["Ask user to log in."]);
});

test("parseReview handles explicit verdict with missing sections", () => {
  const parsed = parseReview("VERDICT: ITERATE\n需要继续验证网页闭环。");

  assert.equal(parsed.verdict, "ITERATE");
  assert.deepEqual(parsed.why, []);
  assert.deepEqual(parsed.changeRequests, []);
  assert.deepEqual(parsed.improvementIdeas, []);
  assert.deepEqual(parsed.risks, []);
  assert.deepEqual(parsed.nextActions, []);
});

test("parseReview treats empty replies as blocked", () => {
  const parsed = parseReview("");

  assert.equal(parsed.verdict, "BLOCKED");
  assert.deepEqual(parsed.nextActions, []);
  assert.equal(parsed.deliveryNote, "");
});

test("parseReview infers non-structured deliver replies", () => {
  const parsed = parseReview("已经 ready，可以交付。");

  assert.equal(parsed.verdict, "DELIVER");
});
