function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, project) {
  return {
    operation: "create backend project entity",
    note: "Creates project in backend state and returns canonical project object.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.project",
        before: normalizeValue(inputHoney?.payload?.project),
        after: normalizeValue(project),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "create backend project entity",
    note: "Project creation failed in backend state layer.",
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

export class CreateProjectApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const project = this.context.createProject(payload.name, payload.projectId)
      const outputHoney = {
        type: "ProjectCreatedHoney",
        payload: { project },
      }
      return this.context.resolveWithReport(
        "CreateProjectApiBee",
        "project created",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, project),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: { detail },
      }
      return this.context.rejectWithReport(
        "CreateProjectApiBee",
        "create project failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function createProjectApiBee(context) {
  return new CreateProjectApiBee(context)
}
