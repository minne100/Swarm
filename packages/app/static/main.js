const state = {
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
}

const API_BASE = "http://127.0.0.1:3000"
const POLL_INTERVAL_MS = 1200
const POLL_TIMEOUT_MS = 60000

const projectListEl = document.getElementById("project-list")
const messagesEl = document.getElementById("messages")
const addProjectBtn = document.getElementById("add-project")
const composerEl = document.getElementById("composer")
const promptEl = document.getElementById("prompt")
const fileInputEl = document.getElementById("file-input")
const attachBtnEl = document.getElementById("attach-btn")
const attachmentsEl = document.getElementById("attachments")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function activeProject() {
  return state.projects.find((item) => item.id === state.activeProjectId)
}

function ensureProjectMessages(projectId) {
  if (!state.messages[projectId]) state.messages[projectId] = []
}

function pushMessage(projectId, role, content) {
  ensureProjectMessages(projectId)
  state.messages[projectId].push({ role, content })
}

function renderProjectList() {
  projectListEl.innerHTML = ""
  for (const project of state.projects) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = `project-item${project.id === state.activeProjectId ? " active" : ""}`
    button.textContent = project.name
    button.addEventListener("click", () => {
      state.activeProjectId = project.id
      ensureProjectMessages(project.id)
      renderProjectList()
      renderMessages()
    })
    projectListEl.appendChild(button)
  }
}

function renderMessages() {
  const list = state.messages[state.activeProjectId] || []
  messagesEl.innerHTML = ""
  for (const msg of list) {
    const item = document.createElement("div")
    item.className = `msg ${msg.role === "user" ? "user" : "ai"}`
    item.textContent = msg.content
    messagesEl.appendChild(item)
  }
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function renderAttachments() {
  attachmentsEl.innerHTML = ""
  for (const file of state.files) {
    const tag = document.createElement("span")
    tag.className = "file-tag"
    tag.textContent = file.name
    attachmentsEl.appendChild(tag)
  }
}

async function request(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(text || `${res.status} ${res.statusText}`)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function listFromMessagesPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.messages)) return payload.messages
  return []
}

function textFromMessage(msg) {
  const parts = Array.isArray(msg?.parts) ? msg.parts : []
  const texts = parts
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
  return texts.join("\n\n")
}

function roleOf(msg) {
  if (msg?.info?.role) return msg.info.role
  if (msg?.role) return msg.role
  return ""
}

function createdAt(msg) {
  if (typeof msg?.info?.time?.created === "number") return msg.info.time.created
  if (typeof msg?.time?.created === "number") return msg.time.created
  return 0
}

async function ensureSession(project) {
  const existing = state.sessionIDs[project.id]
  if (existing) return existing
  const created = await request("/session", {
    method: "POST",
    body: JSON.stringify({ title: project.name }),
  })
  const sessionID = created?.id
  if (!sessionID) throw new Error("创建会话失败：后端未返回 sessionID")
  state.sessionIDs[project.id] = sessionID
  return sessionID
}

async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error(`读取附件失败: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

async function sendPromptAsync(sessionID, parts) {
  await request(`/session/${sessionID}/prompt_async`, {
    method: "POST",
    body: JSON.stringify({ parts }),
  })
}

async function waitAssistantReply(sessionID, since) {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const payload = await request(`/session/${sessionID}/message?limit=80`)
    const messages = listFromMessagesPayload(payload)
    const hit = messages.findLast((msg) => roleOf(msg) === "assistant" && createdAt(msg) >= since)
    if (hit) {
      const text = textFromMessage(hit)
      if (text) return text
    }
    await sleep(POLL_INTERVAL_MS)
  }
  return ""
}

function createProject() {
  const index = state.projects.length + 1
  const id = `p${Date.now()}`
  const name = `新项目 ${index}`
  state.projects.unshift({ id, name })
  state.activeProjectId = id
  state.messages[id] = [{ role: "ai", content: `已创建项目「${name}」，请开始提问。` }]
  renderProjectList()
  renderMessages()
}

addProjectBtn.addEventListener("click", createProject)

attachBtnEl.addEventListener("click", () => {
  fileInputEl.click()
})

fileInputEl.addEventListener("change", () => {
  state.files = Array.from(fileInputEl.files || [])
  renderAttachments()
})

composerEl.addEventListener("submit", (event) => {
  event.preventDefault()
  const send = async () => {
    const text = promptEl.value.trim()
    if (!text && !state.files.length) return

    const project = activeProject()
    if (!project) return

    const userText = text || "(仅上传附件)"
    pushMessage(project.id, "user", userText)
    renderMessages()

    const filesSnapshot = [...state.files]
    promptEl.value = ""
    state.files = []
    fileInputEl.value = ""
    renderAttachments()

    try {
      const sessionID = await ensureSession(project)
      const sentAt = Date.now()
      const parts = [{ type: "text", text: userText }]

      for (const file of filesSnapshot) {
        const dataUrl = await fileToDataUrl(file)
        parts.push({
          type: "file",
          mime: file.type || "application/octet-stream",
          filename: file.name,
          url: dataUrl,
        })
      }

      await sendPromptAsync(sessionID, parts)
      const reply = await waitAssistantReply(sessionID, sentAt)
      pushMessage(
        project.id,
        "ai",
        reply || "请求已发送，但暂时还没有拿到文本回复。请稍后再试，或检查后端模型配置。",
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      pushMessage(
        project.id,
        "ai",
        `后端请求失败。\n请确认后端在 3000 端口运行，并已配置可用模型/API Key。\n\n错误信息：${detail}`,
      )
    }

    renderMessages()
  }
  void send()
})

renderProjectList()
renderMessages()
