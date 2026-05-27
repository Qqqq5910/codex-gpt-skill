const DEFAULT_OBJECTIVE =
  "Build a reliable Codex-to-ChatGPT web review loop: Codex sends completed work to ChatGPT, ChatGPT reviews and suggests next actions, Codex iterates until the work is ready to deliver.";

export function buildReviewPrompt({
  objective = DEFAULT_OBJECTIVE,
  artifactSummary = "",
  changedFiles = [],
  verification = [],
  knownIssues = [],
  reviewFocus = [],
  reviewDepth = "thorough",
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
      reviewFocus,
      reviewDepth,
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
    "## Review Focus",
    formatList(reviewFocus),
    "",
    "## Review Depth",
    cleanBlock(reviewDepth || "thorough"),
    "",
    "## Prior GPT Advice",
    cleanBlock(priorAdvice || "None."),
    "",
    "## Required Output Format",
    "Return concise, actionable Chinese unless the evidence requires exact English identifiers.",
    "Do not rubber-stamp the work. Give concrete modification suggestions when improvement is possible.",
    "For each requested change, name the affected file, behavior, command, or user workflow when the evidence allows it.",
    "If the work is deliverable, still include optional improvement ideas when they would help future iterations.",
    "",
    "VERDICT: ITERATE | DELIVER | BLOCKED",
    "SUMMARY:",
    "- what changed and what is still uncertain",
    "WHY:",
    "- one to three concrete reasons",
    "CHANGE_REQUESTS:",
    "- required modifications Codex should make before delivery; write None only when no required change remains",
    "IMPROVEMENT_IDEAS:",
    "- optional next-level improvements, refactors, UX polish, docs, tests, or reliability ideas",
    "RISKS:",
    "- concrete risks, edge cases, or missing evidence",
    "NEXT_ACTIONS:",
    "- ordered actions Codex should take next; write None only if VERDICT is DELIVER and no action remains",
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
  reviewFocus,
  reviewDepth,
  priorAdvice,
}) {
  return [
    "你是 Codex 的严格外部审查员。请判断当前成果是否还能继续迭代，并给出具体修改意见。",
    "不要只给固定结论。只要还有可改进空间，就指出具体文件、行为、命令、交互或文档应该怎么改。",
    "如果已经可交付，也要给出可选优化建议；不要编造问题，证据不足时明确说缺什么证据。",
    "",
    `目标：${cleanBlock(objective)}`,
    `当前成果：${cleanBlock(artifactSummary || "未提供。")}`,
    `相关文件：${inlineList(changedFiles)}`,
    `已验证：${inlineList(verification)}`,
    `已知限制：${inlineList(knownIssues)}`,
    `审查重点：${inlineList(reviewFocus)}`,
    `审查深度：${cleanBlock(reviewDepth || "thorough")}`,
    `此前建议：${cleanBlock(priorAdvice || "无。")}`,
    "",
    "请只按以下格式用中文回复：",
    "VERDICT: ITERATE | DELIVER | BLOCKED",
    "SUMMARY:",
    "- 当前成果概括和不确定点",
    "WHY:",
    "- 1-3条理由",
    "CHANGE_REQUESTS:",
    "- 必须修改的点；没有则写 None",
    "IMPROVEMENT_IDEAS:",
    "- 可选优化建议，越具体越好",
    "RISKS:",
    "- 风险、边界情况、缺失证据",
    "NEXT_ACTIONS:",
    "- Codex 下一步动作；如果可交付且无动作则写 None",
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
    summary: extractSectionBullets(raw, "SUMMARY"),
    why: extractSectionBullets(raw, "WHY"),
    changeRequests: extractSectionBullets(raw, "CHANGE_REQUESTS"),
    improvementIdeas: extractSectionBullets(raw, "IMPROVEMENT_IDEAS"),
    risks: extractSectionBullets(raw, "RISKS"),
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
