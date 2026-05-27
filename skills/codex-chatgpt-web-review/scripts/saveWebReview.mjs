#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import { parseReview } from "./reviewPrompt.mjs";
import { buildSavedReviewUpdate } from "./saveState.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const latest = JSON.parse(await readFile("runs/latest.json", "utf8"));
  const reviewText = args.fromClipboard ? await readClipboard() : await readInput(args.file);
  const parsed = parseReview(reviewText);
  const mode = latest.mode || (await inferPromptMode(latest.promptPath));

  const reviewPath = `${latest.runDir}/review.md`;
  const parsedPath = `${latest.runDir}/review.json`;

  await writeFile(reviewPath, reviewText.trim() + "\n", "utf8");
  await writeFile(parsedPath, JSON.stringify(parsed, null, 2), "utf8");
  await writeFile(
    "runs/latest.json",
    JSON.stringify(buildSavedReviewUpdate({ ...latest, mode, iteration: Number(latest.iteration || 1) }, parsed, {
      reviewPath,
      parsedPath,
    }), null, 2),
    "utf8",
  );

  console.log(`Review written: ${reviewPath}`);
  console.log(`Verdict: ${parsed.verdict}`);
  if (parsed.nextActions.length > 0) {
    console.log("Next actions:");
    for (const action of parsed.nextActions) {
      console.log(`- ${action}`);
    }
  }
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from-clipboard") args.fromClipboard = true;
    else if (arg === "--file") args.file = argv[++index] || "";
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
  node src/saveWebReview.mjs --from-clipboard
  node src/saveWebReview.mjs --file runs/.../review.md

When neither option is provided, stdin is used.
`.trim());
}

async function readInput(file) {
  if (file) {
    return readFile(file, "utf8");
  }

  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data;
}

async function readClipboard() {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("pbpaste");
    let output = "";
    let error = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      error += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(output);
      else rejectPromise(new Error(error || `pbpaste exited with ${code}`));
    });
  });
}

async function inferPromptMode(promptPath) {
  if (!promptPath) {
    return "unknown";
  }

  try {
    const prompt = await readFile(promptPath, "utf8");
    if (prompt.includes("你是 Codex 的严格外部审查员")) {
      return "compact";
    }
    if (prompt.includes("# External Review Request")) {
      return "full";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
