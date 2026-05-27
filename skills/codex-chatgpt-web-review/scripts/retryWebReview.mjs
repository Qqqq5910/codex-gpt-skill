#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import { buildRetryUpdate } from "./retryState.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const latest = JSON.parse(await readFile("runs/latest.json", "utf8"));
  const prompt = await readFile(latest.promptPath, "utf8");
  const updated = buildRetryUpdate(latest);

  await writeFile("runs/latest.json", JSON.stringify(updated, null, 2), "utf8");

  if (args.copy) {
    await copyToClipboard(prompt);
  }

  console.log(`Retry prompt: ${latest.promptPath}`);
  console.log(`Retry count: ${updated.retryCount}`);
  if (args.copy) {
    console.log("Prompt copied to clipboard.");
  }
  console.log("Refresh ChatGPT, paste this prompt again, then save the reply with saveWebReview.");
}

function parseArgs(argv) {
  const args = {
    copy: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--copy") args.copy = true;
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
  node src/retryWebReview.mjs --copy

Copies the last prepared web review prompt again after ChatGPT gets stuck,
reloads, or loses the conversation view. It does not create a new iteration.
`.trim());
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

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
