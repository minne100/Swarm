import { expect, test } from "bun:test"
import { queueUserMessageApiBee } from "./bee.1.0.0.js"

test("queue-user-message-api bee contract", async () => {
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
    appendUserMessage() {
      return {
        info: { time: { created: 10 } },
      }
    },
  }
  const bee = queueUserMessageApiBee(context)
  const output = await bee.execute({
    type: "SubmitPromptRequestHoney",
    payload: {
      sessionID: "s1",
      parts: [{ type: "text", text: "hello" }],
    },
  })
  expect(output.resultHoney.type).toBe("PromptTaskHoney")
  expect(output.resultHoney.payload.sessionID).toBe("s1")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
