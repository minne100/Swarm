import { danceFileToPath } from "./swarm-hive.js"

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

async function loadBeeDescriptors(projectBeeDefinitions, moduleLoader = (path) => import(path)) {
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

export async function loadBunProjectResources(options = {}) {
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
