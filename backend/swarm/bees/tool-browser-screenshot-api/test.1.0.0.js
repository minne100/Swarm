import { expect, test } from "bun:test"
import { toolBrowserScreenshotApiBee } from "./bee.1.0.0.js"

test("tool-browser-screenshot-api bee runs obscura command", async () => {
  const context = {
    projectConfig: { localTools: { obscuraCommand: "echo" } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolBrowserScreenshotApiBee(context)
  const output = await bee.execute({ type: "ToolCallRequestHoney", payload: { name: "browser.screenshot", input: { output: "a.png" } } })
  expect(output.resultHoney.payload.ok).toBe(true)
  expect(output.resultHoney.payload.output.includes("screenshot --output a.png")).toBe(true)
})
