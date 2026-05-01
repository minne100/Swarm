import { expect, test } from "bun:test"
import { toolSkillReadApiBee } from "./bee.1.0.0.js"

test("tool-skill-read-api bee reads SKILL.md", async () => {
  const root = `/tmp/swarm-skills-${Date.now()}`
  await Bun.write(`${root}/demo/SKILL.md`, "# demo")
  const context = {
    projectConfig: { localTools: { skillsRoot: root } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolSkillReadApiBee(context)
  const output = await bee.execute({ type: "ToolCallRequestHoney", payload: { name: "skills.read", input: { name: "demo" } } })
  expect(output.resultHoney.payload.ok).toBe(true)
  expect(output.resultHoney.payload.output.includes("# demo")).toBe(true)
})
