export const projectBeeDefinitions = [
  {
    name: "BuildPromptPartsBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/build-prompt-parts/bee.1.0.0.js",
    factoryExport: "buildPromptPartsBee",
  },
  {
    name: "ClearComposerBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/clear-composer/bee.1.0.0.js",
    factoryExport: "clearComposerBee",
  },
  {
    name: "CreateProjectBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/create-project/bee.1.0.0.js",
    factoryExport: "createProjectBee",
  },
  {
    name: "EnsureSessionBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/ensure-session/bee.1.0.0.js",
    factoryExport: "ensureSessionBee",
  },
  {
    name: "QueueAssistantMessageBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/queue-assistant-message/bee.1.0.0.js",
    factoryExport: "queueAssistantMessageBee",
  },
  {
    name: "QueuePromptErrorBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/queue-prompt-error/bee.1.0.0.js",
    factoryExport: "queuePromptErrorBee",
  },
  {
    name: "QueueUserMessageBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/queue-user-message/bee.1.0.0.js",
    factoryExport: "queueUserMessageBee",
  },
  {
    name: "RenderAttachmentsBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/render-attachments/bee.1.0.0.js",
    factoryExport: "renderAttachmentsBee",
  },
  {
    name: "RenderMessagesBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/render-messages/bee.1.0.0.js",
    factoryExport: "renderMessagesBee",
  },
  {
    name: "RenderProjectListBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/render-project-list/bee.1.0.0.js",
    factoryExport: "renderProjectListBee",
  },
  {
    name: "SendPromptBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/send-prompt/bee.1.0.0.js",
    factoryExport: "sendPromptBee",
  },
  {
    name: "SetActiveProjectBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/set-active-project/bee.1.0.0.js",
    factoryExport: "setActiveProjectBee",
  },
  {
    name: "SyncAttachmentsBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/sync-attachments/bee.1.0.0.js",
    factoryExport: "syncAttachmentsBee",
  },
  {
    name: "WaitReplyBee",
    version: "1.0.0",
    modulePath: "./swarm/bees/wait-reply/bee.1.0.0.js",
    factoryExport: "waitReplyBee",
  },
]

export const projectDanceFiles = [
  "./swarm/dances/bootstrap/dance.1.0.0.json",
  "./swarm/dances/select-project/dance.1.0.0.json",
  "./swarm/dances/add-project/dance.1.0.0.json",
  "./swarm/dances/attachment-update/dance.1.0.0.json",
  "./swarm/dances/submit-prompt/dance.1.0.0.json",
]

export const projectConfig = {
  bootstrap: {
    dance: "BootstrapDance",
  },
  api: {
    base: "http://127.0.0.1:3000",
    pollIntervalMs: 1200,
    pollTimeoutMs: 60000,
  },
  ui: {
    elementIds: {
      projectListEl: "project-list",
      messagesEl: "messages",
      addProjectBtn: "add-project",
      composerEl: "composer",
      promptEl: "prompt",
      fileInputEl: "file-input",
      attachBtnEl: "attach-btn",
      attachmentsEl: "attachments",
    },
    dances: {
      selectProject: "SelectProjectDance",
      addProject: "AddProjectDance",
      attachmentUpdate: "AttachmentUpdateDance",
      submitPrompt: "SubmitPromptDance",
    },
    honeyTypes: {
      selectProject: "SelectProjectHoney",
      addProject: "AddProjectHoney",
      updateAttachments: "UpdateAttachmentsHoney",
      submitPrompt: "SubmitPromptHoney",
    },
  },
  initialState: {
    projects: [
      { id: "p1", name: "Swarm Paradigm 设计" },
      { id: "p2", name: "需求整理" },
    ],
    activeProjectId: "p1",
    sessionIDs: {},
    messages: {
      p1: [{ role: "ai", content: "你好，我是 Swarm。你可以直接描述需求，我会按项目上下文回复。" }],
      p2: [{ role: "ai", content: "这是“需求整理”项目，欢迎开始记录任务。" }],
    },
    files: [],
  },
}