#!/usr/bin/env bun
import path from "node:path"
import { existsSync, readFileSync } from "node:fs"

function arg(name, fallback = "") {
  const idx = process.argv.indexOf(name)
  return idx >= 0 ? process.argv[idx + 1] || "" : fallback
}

const planFileRaw = arg("--plan-file")
const maxChars = Number(arg("--max-chars", "12000"))
if (!planFileRaw) throw new Error("--plan-file is required")
const planFile = path.resolve(planFileRaw)
if (!existsSync(planFile)) throw new Error(`Plan file not found: ${planFile}`)
let content = readFileSync(planFile, "utf8").replace(/\r\n/g, "\n").trim()
const suffix = "\n\n[文档内容过长，已截断显示。完整文件见上方路径。]"
if (content.length > maxChars) {
  const keep = Math.max(0, maxChars - suffix.length)
  content = `${content.slice(0, keep)}${suffix}`
}
const prompt = `请先审查以下拆解文档，再选择操作。\n文件路径：${planFile}\n\n--- 文档内容开始 ---\n${content}\n--- 文档内容结束 ---\n\n请选择：确认 或 修改`
console.log(prompt)
