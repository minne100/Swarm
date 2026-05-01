function indexedProviderIndexes(env) {
  const matches = Object.keys(env).flatMap((key) => {
    const match = key.match(
      /^SWARM_LLM_(?:NAME|TYPE|BASE_URL|API_KEY|MODEL|CHAT_PATH|STREAM|MULTIMODAL|MULTIMODAL_IMAGE|MULTIMODAL_AUDIO)(\d+)$/,
    )
    if (!match) return []
    return [Number(match[1])]
  })
  return [...new Set(matches.filter((value) => Number.isInteger(value) && value > 0))].sort((a, b) => a - b)
}

function indexedProvider(env, index) {
  const suffix = String(index)
  const baseUrl = env[`SWARM_LLM_BASE_URL${suffix}`] || ""
  const apiKey = env[`SWARM_LLM_API_KEY${suffix}`] || ""
  const model = env[`SWARM_LLM_MODEL${suffix}`] || ""
  if (!baseUrl || !apiKey || !model) return null
  return {
    id: suffix,
    name: env[`SWARM_LLM_NAME${suffix}`] || `Provider ${suffix}`,
    type: env[`SWARM_LLM_TYPE${suffix}`] || "openai-compatible",
    baseUrl,
    apiKey,
    model,
    chatPath: env[`SWARM_LLM_CHAT_PATH${suffix}`] || "/v1/chat/completions",
    stream: env[`SWARM_LLM_STREAM${suffix}`] || env.SWARM_LLM_STREAM || "true",
    multimodal: env[`SWARM_LLM_MULTIMODAL${suffix}`] || env.SWARM_LLM_MULTIMODAL || "",
    multimodalImage: env[`SWARM_LLM_MULTIMODAL_IMAGE${suffix}`] || env.SWARM_LLM_MULTIMODAL_IMAGE || "",
    multimodalAudio: env[`SWARM_LLM_MULTIMODAL_AUDIO${suffix}`] || env.SWARM_LLM_MULTIMODAL_AUDIO || "",
  }
}

function legacyProvider(env) {
  const baseUrl = env.SWARM_LLM_BASE_URL || ""
  const apiKey = env.SWARM_LLM_API_KEY || ""
  const model = env.SWARM_LLM_MODEL || ""
  if (!baseUrl || !apiKey || !model) return null
  return {
    id: "1",
    name: env.SWARM_LLM_NAME || "Provider 1",
    type: env.SWARM_LLM_TYPE || "openai-compatible",
    baseUrl,
    apiKey,
    model,
    chatPath: env.SWARM_LLM_CHAT_PATH || "/v1/chat/completions",
    stream: env.SWARM_LLM_STREAM || "true",
    multimodal: env.SWARM_LLM_MULTIMODAL || "",
    multimodalImage: env.SWARM_LLM_MULTIMODAL_IMAGE || "",
    multimodalAudio: env.SWARM_LLM_MULTIMODAL_AUDIO || "",
  }
}

function providersFromEnv(env) {
  const indexes = indexedProviderIndexes(env)
  if (indexes.length === 0) {
    const provider = legacyProvider(env)
    return provider ? [provider] : []
  }
  return indexes.map((index) => indexedProvider(env, index)).filter(Boolean)
}

function normalizeConfiguredProviders(providers) {
  if (!Array.isArray(providers)) return []
  return providers
    .map((provider, index) => {
      if (!provider || typeof provider !== "object") return null
      const id = provider.id ? String(provider.id) : String(index + 1)
      const baseUrl = typeof provider.baseUrl === "string" ? provider.baseUrl : ""
      const apiKey = typeof provider.apiKey === "string" ? provider.apiKey : ""
      const model = typeof provider.model === "string" ? provider.model : ""
      if (!baseUrl || !apiKey || !model) return null
      return {
        id,
        name: typeof provider.name === "string" && provider.name ? provider.name : `Provider ${id}`,
        type: typeof provider.type === "string" && provider.type ? provider.type : "openai-compatible",
        baseUrl,
        apiKey,
        model,
        chatPath: typeof provider.chatPath === "string" && provider.chatPath ? provider.chatPath : "/v1/chat/completions",
        stream: provider.stream ? String(provider.stream) : "true",
        multimodal: provider.multimodal ? String(provider.multimodal) : "",
        multimodalImage: provider.multimodalImage ? String(provider.multimodalImage) : "",
        multimodalAudio: provider.multimodalAudio ? String(provider.multimodalAudio) : "",
      }
    })
    .filter(Boolean)
}

function resolveProviders(context) {
  const configured = normalizeConfiguredProviders(context?.projectConfig?.llm?.providers)
  if (configured.length > 0) return configured
  return providersFromEnv(process.env)
}

function resolveActiveProviderId(context, providers) {
  if (providers.length === 0) return context?.projectConfig?.llm?.activeProviderId || context?.runtime?.activeProviderId || ""
  const configured = process.env.SWARM_LLM_ACTIVE_PROVIDER || context?.runtime?.activeProviderId || context?.projectConfig?.llm?.activeProviderId || ""
  return providers.some((provider) => provider.id === configured) ? configured : providers[0].id
}

export class BootstrapRuntimeBee {
  constructor(context) {
    this.context = context
  }

  async execute() {
    const providers = resolveProviders(this.context)
    const activeProviderId = resolveActiveProviderId(this.context, providers)
    this.context.runtime.llmProviders = providers
    this.context.runtime.activeProviderId = activeProviderId
    const outputHoney = {
      type: "RuntimeReadyHoney",
      payload: {
        runtime: {
          activeProviderId,
          providerCount: providers.length,
          providerNames: providers.map((provider) => provider.name || provider.id),
        },
      },
    }
    return this.context.resolveWithReport("BootstrapRuntimeBee", "runtime initialized", outputHoney, {
      operation: "bootstrap runtime",
      activeProviderId,
      providerCount: providers.length,
      providerNames: providers.map((provider) => provider.name || provider.id),
    })
  }

  destroy() {}
}

export function bootstrapRuntimeBee(context) {
  return new BootstrapRuntimeBee(context)
}

export const bootstrapRuntimeInternals = {
  providersFromEnv,
  normalizeConfiguredProviders,
  resolveActiveProviderId,
}
