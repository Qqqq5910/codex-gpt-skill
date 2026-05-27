export function canPrepareNextReview(latest, { force = false } = {}) {
  if (!latest || typeof latest !== "object") {
    return { ok: false, reason: "runs/latest.json is missing or invalid." };
  }

  if (force) {
    return { ok: true, reason: "" };
  }

  if (latest.status !== "review_saved") {
    return {
      ok: false,
      reason: `Latest status is ${latest.status || "unknown"}; save a review first or pass --force.`,
    };
  }

  if (latest.verdict === "DELIVER") {
    return { ok: false, reason: "Latest verdict is DELIVER; no next review is needed unless --force is used." };
  }

  if (latest.verdict === "BLOCKED") {
    return { ok: false, reason: "Latest verdict is BLOCKED; resolve the blocker or pass --force." };
  }

  return { ok: true, reason: "" };
}

export function buildContinuationPromptInput({
  latest,
  summary = "",
  changedFiles = [],
  verification = [],
  knownIssues = [],
  reviewFocus = [],
} = {}) {
  const verdict = latest?.verdict || "UNKNOWN";
  const reviewSummary = normalizeList(latest?.summary);
  const why = normalizeList(latest?.why);
  const changeRequests = normalizeList(latest?.changeRequests);
  const improvementIdeas = normalizeList(latest?.improvementIdeas);
  const risks = normalizeList(latest?.risks);
  const nextActions = normalizeList(latest?.nextActions);
  const acceptanceChecks = normalizeList(latest?.acceptanceChecks);
  const deliveryNote = String(latest?.deliveryNote || "").trim();

  const artifactSummary = [
    clean(summary) || "Codex is continuing from the previous ChatGPT review.",
    latest?.runDir ? `Previous run: ${shortRunRef(latest.runDir)}` : "",
    `Previous verdict: ${verdict}`,
  ]
    .filter(Boolean)
    .join("\n");

  const priorAdvice = [
    `Previous verdict: ${verdict}`,
    formatSection("GPT summary", reviewSummary),
    formatSection("GPT reasons", why),
    formatSection("GPT required changes", changeRequests),
    formatSection("GPT optional improvement ideas", improvementIdeas),
    formatSection("GPT risks", risks),
    formatSection("GPT next actions", nextActions),
    formatSection("GPT acceptance checks", acceptanceChecks),
    deliveryNote ? `GPT delivery note: ${deliveryNote}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    artifactSummary,
    changedFiles,
    verification,
    knownIssues,
    reviewFocus,
    priorAdvice,
  };
}

function normalizeList(items) {
  return Array.isArray(items)
    ? items.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function formatSection(title, items) {
  if (items.length === 0) {
    return `${title}: None.`;
  }
  return [`${title}:`, ...items.map((item) => `- ${item}`)].join("\n");
}

function clean(value) {
  return String(value || "").trim();
}

function shortRunRef(runDir) {
  return String(runDir || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .at(-1);
}
