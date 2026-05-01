import { expect, test } from "bun:test"
import { queueAssistantErrorApiBee } from "./bee.1.0.0.js"

test("queue-assistant-error-api bee contract", async () => {
  const context = {
    state: {
      sessions: {
        s1: {
          id: "s1",
          messages: [],
        },
      },
    },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
    t(key, vars = {}) {
      const table = {
        "errors.llm_insufficient_balance": "余额不足",
        "errors.llm_api_key_invalid": "key无效",
        "errors.llm_rate_limited": "限流",
        "errors.llm_model_unavailable": "模型不可用",
        "errors.llm_network_error": "网络异常",
        "errors.request_failed": `请求失败：${vars.detail || ""}`,
        "errors.unknown": "未知错误",
      }
      return table[key] || key
    },
  }
  const bee = queueAssistantErrorApiBee(context)
  const output = await bee.execute({
    type: "ApiErrorHoney",
    payload: { sessionID: "s1", detail: "boom" },
  })
  expect(output.resultHoney.type).toBe("ApiErrorHoney")
  expect(context.state.sessions.s1.messages.length).toBe(1)
})

test("queue-assistant-error-api maps insufficient balance detail to localized message", async () => {
  const context = {
    state: { sessions: {} },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
    hasSession() {
      return false
    },
    t(key, vars = {}) {
      const table = {
        "errors.llm_insufficient_balance": "余额不足",
        "errors.request_failed": `请求失败：${vars.detail || ""}`,
        "errors.unknown": "未知错误",
      }
      return table[key] || key
    },
  }
  const bee = queueAssistantErrorApiBee(context)
  const output = await bee.execute({
    type: "ApiErrorHoney",
    payload: { sessionID: "s1", detail: "llm request failed (402): insufficient_quota" },
  })
  expect(output.resultHoney.payload.detail).toBe("余额不足")
})
