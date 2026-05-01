import { expect, test } from "bun:test"
import { callLlmApiBee } from "./bee.1.0.0.js"

test("call-llm-api bee contract", async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (_url, init) => {
    requests.push(init)
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: { content: "ok" },
          },
        ],
      }),
      { status: 200 },
    )
  }
  const context = {
    state: {
      sessions: {
        s1: {
          id: "s1",
          messages: [
            { parts: [{ type: "text", text: "hello" }], info: { role: "user" } },
            {
              parts: [
                {
                  type: "file",
                  filename: "payload.json",
                  mime: "application/json",
                  url: `data:application/json;base64,${Buffer.from(JSON.stringify({ a: 1, b: "x" })).toString("base64")}`,
                },
              ],
              info: { role: "user" },
            },
          ],
        },
      },
    },
    llmConfig: {
      baseUrl: "https://example.com",
      apiKey: "test",
      model: "gpt-test",
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
  const bee = callLlmApiBee(context)
  const output = await bee
    .execute({
      type: "PromptTaskHoney",
      payload: { sessionID: "s1" },
    })
    .finally(() => {
      globalThis.fetch = originalFetch
    })
  expect(output.resultHoney.type).toBe("PromptTaskHoney")
  expect(output.resultHoney.payload.reply).toBe("ok")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(requests.length).toBe(1)
  const posted = JSON.parse(String(requests[0].body || "{}"))
  expect(posted.messages.length).toBe(2)
  expect(posted.messages[1].content.includes("payload.json")).toBe(true)
  expect(posted.messages[1].content.includes('"a":1')).toBe(true)
})

test("call-llm-api sends image and audio parts when multimodal is enabled", async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (_url, init) => {
    requests.push(init)
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: { content: "ok" },
          },
        ],
      }),
      { status: 200 },
    )
  }
  const context = {
    state: {
      sessions: {
        s2: {
          id: "s2",
          messages: [
            {
              parts: [
                { type: "text", text: "look and listen" },
                {
                  type: "file",
                  filename: "cat.png",
                  mime: "image/png",
                  url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6r9nQAAAAASUVORK5CYII=",
                },
                {
                  type: "file",
                  filename: "voice.wav",
                  mime: "audio/wav",
                  url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA",
                },
              ],
              info: { role: "user" },
            },
          ],
        },
      },
    },
    llmConfig: {
      baseUrl: "https://example.com",
      apiKey: "test",
      model: "gpt-test",
      multimodal: true,
      multimodalImage: true,
      multimodalAudio: true,
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
  const bee = callLlmApiBee(context)
  const output = await bee
    .execute({
      type: "PromptTaskHoney",
      payload: { sessionID: "s2" },
    })
    .finally(() => {
      globalThis.fetch = originalFetch
    })
  expect(output.resultHoney.type).toBe("PromptTaskHoney")
  expect(output.resultHoney.payload.reply).toBe("ok")
  expect(requests.length).toBe(1)
  const posted = JSON.parse(String(requests[0].body || "{}"))
  expect(posted.messages.length).toBe(1)
  expect(Array.isArray(posted.messages[0].content)).toBe(true)
  const content = posted.messages[0].content
  const imagePart = content.find((part) => part.type === "image_url")
  const audioPart = content.find((part) => part.type === "input_audio")
  expect(Boolean(imagePart)).toBe(true)
  expect(Boolean(audioPart)).toBe(true)
  expect(imagePart?.image_url?.url?.startsWith("data:image/png;base64,")).toBe(true)
  expect(audioPart?.input_audio?.format).toBe("wav")
  expect((audioPart?.input_audio?.data || "").length > 0).toBe(true)
})

test("call-llm-api consumes streaming chunks and updates assistant stream message", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    const encoder = new TextEncoder()
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n'))
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'))
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      },
    )
  }
  const streamState = {
    sessions: {
      s3: {
        id: "s3",
        messages: [{ parts: [{ type: "text", text: "hi" }], info: { role: "user" } }],
      },
    },
  }
  const context = {
    state: streamState,
    llmConfig: {
      baseUrl: "https://example.com",
      apiKey: "test",
      model: "gpt-test",
      stream: true,
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
  const bee = callLlmApiBee(context)
  const output = await bee
    .execute({
      type: "PromptTaskHoney",
      payload: { sessionID: "s3" },
    })
    .finally(() => {
      globalThis.fetch = originalFetch
    })
  expect(output.resultHoney.type).toBe("PromptTaskHoney")
  expect(output.resultHoney.payload.reply).toBe("Hello")
  expect(typeof output.resultHoney.payload.messageID).toBe("string")
  const assistant = streamState.sessions.s3.messages.find((item) => item?.info?.role === "assistant")
  expect(Boolean(assistant)).toBe(true)
  expect(assistant.parts[0].text).toBe("Hello")
})
