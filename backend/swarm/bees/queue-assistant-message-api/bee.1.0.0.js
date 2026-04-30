function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, messageID) {
  return {
    operation: "append assistant reply to backend session history",
    note: "Persists assistant text and returns message id for traceability.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.messageID",
        before: normalizeValue(inputHoney?.payload?.messageID),
        after: normalizeValue(messageID),
      },
      {
        path: "$.payload.reply",
        before: normalizeValue(inputHoney?.payload?.reply),
        after: normalizeValue(outputHoney.payload.reply),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "append assistant reply to backend session history",
    note: "Failed to persist assistant message due to session/state issue.",
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
        after: detail,
      },
    ],
  }
}

export class QueueAssistantMessageApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const message = this.context.appendAssistantMessage(payload.sessionID, payload.reply)
      const outputHoney = {
        type: "PromptResultHoney",
        payload: {
          sessionID: payload.sessionID,
          reply: payload.reply,
          messageID: message.id,
        },
      }
      return this.context.resolveWithReport(
        "QueueAssistantMessageApiBee",
        "assistant message queued",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, message.id),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: {
          sessionID: payload.sessionID,
          detail,
        },
      }
      return this.context.rejectWithReport(
        "QueueAssistantMessageApiBee",
        "queue assistant message failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function queueAssistantMessageApiBee(context) {
  return new QueueAssistantMessageApiBee(context)
}
