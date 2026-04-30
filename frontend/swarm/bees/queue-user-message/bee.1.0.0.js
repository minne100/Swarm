function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, userText, files) {
  return {
    operation: "queue user message into project timeline",
    note: "Pushes one user message into state.messages and normalizes outgoing payload fields.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.userText",
        before: normalizeValue(inputHoney?.payload?.userText ?? inputHoney?.payload?.text),
        after: normalizeValue(userText),
      },
      {
        path: "$.payload.files",
        before: normalizeValue(inputHoney?.payload?.files),
        after: normalizeValue(files),
      },
    ],
  }
}

export class QueueUserMessageBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const projectId = honey?.payload?.projectId
    const text = String(honey?.payload?.text || "").trim()
    const files = Array.from(honey?.payload?.files || [])
    const userText = text || "(attachment only)"
    this.context.pushMessage(projectId, "user", userText)
    const outputHoney = {
      type: "PromptFlowHoney",
      payload: { projectId, userText, files },
    }
    return this.context.resolveWithReport(
      "QueueUserMessageBee",
      "queued user message",
      outputHoney,
      buildSuccessDetail(honey, outputHoney, userText, files),
    )
  }

  destroy() {}
}

export function queueUserMessageBee(context) {
  return new QueueUserMessageBee(context)
}
