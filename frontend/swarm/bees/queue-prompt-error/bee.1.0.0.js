function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, detail, projectId) {
  return {
    operation: "queue prompt error as assistant-visible message",
    note: "Pushes readable error guidance to messages and converts flow to PromptFlowHoney for rendering steps.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.projectId",
        before: normalizeValue(inputHoney?.payload?.projectId),
        after: normalizeValue(projectId),
      },
      {
        path: "$.payload.detail",
        before: normalizeValue(inputHoney?.payload?.detail),
        after: normalizeValue(detail),
      },
    ],
  }
}

export class QueuePromptErrorBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const t = typeof this.context.t === "function" ? this.context.t : (_key, vars = {}) => String(vars.detail || "")
    const projectId = honey?.payload?.projectId || this.context.state.activeProjectId
    const detail = honey?.payload?.detail || "unknown error"
    this.context.pushMessage(
      projectId,
      "ai",
      t("errors.backend_request_failed", { detail }),
    )
    const outputHoney = {
      type: "PromptFlowHoney",
      payload: { projectId },
    }
    return this.context.resolveWithReport(
      "QueuePromptErrorBee",
      "error message queued",
      outputHoney,
      buildSuccessDetail(honey, outputHoney, detail, projectId),
    )
  }

  destroy() {}
}

export function queuePromptErrorBee(context) {
  return new QueuePromptErrorBee(context)
}
