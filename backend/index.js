import path from "node:path"
import { mkdirSync } from "node:fs"
import { bootBunLoadedProject, danceFileToPath } from "./swarm-hive.js"

function createContractHelpers() {
  return {
    resolveWithReport(beeName, summary, resultHoney, detail = {}) {
      return Promise.resolve({
        resultHoney,
        reportHoney: {
          type: "BeeReportHoney",
          payload: { beeName, status: "success", summary, detail, timestamp: Date.now() },
        },
      })
    },
    rejectWithReport(beeName, summary, errorHoney, detail = {}) {
      return Promise.reject({
        errorHoney,
        reportHoney: {
          type: "BeeReportHoney",
          payload: { beeName, status: "error", summary, detail, timestamp: Date.now() },
        },
      })
    },
  }
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

async function loadDotEnv(dotEnvPath = new URL("../.env", import.meta.url)) {
  if (!(await Bun.file(dotEnvPath).exists())) return
  const content = await Bun.file(dotEnvPath).text()
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()])
    .filter((entry) => entry[0])
    .forEach((entry) => {
      if (!process.env[entry[0]]) process.env[entry[0]] = entry[1].replace(/^['"]|['"]$/g, "")
    })
}

async function loadBeeDescriptors(projectBeeDefinitions, moduleLoader = (modulePath) => import(modulePath)) {
  const modules = await Promise.all(projectBeeDefinitions.map((descriptor) => moduleLoader(descriptor.modulePath)))
  return projectBeeDefinitions.map((descriptor, index) => ({
    name: descriptor.name,
    version: descriptor.version,
    create: modules[index][descriptor.factoryExport],
  }))
}

async function loadDances(projectDanceFiles) {
  return Promise.all(projectDanceFiles.map((file) => Bun.file(danceFileToPath(new URL(file, import.meta.url))).json()))
}

async function loadMessages(language) {
  const primary = Bun.file(danceFileToPath(new URL(`./languages/${language}.json`, import.meta.url)))
  if (await primary.exists()) return primary.json()
  const fallback = Bun.file(danceFileToPath(new URL("./languages/en-US.json", import.meta.url)))
  if (await fallback.exists()) return fallback.json()
  return {}
}

async function loadBunProjectResources(options = {}) {
  await loadDotEnv(options.dotEnvPath)
  const { projectBeeDefinitions, projectConfig, projectDanceFiles } = await import("./project.js")
  const language = projectConfig?.i18n?.language || "zh-CN"
  return {
    projectConfig: {
      ...projectConfig,
      i18n: {
        ...(projectConfig.i18n || {}),
        language,
        messages: await loadMessages(language),
      },
    },
    beeDescriptors: await loadBeeDescriptors(projectBeeDefinitions, options.moduleLoader),
    dances: await loadDances(projectDanceFiles),
  }
}

function createBackendContext(projectConfig) {
  const state = structuredClone(projectConfig.initialState || {})
  if (!Array.isArray(state.projects)) state.projects = []
  if (!state.sessions || typeof state.sessions !== "object") state.sessions = {}
  if (!state.sessionByProject || typeof state.sessionByProject !== "object") state.sessionByProject = {}
  const helpers = createContractHelpers()
  const t = createTranslator(projectConfig?.i18n?.messages || {})
  const projectsRoot = path.resolve(import.meta.dir, projectConfig?.runtime?.projectsRoot || "../projects")
  const skillsRoot = path.resolve(import.meta.dir, projectConfig?.localTools?.skillsRoot || "../Skills")
  mkdirSync(projectsRoot, { recursive: true })
  const llmProviders = Array.isArray(projectConfig?.llm?.providers) ? [...projectConfig.llm.providers] : []
  const activeProviderId = projectConfig?.llm?.activeProviderId || llmProviders[0]?.id || ""
  return {
    state,
    projectConfig,
    t,
    runtime: {
      projectsRoot,
      skillsRoot,
      llmProviders,
      activeProviderId,
    },
    resolveWithReport: helpers.resolveWithReport,
    rejectWithReport: helpers.rejectWithReport,
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
  if (payload.kind === "empty") return new Response(null, { status, headers })
  if (payload.kind === "text") return new Response(typeof payload.body === "string" ? payload.body : "", { status, headers })
  return jsonResponse(payload.body || {}, status, headers)
}

function normalizeApiError(error) {
  if (error && typeof error === "object" && error.type === "ApiErrorHoney") return { message: error.payload?.detail || "request failed" }
  if (error && typeof error === "object" && error.errorHoney?.type === "ApiErrorHoney") return { message: error.errorHoney.payload?.detail || "request failed" }
  if (error && typeof error === "object" && error.errorHoney?.payload?.message) return { message: error.errorHoney.payload.message }
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
  if (file.size > 0) return new Response(file)
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
const runtime = await bootBunLoadedProject(loadedProject, { context, awaitBootstrap: true })

const server = Bun.serve({
  hostname: projectConfig.server.host,
  port: projectConfig.server.port,
  fetch: async (request) => {
    try {
      const bodyText = request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS" ? "" : await request.text()
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
      return jsonResponse({ error: "unexpected api dispatcher output" }, 500, { "Access-Control-Allow-Origin": "*" })
    } catch (error) {
      const normalized = normalizeApiError(error)
      const status = normalized.message === "invalid JSON body" ? 400 : 500
      return jsonResponse({ error: normalized.message }, status, { "Access-Control-Allow-Origin": "*" })
    }
  },
})

console.log(`[SwarmBackend] running at http://${server.hostname}:${server.port}`)
