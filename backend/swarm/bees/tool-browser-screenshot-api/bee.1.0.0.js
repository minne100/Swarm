export class ToolBrowserScreenshotApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const cmd = this.context.projectConfig?.localTools?.obscuraCommand || "obscura"
      const output = String(payload.input?.output || "./obscura-shot.png").trim()
      const proc = Bun.spawn([cmd, "screenshot", "--output", output], { stdout: "pipe", stderr: "pipe" })
      const out = await new Response(proc.stdout).text()
      const err = await new Response(proc.stderr).text()
      const code = await proc.exited
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: code === 0, output: (out || err).slice(0, 100_000), error: code === 0 ? "" : (err || out || `exit ${code}`) } }
      return this.context.resolveWithReport("ToolBrowserScreenshotApiBee", "obscura screenshot", outputHoney)
    } catch (error) {
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: false, error: error instanceof Error ? error.message : String(error) } }
      return this.context.resolveWithReport("ToolBrowserScreenshotApiBee", "obscura screenshot failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolBrowserScreenshotApiBee(context) {
  return new ToolBrowserScreenshotApiBee(context)
}
