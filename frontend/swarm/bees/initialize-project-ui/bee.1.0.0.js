function normalizeValue(value) {
  return value === undefined ? null : value
}

function renderMessageTemplate(template, vars = {}) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_m, key) =>
    vars[key] === undefined || vars[key] === null ? "" : String(vars[key]),
  )
}

function listFromMessagesPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.messages)) return payload.messages
  return []
}

function messagesFromSessionRecords(records, newestFirst = false) {
  const list = Array.isArray(records) ? records : []
  const ordered = newestFirst ? [...list].reverse() : list
  return ordered.flatMap((record) => {
    const messages = Array.isArray(record?.messages) ? record.messages : []
    return messages
      .map((message) => {
        const role = message?.role === "assistant" ? "ai" : message?.role === "user" ? "user" : ""
        const content = typeof message?.content === "string" ? message.content : ""
        if (!role || !content) return null
        return { role, content }
      })
      .filter(Boolean)
  })
}

function textFromMessage(message) {
  const parts = Array.isArray(message?.parts) ? message.parts : []
  return parts
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n")
}

function roleOf(message) {
  if (message?.info?.role) return message.info.role
  if (message?.role) return message.role
  return ""
}

function createdAt(message) {
  if (typeof message?.info?.time?.created === "number") return message.info.time.created
  if (typeof message?.time?.created === "number") return message.time.created
  return 0
}

function isStreamDone(message) {
  if (typeof message?.info?.stream?.done === "boolean") return message.info.stream.done
  return true
}

function findAssistantReplyState(messages, since) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (roleOf(message) !== "assistant") continue
    if (createdAt(message) < since) continue
    const text = textFromMessage(message)
    if (!text && !isStreamDone(message)) return { reply: "", done: false }
    if (text) return { reply: text, done: isStreamDone(message) }
    if (isStreamDone(message)) return { reply: "", done: true }
  }
  return { reply: "", done: false }
}

function fileIdentity(file) {
  if (typeof file === "string") return `path:${file}`
  if (!file || typeof file !== "object") return ""
  const name = typeof file.name === "string" ? file.name : ""
  const size = typeof file.size === "number" ? String(file.size) : ""
  const type = typeof file.type === "string" ? file.type : ""
  const lastModified = typeof file.lastModified === "number" ? String(file.lastModified) : ""
  return `file:${name}|${size}|${type}|${lastModified}`
}

