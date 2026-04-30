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

export async function loadBrowserProjectResources(options = {}) {
  return {
    projectConfig,
    beeDescriptors: await loadBeeDescriptors(options.moduleLoader),
    dances: await loadDances(),
  }
}