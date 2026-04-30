function normalizeValue(value) {
  return value === undefined ? null : value
}

function toDetail(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

function buildSuccessDetail(inputHoney, outputHoney) {
  return {
    operation: "queue async prompt submission by session",
    note: "Enqueues a background prompt task and returns accepted immediately.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.accepted",
        before: normalizeValue(inputHoney?.payload?.accepted),
        after: true,
      },
      {
        path: "$.payload.sessionID",
        before: normalizeValue(inputHoney?.payload?.sessionID),
        after: normalizeValue(outputHoney.payload.sessionID),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "queue async prompt submission by session",
    note: "Failed to enqueue prompt task due to runtime or session issues.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.detail",
        before: normalizeValue(inputHoney?.payload?.detail),
        after: detail,
      },
    ],
  }
}

export class QueuePromptAsyncApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey, beeRuntimeContext) {
    const payload = honey?.payload || {}
    try {
      const session = this.context.getSession(payload.sessionID)
      if (!session) throw new Error(`session not found: ${payload.sessionID}`)
      if (!beeRuntimeContext || typeof beeRuntimeContext.startDance !== "function") {
        throw new Error("bee runtime context missing startDance")
      }
      const config = this.context.projectConfig?.api
      const submitDance = config?.dances?.submitPrompt
      const submitHoneyType = config?.honeyTypes?.submitPrompt
      if (!submitDance || !submitHoneyType) {
        throw new Error("missing api submitPrompt dance/honey config")
      }
      const pending = session.pending instanceof Promise ? session.pending : Promise.resolve()
      session.pending = pending
        .then(async () => {
          const run = beeRuntimeContext.startDance(submitDance, {
            inputHoney: {
              type: submitHoneyType,
              payload: {
                sessionID: payload.sessionID,
                parts: payload.parts,
              },
            },
          })
          if (!run) throw new Error("submit prompt dance failed to start")
          const finalHoney = await run.done
          if (finalHoney?.type === "ApiErrorHoney" && finalHoney?.payload?.detail) {
            console.warn(`[Backend] prompt failed (${payload.sessionID}): ${finalHoney.payload.detail}`)
          }
        })
        .catch((error) => {
          const detail = toDetail(error)
          if (this.context.hasSession(payload.sessionID)) {
            this.context.appendAssistantMessage(payload.sessionID, `Request failed: ${detail}`)
          }
        })
      const outputHoney = {
        type: "SubmitPromptQueuedHoney",
        payload: {
          accepted: true,
          sessionID: payload.sessionID,
        },
      }
      return this.context.resolveWithReport(
        "QueuePromptAsyncApiBee",
        "prompt queued",
        outputHoney,
        buildSuccessDetail(honey, outputHoney),
      )
    } catch (error) {
      const detail = toDetail(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: {
          sessionID: payload.sessionID,
          detail,
        },
      }
      return this.context.rejectWithReport(
        "QueuePromptAsyncApiBee",
        "queue prompt failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function queuePromptAsyncApiBee(context) {
  return new QueuePromptAsyncApiBee(context)
}
