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

function ensureSession(state, runtime, projectId, title) {
  const id =
    typeof projectId === "string" && projectId
      ? projectId
      : typeof title === "string" && title.trim()
        ? title.trim()
        : `p-${Date.now()}-${Math.floor(Math.random() * 10_000_000)}`
  const linkedSessionID = state.sessionByProject[id]
  if (linkedSessionID && state.sessions[linkedSessionID]) return state.sessions[linkedSessionID]
  const project = state.projects.find((item) => item.id === id) || createProject(state, runtime, title, id)
  const session = {
    id: `s-${Date.now()}-${Math.floor(Math.random() * 10_000_000)}`,
    projectId: project.id,
    title: typeof title === "string" && title.trim() ? title.trim() : project.name,
    createdAt: Date.now(),
    messages: [],
    pending: Promise.resolve(),
  }
  state.sessions[session.id] = session
  state.sessionByProject[project.id] = session.id
  return session
}

function buildSuccessDetail(inputHoney, outputHoney, session) {
  return {
    operation: "ensure backend session",
    note: "Finds or creates project-linked session and injects session id into output payload.",
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
        after: normalizeValue(session.id),
      },
      {
        path: "$.payload.projectId",
        before: normalizeValue(inputHoney?.payload?.projectId),
        after: normalizeValue(session.projectId),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "ensure backend session",
    note: "Session ensure failed due to invalid request or state error.",
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

export class EnsureSessionApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const session = ensureSession(this.context.state, this.context.runtime, payload.projectId, payload.title)
      const outputHoney = {
        type: "SessionReadyHoney",
        payload: {
          sessionID: session.id,
          projectId: session.projectId,
        },
      }
      return this.context.resolveWithReport(
        "EnsureSessionApiBee",
        "session ensured",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, session),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: {
          projectId: payload.projectId,
          detail,
        },
      }
      return this.context.rejectWithReport(
        "EnsureSessionApiBee",
        "ensure session failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function ensureSessionApiBee(context) {
  return new EnsureSessionApiBee(context)
}
