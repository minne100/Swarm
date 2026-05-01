import path from "node:path"

export class ToolLocalSearchTextApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const root = path.resolve(import.meta.dir, this.context.projectConfig?.localTools?.workspaceRoot || "../..")
      const query = String(payload.input?.query || "").trim()
      if (!query) throw new Error("query is required")
      const dir = path.resolve(root, payload.input?.dir || ".")
      if (!dir.startsWith(root)) throw new Error("path out of workspace root")
      const proc = Bun.spawn(["rg", "-n", "--no-heading", query], { cwd: dir, stdout: "pipe", stderr: "pipe" })
      const out = await new Response(proc.stdout).text()
      const err = await new Response(proc.stderr).text()
      const code = await proc.exited
      const output = out || err || ""
      const outputHoney = {
        type: "ToolCallResultHoney",
        payload: {
          name: payload.name,
          ok: code === 0 || code === 1,
          output: output.slice(0, 100_000),
        },
      }
      return this.context.resolveWithReport("ToolLocalSearchTextApiBee", "search text", outputHoney)
    } catch (error) {
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: false, error: error instanceof Error ? error.message : String(error) } }
      return this.context.resolveWithReport("ToolLocalSearchTextApiBee", "search text failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolLocalSearchTextApiBee(context) {
  return new ToolLocalSearchTextApiBee(context)
}
