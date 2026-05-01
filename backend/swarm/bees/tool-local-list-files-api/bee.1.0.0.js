import path from "node:path"

function normalizeRoot(root) {
  return path.resolve(import.meta.dir, root)
}

export class ToolLocalListFilesApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const root = normalizeRoot(this.context.projectConfig?.localTools?.workspaceRoot || "../..")
      const dir = path.resolve(root, payload.input?.dir || ".")
      if (!dir.startsWith(root)) throw new Error("path out of workspace root")
      const lines = await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: dir, onlyFiles: false }))
      const outputHoney = {
        type: "ToolCallResultHoney",
        payload: {
          name: payload.name,
          ok: true,
          output: lines.slice(0, 400).join("\n"),
        },
      }
      return this.context.resolveWithReport("ToolLocalListFilesApiBee", "listed files", outputHoney)
    } catch (error) {
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: false, error: error instanceof Error ? error.message : String(error) } }
      return this.context.resolveWithReport("ToolLocalListFilesApiBee", "list files failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolLocalListFilesApiBee(context) {
  return new ToolLocalListFilesApiBee(context)
}
