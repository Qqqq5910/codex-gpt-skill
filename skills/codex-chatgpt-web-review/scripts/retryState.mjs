export function buildRetryUpdate(latest, { now = new Date().toISOString() } = {}) {
  if (!latest?.promptPath) {
    throw new Error("runs/latest.json has no promptPath to retry.");
  }

  return {
    ...latest,
    status: "prompt_prepared",
    retryCount: Number(latest.retryCount || 0) + 1,
    retryOfFailurePath: latest.failurePath || latest.retryOfFailurePath || null,
    lastFailureReason: latest.failureReason || latest.lastFailureReason || "",
    lastFailureDetails: latest.failureDetails || latest.lastFailureDetails || "",
    previousStatus: latest.status || latest.previousStatus || null,
    retriedAt: now,
  };
}
