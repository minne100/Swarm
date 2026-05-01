export class ToolBrowserClickApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const cmd = this.context.projectConfig?.localTools?.obscuraCommand || "obscura"
      const selector = String(payload.input?.selector || "").trim()
      if (!selector) throw new Error("selector is required")
      const proc = Bun.spawn([cmd, "click", "--selector", selector], { stdout: "pipe", stderr: "pipe" })
      const out = await new Response(proc.stdout).text()
      const err = await new Response(proc.stderr).text()
      const code = await proc.exited
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: code === 0, output: (out || err).slice(0, 100_000), error: code === 0 ? "" : (err || out || `exit ${code}`) } }
      return this.context.resolveWithReport("ToolBrowserClickApiBee", "obscura click", outputHoney)
    } catch (error) {
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: false, error: error instanceof Error ? error.message : String(error) } }
      return this.context.resolveWithReport("ToolBrowserClickApiBee", "obscura click failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolBrowserClickApiBee(context) {
  return new ToolBrowserClickApiBee(context)
}
