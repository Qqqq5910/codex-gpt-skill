---
name: codex-chatgpt-web-review
description: Run an iterative Codex-to-ChatGPT Web review loop without using the OpenAI API. Use when the user wants Codex to send work summaries to a logged-in ChatGPT Plus/Free web session, capture ChatGPT's structured VERDICT/NEXT_ACTIONS feedback, iterate until DELIVER, or recover from ChatGPT Web UI failures such as long prompts, stuck thinking, blank pages, or lost conversation views.
---

# Codex ChatGPT Web Review

Use this skill to route Codex work through ChatGPT Web as an external reviewer. It is designed for users who want to reuse their ChatGPT web login instead of using an API key.

This skill should make ChatGPT produce concrete modification advice, not only a fixed approval phrase. Keep the structured sections so Codex can parse them, but make the content specific to the current task.

## Required Setup

- Use the user's logged-in Chrome/ChatGPT session when available.
- Prefer compact prompts for ChatGPT Web reliability.
- Keep all run state in the current project under `runs/`.
- Do not send secrets, API keys, private tokens, or unnecessary local absolute paths to ChatGPT.

The bundled scripts are in this skill's `scripts/` directory. Run them from the target project directory so `runs/` is created next to the user's work.

## Standard Loop

1. Prepare a review prompt and copy it:

```bash
node /path/to/skill/scripts/prepareWebReview.mjs --compact --copy \
  --summary "what Codex changed" \
  --changed "file or behavior" \
  --verification "test or manual check" \
  --focus "implementation quality" \
  --focus "missing edge cases" \
  --review-depth thorough
```

2. Open ChatGPT Web in Chrome, paste the prompt, and send it.

3. When ChatGPT replies, copy the reply and save it:

```bash
node /path/to/skill/scripts/saveWebReview.mjs --from-clipboard
```

4. Inspect `runs/latest.json`.

- If `verdict` is `DELIVER`, report the result to the user.
- If `verdict` is `ITERATE`, implement the next actions, then prepare the next round:

```bash
node /path/to/skill/scripts/continueWebReview.mjs --compact --copy \
  --summary "what Codex changed after GPT advice" \
  --changed "file or behavior" \
  --verification "test or manual check" \
  --focus "remaining risks"
```

- If `verdict` is `BLOCKED`, resolve the blocker or ask the user for the needed input.

## Web UI Failure Recovery

ChatGPT Web is not an official automation API. Treat UI failures as expected operational states.

If ChatGPT is stuck thinking, reloads to a blank conversation view, or loses the response, first retry the same prompt instead of creating a new iteration:

```bash
node /path/to/skill/scripts/retryWebReview.mjs --copy
```

Then refresh ChatGPT Web, paste the copied prompt again, and save the new reply with `saveWebReview.mjs`.

If the attempt is truly failed and should be recorded:

```bash
node /path/to/skill/scripts/recordWebFailure.mjs \
  --reason "ChatGPT Web got stuck thinking" \
  --details "optional details"
```

This writes `failure.json`, preserves `lastGoodRunDir` / `lastGoodVerdict`, and recommends compact mode after full-prompt failures.

## Output Contract

Ask ChatGPT to return this structure:

```text
VERDICT: ITERATE | DELIVER | BLOCKED
SUMMARY:
- current result and uncertain evidence
WHY:
- one to three concrete reasons
CHANGE_REQUESTS:
- required modifications before delivery, or None
IMPROVEMENT_IDEAS:
- optional improvements for quality, UX, docs, tests, reliability, or maintainability
RISKS:
- concrete risks, edge cases, or missing evidence
NEXT_ACTIONS:
- concrete actions, or None if deliverable
ACCEPTANCE_CHECKS:
- checks before delivery
DELIVERY_NOTE:
- one short user-facing delivery sentence
```

`saveWebReview.mjs` parses `verdict`, `summary`, `why`, `changeRequests`, `improvementIdeas`, `risks`, `nextActions`, `acceptanceChecks`, and `deliveryNote` into `runs/latest.json`.

## Operational Notes

- Prefer `retryWebReview.mjs` after stuck thinking; prefer `continueWebReview.mjs` only after a saved `ITERATE` review.
- Use `--focus` to steer GPT toward specific improvement areas instead of generic judgment.
- Use `--review-depth thorough` when the user wants deeper modification advice.
- `continueWebReview.mjs` stops after `DELIVER` unless `--force` is used.
- `prepareWebReview.mjs --auto-mode` uses compact mode after a recorded full-mode failure.
- Run `node --test` in this repository when modifying the bundled scripts.
