import path from "node:path"

function scriptPath(action) {
  if (action === "prepare_goal_files") return "prepare_goal_files.js"
  if (action === "update_readme_log") return "update_readme_log.js"
  if (action === "sign_plan") return "sign_plan.js"
  if (action === "build_confirmation_prompt") return "build_confirmation_prompt.js"
  return ""
}

function projectRootFromSession(context, sessionID) {
  const session = context.state?.sessions?.[sessionID]
  if (!session) throw new Error(`session not found: ${sessionID}`)
  const root = path.resolve(import.meta.dir, "../../../../projects", session.projectId)
  return { session, root }
}

function normalizeProjectPath(root, maybePath) {
  if (!maybePath) return ""
  const resolved = path.resolve(root, maybePath)
  const relative = path.relative(root, resolved)
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("path out of current project root")
  return resolved
}

export class ToolSkillGoalDecompositionApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const action = String(payload.input?.action || "").trim()
      const script = scriptPath(action)
      if (!script) throw new Error(`unsupported goal-decomposition action: ${action}`)
      const { root } = projectRootFromSession(this.context, payload.sessionID)
      const scriptFile = path.resolve(import.meta.dir, "../../../../Skills/goal-decomposition/scripts", script)
      const args = ["bun", scriptFile, "--project-root", root]
      if (action === "update_readme_log") {
        args.push("--change-note", String(payload.input?.change_note || ""))
        args.push("--status", String(payload.input?.status || "待确认"))
        if (payload.input?.plan_file) args.push("--plan-file", normalizeProjectPath(root, String(payload.input.plan_file)))
        if (payload.input?.version !== undefined) args.push("--version", String(payload.input.version))
        if (payload.input?.phase) args.push("--phase", String(payload.input.phase))
      }
      if (action === "sign_plan") {
        args.push("--plan-file", normalizeProjectPath(root, String(payload.input?.plan_file || "")))
        args.push("--sign-name", String(payload.input?.sign_name || ""))
      }
      if (action === "build_confirmation_prompt") {
        args.push("--plan-file", normalizeProjectPath(root, String(payload.input?.plan_file || "")))
        if (payload.input?.max_chars !== undefined) args.push("--max-chars", String(payload.input.max_chars))
      }
      const proc = Bun.spawn(args, { cwd: root, stdout: "pipe", stderr: "pipe" })
      const out = await new Response(proc.stdout).text()
      const err = await new Response(proc.stderr).text()
      const code = await proc.exited
      const ok = code === 0
      const outputHoney = {
        type: "ToolCallResultHoney",
        payload: {
          name: payload.name,
          ok,
          output: (out || "").trim(),
          error: ok ? "" : (err || out || `exit ${code}`).trim(),
        },
      }
      return this.context.resolveWithReport("ToolSkillGoalDecompositionApiBee", "run goal-decomposition tool", outputHoney)
    } catch (error) {
      const outputHoney = {
        type: "ToolCallResultHoney",
        payload: {
          name: payload.name,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
      }
      return this.context.resolveWithReport("ToolSkillGoalDecompositionApiBee", "run goal-decomposition tool failed", outputHoney)
    }
  }

  destroy() {}
}

export function toolSkillGoalDecompositionApiBee(context) {
  return new ToolSkillGoalDecompositionApiBee(context)
}
