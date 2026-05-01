import { expect, test } from "bun:test"
import { queuePromptAsyncApiBee } from "./bee.1.0.0.js"

test("queue-prompt-async-api bee contract", async () => {
  const started = []
  const session = { pending: Promise.resolve() }
  const context = {
    state: { sessions: { s1: session } },
    projectConfig: {
      api: {
        dances: { submitPrompt: "SubmitPromptApiDance" },
        honeyTypes: { submitPrompt: "SubmitPromptRequestHoney" },
      },
    },
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
  }
  const bee = queuePromptAsyncApiBee(context)
  const output = await bee.execute(
    {
      type: "SubmitPromptAsyncRequestHoney",
      payload: {
        sessionID: "s1",
        parts: [{ type: "text", text: "hello" }],
      },
    },
    {
      startDance(name, options) {
        started.push({ name, options })
        return {
          done: Promise.resolve({
            type: "PromptResultHoney",
            payload: {
              sessionID: "s1",
            },
          }),
        }
      },
    },
  )
  await session.pending
  expect(output.resultHoney.type).toBe("SubmitPromptQueuedHoney")
  expect(output.resultHoney.payload.accepted).toBe(true)
  expect(started.length).toBe(1)
  expect(started[0].name).toBe("SubmitPromptApiDance")
})
