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

export async function loadBunProjectResources(options = {}) {
  await loadDotEnv(options.dotEnvPath)
  const { projectBeeDefinitions, projectConfig, projectDanceFiles } = await import("./project.js")
  return {
    projectConfig,
    beeDescriptors: await loadBeeDescriptors(projectBeeDefinitions, options.moduleLoader),
    dances: await loadDances(projectDanceFiles),
  }
}
