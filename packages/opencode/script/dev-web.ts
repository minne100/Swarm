#!/usr/bin/env bun

import fs from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const host = "127.0.0.1"
const port = 6904
const staticRoot = path.resolve(root, "packages", "app", "static")
const indexFile = path.join(staticRoot, "index.html")

await fs.access(indexFile).catch(() => {
  console.error(`Static UI entry not found: ${indexFile}`)
  process.exit(1)
})

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(req) {
    const url = new URL(req.url)
    const { pathname } = url

    const rawPath = pathname === "/" ? "/index.html" : pathname
    const relative = path.posix.normalize(decodeURIComponent(rawPath)).replace(/^\/+/, "")
    const resolved = path.resolve(staticRoot, relative)

    if (!resolved.startsWith(staticRoot + path.sep) && resolved !== staticRoot) {
      return new Response("Not Found", { status: 404 })
    }

    const file = Bun.file(resolved)
    if (await file.exists()) return new Response(file)

    const fallback = Bun.file(indexFile)
    return new Response(fallback, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  },
})

console.log("SWARM static web is running")
console.log(`web ui: http://${host}:${server.port}/`)

const shutdown = async () => {
  await server.stop(true)
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
