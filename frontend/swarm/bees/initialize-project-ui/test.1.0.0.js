import { expect, test } from "bun:test"
import { initializeProjectUiBee } from "./bee.1.0.0.js"

function createMockNode(tagName = "DIV") {
  const listeners = {}
  return {
    tagName,
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    files: [],
    scrollTop: 0,
    scrollHeight: 0,
    previousElementSibling: null,
    ownerDocument: {
      createElement(name) {
        const child = createMockNode(name.toUpperCase())
        child.type = ""
        child.className = ""
        child.selected = false
        return child
      },
    },
    classList: {
      toggle() {},
    },
    children: [],
    addEventListener(type, handler) {
      listeners[type] = handler
    },
    appendChild(child) {
      this.children.push(child)
      this.scrollHeight += 1
      return child
    },
    click() {},
  }
}

test("initialize-project-ui bee contract", async () => {
  const providerLabel = createMockNode("LABEL")
  const nodeById = {
    "project-list": createMockNode("DIV"),
    "llm-provider": createMockNode("SELECT"),
    messages: createMockNode("DIV"),
    "add-project": createMockNode("BUTTON"),
    composer: createMockNode("FORM"),
    prompt: createMockNode("INPUT"),
    "file-input": createMockNode("INPUT"),
    "attach-btn": createMockNode("BUTTON"),
    "submit-btn": createMockNode("BUTTON"),
    attachments: createMockNode("DIV"),
  }
  const rootDocument = {
    getElementById(id) {
      return nodeById[id] || null
    },
  }
  const context = {
    state: {
      projects: [],
      activeProjectId: "",
      llmProviders: [],
      activeLlmProviderId: "",
      sessionIDs: {},
      messages: {},
      files: [],
    },
    settings: {
      pollIntervalMs: 10,
    },
    projectConfig: {
      ui: {
        elementIds: {
          projectListEl: "project-list",
          llmProviderEl: "llm-provider",
          messagesEl: "messages",
          addProjectBtn: "add-project",
          composerEl: "composer",
          promptEl: "prompt",
          fileInputEl: "file-input",
          attachBtnEl: "attach-btn",
          submitBtnEl: "submit-btn",
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
    },
    rootDocument,
    t(key) {
      const map = {
        "ui.button.new_project": "+ New Project",
        "ui.placeholder.prompt": "Type your question...",
        "ui.button.attach": "Attach",
        "ui.label.llm": "LLM Provider",
        "ui.submit.stop": "Stop",
        "ui.submit.send": "Submit",
      }
      return map[key] || key
    },
    async request(path) {
      if (path === "/api/llm/providers") {
        return {
          providers: [
            { id: "p1", name: "Provider 1" },
            { id: "p2", name: "Provider 2" },
          ],
          activeProviderId: "p1",
        }
      }
      return {}
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
  nodeById["llm-provider"].previousElementSibling = providerLabel
  const bee = initializeProjectUiBee(context)
  const output = await bee.execute({ type: "RenderedHoney", payload: {} }, { startDance() {} })
  expect(output.resultHoney.type).toBe("RenderedHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.state.uiInitialized).toBe(true)
  expect(context.state.llmProviders.length).toBe(2)
  expect(context.state.activeLlmProviderId).toBe("p1")
  expect(context.elements).toBeDefined()
  expect(context.elements.addProjectBtn.textContent).toBe("+ New Project")
  expect(context.elements.promptEl.placeholder).toBe("Type your question...")
  expect(context.elements.attachBtnEl.textContent).toBe("Attach")
  expect(providerLabel.textContent).toBe("LLM Provider")
  expect(typeof context.renderMessages).toBe("function")
  expect(typeof context.loadProjectSessions).toBe("function")
  expect(typeof context.startDance).toBe("function")
})
