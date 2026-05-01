import path from "node:path"
import { mkdirSync, readdirSync } from "node:fs"
import { loadBunProjectResources } from "./loader.bun.js"
import { bootBunLoadedProject } from "./swarm-hive.js"

function createContractHelpers() {
  return {
    resolveWithReport(beeName, summary, resultHoney, detail = {}) {
      return Promise.resolve({
        resultHoney,
        reportHoney: {
          type: "BeeReportHoney",
          payload: {
            beeName,
            status: "success",
            summary,
            detail,
            timestamp: Date.now(),
          },
        },
      })
    },
    rejectWithReport(beeName, summary, errorHoney, detail = {}) {
      return Promise.reject({
        errorHoney,
        reportHoney: {
          type: "BeeReportHoney",
          payload: {
            beeName,
            status: "error",
            summary,
            detail,
            timestamp: Date.now(),
          },
        },
      })
    },
  }
}

function createID(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000_000)}`
}

function textPart(text) {
  return [{ type: "text", text: typeof text === "string" ? text : "" }]
}

function ensureAssistantTextMessage(message, createdAt = Date.now()) {
  if (!message.info || typeof message.info !== "object") message.info = {}
  message.info.role = "assistant"
  if (!message.info.time || typeof message.info.time !== "object") message.info.time = { created: createdAt }
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    message.parts = textPart("")
    return message
  }
  const first = message.parts[0]
  if (!first || first.type !== "text" || typeof first.text !== "string") {
    message.parts = textPart("")
  }
  return message
}

function normalizeParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return [{ type: "text", text: "" }]
  const normalized = parts
    .map((part) => {
      if (!part || typeof part !== "object") return null
      if (part.type === "text" && typeof part.text === "string") {
        return { type: "text", text: part.text }
      }
      if (part.type === "file") {
        const filename = typeof part.filename === "string" ? part.filename : "file"
        const mime = typeof part.mime === "string" ? part.mime : "application/octet-stream"
        const url = typeof part.url === "string" ? part.url : ""
        return { type: "file", filename, mime, url }
      }
      return null
    })
    .filter(Boolean)
  if (normalized.length > 0) return normalized
  return [{ type: "text", text: "" }]
}

function ensureProjectDirectory(projectsRoot, projectName) {
  const name = typeof projectName === "string" ? projectName.trim() : ""
  if (!name) throw new Error("project name is required")
  if (name === "." || name === ".." || /[\\/]/.test(name)) {
    throw new Error(`invalid project name: ${projectName}`)
  }
  const target = path.resolve(projectsRoot, name)
  const relative = path.relative(projectsRoot, target)
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`invalid project name: ${projectName}`)
  }
  mkdirSync(target, { recursive: true })
  return target
}

function createBackendContext(projectConfig) {
  const projectsRoot = path.resolve(import.meta.dir, "../projects")
  mkdirSync(projectsRoot, { recursive: true })
  const state = structuredClone(projectConfig.initialState || {})
  if (!Array.isArray(state.projects)) state.projects = []
  if (!state.sessions || typeof state.sessions !== "object") state.sessions = {}
  if (!state.sessionByProject || typeof state.sessionByProject !== "object") state.sessionByProject = {}
  const helpers = createContractHelpers()
  function projectsFromDirectory() {
    const entries = readdirSync(projectsRoot, { withFileTypes: true })
    const projects = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        id: entry.name,
        name: entry.name,
        createdAt: 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
    state.projects = projects
    return projects
  }
  return {
    state,
    projectConfig,
    llmConfig: projectConfig.llm || {},
    resolveWithReport: helpers.resolveWithReport,
    rejectWithReport: helpers.rejectWithReport,
    createProject(name, projectId) {
      const projectName =
        typeof name === "string" && name.trim() ? name.trim() : `Project ${state.projects.length + 1}`
      const id = typeof projectId === "string" && projectId ? projectId : projectName
      const existing = state.projects.find((item) => item.id === id)
      if (existing) return existing
      ensureProjectDirectory(projectsRoot, projectName)
      const project = {
        id,
        name: projectName,
        createdAt: Date.now(),
      }
      state.projects.unshift(project)
      return project
    },
    listProjects() {
      return projectsFromDirectory()
    },
    ensureSession(projectId, title) {
      const id = typeof projectId === "string" && projectId ? projectId : createID("p")
      const linkedSessionID = state.sessionByProject[id]
      if (linkedSessionID && state.sessions[linkedSessionID]) return state.sessions[linkedSessionID]
      const project = state.projects.find((item) => item.id === id) || this.createProject(title, id)
      const session = {
        id: createID("s"),
        projectId: project.id,
        title: typeof title === "string" && title.trim() ? title.trim() : project.name,
        createdAt: Date.now(),
        messages: [],
        pending: Promise.resolve(),
      }
      state.sessions[session.id] = session
      state.sessionByProject[project.id] = session.id
      return session
    },
    getSession(sessionID) {
      return state.sessions[sessionID] || null
    },
    getSessionMessage(sessionID, messageID) {
      const session = this.getSession(sessionID)
      if (!session) return null
      return session.messages.find((item) => item.id === messageID) || null
    },
    hasSession(sessionID) {
      return Boolean(state.sessions[sessionID])
    },
    appendUserMessage(sessionID, parts) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      const message = {
        id: createID("m"),
        parts: normalizeParts(parts),
        info: {
          role: "user",
          time: { created: Date.now() },
        },
      }
      session.messages.push(message)
      return message
    },
    appendAssistantMessage(sessionID, replyText) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      const message = {
        id: createID("m"),
        parts: textPart(replyText),
        info: {
          role: "assistant",
          time: { created: Date.now() },
          stream: { done: true },
        },
      }
      session.messages.push(message)
      return message
    },
    beginAssistantStream(sessionID) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      const message = {
        id: createID("m"),
        parts: textPart(""),
        info: {
          role: "assistant",
          time: { created: Date.now() },
          stream: { done: false },
        },
      }
      session.messages.push(message)
      return message
    },
    updateAssistantStream(sessionID, messageID, replyText) {
      const message = this.getSessionMessage(sessionID, messageID)
      if (!message) throw new Error(`assistant stream message not found: ${messageID}`)
      ensureAssistantTextMessage(message)
      message.parts[0].text = typeof replyText === "string" ? replyText : ""
      return message
    },
    finishAssistantStream(sessionID, messageID, replyText) {
      const message = this.updateAssistantStream(sessionID, messageID, replyText)
      message.info.stream = { done: true }
      return message
    },
    failAssistantStream(sessionID, messageID) {
      const message = this.getSessionMessage(sessionID, messageID)
      if (!message) return null
      ensureAssistantTextMessage(message)
      message.info.stream = { done: true, failed: true }
      return message
    },
    listMessages(sessionID, limit) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      const count = Number.isInteger(limit) && limit > 0 ? limit : 80
      if (session.messages.length <= count) return [...session.messages]
      return session.messages.slice(session.messages.length - count)
    },
  }
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  })
}

function responseFromApiHoney(honey) {
  const payload = honey?.payload || {}
  const status = Number.isInteger(payload.status) ? payload.status : 200
  const headers = payload.headers && typeof payload.headers === "object" ? payload.headers : {}
  if (payload.kind === "empty") {
    return new Response(null, {
      status,
      headers,
    })
  }
  if (payload.kind === "text") {
    return new Response(typeof payload.body === "string" ? payload.body : "", {
      status,
      headers,
    })
  }
  return jsonResponse(payload.body || {}, status, headers)
}

function normalizeApiError(error) {
  if (error && typeof error === "object" && error.type === "ApiErrorHoney") {
    return { message: error.payload?.detail || "request failed" }
  }
  if (error && typeof error === "object" && error.errorHoney?.type === "ApiErrorHoney") {
    return { message: error.errorHoney.payload?.detail || "request failed" }
  }
  if (error && typeof error === "object" && error.errorHoney?.payload?.message) {
    return { message: error.errorHoney.payload.message }
  }
  if (error instanceof Error) return { message: error.message }
  return { message: String(error) }
}

function pathFromUrl(url) {
  return new URL(url).pathname
}

function staticResponse(request, config) {
  const root = path.resolve(import.meta.dir, config.server.frontendRoot || "../frontend")
  const indexFile = config.server.indexFile || "index.html"
  const pathname = pathFromUrl(request.url)
  const target = pathname === "/" ? `/${indexFile}` : pathname
  const safePath = path.resolve(root, `.${decodeURIComponent(target)}`)
  if (!safePath.startsWith(root)) return new Response("Forbidden", { status: 403 })
  const file = Bun.file(safePath)
  if (file.size > 0) {
    return new Response(file)
  }
  const fallback = Bun.file(path.resolve(root, indexFile))
  if (fallback.size > 0) return new Response(fallback)
  return new Response("Not Found", { status: 404 })
}

async function runDance(runtime, danceName, inputHoney) {
  const run = runtime.startDance(danceName, inputHoney)
  if (!run) throw new Error(`failed to start dance: ${danceName}`)
  return run.done
}

const loadedProject = await loadBunProjectResources()
const projectConfig = loadedProject.projectConfig
const context = createBackendContext(projectConfig)
const runtime = await bootBunLoadedProject(loadedProject, {
  context,
  autoBootstrap: false,
})

const server = Bun.serve({
  hostname: projectConfig.server.host,
  port: projectConfig.server.port,
  fetch: async (request) => {
    try {
      const bodyText =
        request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS" ? "" : await request.text()
      const finalHoney = await runDance(runtime, projectConfig.api.dances.dispatchRequest, {
        type: projectConfig.api.honeyTypes.dispatchRequest,
        payload: {
          method: request.method,
          url: request.url,
          bodyText,
        },
      })
      if (finalHoney?.type === "HttpApiResponseHoney") return responseFromApiHoney(finalHoney)
      if (finalHoney?.type === "ApiNotHandledHoney") return staticResponse(request, projectConfig)
      return jsonResponse(
        { error: "unexpected api dispatcher output" },
        500,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    } catch (error) {
      const normalized = normalizeApiError(error)
      const status = normalized.message === "invalid JSON body" ? 400 : 500
      return jsonResponse(
        { error: normalized.message },
        status,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    }
  },
})

console.log(`[SwarmBackend] running at http://${server.hostname}:${server.port}`)
