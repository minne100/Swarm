import { expect, test } from "bun:test"
import { toolLocalSearchTextApiBee } from "./bee.1.0.0.js"

test("tool-local-search-text-api bee searches text", async () => {
  const root = `/tmp/swarm-search-${Date.now()}`
  await Bun.write(`${root}/a.txt`, "needle")
  const context = {
    projectConfig: { localTools: { workspaceRoot: root } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolLocalSearchTextApiBee(context)
  const output = await bee.execute({ type: "ToolCallRequestHoney", payload: { name: "local.search_text", input: { query: "needle", dir: "." } } })
  expect(output.resultHoney.payload.ok).toBe(true)
  expect(output.resultHoney.payload.output.includes("needle")).toBe(true)
})
