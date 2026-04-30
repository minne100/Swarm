import { expect, test } from "bun:test"
import { renderAttachmentsBee } from "./bee.1.0.0.js"

test("render-attachments bee contract", async () => {
  let rendered = 0
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
    renderAttachments() {
      rendered += 1
    },
  }
  const bee = renderAttachmentsBee(context)
  const output = await bee.execute({
    type: "AttachmentsChangedHoney",
    payload: {},
  })
  expect(output.resultHoney.type).toBe("RenderedHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(rendered).toBe(1)
})
