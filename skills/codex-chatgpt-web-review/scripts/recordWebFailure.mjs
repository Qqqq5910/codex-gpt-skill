#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { buildFailureUpdate } from "./failureState.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const latest = JSON.parse(await readFile("runs/latest.json", "utf8"));
  const failedAt = new Date().toISOString();
  const failure = buildFailureUpdate(latest, {
    reason: args.reason,
    details: args.details,
    now: failedAt,
  });
  const failureDir = latest.status === "prompt_prepared" && latest.runDir
    ? latest.runDir
    : resolve("runs", `failure-${safeTimestamp(failedAt)}`);
  const failurePath = resolve(failureDir, "failure.json");

  await mkdir(failureDir, { recursive: true });
  await writeFile(failurePath, JSON.stringify(failure, null, 2), "utf8");
  await writeFile(
    "runs/latest.json",
    JSON.stringify(
      {
        ...failure,
        failurePath,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Recorded web review failure: ${args.reason || "unspecified web UI failure"}`);
  console.log(`Recommended next mode: ${failure.recommendedMode}`);
  console.log(`Failure written: ${failurePath}`);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--reason") args.reason = argv[++index] || "";
    else if (arg === "--details") args.details = argv[++index] || "";
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
  node src/recordWebFailure.mjs --reason "ChatGPT returned an empty response"

Records a failed web review attempt in runs/latest.json. If the failed prompt
used full mode, the next recommended mode is compact. The previous saved
review is preserved as lastGoodRunDir / lastGoodVerdict for recovery.
`.trim());
}

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
