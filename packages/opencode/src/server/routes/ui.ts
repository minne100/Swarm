import { Flag } from "@opencode-ai/core/flag/flag"
import { Hono } from "hono"
import { getMimeType } from "hono/utils/mime"
import fs from "node:fs/promises"
import path from "node:path"

const embeddedUIPromise = Flag.OPENCODE_DISABLE_EMBEDDED_WEB_UI
  ? Promise.resolve(null)
  : // @ts-expect-error - generated file at build time
    import("opencode-web-ui.gen.ts").then((module) => module.default as Record<string, string>).catch(() => null)

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' data:; connect-src 'self' data:"

async function resolveLocalDistDir() {
  const candidates = [
    path.resolve(process.cwd(), "packages", "app", "dist"),
    path.resolve(import.meta.dirname, "../../../../app/dist"),
  ]
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate)
      if (stat.isDirectory()) return candidate
    } catch {
      continue
    }
  }
  return null
}

async function readStaticFile(rootDir: string, requestPath: string) {
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\//, "")
  const filePath = path.resolve(rootDir, relativePath)
  if (!filePath.startsWith(rootDir + path.sep) && filePath !== path.join(rootDir, "index.html")) return null
  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) return null
    return filePath
  } catch {
    return null
  }
}

export const UIRoutes = (): Hono =>
  new Hono().all("/*", async (c) => {
    const embeddedWebUI = await embeddedUIPromise
    const requestPath = c.req.path

    if (embeddedWebUI) {
      const match = embeddedWebUI[requestPath.replace(/^\//, "")] ?? embeddedWebUI["index.html"] ?? null
      if (!match) return c.json({ error: "Not Found" }, 404)

      if (await fs.exists(match)) {
        const mime = getMimeType(match) ?? "text/plain"
        c.header("Content-Type", mime)
        if (mime.startsWith("text/html")) {
          c.header("Content-Security-Policy", DEFAULT_CSP)
        }
        return c.body(new Uint8Array(await fs.readFile(match)))
      } else {
        return c.json({ error: "Not Found" }, 404)
      }
    }

    const distDir = await resolveLocalDistDir()
    if (!distDir) {
      return c.text("Web UI bundle not found. Run `bun --cwd packages/app build` or `bun run dev:web`.", 503)
    }

    const file = (await readStaticFile(distDir, requestPath)) ?? (await readStaticFile(distDir, "/index.html"))
    if (!file) return c.json({ error: "Not Found" }, 404)

    const mime = getMimeType(file) ?? "text/plain"
    c.header("Content-Type", mime)
    if (mime.startsWith("text/html")) c.header("Content-Security-Policy", DEFAULT_CSP)
    return c.body(new Uint8Array(await fs.readFile(file)))
  })
