function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, reply) {
  return {
    operation: "call upstream llm endpoint",
    note: "Sends session conversation to configured LLM and writes returned assistant text into payload.reply.",
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

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "call upstream llm endpoint",
    note: "Upstream call failed due to HTTP/auth/model/config/network issue.",
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

export class CallLlmApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const reply = await this.context.callLLM(payload.sessionID)
      const outputHoney = {
        type: "PromptTaskHoney",
        payload: {
          ...payload,
          reply,
        },
      }
      return this.context.resolveWithReport(
        "CallLlmApiBee",
        "llm replied",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, reply),
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
        "CallLlmApiBee",
        "llm call failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function callLlmApiBee(context) {
  return new CallLlmApiBee(context)
}
