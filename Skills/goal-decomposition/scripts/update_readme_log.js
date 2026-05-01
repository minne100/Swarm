#!/usr/bin/env bun
import path from "node:path"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

function arg(name, fallback = "") {
  const idx = process.argv.indexOf(name)
  return idx >= 0 ? process.argv[idx + 1] || "" : fallback
}

const projectRootRaw = arg("--project-root")
const changeNoteRaw = arg("--change-note")
const planFileRaw = arg("--plan-file")
const versionRaw = arg("--version")
const status = arg("--status")
const phase = arg("--phase", "拆解阶段")
if (!projectRootRaw) throw new Error("--project-root is required")
if (!changeNoteRaw) throw new Error("--change-note is required")
if (!status) throw new Error("--status is required")
const root = path.resolve(projectRootRaw)
const readme = path.resolve(root, "README.md")
const nowDate = new Date()
const pad = (n) => String(n).padStart(2, "0")
const now = `${nowDate.getFullYear()}-${pad(nowDate.getMonth() + 1)}-${pad(nowDate.getDate())} ${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`
const changeNote = changeNoteRaw.trim() || "(空)"
const planFile = planFileRaw ? path.resolve(planFileRaw) : ""
const relPlan = planFile ? path.relative(root, planFile) || planFile : "(未生成)"
const versionText = versionRaw ? String(versionRaw) : "(未生成)"
const entry = `\n## 需求记录 - ${now}\n\n- 提交时间：${now}\n- 阶段：${phase}\n- 修改意见：${changeNote}\n- 拆解文件：${relPlan}\n- 版本号：${versionText}\n- 状态：${status}\n`
if (!existsSync(readme)) writeFileSync(readme, "# 项目需求记录\n", "utf8")
const current = readFileSync(readme, "utf8")
writeFileSync(readme, `${current.replace(/\s*$/g, "")}\n${entry}`, "utf8")
console.log(readme)
