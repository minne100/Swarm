import { expect, test } from "bun:test"
import { toolLocalListFilesApiBee } from "./bee.1.0.0.js"

test("tool-local-list-files-api bee contract", async () => {
  const context = {
    projectConfig: { localTools: { workspaceRoot: "../../.." } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolLocalListFilesApiBee(context)
  const output = await bee.execute({ type: "ToolCallRequestHoney", payload: { name: "local.list_files", input: { dir: "." } } })
  expect(output.resultHoney.type).toBe("ToolCallResultHoney")
  expect(typeof output.resultHoney.payload.ok).toBe("boolean")
})
