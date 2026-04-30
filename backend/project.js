export const projectBeeDefinitions = [
  {
    name: "CreateProjectApiBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/create-project-api/bee.1.0.0.js",
    factoryExport: "createProjectApiBee",
  },
  {
    name: "EnsureSessionApiBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/ensure-session-api/bee.1.0.0.js",
    factoryExport: "ensureSessionApiBee",
  },
  {
    name: "QueueUserMessageApiBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/queue-user-message-api/bee.1.0.0.js",
    factoryExport: "queueUserMessageApiBee",
  },
  {
    name: "CallLlmApiBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/call-llm-api/bee.1.0.0.js",
    factoryExport: "callLlmApiBee",
  },
  {
    name: "QueueAssistantMessageApiBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/queue-assistant-message-api/bee.1.0.0.js",
    factoryExport: "queueAssistantMessageApiBee",
  },
  {
    name: "QueueAssistantErrorApiBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/queue-assistant-error-api/bee.1.0.0.js",
    factoryExport: "queueAssistantErrorApiBee",
  },
  {
    name: "PassThroughErrorApiBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/pass-through-error-api/bee.1.0.0.js",
    factoryExport: "passThroughErrorApiBee",
  },
]

export const projectDanceFiles = [
  "./swarm/dances/create-project-api/dance.1.0.0.json",
  "./swarm/dances/ensure-session-api/dance.1.0.0.json",
  "./swarm/dances/submit-prompt-api/dance.1.0.0.json",
]

export const projectConfig = {
  server: {
    host: "127.0.0.1",
    port: 3000,
    frontendRoot: "../frontend",
    indexFile: "index.html",
  },
  api: {
    dances: {
      createProject: "CreateProjectApiDance",
      ensureSession: "EnsureSessionApiDance",
      submitPrompt: "SubmitPromptApiDance",
    },
    honeyTypes: {
      createProject: "CreateProjectRequestHoney",
      ensureSession: "EnsureSessionRequestHoney",
      submitPrompt: "SubmitPromptRequestHoney",
    },
  },
  initialState: {
    projects: [],
    sessions: {},
    sessionByProject: {},
  },
}
