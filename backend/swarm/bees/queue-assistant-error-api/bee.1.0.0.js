function normalizeValue(value) {
  return value === undefined ? null : value
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
    const detail = payload.detail || "request failed"
    const wroteMessage = Boolean(payload.sessionID && this.context.hasSession(payload.sessionID))
    if (wroteMessage) {
      this.context.appendAssistantMessage(payload.sessionID, `Request failed: ${detail}`)
    }
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
