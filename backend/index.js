import path from "node:path"
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
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
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
        return { type: "text", text: `[attachment] ${filename} (${mime})` }
      }
      return null
    })
    .filter(Boolean)
  if (normalized.length > 0) return normalized
  return [{ type: "text", text: "" }]
}

function textFromParts(parts) {
  const list = normalizeParts(parts)
  return list
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n")
}

function createBackendContext(projectConfig) {
  const state = structuredClone(projectConfig.initialState || {})
  if (!Array.isArray(state.projects)) state.projects = []
  if (!state.sessions || typeof state.sessions !== "object") state.sessions = {}
  if (!state.sessionByProject || typeof state.sessionByProject !== "object") state.sessionByProject = {}
  const helpers = createContractHelpers()
  return {
    state,
    resolveWithReport: helpers.resolveWithReport,
    rejectWithReport: helpers.rejectWithReport,
    createProject(name, projectId) {
      const id = typeof projectId === "string" && projectId ? projectId : createID("p")
      const projectName =
        typeof name === "string" && name.trim() ? name.trim() : `Project ${state.projects.length + 1}`
      const existing = state.projects.find((item) => item.id === id)
      if (existing) return existing
      const project = {
        id,
        name: projectName,
        createdAt: Date.now(),
      }
      state.projects.unshift(project)
      return project
    },
    listProjects() {
      return [...state.projects]
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
        parts: [{ type: "text", text: typeof replyText === "string" ? replyText : "" }],
        info: {
          role: "assistant",
          time: { created: Date.now() },
        },
      }
      session.messages.push(message)
      return message
    },
    listMessages(sessionID, limit) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      const count = Number.isInteger(limit) && limit > 0 ? limit : 80
      if (session.messages.length <= count) return [...session.messages]
      return session.messages.slice(session.messages.length - count)
    },
    async callLLM(sessionID) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      const baseUrl = projectConfig?.llm?.baseUrl
      const apiKey = projectConfig?.llm?.apiKey
      const chatPath = projectConfig?.llm?.chatPath || "/v1/chat/completions"
      if (!baseUrl || !apiKey) {
        throw new Error("missing llm.baseUrl or llm.apiKey in backend/project.js (or SWARM_LLM_* env)")
      }
      const model = projectConfig?.llm?.model
      if (!model) {
        throw new Error("missing llm.model in backend/project.js (or SWARM_LLM_MODEL env)")
      }
      const requestUrl = `${String(baseUrl).replace(/\/$/, "")}${String(chatPath).startsWith("/") ? chatPath : `/${chatPath}`}`
      const messages = session.messages
        .map((msg) => {
          const role = msg?.info?.role || msg?.role
          if (role !== "user" && role !== "assistant" && role !== "system") return null
          return {
            role,
            content: textFromParts(msg.parts),
          }
        })
        .filter((item) => item && item.content)
      const body = {
        model,
        messages,
      }
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })
      const text = await response.text()
      if (!response.ok) {
        throw new Error(`llm request failed (${response.status}) url=${requestUrl}: ${text || response.statusText}`)
      }
      const json = !text
        ? {}
        : (() => {
            try {
              return JSON.parse(text)
            } catch {
              const preview = text.slice(0, 160).replace(/\s+/g, " ").trim()
              throw new Error(
                `llm returned non-JSON response url=${requestUrl}, check llm.baseUrl/chatPath (got: ${preview || "empty"})`,
              )
            }
          })()
      const choices = Array.isArray(json.choices) ? json.choices : []
      const choice = choices[0]
      if (typeof choice?.message?.content === "string" && choice.message.content.trim()) {
        return choice.message.content
      }
      if (Array.isArray(choice?.message?.content)) {
        const joined = choice.message.content
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .filter(Boolean)
          .join("\n")
        if (joined.trim()) return joined
      }
      if (typeof json.output_text === "string" && json.output_text.trim()) return json.output_text
      throw new Error("llm response missing assistant text")
    },
    queuePrompt(runtime, sessionID, parts, config) {
      const session = this.getSession(sessionID)
      if (!session) throw new Error(`session not found: ${sessionID}`)
      session.pending = session.pending
        .then(async () => {
          const run = runtime.startDance(config.api.dances.submitPrompt, {
            type: config.api.honeyTypes.submitPrompt,
            payload: {
              sessionID,
              parts: normalizeParts(parts),
            },
          })
          if (!run) throw new Error("submit prompt dance failed to start")
          const finalHoney = await run.done
          if (finalHoney?.type === "ApiErrorHoney" && finalHoney?.payload?.detail) {
            console.warn(`[Backend] prompt failed (${sessionID}): ${finalHoney.payload.detail}`)
          }
        })
        .catch((error) => {
          const detail = error instanceof Error ? error.message : String(error)
          this.appendAssistantMessage(sessionID, `Request failed: ${detail}`)
        })
      return session.pending
    },
  }
}

