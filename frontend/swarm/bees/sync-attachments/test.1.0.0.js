import { expect, test } from "bun:test"
import { syncAttachmentsBee } from "./bee.1.0.0.js"

test("sync-attachments bee contract", async () => {
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
    state: { files: [] },
    syncFiles(files) {
      this.state.files = Array.from(files)
    },
  }
  const bee = syncAttachmentsBee(context)
  const output = await bee.execute({
    type: "UpdateAttachmentsHoney",
    payload: { files: [{ name: "a.txt" }] },
  })
  expect(output.resultHoney.type).toBe("AttachmentsChangedHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.state.files.length).toBe(1)
})
