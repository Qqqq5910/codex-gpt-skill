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
    why: parsed.why,
    nextActions: parsed.nextActions,
    acceptanceChecks: parsed.acceptanceChecks,
    deliveryNote: parsed.deliveryNote,
    savedAt,
  };
}
