import { expect, test } from "bun:test"
import { setActiveProjectBee } from "./bee.1.0.0.js"

test("set-active-project bee success contract", async () => {
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
    state: {
      projects: [{ id: "p1", name: "A" }, { id: "p2", name: "B" }],
      activeProjectId: "p1",
      messages: { p1: [] },
    },
    ensureProjectMessages(projectId) {
      if (!this.state.messages[projectId]) this.state.messages[projectId] = []
    },
  }
  const bee = setActiveProjectBee(context)
  const output = await bee.execute({
    type: "SelectProjectHoney",
    payload: { projectId: "p2" },
  })
  expect(output.resultHoney.type).toBe("ProjectChangedHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.state.activeProjectId).toBe("p2")
})

test("set-active-project bee reject contract", async () => {
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
    state: {
      projects: [{ id: "p1", name: "A" }],
      activeProjectId: "p1",
      messages: { p1: [] },
    },
    ensureProjectMessages() {},
  }
  const bee = setActiveProjectBee(context)
  const error = await bee
    .execute({
      type: "SelectProjectHoney",
      payload: { projectId: "p404" },
    })
    .catch((err) => err)
  expect(error.errorHoney.type).toBe("ErrorHoney")
  expect(error.reportHoney.type).toBe("BeeReportHoney")
})
