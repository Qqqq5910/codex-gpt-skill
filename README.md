# Codex ChatGPT Web Review Skill

A Codex skill for routing finished work through ChatGPT Web as an external reviewer, then iterating until ChatGPT returns `VERDICT: DELIVER`.

This avoids the OpenAI API path and reuses a logged-in ChatGPT web session. It is useful for ChatGPT Plus users who want a browser-based review loop without API billing.

## Install

Copy the skill folder into your Codex skills directory:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/codex-chatgpt-web-review "${CODEX_HOME:-$HOME/.codex}/skills/"
```

Restart Codex if needed so it discovers the skill.

## Use

From the project you want reviewed:

```bash
node "${CODEX_HOME:-$HOME/.codex}/skills/codex-chatgpt-web-review/scripts/prepareWebReview.mjs" --compact --copy \
  --summary "what Codex changed" \
  --changed "src/example.ts: changed behavior" \
  --verification "node --test passed" \
  --focus "implementation quality" \
  --focus "missing edge cases" \
  --review-depth thorough
```

Paste the prompt into ChatGPT Web. After ChatGPT replies, copy its response and run:

```bash
node "${CODEX_HOME:-$HOME/.codex}/skills/codex-chatgpt-web-review/scripts/saveWebReview.mjs" --from-clipboard
```

If the verdict is `ITERATE`, implement the advice and continue:

```bash
node "${CODEX_HOME:-$HOME/.codex}/skills/codex-chatgpt-web-review/scripts/continueWebReview.mjs" --compact --copy \
  --summary "what changed after the previous advice" \
  --verification "node --test passed" \
  --focus "remaining risks"
```

If ChatGPT Web gets stuck thinking or reloads to a blank conversation, refresh the page and resend the same prompt:

```bash
node "${CODEX_HOME:-$HOME/.codex}/skills/codex-chatgpt-web-review/scripts/retryWebReview.mjs" --copy
```

## State Files

The scripts write review state under the current working directory:

- `runs/latest.json`: current mode, iteration, verdict, next actions, timestamps, and recovery metadata
- `runs/<timestamp>/prompt.md`: prompt sent to ChatGPT
- `runs/<timestamp>/review.md`: raw ChatGPT reply
- `runs/<timestamp>/review.json`: parsed verdict and advice
- `runs/<timestamp>/failure.json`: failure details when a web attempt fails

Parsed advice includes required changes, optional improvement ideas, risks, next actions, acceptance checks, and the delivery note. The structure is fixed for parsing; the advice content should be specific to the current task.

## Test

```bash
node --test
```

## Limitations

ChatGPT Web is not an official automation API. Browser UI state can fail, hang, or change. For production-grade reliability, use an official API integration instead. This skill includes retry and failure recovery because Web UI automation is inherently less stable.
