function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, reply) {
  return {
    operation: "queue assistant message into project timeline",
    note: "Pushes assistant reply text into state.messages and writes normalized reply to payload.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.payload.reply",
        before: normalizeValue(inputHoney?.payload?.reply),
        after: normalizeValue(reply),
      },
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
    ],
  }
}

export class QueueAssistantMessageBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    const reply = payload.reply || "Request accepted but no assistant text is available yet."
    this.context.pushMessage(payload.projectId, "ai", reply)
    const outputHoney = {
      type: "PromptFlowHoney",
      payload: {
        ...payload,
        reply,
      },
    }
    return this.context.resolveWithReport(
      "QueueAssistantMessageBee",
      "assistant message queued",
      outputHoney,
      buildSuccessDetail(honey, outputHoney, reply),
    )
  }

  destroy() {}
}

export function queueAssistantMessageBee(context) {
  return new QueueAssistantMessageBee(context)
}
