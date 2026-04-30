function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, previousProjectId, projectId) {
  return {
    operation: "switch active project",
    note: "Validates project existence, updates activeProjectId, and ensures message bucket.",
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
        path: "$state.activeProjectId",
        before: normalizeValue(previousProjectId),
        after: normalizeValue(projectId),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, projectId, detail) {
  return {
    operation: "switch active project",
    note: "Project id does not exist in state.projects.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.message",
        before: normalizeValue(inputHoney?.payload?.message),
        after: detail,
      },
      {
        path: "$.payload.projectId",
        before: normalizeValue(inputHoney?.payload?.projectId),
        after: normalizeValue(projectId),
      },
    ],
  }
}

export class SetActiveProjectBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const projectId = honey?.payload?.projectId
    const exists = this.context.state.projects.some((item) => item.id === projectId)
    if (!exists) {
      const detail = `project not found: ${projectId}`
      const errorHoney = {
        type: "ErrorHoney",
        payload: { message: detail },
      }
      return this.context.rejectWithReport(
        "SetActiveProjectBee",
        "project not found",
        errorHoney,
        buildFailureDetail(honey, errorHoney, projectId, detail),
      )
    }
    const previousProjectId = this.context.state.activeProjectId
    this.context.state.activeProjectId = projectId
    this.context.ensureProjectMessages(projectId)
    const outputHoney = {
      type: "ProjectChangedHoney",
      payload: { projectId },
    }
    return this.context.resolveWithReport(
      "SetActiveProjectBee",
      "active project switched",
      outputHoney,
      buildSuccessDetail(honey, outputHoney, previousProjectId, projectId),
    )
  }

  destroy() {}
}

export function setActiveProjectBee(context) {
  return new SetActiveProjectBee(context)
}