function mergeAttachmentFiles(existingFiles, incomingFiles) {
  const all = [...(Array.isArray(existingFiles) ? existingFiles : []), ...(Array.isArray(incomingFiles) ? incomingFiles : [])]
  const seen = new Set()
  return all.filter((file) => {
    const key = fileIdentity(file)
    if (!key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function resolveElement(root, id) {
  const node = root?.getElementById?.(id)
  if (!node) throw new Error(`缺少页面元素: #${id}`)
  return node
}

function createBrowserElements(config, rootDocument) {
  if (!rootDocument) throw new Error("缺少页面根文档对象")
  const ids = config?.ui?.elementIds || {}
  return {
    projectListEl: resolveElement(rootDocument, ids.projectListEl),
    llmProviderEl: resolveElement(rootDocument, ids.llmProviderEl),
    messagesEl: resolveElement(rootDocument, ids.messagesEl),
    addProjectBtn: resolveElement(rootDocument, ids.addProjectBtn),
    composerEl: resolveElement(rootDocument, ids.composerEl),
    promptEl: resolveElement(rootDocument, ids.promptEl),
    fileInputEl: resolveElement(rootDocument, ids.fileInputEl),
    attachBtnEl: resolveElement(rootDocument, ids.attachBtnEl),
    submitBtnEl: resolveElement(rootDocument, ids.submitBtnEl),
    attachmentsEl: resolveElement(rootDocument, ids.attachmentsEl),
  }
}

function ensureStateShape(state) {
  if (!Array.isArray(state.projects)) state.projects = []
  if (!state.messages || typeof state.messages !== "object") state.messages = {}
  if (!Array.isArray(state.files)) state.files = []
  if (!state.sessionIDs || typeof state.sessionIDs !== "object") state.sessionIDs = {}
  if (!state.streamingAssistantByProject || typeof state.streamingAssistantByProject !== "object") {
    state.streamingAssistantByProject = {}
  }
  if (!state.projectSessionOffsets || typeof state.projectSessionOffsets !== "object") state.projectSessionOffsets = {}
  if (!state.projectSessionHasMore || typeof state.projectSessionHasMore !== "object") state.projectSessionHasMore = {}
  if (!state.loadingOlderSessions || typeof state.loadingOlderSessions !== "object") state.loadingOlderSessions = {}
  if (!state.submittingByProject || typeof state.submittingByProject !== "object") state.submittingByProject = {}
  if (!state.stopRequestedByProject || typeof state.stopRequestedByProject !== "object") state.stopRequestedByProject = {}
}

function ensureProjectMessages(state, projectId) {
  if (!state.messages[projectId]) state.messages[projectId] = []
}

function setSubmitState(context, projectId, submitting) {
  if (!projectId) return
  context.state.submittingByProject[projectId] = Boolean(submitting)
  const isStop = Boolean(submitting)
  context.elements.submitBtnEl.textContent = isStop ? context.t("ui.submit.stop") : context.t("ui.submit.send")
  context.elements.submitBtnEl.classList.toggle("is-stop", isStop)
}

function activeProject(context) {
  return context.state.projects.find((item) => item.id === context.state.activeProjectId)
}

function pushMessage(context, projectId, role, content) {
  ensureProjectMessages(context.state, projectId)
  context.state.messages[projectId].push({ role, content })
}

function updateAssistantStream(context, projectId, content, done = false) {
  ensureProjectMessages(context.state, projectId)
  const mappedIndex = context.state.streamingAssistantByProject[projectId]
  if (!Number.isInteger(mappedIndex) || mappedIndex < 0) {
    context.state.messages[projectId].push({ role: "ai", content: "", streaming: true })
    context.state.streamingAssistantByProject[projectId] = context.state.messages[projectId].length - 1
  }
  const target = context.state.messages[projectId][context.state.streamingAssistantByProject[projectId]]
  if (!target) return
  target.role = "ai"
  target.content = typeof content === "string" ? content : ""
  target.streaming = !done
  if (done) delete context.state.streamingAssistantByProject[projectId]
}

function consumeAssistantStream(context, projectId, reply) {
  if (!projectId) return false
  const mappedIndex = context.state.streamingAssistantByProject[projectId]
  if (!Number.isInteger(mappedIndex) || mappedIndex < 0) return false
  const target = context.state.messages[projectId]?.[mappedIndex]
  if (!target) {
    delete context.state.streamingAssistantByProject[projectId]
    return false
  }
  target.role = "ai"
  target.content = typeof reply === "string" ? reply : ""
  target.streaming = false
  delete context.state.streamingAssistantByProject[projectId]
  return true
}

function renderProjectList(context, config) {
  context.elements.projectListEl.innerHTML = ""
  const doc = context.elements.projectListEl.ownerDocument || globalThis.document
  context.state.projects.forEach((project) => {
    const button = doc.createElement("button")
    button.type = "button"
    button.className = `project-item${project.id === context.state.activeProjectId ? " active" : ""}`
    button.textContent = project.name
    button.addEventListener("click", () => {
      if (typeof context.startDance !== "function") return
      context.startDance(config.ui.dances.selectProject, {
        type: config.ui.honeyTypes.selectProject,
        payload: { projectId: project.id },
      })
    })
    context.elements.projectListEl.appendChild(button)
  })
}

function renderLlmProviders(context) {
  context.elements.llmProviderEl.innerHTML = ""
  const doc = context.elements.llmProviderEl.ownerDocument || globalThis.document
  context.state.llmProviders.forEach((provider) => {
    const option = doc.createElement("option")
    option.value = provider.id
    option.textContent = provider.name || provider.id
    option.selected = provider.id === context.state.activeLlmProviderId
    context.elements.llmProviderEl.appendChild(option)
  })
  context.elements.llmProviderEl.disabled = context.state.llmProviders.length <= 1
}

function renderMessages(context) {
  const list = context.state.messages[context.state.activeProjectId] || []
  context.elements.messagesEl.innerHTML = ""
  const doc = context.elements.messagesEl.ownerDocument || globalThis.document
  list.forEach((message) => {
    const item = doc.createElement("div")
    item.className = `msg ${message.role === "user" ? "user" : "ai"}`
    item.textContent = message.content
    context.elements.messagesEl.appendChild(item)
  })
  context.elements.messagesEl.scrollTop = context.elements.messagesEl.scrollHeight
}

function renderAttachments(context) {
  context.elements.attachmentsEl.innerHTML = ""
  const doc = context.elements.attachmentsEl.ownerDocument || globalThis.document
  context.state.files.forEach((file) => {
    const tag = doc.createElement("span")
    tag.className = "file-tag"
    tag.textContent = file.name
    context.elements.attachmentsEl.appendChild(tag)
  })
}

async function ensureSession(context, projectId, projectName) {
  const existing = context.state.sessionIDs[projectId]
  if (existing) return existing
  const created = await context.request("/session", {
    method: "POST",
    body: JSON.stringify({ projectId, title: projectName }),
  })
  const sessionID = created?.id
  if (!sessionID) throw new Error("创建会话失败：后端未返回 sessionID")
  context.state.sessionIDs[projectId] = sessionID
  return sessionID
}

function fileToDataUrl(context, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error(context.t("errors.read_attachment_failed", { name: file.name })))
    reader.readAsDataURL(file)
  })
}

async function sendPromptAsync(context, sessionID, parts) {
  await context.request(`/session/${sessionID}/prompt_async`, {
    method: "POST",
    body: JSON.stringify({ parts }),
  })
}

async function loadLlmProviders(context) {
  const payload = await context.request("/api/llm/providers")
  const providers = Array.isArray(payload?.providers) ? payload.providers : []
  context.state.llmProviders = providers.map((item) => ({ id: item.id, name: item.name || item.id }))
  context.state.activeLlmProviderId = typeof payload?.activeProviderId === "string" ? payload.activeProviderId : ""
  renderLlmProviders(context)
}

async function setActiveLlmProvider(context, providerId) {
  if (!providerId) return
  const payload = await context.request("/api/llm/providers/active", {
    method: "POST",
    body: JSON.stringify({ providerId }),
  })
  context.state.activeLlmProviderId = typeof payload?.activeProviderId === "string" ? payload.activeProviderId : providerId
  renderLlmProviders(context)
}

async function waitAssistantReply(context, sessionID, since, projectId) {
  while (true) {
    if (projectId && context.state.stopRequestedByProject[projectId]) {
      delete context.state.stopRequestedByProject[projectId]
      const mappedIndex = context.state.streamingAssistantByProject[projectId]
      if (Number.isInteger(mappedIndex) && mappedIndex >= 0) {
        const message = context.state.messages[projectId]?.[mappedIndex]
        if (message?.content) return message.content
      }
      return ""
    }
    const payload = await context.request(`/session/${sessionID}/message?limit=80`)
    const hit = findAssistantReplyState(listFromMessagesPayload(payload), since)
    if (projectId && hit.reply) {
      updateAssistantStream(context, projectId, hit.reply, false)
      renderMessages(context)
    }
    if (hit.done && hit.reply) return hit.reply
    await sleep(context.settings.pollIntervalMs)
  }
}

async function loadProjectSessions(context, projectId, appendOlder = false) {
  if (!projectId) return
  const currentOffset = Number(context.state.projectSessionOffsets[projectId] || 0)
  const offset = appendOlder ? currentOffset : 0
  const payload = await context.request(`/api/projects/${encodeURIComponent(projectId)}/sessions?limit=5&offset=${offset}`)
  const records = Array.isArray(payload?.sessions) ? payload.sessions : []
  const incoming = messagesFromSessionRecords(records, true)
  const existing = Array.isArray(context.state.messages[projectId]) ? context.state.messages[projectId] : []
  context.state.messages[projectId] = appendOlder ? [...incoming, ...existing] : incoming
  if (!appendOlder && context.state.messages[projectId].length === 0) {
    context.state.messages[projectId] = [{ role: "ai", content: context.t("ui.welcome.describe_requirement") }]
  }
  context.state.projectSessionOffsets[projectId] = Number(payload?.nextOffset || offset + records.length)
  context.state.projectSessionHasMore[projectId] = Boolean(payload?.hasMore)
}

async function loadOlderProjectSessions(context, projectId) {
  if (!projectId) return false
  if (!context.state.projectSessionHasMore[projectId]) return false
  if (context.state.loadingOlderSessions[projectId]) return false
  context.state.loadingOlderSessions[projectId] = true
  try {
    await loadProjectSessions(context, projectId, true)
    return true
  } finally {
    context.state.loadingOlderSessions[projectId] = false
  }
}

function requestProjectName(context) {
  const suggested = `Project ${context.state.projects.length + 1}`
  if (typeof globalThis.prompt !== "function") return suggested
  while (true) {
    const raw = globalThis.prompt(context.t("ui.prompt.project_name"), suggested)
    if (raw === null) return null
    const value = raw.trim()
    if (value) return value
    if (typeof globalThis.alert === "function") globalThis.alert(context.t("ui.alert.project_name_empty"))
  }
}

function applyLocalizedStaticText(context) {
  const addProjectText = context.t("ui.button.new_project")
  if (addProjectText) context.elements.addProjectBtn.textContent = addProjectText
  const promptPlaceholder = context.t("ui.placeholder.prompt")
  if (promptPlaceholder) context.elements.promptEl.placeholder = promptPlaceholder
  const attachText = context.t("ui.button.attach")
  if (attachText) context.elements.attachBtnEl.textContent = attachText
  const providerLabelText = context.t("ui.label.llm")
  const providerLabel = context.elements.llmProviderEl?.previousElementSibling
  if (providerLabelText && providerLabel && providerLabel.tagName === "LABEL") providerLabel.textContent = providerLabelText
}

function bindBrowserProjectHandlers(context, config) {
  const elements = context.elements
  if (context.state.uiHandlersBound) return
  context.state.uiHandlersBound = true
  setSubmitState(context, context.state.activeProjectId, false)
  context.elements.llmProviderEl.addEventListener("change", async () => {
    await setActiveLlmProvider(context, context.elements.llmProviderEl.value)
  })
  elements.addProjectBtn.addEventListener("click", () => {
    const name = requestProjectName(context)
    if (!name) return
    context.startDance(config.ui.dances.addProject, {
      type: config.ui.honeyTypes.addProject,
      payload: { name },
    })
  })
  elements.attachBtnEl.addEventListener("click", () => {
    elements.fileInputEl.click()
  })
  elements.fileInputEl.addEventListener("change", () => {
    context.startDance(config.ui.dances.attachmentUpdate, {
      type: config.ui.honeyTypes.updateAttachments,
      payload: { files: Array.from(elements.fileInputEl.files || []) },
    })
    elements.fileInputEl.value = ""
  })
  elements.composerEl.addEventListener("submit", (event) => {
    event.preventDefault()
    const project = activeProject(context)
    if (!project) return
    if (context.state.submittingByProject[project.id]) {
      context.state.stopRequestedByProject[project.id] = true
      setSubmitState(context, project.id, false)
      return
    }
    const text = elements.promptEl.value.trim()
    if (!text && context.state.files.length === 0) return
    context.state.stopRequestedByProject[project.id] = false
    setSubmitState(context, project.id, true)
    context.startDance(config.ui.dances.submitPrompt, {
      type: config.ui.honeyTypes.submitPrompt,
      payload: {
        projectId: project.id,
        text,
        files: Array.from(context.state.files),
      },
    })
  })
  elements.messagesEl.addEventListener("scroll", async () => {
    if (elements.messagesEl.scrollTop > 10) return
    const project = activeProject(context)
    if (!project) return
    const beforeHeight = elements.messagesEl.scrollHeight
    const loaded = await loadOlderProjectSessions(context, project.id)
    if (!loaded) return
    renderMessages(context)
    const afterHeight = elements.messagesEl.scrollHeight
    elements.messagesEl.scrollTop = Math.max(0, afterHeight - beforeHeight)
  })
}

function attachContextApis(context, config) {
  context.ensureProjectMessages = (projectId) => ensureProjectMessages(context.state, projectId)
  context.pushMessage = (projectId, role, content) => pushMessage(context, projectId, role, content)
  context.updateAssistantStream = (projectId, content, done = false) => updateAssistantStream(context, projectId, content, done)
  context.consumeAssistantStream = (projectId, reply) => consumeAssistantStream(context, projectId, reply)
  context.renderProjectList = () => renderProjectList(context, config)
  context.renderLlmProviders = () => renderLlmProviders(context)
  context.renderMessages = () => renderMessages(context)
  context.renderAttachments = () => renderAttachments(context)
  context.syncFiles = (files) => {
    context.state.files = mergeAttachmentFiles(context.state.files, Array.from(files || []))
  }
  context.clearComposer = () => {
    context.elements.promptEl.value = ""
    context.state.files = []
    context.elements.fileInputEl.value = ""
  }
  context.setSubmitState = (projectId, submitting) => setSubmitState(context, projectId, submitting)
  context.activeProject = () => activeProject(context)
  context.ensureSession = (projectId, projectName) => ensureSession(context, projectId, projectName)
  context.fileToDataUrl = (file) => fileToDataUrl(context, file)
  context.sendPromptAsync = (sessionID, parts) => sendPromptAsync(context, sessionID, parts)
  context.loadLlmProviders = () => loadLlmProviders(context)
  context.setActiveLlmProvider = (providerId) => setActiveLlmProvider(context, providerId)
  context.waitAssistantReply = (sessionID, since, projectId) => waitAssistantReply(context, sessionID, since, projectId)
  context.loadProjectSessions = (projectId, appendOlder = false) => loadProjectSessions(context, projectId, appendOlder)
  context.loadOlderProjectSessions = (projectId) => loadOlderProjectSessions(context, projectId)
  context.requestProjectName = () => requestProjectName(context)
  context.renderTemplate = (template, vars = {}) => renderMessageTemplate(template, vars)
}

function buildReportDetail(inputHoney, outputHoney, providerError = "") {
  return {
    operation: "initialize project ui runtime",
    note: "Injects app-specific context methods, applies localized static text, loads LLM providers and binds UI handlers.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.state.uiInitialized",
        before: normalizeValue(false),
        after: normalizeValue(true),
      },
      {
        path: "$.payload.providerError",
        before: null,
        after: providerError || null,
      },
    ],
  }
}

