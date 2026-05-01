import { projectBeeDefinitions, projectConfig, projectDanceFiles } from "./project.js"

async function loadBeeDescriptors(moduleLoader = (path) => import(path)) {
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
