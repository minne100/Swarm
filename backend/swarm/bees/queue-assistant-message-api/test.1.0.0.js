import { expect, test } from "bun:test"
import { queueAssistantMessageApiBee } from "./bee.1.0.0.js"

test("queue-assistant-message-api bee contract", async () => {
  const context = {
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
    rejectWithReport(_beeName, _summary, errorHoney) {
      return Promise.reject({
        errorHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
    appendAssistantMessage() {
      return { id: "m2" }
    },
  }
  const bee = queueAssistantMessageApiBee(context)
  const output = await bee.execute({
    type: "PromptTaskHoney",
    payload: {
      sessionID: "s1",
      reply: "done",
    },
  })
  expect(output.resultHoney.type).toBe("PromptResultHoney")
  expect(output.resultHoney.payload.messageID).toBe("m2")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
