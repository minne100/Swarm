function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, sentAt) {
  return {
    operation: "append user message to backend session history",
    note: "Writes user message into session.messages and timestamps prompt task payload.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.sentAt",
        before: normalizeValue(inputHoney?.payload?.sentAt),
        after: normalizeValue(sentAt),
      },
      {
        path: "$.payload.parts",
        before: normalizeValue(inputHoney?.payload?.parts),
        after: normalizeValue(outputHoney.payload.parts),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "append user message to backend session history",
    note: "Failed to append user message because session is invalid or state write failed.",
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

export class QueueUserMessageApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const message = this.context.appendUserMessage(payload.sessionID, payload.parts)
      const outputHoney = {
        type: "PromptTaskHoney",
        payload: {
          sessionID: payload.sessionID,
          parts: payload.parts,
          sentAt: message.info.time.created,
        },
      }
      return this.context.resolveWithReport(
        "QueueUserMessageApiBee",
        "user message queued",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, message.info.time.created),
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
        "QueueUserMessageApiBee",
        "queue user message failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function queueUserMessageApiBee(context) {
  return new QueueUserMessageApiBee(context)
}
