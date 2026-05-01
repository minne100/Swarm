import path from "node:path"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
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

function renderMessageTemplate(template, vars = {}) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_match, key) =>
    vars[key] === undefined || vars[key] === null ? "" : String(vars[key]),
  )
}

function createTranslator(messages = {}) {
  return (key, vars = {}) => {
    const template = messages[key]
    if (typeof template !== "string") return key
    return renderMessageTemplate(template, vars)
  }
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
  mkdirSync(path.resolve(target, "sessions"), { recursive: true })
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
  const t = createTranslator(projectConfig?.i18n?.messages || {})
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
  function sessionsRoot(projectId) {
    return path.resolve(projectsRoot, projectId, "sessions")
  }
  function ensureSessionsRoot(projectId) {
    const root = sessionsRoot(projectId)
    mkdirSync(root, { recursive: true })
    return root
  }
  function appendProjectSessionRecord(projectId, sessionID, userText, assistantText) {
    const root = ensureSessionsRoot(projectId)
    const createdAt = Date.now()
    const id = `${createdAt}-${Math.floor(Math.random() * 10_000_000)}`
    const filePath = path.resolve(root, `${id}.json`)
    const record = {
      id,
      sessionID,
      projectId,
      createdAt,
      messages: [
        {
          role: "user",
          content: typeof userText === "string" ? userText : "",
        },
        {
          role: "assistant",
          content: typeof assistantText === "string" ? assistantText : "",
        },
      ],
    }
    writeFileSync(filePath, JSON.stringify(record))
    return record
  }
  function listProjectSessionRecords(projectId, limit = 5, offset = 0) {
    const root = sessionsRoot(projectId)
    if (!existsSync(root)) {
      return {
        sessions: [],
        nextOffset: offset,
        hasMore: false,
      }
    }
    const files = readdirSync(root)
      .filter((name) => name.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a, "en"))
    const total = files.length
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5
    const selected = files.slice(safeOffset, safeOffset + safeLimit).map((name) => {
      const raw = readFileSync(path.resolve(root, name), "utf8")
      return JSON.parse(raw)
    })
    const nextOffset = safeOffset + selected.length
    return {
      sessions: selected,
      nextOffset,
      hasMore: nextOffset < total,
    }
  }
  function textFromParts(parts) {
    if (!Array.isArray(parts)) return ""
    return parts
      .map((part) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
      .join("\n")
  }
  function parseResponseJson(rawText, requestUrl) {
    if (!rawText) return {}
    try {
      return JSON.parse(rawText)
    } catch {
      throw new Error(`llm returned non-JSON response url=${requestUrl}`)
    }
  }
  function extractReply(json) {
    const choices = Array.isArray(json?.choices) ? json.choices : []
    const first = choices[0]
    if (typeof first?.message?.content === "string" && first.message.content.trim()) return first.message.content
    if (typeof json?.output_text === "string" && json.output_text.trim()) return json.output_text
    return ""
  }
  async function callGoalDecomposition(projectName, userRequirementText) {
    const llmConfig = projectConfig.llm || {}
    if (!llmConfig.baseUrl || !llmConfig.apiKey || !llmConfig.model) {
      return t("goal.fallback", { project: projectName })
    }
    const skillPath = path.resolve(import.meta.dir, "../Skills/goal-decomposition/SKILL.md")
    const skillText = existsSync(skillPath) ? readFileSync(skillPath, "utf8") : ""
    const requestUrl = `${String(llmConfig.baseUrl).replace(/\/$/, "")}${
      String(llmConfig.chatPath || "/v1/chat/completions").startsWith("/")
        ? String(llmConfig.chatPath || "/v1/chat/completions")
        : `/${String(llmConfig.chatPath || "/v1/chat/completions")}`
    }`
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: llmConfig.model,
        stream: false,
        messages: [
          {
            role: "system",
            content: `你是 Swarm 的 goal-decomposition 执行助手。严格遵循以下技能说明：\n\n${skillText}`,
          },
          {
            role: "user",
            content: `${t("goal.first_round_prompt")}\n\n${t("goal.project_title_label", { project: projectName })}\n${t("goal.user_first_message_label", { message: userRequirementText })}`,
          },
        ],
      }),
    })
    if (!response.ok) {
      const fallback = await response.text()
      throw new Error(`goal-decomposition llm request failed: ${fallback || response.statusText}`)
    }
    const reply = extractReply(parseResponseJson(await response.text(), requestUrl))
    return reply || t("goal.fallback", { project: projectName })
  }
  return {
    state,
    projectConfig,
    llmConfig: projectConfig.llm || {},
    resolveWithReport: helpers.resolveWithReport,
    rejectWithReport: helpers.rejectWithReport,
    t,
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
      const id =
        typeof projectId === "string" && projectId
          ? projectId
          : typeof title === "string" && title.trim()
            ? title.trim()
            : createID("p")
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
      const userMessage = [...session.messages].reverse().find((item) => item?.info?.role === "user")
      appendProjectSessionRecord(session.projectId, sessionID, textFromParts(userMessage?.parts), replyText)
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
    listProjectSessions(projectId, limit, offset) {
      return listProjectSessionRecords(projectId, limit, offset)
    },
    shouldTriggerGoalDecomposition(sessionID) {
      const session = this.getSession(sessionID)
      if (!session) return false
      const existing = listProjectSessionRecords(session.projectId, 1, 0)
      if (existing.sessions.length > 0) return false
      const userCount = session.messages.filter((item) => item?.info?.role === "user").length
      const assistantCount = session.messages.filter((item) => item?.info?.role === "assistant").length
      return userCount === 1 && assistantCount === 0
    },
    async runGoalDecompositionFromFirstUserMessage(sessionID) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      const project = this.listProjects().find((item) => item.id === session.projectId)
      if (!project) throw new Error(`project not found: ${session.projectId}`)
      const userMessage = [...session.messages].reverse().find((item) => item?.info?.role === "user")
      const userText = textFromParts(userMessage?.parts)
      const reply = await callGoalDecomposition(project.name, userText)
      return reply
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
