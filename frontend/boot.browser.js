import { bootBrowserLoadedProject } from "./swarm-hive.js"
import { loadBrowserProjectResources } from "./loader.browser.js"

async function autoBootBrowser() {
  if (typeof document === "undefined") return
  if (globalThis.__SWARM_AUTO_BOOT__ === false) return
  const loadedProject = await loadBrowserProjectResources()
  await bootBrowserLoadedProject(loadedProject)
}

void autoBootBrowser()