export class InitializeProjectUiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey, beeContext) {
    const config = this.context.projectConfig
    ensureStateShape(this.context.state)
    if (!this.context.elements) {
      const rootDocument = this.context.rootDocument || (typeof document === "undefined" ? null : document)
      this.context.elements = createBrowserElements(config, rootDocument)
    }
    attachContextApis(this.context, config)
    if (typeof beeContext?.startDance === "function") this.context.startDance = beeContext.startDance
    applyLocalizedStaticText(this.context)
    bindBrowserProjectHandlers(this.context, config)
    let providerError = ""
    await loadLlmProviders(this.context).catch((error) => {
      providerError = error instanceof Error ? error.message : String(error)
      this.context.state.llmProviders = []
      this.context.state.activeLlmProviderId = ""
      renderLlmProviders(this.context)
    })
    this.context.state.uiInitialized = true
    const outputHoney = {
      type: honey?.type || "RenderedHoney",
      payload: {
        ...(honey?.payload || {}),
        providerError: providerError || undefined,
      },
    }
    return this.context.resolveWithReport(
      "InitializeProjectUiBee",
      "project ui initialized",
      outputHoney,
      buildReportDetail(honey, outputHoney, providerError),
    )
  }

  destroy() {}
}

export function initializeProjectUiBee(context) {
  return new InitializeProjectUiBee(context)
}
