import { expect, test } from "bun:test"
import { toolSkillGoalDecompositionApiBee } from "./bee.1.0.0.js"

test("tool-skill-goal-decomposition-api bee contract", async () => {
  const context = {
    getSession() {
      return { projectId: "demo" }
    },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolSkillGoalDecompositionApiBee(context)
  const output = await bee.execute({
    type: "ToolCallRequestHoney",
    payload: {
      sessionID: "s1",
      name: "skills.goal_decomposition.run",
      input: { action: "prepare_goal_files" },
    },
  })
  expect(output.resultHoney.type).toBe("ToolCallResultHoney")
  expect(typeof output.resultHoney.payload.ok).toBe("boolean")
})
