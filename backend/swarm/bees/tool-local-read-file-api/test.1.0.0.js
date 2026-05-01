import { expect, test } from "bun:test"
import { toolLocalReadFileApiBee } from "./bee.1.0.0.js"

test("tool-local-read-file-api bee reads file", async () => {
  const root = `/tmp/swarm-read-${Date.now()}`
  await Bun.write(`${root}/a.txt`, "hello")
  const context = {
    projectConfig: { localTools: { workspaceRoot: root } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolLocalReadFileApiBee(context)
  const output = await bee.execute({ type: "ToolCallRequestHoney", payload: { name: "local.read_file", input: { path: "a.txt" } } })
  expect(output.resultHoney.payload.ok).toBe(true)
  expect(output.resultHoney.payload.output).toBe("hello")
})
