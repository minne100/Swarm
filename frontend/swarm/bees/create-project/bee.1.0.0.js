function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, previousActiveProjectId, createdName) {
  return {
    operation: "create project from frontend",
    note: "Calls backend /api/projects, prepends new project in local state, and switches active project.",
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
        after: normalizeValue(outputHoney.payload.projectId),
      },
      {
        path: "$state.activeProjectId",
        before: normalizeValue(previousActiveProjectId),
        after: normalizeValue(outputHoney.payload.projectId),
      },
      {
        path: "$state.projects[0].name",
        before: null,
        after: normalizeValue(createdName),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, errorHoney, detail) {
  return {
    operation: "create project from frontend",
    note: "Backend project creation request failed.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: errorHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: errorHoney.type,
      },
      {
        path: "$.payload.detail",
        before: normalizeValue(inputHoney?.payload?.detail),
        after: detail,
      },
    ],
  }
}

export class CreateProjectBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const index = this.context.state.projects.length + 1
    const requestedName = honey?.payload?.name
    const fallbackName = `Project ${index}`
    const name = typeof requestedName === "string" && requestedName.trim() ? requestedName.trim() : fallbackName
    try {
      const created = await this.context.request("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      const id = created?.id
      if (!id) throw new Error("backend did not return project id")
      const projectName = created?.name || name
      const previousActiveProjectId = this.context.state.activeProjectId
      this.context.state.projects.unshift({ id, name: projectName })
      this.context.state.activeProjectId = id
      this.context.state.messages[id] = [{ role: "ai", content: `Project created: ${projectName}` }]
      const outputHoney = {
        type: "ProjectChangedHoney",
        payload: { projectId: id },
      }
      return this.context.resolveWithReport(
        "CreateProjectBee",
        "created project",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, previousActiveProjectId, projectName),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "PromptFlowErrorHoney",
        payload: { detail },
      }
      return this.context.rejectWithReport(
        "CreateProjectBee",
        "create project failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function createProjectBee(context) {
  return new CreateProjectBee(context)
}
