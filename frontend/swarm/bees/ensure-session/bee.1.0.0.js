function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, sessionID) {
  return {
    operation: "ensure backend session for project",
    note: "Checks project existence, then ensures backend session and writes sessionID into payload.",
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
        after: normalizeValue(sessionID),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "ensure backend session for project",
    note: "Project missing or backend ensure-session request failed.",
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

export class EnsureSessionBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    const projectId = payload.projectId
    const project = this.context.state.projects.find((item) => item.id === projectId)
    if (!project) {
      const detail = `project not found: ${projectId}`
      const errorHoney = {
        type: "PromptFlowErrorHoney",
        payload: {
          projectId,
          detail,
        },
      }
      return this.context.rejectWithReport(
        "EnsureSessionBee",
        "project not found",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
    try {
      const sessionID = await this.context.ensureSession(projectId, project.name)
      const outputHoney = {
        type: "PromptFlowHoney",
        payload: {
          ...payload,
          sessionID,
        },
      }
      return this.context.resolveWithReport(
        "EnsureSessionBee",
        "session ensured",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, sessionID),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "PromptFlowErrorHoney",
        payload: { projectId, detail },
      }
      return this.context.rejectWithReport(
        "EnsureSessionBee",
        "ensure session failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function ensureSessionBee(context) {
  return new EnsureSessionBee(context)
}
