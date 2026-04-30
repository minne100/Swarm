function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney) {
  return {
    operation: "send prompt async request to backend",
    note: "Calls /session/{id}/prompt_async and keeps the same payload for downstream wait step.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.sessionID",
        before: normalizeValue(inputHoney?.payload?.sessionID),
        after: normalizeValue(outputHoney.payload.sessionID),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "send prompt async request to backend",
    note: "Backend request failed before wait-reply step.",
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

export class SendPromptBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    const projectId = payload.projectId
    try {
      await this.context.sendPromptAsync(payload.sessionID, payload.parts)
      const outputHoney = {
        type: "PromptFlowHoney",
        payload,
      }
      return this.context.resolveWithReport(
        "SendPromptBee",
        "prompt sent",
        outputHoney,
        buildSuccessDetail(honey, outputHoney),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "PromptFlowErrorHoney",
        payload: { projectId, detail },
      }
      return this.context.rejectWithReport(
        "SendPromptBee",
        "send prompt failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function sendPromptBee(context) {
  return new SendPromptBee(context)
}
