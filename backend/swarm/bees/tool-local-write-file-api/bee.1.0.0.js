import path from "node:path"

export class ToolLocalWriteFileApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const root = path.resolve(import.meta.dir, this.context.projectConfig?.localTools?.workspaceRoot || "../..")
      const target = path.resolve(root, payload.input?.path || "")
      if (!target.startsWith(root)) throw new Error("path out of workspace root")
      await Bun.write(target, String(payload.input?.content || ""))
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: true, output: `written: ${target}` } }
      return this.context.resolveWithReport("ToolLocalWriteFileApiBee", "write file", outputHoney)
    } catch (error) {
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: false, error: error instanceof Error ? error.message : String(error) } }
      return this.context.resolveWithReport("ToolLocalWriteFileApiBee", "write file failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolLocalWriteFileApiBee(context) {
  return new ToolLocalWriteFileApiBee(context)
}