function parseRequestBody(request) {
  return request
    .text()
    .then((text) => {
      if (!text) return {}
      return JSON.parse(text)
    })
    .catch(() => {
      throw new Error("invalid JSON body")
    })
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

async function handleApiRequest(request, runtime, context, config) {
  const pathname = pathFromUrl(request.url)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }
  if (request.method === "GET" && pathname === "/health") {
    return jsonResponse(
      { ok: true, ts: Date.now() },
      200,
      {
        "Access-Control-Allow-Origin": "*",
      },
    )
  }
  if (request.method === "GET" && pathname === "/api/projects") {
    return jsonResponse(
      { projects: context.listProjects() },
      200,
      {
        "Access-Control-Allow-Origin": "*",
      },
    )
  }
  if (request.method === "POST" && pathname === "/api/projects") {
    const body = await parseRequestBody(request)
    const finalHoney = await runDance(runtime, config.api.dances.createProject, {
      type: config.api.honeyTypes.createProject,
      payload: {
        name: body.name,
        projectId: body.projectId,
      },
    })
    if (finalHoney?.type === "ProjectCreatedHoney") {
      return jsonResponse(
        finalHoney.payload.project,
        201,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    }
    if (finalHoney?.type === "ApiErrorHoney") {
      return jsonResponse(
        { error: finalHoney.payload?.detail || "create project failed" },
        400,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    }
    return jsonResponse(
      { error: "unexpected dance output" },
      500,
      {
        "Access-Control-Allow-Origin": "*",
      },
    )
  }
  if (request.method === "POST" && pathname === "/session") {
    const body = await parseRequestBody(request)
    const finalHoney = await runDance(runtime, config.api.dances.ensureSession, {
      type: config.api.honeyTypes.ensureSession,
      payload: {
        projectId: body.projectId,
        title: body.title,
      },
    })
    if (finalHoney?.type === "SessionReadyHoney") {
      return jsonResponse(
        {
          id: finalHoney.payload.sessionID,
          projectId: finalHoney.payload.projectId,
        },
        200,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    }
    if (finalHoney?.type === "ApiErrorHoney") {
      return jsonResponse(
        { error: finalHoney.payload?.detail || "ensure session failed" },
        400,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    }
    return jsonResponse(
      { error: "unexpected dance output" },
      500,
      {
        "Access-Control-Allow-Origin": "*",
      },
    )
  }
  const promptMatch = pathname.match(/^\/session\/([^/]+)\/prompt_async$/)
  if (request.method === "POST" && promptMatch) {
    const sessionID = decodeURIComponent(promptMatch[1])
    const body = await parseRequestBody(request)
    if (!context.hasSession(sessionID)) {
      return jsonResponse(
        { error: `session not found: ${sessionID}` },
        404,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    }
    context.queuePrompt(runtime, sessionID, body.parts, config)
    return jsonResponse(
      { accepted: true, sessionID },
      202,
      {
        "Access-Control-Allow-Origin": "*",
      },
    )
  }
  const messageMatch = pathname.match(/^\/session\/([^/]+)\/message$/)
  if (request.method === "GET" && messageMatch) {
    const sessionID = decodeURIComponent(messageMatch[1])
    if (!context.hasSession(sessionID)) {
      return jsonResponse(
        { error: `session not found: ${sessionID}` },
        404,
        {
          "Access-Control-Allow-Origin": "*",
        },
      )
    }
    const limitRaw = new URL(request.url).searchParams.get("limit")
    const limit = limitRaw ? Number(limitRaw) : 80
    return jsonResponse(
      {
        messages: context.listMessages(sessionID, Number.isInteger(limit) ? limit : 80),
      },
      200,
      {
        "Access-Control-Allow-Origin": "*",
      },
    )
  }
  return null
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
    const pathname = pathFromUrl(request.url)
    const isApiRoute = pathname.startsWith("/api/") || pathname.startsWith("/session/") || pathname === "/session" || pathname === "/health"
    if (isApiRoute) {
      try {
        const response = await handleApiRequest(request, runtime, context, projectConfig)
        if (response) return response
        return jsonResponse(
          { error: "not found" },
          404,
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
    }
    return staticResponse(request, projectConfig)
  },
})

console.log(`[SwarmBackend] running at http://${server.hostname}:${server.port}`)
