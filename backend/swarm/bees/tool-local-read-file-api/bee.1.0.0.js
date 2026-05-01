import path from "node:path"

function resolveFile(root, target) {
  const finalPath = path.resolve(root, target || "")
  if (!finalPath.startsWith(root)) throw new Error("path out of workspace root")
  return finalPath
}

export class ToolLocalReadFileApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const root = path.resolve(import.meta.dir, this.context.projectConfig?.localTools?.workspaceRoot || "../..")
      const filePath = resolveFile(root, payload.input?.path)
      const text = await Bun.file(filePath).text()
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: true, output: text.slice(0, 100_000) } }
      return this.context.resolveWithReport("ToolLocalReadFileApiBee", "read file", outputHoney)
    } catch (error) {
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: false, error: error instanceof Error ? error.message : String(error) } }
      return this.context.resolveWithReport("ToolLocalReadFileApiBee", "read file failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolLocalReadFileApiBee(context) {
  return new ToolLocalReadFileApiBee(context)
}
