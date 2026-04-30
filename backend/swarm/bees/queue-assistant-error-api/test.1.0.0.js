import { expect, test } from "bun:test"
import { queueAssistantErrorApiBee } from "./bee.1.0.0.js"

test("queue-assistant-error-api bee contract", async () => {
  const calls = []
  const context = {
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
    hasSession() {
      return true
    },
    appendAssistantMessage(sessionID, text) {
      calls.push({ sessionID, text })
      return { id: "m1" }
    },
  }
  const bee = queueAssistantErrorApiBee(context)
  const output = await bee.execute({
    type: "ApiErrorHoney",
    payload: { sessionID: "s1", detail: "boom" },
  })
  expect(output.resultHoney.type).toBe("ApiErrorHoney")
  expect(calls.length).toBe(1)
  expect(calls[0].sessionID).toBe("s1")
})
