function normalizeValue(value) {
  return value === undefined ? null : value
}

function normalizedDetail(t, rawDetail) {
  const detail = String(rawDetail || "").trim()
  const lower = detail.toLowerCase()
  if (lower.includes("insufficient") || lower.includes("quota") || lower.includes("余额不足") || lower.includes("credit")) {
    return t("errors.llm_insufficient_balance")
  }
  if (
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("apikey")
  ) {
    return t("errors.llm_api_key_invalid")
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return t("errors.llm_rate_limited")
  }
  if (lower.includes("model") && (lower.includes("not found") || lower.includes("not support") || lower.includes("unsupported"))) {
    return t("errors.llm_model_unavailable")
  }
  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("timed out")
  ) {
    return t("errors.llm_network_error")
  }
  return t("errors.request_failed", { detail: detail || t("errors.unknown") })
}

function appendAssistantErrorMessage(state, sessionID, detail) {
  const session = state?.sessions?.[sessionID]
  if (!session) return false
  session.messages.push({
    id: `m-${Date.now()}-${Math.floor(Math.random() * 10_000_000)}`,
    parts: [{ type: "text", text: detail }],
    info: { role: "assistant", time: { created: Date.now() }, stream: { done: true } },
  })
  return true
}

function buildSuccessDetail(inputHoney, outputHoney, detail, wroteMessage) {
  return {
    operation: "persist assistant-visible error text",
    note: "Optionally appends readable error text into session messages and returns ApiErrorHoney.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.detail",
        before: normalizeValue(inputHoney?.payload?.detail),
        after: normalizeValue(detail),
      },
      {
        path: "$state.session.messages[+1]",
        before: null,
        after: wroteMessage ? `Request failed: ${detail}` : null,
      },
    ],
  }
}

export class QueueAssistantErrorApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    const t = typeof this.context.t === "function" ? this.context.t : (key, vars = {}) => (vars.detail ? String(vars.detail) : key)
    const detail = normalizedDetail(t, payload.detail)
    const wroteMessage = payload.sessionID ? appendAssistantErrorMessage(this.context.state, payload.sessionID, detail) : false
    const outputHoney = {
      type: "ApiErrorHoney",
      payload: {
        sessionID: payload.sessionID,
        detail,
      },
    }
    return this.context.resolveWithReport(
      "QueueAssistantErrorApiBee",
      "assistant error queued",
      outputHoney,
      buildSuccessDetail(honey, outputHoney, detail, wroteMessage),
    )
  }

  destroy() {}
}

export function queueAssistantErrorApiBee(context) {
  return new QueueAssistantErrorApiBee(context)
}
