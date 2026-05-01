import { expect, test } from "bun:test"
import { toolBrowserClickApiBee } from "./bee.1.0.0.js"

test("tool-browser-click-api bee runs obscura command", async () => {
  const context = {
    projectConfig: { localTools: { obscuraCommand: "echo" } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolBrowserClickApiBee(context)
  const output = await bee.execute({ type: "ToolCallRequestHoney", payload: { name: "browser.click", input: { selector: "#ok" } } })
  expect(output.resultHoney.payload.ok).toBe(true)
  expect(output.resultHoney.payload.output.includes("click --selector #ok")).toBe(true)
})
