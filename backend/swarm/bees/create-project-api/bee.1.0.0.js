import path from "node:path"
import { mkdirSync } from "node:fs"

function normalizeValue(value) {
  return value === undefined ? null : value
}

function ensureProjectDirectory(projectsRoot, projectName) {
  const name = typeof projectName === "string" ? projectName.trim() : ""
  if (!name) throw new Error("project name is required")
  if (name === "." || name === ".." || /[\\/]/.test(name)) throw new Error(`invalid project name: ${projectName}`)
  const target = path.resolve(projectsRoot, name)
  const relative = path.relative(projectsRoot, target)
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`invalid project name: ${projectName}`)
  mkdirSync(target, { recursive: true })
  mkdirSync(path.resolve(target, "sessions"), { recursive: true })
  return target
}

function createProject(state, runtime, name, projectId) {
  const projectName = typeof name === "string" && name.trim() ? name.trim() : `Project ${state.projects.length + 1}`
  const id = typeof projectId === "string" && projectId ? projectId : projectName
  const existing = state.projects.find((item) => item.id === id)
  if (existing) return existing
  ensureProjectDirectory(runtime.projectsRoot, projectName)
  const project = { id, name: projectName, createdAt: Date.now() }
  state.projects.unshift(project)
  return project
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
      const project = createProject(this.context.state, this.context.runtime, payload.name, payload.projectId)
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
