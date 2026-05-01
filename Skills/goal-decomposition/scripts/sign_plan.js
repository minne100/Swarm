#!/usr/bin/env bun
import path from "node:path"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

function arg(name) {
  const idx = process.argv.indexOf(name)
  return idx >= 0 ? process.argv[idx + 1] || "" : ""
}

const planFileRaw = arg("--plan-file")
const signName = arg("--sign-name")
if (!planFileRaw) throw new Error("--plan-file is required")
if (!signName) throw new Error("--sign-name is required")
const planFile = path.resolve(planFileRaw)
if (!existsSync(planFile)) throw new Error(`Plan file not found: ${planFile}`)
const nowDate = new Date()
const pad = (n) => String(n).padStart(2, "0")
const now = `${nowDate.getFullYear()}-${pad(nowDate.getMonth() + 1)}-${pad(nowDate.getDate())} ${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`
const content = readFileSync(planFile, "utf8")
const signatureBlock = `\n\n## 用户签名\n- 签名：${signName}\n- 签名时间：${now}\n`
writeFileSync(planFile, `${content.replace(/\s*$/g, "")}${signatureBlock}\n`, "utf8")
console.log(planFile)
