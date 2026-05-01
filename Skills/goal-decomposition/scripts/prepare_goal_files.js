#!/usr/bin/env bun
import path from "node:path"
import { mkdirSync, readdirSync } from "node:fs"

function arg(name) {
  const idx = process.argv.indexOf(name)
  return idx >= 0 ? process.argv[idx + 1] || "" : ""
}

const projectRootRaw = arg("--project-root")
if (!projectRootRaw) throw new Error("--project-root is required")
const root = path.resolve(projectRootRaw)
const docsDir = path.resolve(root, "docs", "goal-decomposition")
mkdirSync(docsDir, { recursive: true })
const version =
  readdirSync(docsDir)
    .map((name) => name.match(/_version_(\d+)\.md$/i))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .reduce((max, n) => (n > max ? n : max), 0) + 1
const now = new Date()
const pad = (n) => String(n).padStart(2, "0")
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
const planFile = path.resolve(docsDir, `${stamp}_version_${version}.md`)
const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
console.log(
  JSON.stringify({
    project_root: root,
    docs_dir: docsDir,
    version,
    timestamp: iso,
    plan_file: planFile,
  }),
)
