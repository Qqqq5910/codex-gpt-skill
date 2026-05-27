#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { buildReviewPrompt } from "./reviewPrompt.mjs";
import { buildContinuationPromptInput, canPrepareNextReview } from "./webLoop.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stdin = await readStdin();
  const latest = JSON.parse(await readFile("runs/latest.json", "utf8"));
  const reviewSource = await recoverReviewSource(latest);
  const gate = canPrepareNextReview(reviewSource, { force: args.force });

  if (!gate.ok) {
    throw new Error(gate.reason);
  }

  const mode = selectMode(args, latest);
  const runDir = resolve(args.runDir || `runs/${safeTimestamp()}`);
  const promptPath = resolve(runDir, "prompt.md");
  const promptInput = buildContinuationPromptInput({
    latest: reviewSource,
    summary: args.summary || stdin,
    changedFiles: args.changed,
    verification: args.verification,
    knownIssues: args.issue,
  });
  const prompt = buildReviewPrompt({
    ...promptInput,
    compact: mode === "compact",
  });

  await mkdir(runDir, { recursive: true });
  await writeFile(promptPath, prompt, "utf8");
  await writeFile(
    "runs/latest.json",
    JSON.stringify(
      {
        runDir,
        promptPath,
        mode,
        iteration: Number(latest.iteration || 0) + 1,
        promptChars: prompt.length,
        previousRunDir: reviewSource.runDir || latest.runDir || null,
        previousVerdict: reviewSource.verdict || latest.verdict || null,
        previousStatus: reviewSource.status || latest.status || null,
        recoveredFromFailure: latest.status === "review_failed" ? latest.failurePath || true : false,
        status: "prompt_prepared",
        preparedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  if (args.copy) {
    await copyToClipboard(prompt);
  }

  console.log(`Next prompt written: ${promptPath}`);
  console.log(`Mode: ${mode}`);
  console.log(`Iteration: ${Number(latest.iteration || 0) + 1}`);
  if (args.copy) {
    console.log("Prompt copied to clipboard.");
  }
}

async function recoverReviewSource(latest) {
  if (latest.status !== "review_failed" || !latest.lastGoodRunDir) {
    return latest;
  }

  try {
    const parsed = JSON.parse(await readFile(resolve(latest.lastGoodRunDir, "review.json"), "utf8"));
    return {
      ...parsed,
      status: "review_saved",
      runDir: latest.lastGoodRunDir,
      verdict: parsed.verdict || latest.lastGoodVerdict,
      savedAt: latest.lastGoodSavedAt || null,
    };
  } catch {
    return latest;
  }
}

function parseArgs(argv) {
  const args = {
    changed: [],
    verification: [],
    issue: [],
    copy: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index] || "";

    if (arg === "--copy") args.copy = true;
    else if (arg === "--compact") args.compact = true;
    else if (arg === "--full") args.full = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--summary") args.summary = next();
    else if (arg === "--changed") args.changed.push(next());
    else if (arg === "--verification") args.verification.push(next());
    else if (arg === "--issue") args.issue.push(next());
    else if (arg === "--run-dir") args.runDir = next();
    else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.compact && args.full) {
    throw new Error("Use only one of --compact or --full.");
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node src/continueWebReview.mjs --copy --summary "what Codex changed after GPT advice"

Options:
  --summary TEXT        What Codex changed since the last GPT review; stdin is used when omitted
  --changed TEXT        Relevant file or behavior, repeatable
  --verification TEXT   Check already run, repeatable
  --issue TEXT          Known issue or constraint, repeatable
  --run-dir PATH        Output directory
  --copy                Copy prompt to macOS clipboard
  --compact             Force compact mode
  --full                Force full mode
  --force               Prepare a prompt even after DELIVER/BLOCKED or an unsaved review state
`.trim());
}

function selectMode(args, latest) {
  if (args.compact) {
    return "compact";
  }
  if (args.full) {
    return "full";
  }
  return latest.recommendedMode || latest.mode || "compact";
}

async function readStdin() {
  if (process.stdin.isTTY) {
    return "";
  }

  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data.trim();
}

async function copyToClipboard(text) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("pbcopy");
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`pbcopy exited with ${code}`));
    });
    child.stdin.end(text);
  });
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
