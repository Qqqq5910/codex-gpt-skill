#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { buildReviewPrompt } from "./reviewPrompt.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stdin = await readStdin();
  const previous = await readLatest();
  const mode = selectMode(args, previous);
  const runDir = resolve(args.runDir || `runs/${safeTimestamp()}`);
  const promptPath = resolve(runDir, "prompt.md");
  const metadataPath = resolve("runs/latest.json");

  const prompt = buildReviewPrompt({
    objective: args.objective,
    artifactSummary: args.summary || stdin,
    changedFiles: args.changed,
    verification: args.verification,
    knownIssues: args.issue,
    reviewFocus: args.focus,
    reviewDepth: args.reviewDepth,
    priorAdvice: args.priorAdvice,
    compact: mode === "compact",
  });

  await mkdir(runDir, { recursive: true });
  await mkdir("runs", { recursive: true });
  await writeFile(promptPath, prompt, "utf8");
  await writeFile(
    metadataPath,
    JSON.stringify(
      {
        runDir,
        promptPath,
        mode,
        iteration: Number(previous?.iteration || 0) + 1,
        promptChars: prompt.length,
        reviewFocus: args.focus,
        reviewDepth: args.reviewDepth || "thorough",
        previousStatus: previous?.status || null,
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

  console.log(`Prompt written: ${promptPath}`);
  if (args.copy) {
    console.log("Prompt copied to clipboard.");
  }
}

function parseArgs(argv) {
  const args = {
    changed: [],
    verification: [],
    issue: [],
    focus: [],
    copy: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index] || "";

    if (arg === "--copy") args.copy = true;
    else if (arg === "--compact") args.compact = true;
    else if (arg === "--auto-mode") args.autoMode = true;
    else if (arg === "--objective") args.objective = next();
    else if (arg === "--summary") args.summary = next();
    else if (arg === "--changed") args.changed.push(next());
    else if (arg === "--verification") args.verification.push(next());
    else if (arg === "--issue") args.issue.push(next());
    else if (arg === "--focus") args.focus.push(next());
    else if (arg === "--review-depth") args.reviewDepth = next();
    else if (arg === "--prior-advice") args.priorAdvice = next();
    else if (arg === "--run-dir") args.runDir = next();
    else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node src/prepareWebReview.mjs --summary "what Codex did" --copy

Options:
  --objective TEXT      Overall goal being pursued
  --summary TEXT        Current work summary; stdin is used when omitted
  --changed TEXT        Relevant file or behavior, repeatable
  --verification TEXT   Check already run, repeatable
  --issue TEXT          Known issue or constraint, repeatable
  --focus TEXT          Review focus such as tests, UX, security, docs, repeatable
  --review-depth TEXT   Review depth: fast, normal, thorough, or custom
  --prior-advice TEXT   Previous GPT advice
  --run-dir PATH        Output directory
  --copy                Copy prompt to macOS clipboard
  --compact             Use a shorter prompt for the ChatGPT web UI
  --auto-mode           Use compact after a recorded full-mode web failure
`.trim());
}

async function readLatest() {
  try {
    return JSON.parse(await readFile("runs/latest.json", "utf8"));
  } catch {
    return null;
  }
}

function selectMode(args, previous) {
  if (args.compact) {
    return "compact";
  }
  if (args.autoMode && previous?.status === "review_failed" && previous?.mode === "full") {
    return "compact";
  }
  return "full";
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
