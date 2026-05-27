export function buildSavedReviewUpdate(latest, parsed, { reviewPath, parsedPath, savedAt = new Date().toISOString() } = {}) {
  const {
    failureReason,
    failureDetails,
    recommendedMode,
    failedRunDir,
    failedAt,
    failurePath,
    ...base
  } = latest || {};

  return {
    ...base,
    lastFailureReason: base.lastFailureReason || failureReason || "",
    lastFailureDetails: base.lastFailureDetails || failureDetails || "",
    lastFailurePath: base.lastFailurePath || failurePath || "",
    lastFailureAt: base.lastFailureAt || failedAt || "",
    lastFailedRunDir: base.lastFailedRunDir || failedRunDir || "",
    reviewPath,
    parsedPath,
    status: "review_saved",
    verdict: parsed.verdict,
    summary: list(parsed.summary),
    why: list(parsed.why),
    changeRequests: list(parsed.changeRequests),
    improvementIdeas: list(parsed.improvementIdeas),
    risks: list(parsed.risks),
    nextActions: list(parsed.nextActions),
    acceptanceChecks: list(parsed.acceptanceChecks),
    deliveryNote: parsed.deliveryNote,
    savedAt,
  };
}

function list(value) {
  return Array.isArray(value) ? value : [];
}
