import path from "node:path"

export class ToolSkillReadApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const root = path.resolve(import.meta.dir, this.context.projectConfig?.localTools?.skillsRoot || "../Skills")
      const name = String(payload.input?.name || "").trim()
      if (!name) throw new Error("skill name is required")
      const skillPath = path.resolve(root, name, "SKILL.md")
      if (!skillPath.startsWith(root)) throw new Error("skill path out of root")
      const text = await Bun.file(skillPath).text()
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: true, output: text.slice(0, 100_000) } }
      return this.context.resolveWithReport("ToolSkillReadApiBee", "read skill", outputHoney)
    } catch (error) {
      const outputHoney = { type: "ToolCallResultHoney", payload: { name: payload.name, ok: false, error: error instanceof Error ? error.message : String(error) } }
      return this.context.resolveWithReport("ToolSkillReadApiBee", "read skill failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolSkillReadApiBee(context) {
  return new ToolSkillReadApiBee(context)
}
