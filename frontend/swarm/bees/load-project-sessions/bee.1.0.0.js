function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "load project sessions",
    note: "Failed to fetch recent sessions from backend.",
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
        before: null,
        after: detail,
      },
    ],
  }
}

export class LoadProjectSessionsBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const projectId = honey?.payload?.projectId
    try {
      await this.context.loadProjectSessions(projectId)
      const outputHoney = {
        type: "ProjectChangedHoney",
        payload: {
          ...(honey?.payload || {}),
        },
      }
      return this.context.resolveWithReport("LoadProjectSessionsBee", "project sessions loaded", outputHoney)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ErrorHoney",
        payload: { message: detail },
      }
      return this.context.rejectWithReport(
        "LoadProjectSessionsBee",
        "load project sessions failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function loadProjectSessionsBee(context) {
  return new LoadProjectSessionsBee(context)
}
