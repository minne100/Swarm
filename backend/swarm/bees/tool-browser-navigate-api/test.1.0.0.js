import { expect, test } from "bun:test"
import { toolBrowserNavigateApiBee } from "./bee.1.0.0.js"

test("tool-browser-navigate-api bee runs obscura command", async () => {
  const context = {
    projectConfig: { localTools: { obscuraCommand: "echo" } },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = toolBrowserNavigateApiBee(context)
  const output = await bee.execute({ type: "ToolCallRequestHoney", payload: { name: "browser.navigate", input: { url: "https://example.com" } } })
  expect(output.resultHoney.payload.ok).toBe(true)
  expect(output.resultHoney.payload.output.includes("navigate --url https://example.com")).toBe(true)
})
