import { expect, test } from "bun:test"
import { bootstrapRuntimeBee, bootstrapRuntimeInternals } from "./bee.1.0.0.js"

test("bootstrap-runtime providersFromEnv parses indexed providers", () => {
  const providers = bootstrapRuntimeInternals.providersFromEnv({
    SWARM_LLM_NAME1: "OpenRouter",
    SWARM_LLM_BASE_URL1: "https://openrouter.ai/api",
    SWARM_LLM_API_KEY1: "k1",
    SWARM_LLM_MODEL1: "openrouter/model-a",
    SWARM_LLM_TYPE1: "openai-compatible",
    SWARM_LLM_BASE_URL2: "https://example.com/v1",
    SWARM_LLM_API_KEY2: "k2",
    SWARM_LLM_MODEL3: "gemini-flash",
    SWARM_LLM_BASE_URL3: "https://generativelanguage.googleapis.com",
    SWARM_LLM_API_KEY3: "k3",
    SWARM_LLM_CHAT_PATH3: "/v1beta/models/gemini-flash-latest:generateContent",
    SWARM_LLM_TYPE3: "google-native",
  })
  expect(providers.length).toBe(2)
  expect(providers[0].id).toBe("1")
  expect(providers[0].name).toBe("OpenRouter")
  expect(providers[1].id).toBe("3")
  expect(providers[1].type).toBe("google-native")
})

test("bootstrap-runtime bee contract", async () => {
  const context = {
    projectConfig: {
      llm: {
        activeProviderId: "2",
        providers: [
          { id: "1", name: "OpenRouter", baseUrl: "https://openrouter.ai/api", apiKey: "k1", model: "a" },
          { id: "2", name: "DeepSeek", baseUrl: "https://api.deepseek.com", apiKey: "k2", model: "b" },
        ],
      },
    },
    runtime: {
      llmProviders: [],
      activeProviderId: "",
    },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = bootstrapRuntimeBee(context)
  const output = await bee.execute({ type: "RuntimeBootstrapHoney", payload: {} })
  expect(output.resultHoney.type).toBe("RuntimeReadyHoney")
  expect(context.runtime.llmProviders.length).toBe(2)
  expect(context.runtime.llmProviders[0].name).toBe("OpenRouter")
  const configuredActiveProvider = process.env.SWARM_LLM_ACTIVE_PROVIDER || "2"
  const expectedActiveProvider = context.runtime.llmProviders.some((provider) => provider.id === configuredActiveProvider)
    ? configuredActiveProvider
    : "1"
  expect(context.runtime.activeProviderId).toBe(expectedActiveProvider)
})
