import { expect, test } from "bun:test"
import { callLlmApiBee } from "./bee.1.0.0.js"

test("call-llm-api bee contract", async () => {
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
    async callLLM() {
      return "ok"
    },
  }
  const bee = callLlmApiBee(context)
  const output = await bee.execute({
    type: "PromptTaskHoney",
    payload: { sessionID: "s1" },
  })
  expect(output.resultHoney.type).toBe("PromptTaskHoney")
  expect(output.resultHoney.payload.reply).toBe("ok")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
