import { expect, test } from "bun:test"
import { renderProjectListBee } from "./bee.1.0.0.js"

test("render-project-list bee contract", async () => {
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
    renderProjectList() {
      rendered += 1
    },
  }
  const bee = renderProjectListBee(context)
  const output = await bee.execute({
    type: "ProjectChangedHoney",
    payload: { projectId: "p1" },
  })
  expect(output.resultHoney.type).toBe("RenderedHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(rendered).toBe(1)
})
