export function buildFailureUpdate(latest, { reason = "", details = "", now = new Date().toISOString() } = {}) {
  const safeLatest = latest && typeof latest === "object" ? latest : {};
  const recommendedMode = safeLatest.mode === "full" ? "compact" : safeLatest.mode || "compact";
  const lastGood = findLastGoodReview(safeLatest);

  return {
    ...safeLatest,
    status: "review_failed",
    failureReason: reason || "unspecified web UI failure",
    failureDetails: details || "",
    recommendedMode,
    failedRunDir: safeLatest.runDir || null,
    lastGoodRunDir: lastGood.runDir,
    lastGoodVerdict: lastGood.verdict,
    lastGoodSavedAt: lastGood.savedAt,
    failedAt: now,
  };
}

function findLastGoodReview(latest) {
  if (latest.status === "review_saved") {
    return {
      runDir: latest.runDir || null,
      verdict: latest.verdict || null,
      savedAt: latest.savedAt || null,
    };
  }

  return {
    runDir: latest.lastGoodRunDir || latest.previousRunDir || null,
    verdict: latest.lastGoodVerdict || latest.previousVerdict || null,
    savedAt: latest.lastGoodSavedAt || null,
  };
}
