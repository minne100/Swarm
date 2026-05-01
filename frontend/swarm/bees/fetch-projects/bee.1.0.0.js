function normalizeProjects(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const id = typeof item.id === "string" ? item.id.trim() : ""
      if (!id) return null
      const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : id
      return { id, name }
    })
    .filter(Boolean)
}

export class FetchProjectsBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    try {
      const payload = await this.context.request("/api/projects")
      const projects = normalizeProjects(payload?.projects)
      this.context.state.projects = projects
      const activeProjectId = this.context.state.activeProjectId
      const exists = projects.some((item) => item.id === activeProjectId)
      this.context.state.activeProjectId = exists ? activeProjectId : projects[0]?.id || ""
      const outputHoney = {
        type: "ProjectChangedHoney",
        payload: {
          projectId: this.context.state.activeProjectId || null,
          projects,
        },
      }
      return this.context.resolveWithReport("FetchProjectsBee", "projects fetched", outputHoney, {
        operation: "fetch projects on bootstrap",
        status: 200,
        projects: projects.length,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ProjectFlowErrorHoney",
        payload: {
          detail,
        },
      }
      return this.context.rejectWithReport("FetchProjectsBee", "fetch projects failed", errorHoney, {
        operation: "fetch projects on bootstrap",
        detail,
      })
    }
  }

  destroy() {}
}

export function fetchProjectsBee(context) {
  return new FetchProjectsBee(context)
}
