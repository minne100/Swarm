import { expect, test } from "bun:test"
import { runLocalToolCallsApiBee } from "./bee.1.0.0.js"

test("run-local-tool-calls-api bee executes mapped tool dances", async () => {
  const started = []
  const context = {
    projectConfig: {
      localTools: {
        enabled: true,
        dances: {
          listFiles: "ToolLocalListFilesApiDance",
        },
      },
    },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
    rejectWithReport(_beeName, _summary, errorHoney) {
      return Promise.reject({ errorHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = runLocalToolCallsApiBee(context)
  const output = await bee.execute(
    {
      type: "PromptTaskHoney",
      payload: {
        sessionID: "s1",
        reply: '```tool_calls\n[{"name":"local.list_files","input":{"dir":"."}}]\n```',
      },
    },
    {
      startDance(name, options) {
        started.push({ name, payload: options?.inputHoney?.payload })
        return {
          done: Promise.resolve({
            type: "ToolCallResultHoney",
            payload: { name: "local.list_files", ok: true, output: "a\nb" },
          }),
        }
      },
    },
  )
  expect(started.length).toBe(1)
  expect(started[0].name).toBe("ToolLocalListFilesApiDance")
  expect(output.resultHoney.type).toBe("PromptTaskHoney")
  expect(output.resultHoney.payload.reply.includes("[local-tool-results]")).toBe(true)
  expect(output.resultHoney.payload.toolCalls.length).toBe(1)
})
