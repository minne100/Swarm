function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, reply) {
  return {
    operation: "poll assistant reply from backend",
    note: "Polls /session/{id}/message until timeout and writes reply into payload.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.reply",
        before: normalizeValue(inputHoney?.payload?.reply),
        after: normalizeValue(reply),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "poll assistant reply from backend",
    note: "Polling failed due to network error or timeout exception.",
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

export class WaitReplyBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    const projectId = payload.projectId
    try {
      const reply = await this.context.waitAssistantReply(payload.sessionID, payload.sentAt)
      const outputHoney = {
        type: "PromptFlowHoney",
        payload: {
          ...payload,
          reply,
        },
      }
      return this.context.resolveWithReport(
        "WaitReplyBee",
        "assistant reply received",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, reply),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "PromptFlowErrorHoney",
        payload: { projectId, detail },
      }
      return this.context.rejectWithReport(
        "WaitReplyBee",
        "wait reply failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function waitReplyBee(context) {
  return new WaitReplyBee(context)
}
