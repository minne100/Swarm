import { bootBrowserLoadedProject } from "./swarm-hive.js"
import { projectBeeDefinitions, projectConfig, projectDanceFiles } from "./project.js"

function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

function renderMessageTemplate(template, vars = {}) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_m, key) =>
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

async function loadBeeDescriptors(moduleLoader = (modulePath) => import(modulePath)) {
  const modules = await Promise.all(projectBeeDefinitions.map((descriptor) => moduleLoader(descriptor.modulePath)))
  return projectBeeDefinitions.map((descriptor, index) => ({
    name: descriptor.name,
    version: descriptor.version,
    create: modules[index][descriptor.factoryExport],
  }))
}

async function loadDanceFile(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`加载 Dance 失败: ${url} (${response.status})`)
  return response.json()
}

async function loadDances() {
  return Promise.all(projectDanceFiles.map((file) => loadDanceFile(new URL(file, import.meta.url))))
}

async function loadMessages(language) {
  const primary = new URL(`./languages/${language}.json`, import.meta.url)
  const fallback = new URL("./languages/en-US.json", import.meta.url)
  const primaryRes = await fetch(primary)
  if (primaryRes.ok) return primaryRes.json()
  const fallbackRes = await fetch(fallback)
  if (!fallbackRes.ok) return {}
  return fallbackRes.json()
}

export async function loadBrowserProjectResources(options = {}) {
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
    beeDescriptors: await loadBeeDescriptors(options.moduleLoader),
    dances: await loadDances(),
  }
}

function createBrowserProjectContext(config, options = {}) {
  const state = cloneValue(config.initialState || {})
  const t = createTranslator(options.messages || config?.i18n?.messages || {})
  const apiBase = options.apiBase || config?.api?.base || "http://127.0.0.1:3000"
  const pollIntervalMs = Number.isInteger(options.pollIntervalMs) ? options.pollIntervalMs : config?.api?.pollIntervalMs ?? 1200
  const helpers = createContractHelpers()
  return {
    state,
    rootDocument: options.rootDocument || null,
    projectConfig: config,
    settings: { apiBase, pollIntervalMs },
    t,
    resolveWithReport: helpers.resolveWithReport,
    rejectWithReport: helpers.rejectWithReport,
    async request(path, init = {}) {
      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      })
      const text = await response.text()
      if (!response.ok) throw new Error(text || `${response.status} ${response.statusText}`)
      if (!text) return null
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    },
  }
}

async function autoBootBrowser() {
  if (typeof document === "undefined") return
  if (globalThis.__SWARM_AUTO_BOOT__ === false) return
  const loadedProject = await loadBrowserProjectResources()
  const context = createBrowserProjectContext(loadedProject.projectConfig, {
    messages: loadedProject.projectConfig?.i18n?.messages || {},
    rootDocument: document,
  })
  await bootBrowserLoadedProject(loadedProject, { context })
}

void autoBootBrowser()
