import { expect, test } from "bun:test"
import { buildPromptPartsBee } from "./bee.1.0.0.js"

test("build-prompt-parts bee success contract", async () => {
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
    async fileToDataUrl(file) {
      return `data:text/plain;base64,${file.name}`
    },
  }
  const bee = buildPromptPartsBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: {
      projectId: "p1",
      userText: "hello",
      files: [{ name: "a.txt", type: "text/plain" }],
    },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.resultHoney.payload.parts.length).toBe(2)
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
