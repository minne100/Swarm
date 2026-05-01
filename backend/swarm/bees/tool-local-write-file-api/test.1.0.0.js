import { expect, test } from "bun:test"
import { toolLocalWriteFileApiBee } from "./bee.1.0.0.js"

test("tool-local-write-file-api bee writes file", async () => {
  const root = `/tmp/swarm-write-${Date.now()}`
  const context = {
    projectConfig: { localTools: { workspaceRoot: root } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolLocalWriteFileApiBee(context)
  const output = await bee.execute({
    type: "ToolCallRequestHoney",
    payload: { name: "local.write_file", input: { path: "out.txt", content: "ok" } },
  })
  expect(output.resultHoney.payload.ok).toBe(true)
  expect(await Bun.file(`${root}/out.txt`).text()).toBe("ok")
})
