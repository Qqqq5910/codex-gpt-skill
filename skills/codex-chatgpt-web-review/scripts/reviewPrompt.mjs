const DEFAULT_OBJECTIVE =
  "Build a reliable Codex-to-ChatGPT web review loop: Codex sends completed work to ChatGPT, ChatGPT reviews and suggests next actions, Codex iterates until the work is ready to deliver.";

export function buildReviewPrompt({
  objective = DEFAULT_OBJECTIVE,
  artifactSummary = "",
  changedFiles = [],
  verification = [],
  knownIssues = [],
  priorAdvice = "",
  compact = false,
} = {}) {
  if (compact) {
    return buildCompactReviewPrompt({
      objective,
      artifactSummary,
      changedFiles,
      verification,
      knownIssues,
      priorAdvice,
    });
  }

  return [
    "# External Review Request",
    "",
    "You are ChatGPT acting as a strict external reviewer for Codex.",
    "Review the current work and decide whether Codex should iterate again or deliver to the user.",
    "",
    "## Objective",
    cleanBlock(objective),
    "",
    "## Current Work Summary",
    cleanBlock(artifactSummary || "No summary was provided."),
    "",
    "## Changed / Relevant Files",
    formatList(changedFiles),
    "",
    "## Verification Already Run",
    formatList(verification),
    "",
    "## Known Issues / Constraints",
    formatList(knownIssues),
    "",
    "## Prior GPT Advice",
    cleanBlock(priorAdvice || "None."),
    "",
    "## Required Output Format",
    "Return concise, actionable Chinese unless the evidence requires exact English identifiers.",
    "",
    "VERDICT: ITERATE | DELIVER | BLOCKED",
    "WHY:",
    "- one to three concrete reasons",
    "NEXT_ACTIONS:",
    "- ordered actions Codex should take next; empty only if VERDICT is DELIVER",
    "ACCEPTANCE_CHECKS:",
    "- checks or tests Codex should run before delivery",
    "DELIVERY_NOTE:",
    "- one short sentence Codex can use when reporting back to the user",
  ].join("\n");
}

function buildCompactReviewPrompt({
  objective,
  artifactSummary,
  changedFiles,
  verification,
  knownIssues,
  priorAdvice,
}) {
  return [
    "你是 Codex 的严格外部审查员。请判断当前成果是否还能继续迭代。",
    "",
    `目标：${cleanBlock(objective)}`,
    `当前成果：${cleanBlock(artifactSummary || "未提供。")}`,
    `相关文件：${inlineList(changedFiles)}`,
    `已验证：${inlineList(verification)}`,
    `已知限制：${inlineList(knownIssues)}`,
    `此前建议：${cleanBlock(priorAdvice || "无。")}`,
    "",
    "请只按以下格式用中文回复：",
    "VERDICT: ITERATE | DELIVER | BLOCKED",
    "WHY:",
    "- 1-3条理由",
    "NEXT_ACTIONS:",
    "- 下一步动作；如果可交付则写 None",
    "ACCEPTANCE_CHECKS:",
    "- 交付前检查",
    "DELIVERY_NOTE:",
    "- 给用户的一句话",
  ].join("\n");
}

export function parseReview(text) {
  const raw = String(text || "").trim();
  const explicitVerdict = raw.match(/^\s*VERDICT\s*[:：]\s*(ITERATE|DELIVER|BLOCKED)\b/im)?.[1];
  const verdict = explicitVerdict?.toUpperCase() || inferVerdict(raw);

  return {
    verdict,
    why: extractSectionBullets(raw, "WHY"),
    nextActions: extractSectionBullets(raw, "NEXT_ACTIONS"),
    acceptanceChecks: extractSectionBullets(raw, "ACCEPTANCE_CHECKS"),
    deliveryNote: cleanSectionText(extractSectionText(raw, "DELIVERY_NOTE")),
    raw,
  };
}

function inferVerdict(text) {
  if (!text) {
    return "BLOCKED";
  }
  if (/交付|deliver|ready/i.test(text) && !/继续|iterate|next action|下一步/i.test(text)) {
    return "DELIVER";
  }
  return "ITERATE";
}

function extractSectionBullets(text, sectionName) {
  const section = extractSectionText(text, sectionName);
  if (!section) {
    return [];
  }

  return section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(stripListMarker)
    .filter(Boolean);
}

function extractSectionText(text, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(`^\\s*${escaped}\\s*[:：]?\\s*\\n?([\\s\\S]*?)(?=^\\s*[A-Z_]+\\s*[:：]|(?![\\s\\S]))`, "im"),
  );

  return match?.[1]?.trim() || "";
}

function formatList(items) {
  const clean = items.map((item) => String(item).trim()).filter(Boolean);
  if (clean.length === 0) {
    return "- None.";
  }
  return clean.map((item) => `- ${item}`).join("\n");
}

function inlineList(items) {
  const clean = items.map((item) => String(item).trim()).filter(Boolean);
  return clean.length > 0 ? clean.join("; ") : "无。";
}

function cleanBlock(value) {
  return String(value || "").trim();
}

function cleanSectionText(value) {
  return String(value || "")
    .split("\n")
    .map((line) => stripListMarker(line.trim()))
    .filter(Boolean)
    .join(" ");
}

function stripListMarker(value) {
  return String(value || "")
    .replace(/^[-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}
