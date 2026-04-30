const TERMINATE_HONEY_TYPE = "__Terminate__"
const DEFAULT_TICK_MS = 16
const DEFAULT_LOGGER = {
  debug: (...args) => console.debug("[Hive]", ...args),
  info: (...args) => console.info("[Hive]", ...args),
  warn: (...args) => console.warn("[Hive]", ...args),
  error: (...args) => console.error("[Hive]", ...args),
}

function createRuntimeAdapters() {
  return {
    now: () => Date.now(),
    setTimeout: (fn, delay) => globalThis.setTimeout(fn, delay),
    clearTimeout: (handle) => globalThis.clearTimeout(handle),
    setInterval: (fn, delay) => globalThis.setInterval(fn, delay),
    clearInterval: (handle) => globalThis.clearInterval(handle),
  }
}

function toError(value) {
  if (value instanceof Error) return value
  if (typeof value === "string") return new Error(value)
  return new Error("Unknown Hive error")
}

function danceKey(name, version) {
  return `${name}@${version}`
}

function isObject(value) {
  return typeof value === "object" && value !== null
}

function isHoney(value) {
  return isObject(value) && typeof value.type === "string"
}

function makeErrorHoney(reason, fallbackType) {
  const error = toError(reason)
  return {
    type: fallbackType ?? "ErrorHoney",
    payload: {
      message: error.message,
    },
  }
}

function normalizeBeeSuccess(result) {
  if (!result) return { resultHoney: undefined, reportHoney: undefined }
  if (isHoney(result)) return { resultHoney: result, reportHoney: undefined }
  if (!isObject(result)) return { resultHoney: undefined, reportHoney: undefined }
  return {
    resultHoney: isHoney(result.resultHoney) ? result.resultHoney : undefined,
    reportHoney: isHoney(result.reportHoney) ? result.reportHoney : undefined,
  }
}

function normalizeBeeFailure(error) {
  if (!isObject(error)) return { errorHoney: makeErrorHoney(error), reportHoney: undefined }
  return {
    errorHoney: isHoney(error.errorHoney) ? error.errorHoney : makeErrorHoney(error),
    reportHoney: isHoney(error.reportHoney) ? error.reportHoney : undefined,
  }
}

function parsePath(path) {
  if (path === "$") return []
  if (!path.startsWith("$.")) return null
  const body = path.slice(2)
  if (!body) return []
  const parts = []
  let token = ""
  let i = 0
  while (i < body.length) {
    const char = body[i]
    if (char === ".") {
      if (token) parts.push(token)
      token = ""
      i += 1
      continue
    }
    if (char === "[") {
      if (token) {
        parts.push(token)
        token = ""
      }
      const close = body.indexOf("]", i)
      if (close < 0) return null
      const rawIndex = body.slice(i + 1, close).trim()
      const numericIndex = Number(rawIndex)
      if (!Number.isInteger(numericIndex)) return null
      parts.push(numericIndex)
      i = close + 1
      continue
    }
    token += char
    i += 1
  }
  if (token) parts.push(token)
  return parts
}

function readPathValue(source, path) {
  const parts = parsePath(path)
  if (!parts) return undefined
  return parts.reduce((current, part) => {
    if (current === undefined || current === null) return undefined
    if (typeof part === "number") return current[part]
    return current[part]
  }, source)
}

function resolveTemplateExpression(expression, scope) {
  const trimmed = expression.trim()
  if (!trimmed) return undefined
  return trimmed.split(".").reduce((current, part) => {
    if (current === undefined || current === null) return undefined
    if (part === "$") return current
    return current[part]
  }, scope)
}

function renderTemplateString(template, scope) {
  const single = template.match(/^\$\{([^}]+)\}$/)
  if (single) return resolveTemplateExpression(single[1], scope)
  return template.replace(/\$\{([^}]+)\}/g, (_match, expr) => {
    const resolved = resolveTemplateExpression(expr, scope)
    if (resolved === undefined || resolved === null) return ""
    return String(resolved)
  })
}

function renderTemplateNode(node, scope) {
  if (typeof node === "string") return renderTemplateString(node, scope)
  if (Array.isArray(node)) return node.map((item) => renderTemplateNode(item, scope))
  if (!isObject(node)) return node
  return Object.keys(node).reduce((acc, key) => {
    acc[key] = renderTemplateNode(node[key], scope)
    return acc
  }, {})
}

function withTimeout(promise, timeoutMs, runtime, timeoutMessage) {
  if (!timeoutMs || timeoutMs <= 0) return promise
  return new Promise((resolve, reject) => {
    const handle = runtime.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    promise.then(
      (value) => {
        runtime.clearTimeout(handle)
        resolve(value)
      },
      (error) => {
        runtime.clearTimeout(handle)
        reject(error)
      },
    )
  })
}

function parseCronField(token, min, max) {
  const value = token.trim()
  if (value === "*") return () => true
  if (value.startsWith("*/")) {
    const step = Number(value.slice(2))
    if (!Number.isInteger(step) || step <= 0) return null
    return (n) => n >= min && n <= max && (n - min) % step === 0
  }
  const checks = value.split(",").map((part) => {
    const piece = part.trim()
    if (!piece) return null
    if (piece.includes("-")) {
      const range = piece.split("-")
      const start = Number(range[0])
      const end = Number(range[1])
      if (!Number.isInteger(start) || !Number.isInteger(end)) return null
      if (start < min || end > max || start > end) return null
      return (n) => n >= start && n <= end
    }
    const fixed = Number(piece)
    if (!Number.isInteger(fixed) || fixed < min || fixed > max) return null
    return (n) => n === fixed
  })
  if (checks.some((check) => check === null)) return null
  return (n) => checks.some((check) => check(n))
}

function parseCron(expression) {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5 && fields.length !== 6) return null
  const withSecond = fields.length === 6
  const secondCheck = withSecond ? parseCronField(fields[0], 0, 59) : () => true
  const minuteCheck = parseCronField(fields[withSecond ? 1 : 0], 0, 59)
  const hourCheck = parseCronField(fields[withSecond ? 2 : 1], 0, 23)
  const dayCheck = parseCronField(fields[withSecond ? 3 : 2], 1, 31)
  const monthCheck = parseCronField(fields[withSecond ? 4 : 3], 1, 12)
  const weekCheck = parseCronField(fields[withSecond ? 5 : 4], 0, 6)
  if (!secondCheck || !minuteCheck || !hourCheck || !dayCheck || !monthCheck || !weekCheck) return null
  return {
    withSecond,
    matches(date) {
      return (
        secondCheck(date.getSeconds()) &&
        minuteCheck(date.getMinutes()) &&
        hourCheck(date.getHours()) &&
        dayCheck(date.getDate()) &&
        monthCheck(date.getMonth() + 1) &&
        weekCheck(date.getDay())
      )
    },
  }
}

export class Hive {
  constructor(options = {}) {
    this._runtime = options.runtime ? { ...createRuntimeAdapters(), ...options.runtime } : createRuntimeAdapters()
    this._logger = options.logger ? { ...DEFAULT_LOGGER, ...options.logger } : DEFAULT_LOGGER
    this._autoStartScheduled = options.autoStartScheduled !== false
    this._autoStartOnInput = options.autoStartOnInput !== false
    this._tickMs = Number.isInteger(options.updateTickMs) ? Math.max(1, options.updateTickMs) : DEFAULT_TICK_MS
    this._beeFactories = new Map()
    this._dances = new Map()
    this._danceByName = new Map()
    this._instances = new Map()
    this._schedules = new Map()
    this._children = new Map()
    this._instanceSeed = 0
    this._lastTickAt = this._runtime.now()
    this._updateTimer = this._runtime.setInterval(() => this._tickUpdates(), this._tickMs)
  }

  registerBee(config, maybeVersion, maybeFactory) {
    if (typeof config === "string") {
      if (typeof maybeVersion !== "string") throw new Error("registerBee(name, version, factory) requires version")
      if (typeof maybeFactory !== "function") throw new Error("registerBee(name, version, factory) requires factory")
      this._beeFactories.set(danceKey(config, maybeVersion), maybeFactory)
      return this
    }
    if (!isObject(config)) throw new Error("registerBee(config) requires an object")
    if (typeof config.name !== "string" || typeof config.version !== "string") {
      throw new Error("registerBee(config) requires name and version")
    }
    if (typeof config.create !== "function") throw new Error("registerBee(config) requires create factory")
    this._beeFactories.set(danceKey(config.name, config.version), config.create)
    return this
  }

  registerDance(dance) {
    this._validateDance(dance)
    const key = danceKey(dance.name, dance.version)
    this._dances.set(key, dance)
    this._danceByName.set(dance.name, dance)
    this._refreshScheduleForDance(dance)
    return this
  }

  startDance(name, options = {}) {
    const dance = this._resolveDance(name, options.version)
    if (!dance) throw new Error(`Dance not found: ${name}${options.version ? `@${options.version}` : ""}`)
    const instance = this._createInstance(dance, options)
    if (isHoney(options.inputHoney)) this._rememberHoney(instance, options.inputHoney)
    this._wakeInstance(instance)
    return {
      instanceId: instance.id,
      done: instance.done,
    }
  }

  publish(honey, options = {}) {
    if (!isHoney(honey)) throw new Error("publish(honey) requires a Honey object")
    const deliveredTo = []
    const startedInstances = []
    if (options.instanceId) {
      const delivered = this._deliverHoneyToInstance(options.instanceId, honey)
      if (delivered) deliveredTo.push(options.instanceId)
      return { deliveredTo, startedInstances }
    }
    this._instances.forEach((instance) => {
      this._enqueueHoney(instance, honey)
      deliveredTo.push(instance.id)
      if (instance.status === "waiting" && (instance.waitingFor === honey.type || honey.type === TERMINATE_HONEY_TYPE)) {
        instance.status = "running"
        instance.waitingFor = null
        this._wakeInstance(instance)
      }
    })
    if (!this._autoStartOnInput) return { deliveredTo, startedInstances }
    this._danceByName.forEach((dance) => {
      if (dance.input !== honey.type) return
      const started = this.startDance(dance.name, {
        version: dance.version,
        inputHoney: honey,
      })
      startedInstances.push(started.instanceId)
    })
    return { deliveredTo, startedInstances }
  }

  listInstances() {
    return Array.from(this._instances.values()).map((instance) => ({
      id: instance.id,
      danceName: instance.dance.name,
      danceVersion: instance.dance.version,
      status: instance.status,
      currentStepId: instance.currentStepId,
      parentInstanceId: instance.parentInstanceId,
    }))
  }

  terminateInstance(instanceId, reason = "manual") {
    const instance = this._instances.get(instanceId)
    if (!instance) return false
    const terminateStep = instance.dance.steps.find((step) => step.triggeredBy === TERMINATE_HONEY_TYPE)
    if (!terminateStep) {
      this._logger.warn("Terminate signal not handled by dance, force-closing instance", instanceId)
      this._finalizeInstance(instance, "terminated", {
        type: TERMINATE_HONEY_TYPE,
        payload: { reason },
      })
      return true
    }
    const terminateHoney = {
      type: TERMINATE_HONEY_TYPE,
      payload: { reason },
    }
    this._enqueueHoney(instance, terminateHoney)
    instance.pendingTransitions.push({
      targetId: terminateStep.id,
      honey: terminateHoney,
    })
    if (instance.status === "waiting") {
      instance.status = "running"
      instance.waitingFor = null
    }
    this._wakeInstance(instance)
    return true
  }

  async destroy() {
    this._runtime.clearInterval(this._updateTimer)
    this._schedules.forEach((dispose) => dispose())
    this._schedules.clear()
    const active = Array.from(this._instances.values())
    active.forEach((instance) => this.terminateInstance(instance.id, "hive-destroy"))
    await Promise.all(active.map((instance) => instance.done.catch(() => undefined)))
  }

  _validateDance(dance) {
    if (!isObject(dance)) throw new Error("dance must be an object")
    if (typeof dance.name !== "string" || !dance.name) throw new Error("dance.name is required")
    if (typeof dance.version !== "string" || !dance.version) throw new Error("dance.version is required")
    if (!Array.isArray(dance.steps) || dance.steps.length === 0) throw new Error("dance.steps must be a non-empty array")
    if (!Array.isArray(dance.bees)) throw new Error("dance.bees must be an array")
    if (!Array.isArray(dance.dances)) throw new Error("dance.dances must be an array")
    if (dance.needLog !== undefined && typeof dance.needLog !== "boolean") {
      throw new Error("dance.needLog must be boolean when provided")
    }
    const stepIds = new Set()
    dance.steps.forEach((step) => {
      if (!isObject(step) || typeof step.id !== "string" || !step.id) throw new Error(`Invalid step in ${dance.name}`)
      if (stepIds.has(step.id)) throw new Error(`Duplicate step id "${step.id}" in ${dance.name}`)
      stepIds.add(step.id)
      if (typeof step.alias !== "string" || !step.alias) throw new Error(`Step "${step.id}" must have alias`)
      if (step.log !== undefined && step.log !== "none" && step.log !== "console" && step.log !== "file") {
        throw new Error(`Step "${step.id}" log must be one of: none, console, file`)
      }
      if (step.onSuccess && !stepIds.has(step.onSuccess) && !dance.steps.find((it) => it.id === step.onSuccess)) {
        throw new Error(`Step "${step.id}" onSuccess points to unknown step "${step.onSuccess}"`)
      }
      if (step.onFail && !stepIds.has(step.onFail) && !dance.steps.find((it) => it.id === step.onFail)) {
        throw new Error(`Step "${step.id}" onFail points to unknown step "${step.onFail}"`)
      }
      if (step.fork && !stepIds.has(step.fork) && !dance.steps.find((it) => it.id === step.fork)) {
        throw new Error(`Step "${step.id}" fork points to unknown step "${step.fork}"`)
      }
    })
    const beeAliases = new Set(dance.bees.map((item) => item.alias))
    const danceAliases = new Set(dance.dances.map((item) => item.alias))
    dance.steps.forEach((step) => {
      if (step.alias === "queen-bee") return
      if (beeAliases.has(step.alias)) return
      if (danceAliases.has(step.alias)) return
      throw new Error(`Step "${step.id}" alias "${step.alias}" is not declared in bees/dances`)
    })
  }

  _resolveDance(name, version) {
    if (version) return this._dances.get(danceKey(name, version))
    return this._danceByName.get(name)
  }

  _createInstance(dance, options) {
    const stepMap = dance.steps.reduce((acc, step) => {
      acc.set(step.id, step)
      return acc
    }, new Map())
    const bees = dance.bees.reduce((acc, descriptor) => {
      if (descriptor.alias === "queen-bee") return acc
      const factory = this._beeFactories.get(danceKey(descriptor.name, descriptor.version))
      if (!factory) throw new Error(`Bee factory not found: ${descriptor.name}@${descriptor.version}`)
      acc.set(descriptor.alias, factory())
      return acc
    }, new Map())
    const danceAliases = dance.dances.reduce((acc, descriptor) => {
      const resolved = this._resolveDance(descriptor.name, descriptor.version)
      if (!resolved) throw new Error(`Sub dance not found: ${descriptor.name}@${descriptor.version}`)
      acc.set(descriptor.alias, resolved)
      return acc
    }, new Map())
    this._instanceSeed += 1
    const instanceId = options.instanceId ?? `${dance.name}-${this._instanceSeed}`
    let resolveDone = () => {}
    let rejectDone = () => {}
    const done = new Promise((resolve, reject) => {
      resolveDone = resolve
      rejectDone = reject
    })
    const instance = {
      id: instanceId,
      dance,
      parentInstanceId: options.parentInstanceId ?? null,
      status: "running",
      currentStepId: dance.steps[0].id,
      waitingFor: null,
      bees,
      danceAliases,
      stepMap,
      inbox: new Map(),
      honeyStore: new Map(),
      pendingTransitions: [],
      pendingForks: 0,
      activeUpdates: new Set(),
      queue: Promise.resolve(),
      wakeQueued: false,
      retries: 0,
      lastHoney: undefined,
      timeoutHandle: null,
      done,
      resolveDone,
      rejectDone,
      cascadeTermination: dance.cascadeTermination !== false,
    }
    if (Number.isInteger(dance.timeout) && dance.timeout > 0) {
      instance.timeoutHandle = this._runtime.setTimeout(() => {
        this.terminateInstance(instance.id, "dance-timeout")
      }, dance.timeout)
    }
    if (instance.parentInstanceId) {
      const siblings = this._children.get(instance.parentInstanceId) ?? new Set()
      siblings.add(instance.id)
      this._children.set(instance.parentInstanceId, siblings)
    }
    this._instances.set(instanceId, instance)
    return instance
  }

  _refreshScheduleForDance(dance) {
    const key = danceKey(dance.name, dance.version)
    const cleanup = this._schedules.get(key)
    if (cleanup) cleanup()
    if (!this._autoStartScheduled) return
    if (!dance.schedule) return
    if (Number.isInteger(dance.schedule.interval) && dance.schedule.interval > 0) {
      const timer = this._runtime.setInterval(() => {
        this.startDance(dance.name, {
          version: dance.version,
        })
      }, dance.schedule.interval)
      this._schedules.set(key, () => this._runtime.clearInterval(timer))
      return
    }
    if (typeof dance.schedule.cron === "string") {
      const parsed = parseCron(dance.schedule.cron)
      if (!parsed) {
        this._logger.warn(`Invalid cron expression in ${dance.name}:`, dance.schedule.cron)
        return
      }
      let lastTick = ""
      const timer = this._runtime.setInterval(() => {
        const now = new Date()
        if (!parsed.matches(now)) return
        const signature = parsed.withSecond
          ? `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`
          : `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`
        if (signature === lastTick) return
        lastTick = signature
        this.startDance(dance.name, {
          version: dance.version,
        })
      }, 1_000)
      this._schedules.set(key, () => this._runtime.clearInterval(timer))
    }
  }

  _tickUpdates() {
    const now = this._runtime.now()
    const delta = Math.max(0, now - this._lastTickAt)
    this._lastTickAt = now
    this._instances.forEach((instance) => {
      if (instance.status !== "running" && instance.status !== "waiting") return
      if (instance.activeUpdates.size === 0) return
      instance.activeUpdates.forEach((alias) => {
        const bee = instance.bees.get(alias)
        if (!bee || typeof bee.update !== "function") return
        Promise.resolve()
          .then(() => bee.update(delta))
          .catch((error) => this._logger.error("Bee update failed", alias, error))
      })
    })
  }

  _deliverHoneyToInstance(instanceId, honey) {
    const instance = this._instances.get(instanceId)
    if (!instance) return false
    this._enqueueHoney(instance, honey)
    if (instance.status === "waiting" && (instance.waitingFor === honey.type || honey.type === TERMINATE_HONEY_TYPE)) {
      instance.status = "running"
      instance.waitingFor = null
      this._wakeInstance(instance)
    }
    return true
  }

  _enqueueHoney(instance, honey) {
    const bucket = instance.inbox.get(honey.type) ?? []
    bucket.push(honey)
    instance.inbox.set(honey.type, bucket)
  }

  _takeInboxHoney(instance, type) {
    const bucket = instance.inbox.get(type)
    if (!bucket || bucket.length === 0) return undefined
    const honey = bucket.shift()
    if (bucket.length === 0) instance.inbox.delete(type)
    return honey
  }

  _rememberHoney(instance, honey) {
    if (!isHoney(honey)) return
    const bucket = instance.honeyStore.get(honey.type) ?? []
    bucket.push(honey)
    instance.honeyStore.set(honey.type, bucket)
    instance.lastHoney = honey
  }

  _readLatestHoney(instance, type) {
    const bucket = instance.honeyStore.get(type)
    if (!bucket || bucket.length === 0) return undefined
    return bucket[bucket.length - 1]
  }

  _wakeInstance(instance) {
    if (!this._instances.has(instance.id)) return
    if (instance.wakeQueued) return
    if (instance.status !== "running") return
    instance.wakeQueued = true
    const fire = () => {
      instance.wakeQueued = false
      instance.queue = instance.queue.then(
        () => this._runInstance(instance),
        () => this._runInstance(instance),
      )
    }
    if (typeof queueMicrotask === "function") {
      queueMicrotask(fire)
      return
    }
    this._runtime.setTimeout(fire, 0)
  }

  async _runInstance(instance) {
    if (!this._instances.has(instance.id)) return
    while (instance.status === "running") {
      const transition = instance.pendingTransitions.shift()
      if (transition) {
        if (transition.honey) this._rememberHoney(instance, transition.honey)
        if (!transition.targetId) {
          this._finalizeInstance(instance, "completed", transition.honey ?? instance.lastHoney)
          return
        }
        instance.currentStepId = transition.targetId
      }
      const step = instance.stepMap.get(instance.currentStepId)
      if (!step) {
        this._finalizeInstance(instance, "completed", instance.lastHoney)
        return
      }
      const incoming = step.triggeredBy ? this._takeInboxHoney(instance, step.triggeredBy) : undefined
      if (step.triggeredBy && !incoming) {
        instance.status = "waiting"
        instance.waitingFor = step.triggeredBy
        return
      }
      await this._executeStep(instance, step, incoming)
    }
  }

  async _executeStep(instance, step, incomingHoney) {
    const stepInput = incomingHoney ?? (step.input ? this._readLatestHoney(instance, step.input) : instance.lastHoney)
    const timeoutMs = Number.isInteger(step.timeout) ? step.timeout : 0
    const runner = this._runStepAlias(instance, step, stepInput)
    const wrapped = withTimeout(
      runner,
      timeoutMs,
      this._runtime,
      `Step timeout: ${instance.dance.name}.${step.id} after ${timeoutMs}ms`,
    )
    if (step.update && instance.bees.has(step.alias)) instance.activeUpdates.add(step.alias)
    const settle = wrapped.then(
      (success) => ({
        ok: true,
        ...success,
      }),
      (error) => ({
        ok: false,
        ...normalizeBeeFailure(error),
        error,
      }),
    )
    if (step.fork) {
      instance.pendingForks += 1
      instance.currentStepId = step.fork
      settle.then((outcome) => {
        if (step.update) instance.activeUpdates.delete(step.alias)
        instance.pendingForks = Math.max(0, instance.pendingForks - 1)
        this._applyStepOutcome(instance, step, outcome)
      })
      return
    }
    const outcome = await settle
    if (step.update) instance.activeUpdates.delete(step.alias)
    this._applyStepOutcome(instance, step, outcome)
  }

  _resolveStepLogMode(instance, step) {
    if (instance.dance.needLog === false) return "none"
    if (typeof step.log !== "string" || !step.log) return "console"
    if (step.log === "none" || step.log === "console" || step.log === "file") return step.log
    return "console"
  }

  _logStepSuccess(instance, step, outcome) {
    const mode = this._resolveStepLogMode(instance, step)
    if (mode === "none") return
    if (mode === "console") {
      this._logger.info("Step success", instance.id, step.id, outcome.resultHoney?.type ?? "none")
      return
    }
    if (mode === "file") this._logger.info("[file]", instance.id, step.id, outcome.resultHoney?.type ?? "none")
  }

  _logStepFailure(instance, step, outcome) {
    const mode = this._resolveStepLogMode(instance, step)
    if (mode === "none") return
    if (mode === "console") {
      this._logger.warn("Step failed", instance.id, step.id, outcome.errorHoney?.type ?? "none")
      return
    }
    if (mode === "file") this._logger.warn("[file]", instance.id, step.id, outcome.errorHoney?.type ?? "none")
  }

  _applyStepOutcome(instance, step, outcome) {
    if (!this._instances.has(instance.id)) return
    if (outcome.reportHoney) this._rememberHoney(instance, outcome.reportHoney)
    if (outcome.ok) {
      if (outcome.resultHoney) this._rememberHoney(instance, outcome.resultHoney)
      this._logStepSuccess(instance, step, outcome)
      if (step.onSuccess) {
        instance.pendingTransitions.push({
          targetId: step.onSuccess,
          honey: outcome.resultHoney,
        })
        if (instance.status === "waiting") {
          instance.status = "running"
          instance.waitingFor = null
        }
        this._wakeInstance(instance)
        return
      }
      if (instance.pendingForks > 0) {
        instance.status = "waiting"
        instance.waitingFor = "__fork__"
        return
      }
      this._finalizeInstance(instance, "completed", outcome.resultHoney ?? instance.lastHoney)
      return
    }
    if (outcome.errorHoney) this._rememberHoney(instance, outcome.errorHoney)
    this._logStepFailure(instance, step, outcome)
    if (step.onFail) {
      instance.pendingTransitions.push({
        targetId: step.onFail,
        honey: outcome.errorHoney,
      })
      if (instance.status === "waiting") {
        instance.status = "running"
        instance.waitingFor = null
      }
      this._wakeInstance(instance)
      return
    }
    if (instance.dance.retry && Number.isInteger(instance.dance.retry.maxRetries) && instance.retries < instance.dance.retry.maxRetries) {
      instance.retries += 1
      const retryTarget = instance.dance.retry.step ?? instance.dance.steps[0].id
      instance.pendingTransitions.push({
        targetId: retryTarget,
      })
      this._wakeInstance(instance)
      return
    }
    this._failInstance(instance, outcome.error)
  }

  _runStepAlias(instance, step, inputHoney) {
    if (step.alias === "queen-bee") return this._runQueenBee(instance, inputHoney)
    if (step.multiplicity) return this._runMultiplicity(instance, step, inputHoney)
    const childDance = instance.danceAliases.get(step.alias)
    if (childDance) return this._runChildDance(instance, childDance, inputHoney)
    const bee = instance.bees.get(step.alias)
    if (!bee || typeof bee.execute !== "function") return Promise.reject(new Error(`Bee alias not found: ${step.alias}`))
    return Promise.resolve(bee.execute(inputHoney, this._createBeeContext(instance, step, inputHoney))).then((result) =>
      normalizeBeeSuccess(result),
    )
  }

  _createBeeContext(instance, step, inputHoney) {
    return {
      instanceId: instance.id,
      danceName: instance.dance.name,
      danceVersion: instance.dance.version,
      stepId: step.id,
      inputHoney,
      hive: this,
      publish: (honey, options) => this.publish(honey, options),
      startDance: (name, options) => this.startDance(name, options),
      terminateInstance: (id, reason) => this.terminateInstance(id, reason),
      listInstances: () => this.listInstances(),
      logger: this._logger,
    }
  }

  _runChildDance(instance, childDance, inputHoney) {
    const child = this._createInstance(childDance, {
      parentInstanceId: instance.id,
      inputHoney,
    })
    if (isHoney(inputHoney)) this._rememberHoney(child, inputHoney)
    this._wakeInstance(child)
    return child.done.then(
      (honey) => ({
        resultHoney: honey,
      }),
      (error) => Promise.reject(error),
    )
  }

  _runMultiplicity(instance, step, inputHoney) {
    const childDance = instance.danceAliases.get(step.alias)
    if (!childDance) return Promise.reject(new Error(`Multiplicity step must target sub dance alias: ${step.alias}`))
    const sourceValue = readPathValue(inputHoney?.payload ?? inputHoney ?? {}, step.multiplicity.source)
    if (!Array.isArray(sourceValue)) {
      return Promise.reject(new Error(`Multiplicity source must resolve to array: ${step.multiplicity.source}`))
    }
    const scopeBase = {
      input: inputHoney?.payload ?? inputHoney ?? {},
    }
    const parallel = step.multiplicity.parallel !== false
    const runner = sourceValue.reduce(
      (chain, item, index) =>
        chain.then(async (state) => {
          const scope = { ...scopeBase, item, index }
          const rawId = renderTemplateString(step.multiplicity.instanceIdTemplate, scope)
          const childInstanceId = typeof rawId === "string" && rawId ? rawId : `${instance.id}-${step.id}-${index}`
          const templatedInput = renderTemplateNode(step.multiplicity.inputTemplate, scope)
          const childInput = isHoney(templatedInput) ? templatedInput : { type: step.input ?? "InputHoney", payload: templatedInput }
          const child = this._createInstance(childDance, {
            parentInstanceId: instance.id,
            instanceId: childInstanceId,
            inputHoney: childInput,
          })
          this._rememberHoney(child, childInput)
          this._wakeInstance(child)
          if (!parallel) await child.done
          state.instanceIds.push(child.id)
          return state
        }),
      Promise.resolve({ instanceIds: [] }),
    )
    return runner.then((state) => ({
      resultHoney: {
        type: step.output ?? "MultiplicityResultHoney",
        payload: {
          instanceIds: state.instanceIds,
          count: state.instanceIds.length,
        },
      },
    }))
  }

  _runQueenBee(instance, inputHoney) {
    const payload = inputHoney?.payload
    if (!isObject(payload) || typeof payload.action !== "string") {
      return Promise.reject(new Error("ManageDanceHoney payload.action is required"))
    }
    if (payload.action === "list") {
      return Promise.resolve({
        resultHoney: {
          type: "ManageDanceResultHoney",
          payload: {
            action: "list",
            instances: this.listInstances(),
          },
        },
      })
    }
    if (payload.action === "create") {
      if (typeof payload.danceName !== "string" || !payload.danceName) {
        return Promise.reject(new Error("ManageDanceHoney create requires danceName"))
      }
      const started = this.startDance(payload.danceName, {
        version: typeof payload.danceVersion === "string" ? payload.danceVersion : undefined,
        inputHoney: isHoney(payload.inputHoney) ? payload.inputHoney : undefined,
        instanceId: typeof payload.instanceId === "string" ? payload.instanceId : undefined,
        parentInstanceId: instance.id,
      })
      return Promise.resolve({
        resultHoney: {
          type: "ManageDanceResultHoney",
          payload: {
            action: "create",
            instanceId: started.instanceId,
          },
        },
      })
    }
    if (payload.action === "terminate") {
      if (typeof payload.instanceId !== "string" || !payload.instanceId) {
        return Promise.reject(new Error("ManageDanceHoney terminate requires instanceId"))
      }
      const terminated = this.terminateInstance(payload.instanceId, "queen-bee")
      return Promise.resolve({
        resultHoney: {
          type: "ManageDanceResultHoney",
          payload: {
            action: "terminate",
            instanceId: payload.instanceId,
            terminated,
          },
        },
      })
    }
    return Promise.reject(new Error(`Unknown ManageDanceHoney action: ${payload.action}`))
  }

  _finalizeInstance(instance, status, finalHoney) {
    if (!this._instances.has(instance.id)) return
    instance.status = status
    if (instance.timeoutHandle) {
      this._runtime.clearTimeout(instance.timeoutHandle)
      instance.timeoutHandle = null
    }
    instance.bees.forEach((bee, alias) => {
      if (!bee || typeof bee.destroy !== "function") return
      Promise.resolve()
        .then(() => bee.destroy())
        .catch((error) => this._logger.warn("Bee destroy failed", alias, error))
    })
    if (instance.parentInstanceId) {
      const siblings = this._children.get(instance.parentInstanceId)
      if (siblings) {
        siblings.delete(instance.id)
        if (siblings.size === 0) this._children.delete(instance.parentInstanceId)
      }
    }
    if (instance.cascadeTermination) {
      const children = this._children.get(instance.id)
      if (children && children.size > 0) {
        Array.from(children).forEach((childId) => this.terminateInstance(childId, "parent-finished"))
      }
      this._children.delete(instance.id)
    }
    this._instances.delete(instance.id)
    instance.resolveDone(finalHoney)
  }

  _failInstance(instance, reason) {
    if (!this._instances.has(instance.id)) return
    const error = toError(reason)
    instance.status = "failed"
    if (instance.timeoutHandle) {
      this._runtime.clearTimeout(instance.timeoutHandle)
      instance.timeoutHandle = null
    }
    instance.bees.forEach((bee, alias) => {
      if (!bee || typeof bee.destroy !== "function") return
      Promise.resolve()
        .then(() => bee.destroy())
        .catch((destroyError) => this._logger.warn("Bee destroy failed", alias, destroyError))
    })
    const children = this._children.get(instance.id)
    if (children && children.size > 0) {
      Array.from(children).forEach((childId) => this.terminateInstance(childId, "parent-failed"))
    }
    this._children.delete(instance.id)
    this._instances.delete(instance.id)
    instance.rejectDone(error)
  }
}

export default Hive

function defaultEntryLogger() {
  return {
    debug: (...args) => console.debug("[HiveRuntime]", ...args),
    info: (...args) => console.info("[HiveRuntime]", ...args),
    warn: (...args) => console.warn("[HiveRuntime]", ...args),
    error: (...args) => console.error("[HiveRuntime]", ...args),
  }
}

function resolveLogger(options) {
  if (options?.logger) return options.logger
  return defaultEntryLogger()
}

function resolveBootstrapName(program) {
  if (!program?.bootstrap) return ""
  if (typeof program.bootstrap === "string") return program.bootstrap
  if (typeof program.bootstrap.dance === "string") return program.bootstrap.dance
  return ""
}

function resolveBootstrapInput(program) {
  if (!isObject(program?.bootstrap)) return undefined
  if (isHoney(program.bootstrap.inputHoney)) return program.bootstrap.inputHoney
  return undefined
}

export async function createSwarmRuntime(program, options = {}) {
  if (!isObject(program)) throw new Error("program 必须是对象")
  if (typeof program.registerBees !== "function") throw new Error("program.registerBees 必须是函数")
  if (typeof program.loadDances !== "function") throw new Error("program.loadDances 必须是函数")
  const logger = resolveLogger(options)
  const hive = options.hive instanceof Hive ? options.hive : new Hive({ logger: options.hiveLogger ?? logger })
  program.registerBees(hive)
  const dances = await program.loadDances()
  if (!Array.isArray(dances)) throw new Error("program.loadDances 必须返回数组")
  dances.forEach((dance) => hive.registerDance(dance))
  const runtime = {
    hive,
    startDance(name, inputHoney) {
      try {
        const run = hive.startDance(name, inputHoney ? { inputHoney } : {})
        run.done.catch((error) => {
          logger.error(`Dance 执行失败: ${name}`, error)
        })
        return run
      } catch (error) {
        logger.error(`Dance 启动失败: ${name}`, error)
        return null
      }
    },
    publish(honey, publishOptions = {}) {
      return hive.publish(honey, publishOptions)
    },
    async destroy() {
      await hive.destroy()
    },
  }
  if (typeof program.bind === "function") program.bind(runtime)
  if (options.autoBootstrap !== false) {
    const bootstrapName = resolveBootstrapName(program)
    if (bootstrapName) runtime.startDance(bootstrapName, resolveBootstrapInput(program))
  }
  return runtime
}

export async function autoBoot(programFactory, options = {}) {
  const program = typeof programFactory === "function" ? programFactory() : programFactory
  return createSwarmRuntime(program, options)
}

function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
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

function findAssistantReply(messages, since) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (roleOf(msg) !== "assistant") continue
    if (createdAt(msg) < since) continue
    const text = textFromMessage(msg)
    if (text) return text
  }
  return ""
}

function buildBeeReportHoney(beeName, status, summary, detail = {}) {
  return {
    type: "BeeReportHoney",
    payload: {
      beeName,
      status,
      summary,
      detail,
      timestamp: Date.now(),
    },
  }
}

function toBeeErrorDetail(error) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "未知错误"
}

function toBeeFailureContract(beeName, error) {
  if (error && typeof error === "object" && error.errorHoney && error.reportHoney) return error
  return {
    errorHoney: {
      type: "ErrorHoney",
      payload: {
        message: toBeeErrorDetail(error),
      },
    },
    reportHoney: buildBeeReportHoney(beeName, "error", "bee execute failed", {
      detail: toBeeErrorDetail(error),
    }),
  }
}

function toBeeSuccessContract(beeName, output) {
  if (output && typeof output === "object" && output.resultHoney && output.reportHoney) return output
  if (output && typeof output === "object" && typeof output.type === "string") {
    return {
      resultHoney: output,
      reportHoney: buildBeeReportHoney(beeName, "success", "bee execute success"),
    }
  }
  if (output && typeof output === "object" && output.resultHoney) {
    return {
      resultHoney: output.resultHoney,
      reportHoney: buildBeeReportHoney(beeName, "success", "bee execute success"),
    }
  }
  return {
    resultHoney: {
      type: "EmptyHoney",
      payload: {},
    },
    reportHoney: buildBeeReportHoney(beeName, "success", "bee execute success"),
  }
}

function ensureBeeContract(descriptor, instance) {
  if (!instance || typeof instance !== "object") throw new Error(`Bee 工厂返回非法实例: ${descriptor.name}`)
  if (typeof instance.destroy !== "function") instance.destroy = () => {}
  if (typeof instance.execute !== "function") {
    instance.execute = () =>
      Promise.reject(
        toBeeFailureContract(descriptor.name, new Error(`Bee 缺少 execute: ${descriptor.name}@${descriptor.version}`)),
      )
    return instance
  }
  const rawExecute = instance.execute.bind(instance)
  instance.execute = (honey) =>
    Promise.resolve()
      .then(() => rawExecute(honey))
      .then((output) => toBeeSuccessContract(descriptor.name, output))
      .catch((error) => Promise.reject(toBeeFailureContract(descriptor.name, error)))
  return instance
}

function createContractHelpers() {
  return {
    resolveWithReport(beeName, summary, resultHoney, detail = {}) {
      return Promise.resolve({
        resultHoney,
        reportHoney: buildBeeReportHoney(beeName, "success", summary, detail),
      })
    },
    rejectWithReport(beeName, summary, errorHoney, detail = {}) {
      return Promise.reject({
        errorHoney,
        reportHoney: buildBeeReportHoney(beeName, "error", summary, detail),
      })
    },
  }
}

function registerLoadedBees(hive, context, beeDescriptors) {
  beeDescriptors.forEach((descriptor) => {
    if (typeof descriptor.create !== "function") throw new Error(`Bee 工厂缺失: ${descriptor.name}@${descriptor.version}`)
    hive.registerBee(descriptor.name, descriptor.version, () => ensureBeeContract(descriptor, descriptor.create(context)))
  })
}

function fileUrlToPath(url) {
  const path = decodeURIComponent(url.pathname)
  if (/^\/[A-Za-z]:/.test(path)) return path.slice(1)
  return path
}

function resolveElement(root, id) {
  const node = root.getElementById(id)
  if (!node) throw new Error(`缺少页面元素: #${id}`)
  return node
}

function createBrowserElements(projectConfig, rootDocument = document) {
  const ids = projectConfig?.ui?.elementIds || {}
  return {
    projectListEl: resolveElement(rootDocument, ids.projectListEl),
    messagesEl: resolveElement(rootDocument, ids.messagesEl),
    addProjectBtn: resolveElement(rootDocument, ids.addProjectBtn),
    composerEl: resolveElement(rootDocument, ids.composerEl),
    promptEl: resolveElement(rootDocument, ids.promptEl),
    fileInputEl: resolveElement(rootDocument, ids.fileInputEl),
    attachBtnEl: resolveElement(rootDocument, ids.attachBtnEl),
    attachmentsEl: resolveElement(rootDocument, ids.attachmentsEl),
  }
}

function createBrowserProjectContext(projectConfig, elements, options = {}) {
  const state = cloneValue(projectConfig.initialState)
  const apiBase = options.apiBase || projectConfig?.api?.base || "http://127.0.0.1:3000"
  const pollIntervalMs =
    Number.isInteger(options.pollIntervalMs) ? options.pollIntervalMs : projectConfig?.api?.pollIntervalMs ?? 1200
  const pollTimeoutMs =
    Number.isInteger(options.pollTimeoutMs) ? options.pollTimeoutMs : projectConfig?.api?.pollTimeoutMs ?? 60000
  const helpers = createContractHelpers()
  const context = {
    state,
    elements,
    startDance: null,
    resolveWithReport: helpers.resolveWithReport,
    rejectWithReport: helpers.rejectWithReport,
    ensureProjectMessages(projectId) {
      if (!state.messages[projectId]) state.messages[projectId] = []
    },
    pushMessage(projectId, role, content) {
      context.ensureProjectMessages(projectId)
      state.messages[projectId].push({ role, content })
    },
    renderProjectList() {
      elements.projectListEl.innerHTML = ""
      state.projects.forEach((project) => {
        const button = document.createElement("button")
        button.type = "button"
        button.className = `project-item${project.id === state.activeProjectId ? " active" : ""}`
        button.textContent = project.name
        button.addEventListener("click", () => {
          if (!context.startDance) return
          context.startDance(projectConfig.ui.dances.selectProject, {
            type: projectConfig.ui.honeyTypes.selectProject,
            payload: {
              projectId: project.id,
            },
          })
        })
        elements.projectListEl.appendChild(button)
      })
    },
    renderMessages() {
      const list = state.messages[state.activeProjectId] || []
      elements.messagesEl.innerHTML = ""
      list.forEach((msg) => {
        const item = document.createElement("div")
        item.className = `msg ${msg.role === "user" ? "user" : "ai"}`
        item.textContent = msg.content
        elements.messagesEl.appendChild(item)
      })
      elements.messagesEl.scrollTop = elements.messagesEl.scrollHeight
    },
    renderAttachments() {
      elements.attachmentsEl.innerHTML = ""
      state.files.forEach((file) => {
        const tag = document.createElement("span")
        tag.className = "file-tag"
        tag.textContent = file.name
        elements.attachmentsEl.appendChild(tag)
      })
    },
    syncFiles(files) {
      state.files = Array.from(files || [])
    },
    clearComposer() {
      elements.promptEl.value = ""
      state.files = []
      elements.fileInputEl.value = ""
    },
    activeProject() {
      return state.projects.find((item) => item.id === state.activeProjectId)
    },
    async request(path, init = {}) {
      const res = await fetch(`${apiBase}${path}`, {
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
    },
    async ensureSession(projectId, projectName) {
      const existing = state.sessionIDs[projectId]
      if (existing) return existing
      const created = await context.request("/session", {
        method: "POST",
        body: JSON.stringify({ title: projectName }),
      })
      const sessionID = created?.id
      if (!sessionID) throw new Error("创建会话失败：后端未返回 sessionID")
      state.sessionIDs[projectId] = sessionID
      return sessionID
    },
    fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error(`读取附件失败: ${file.name}`))
        reader.readAsDataURL(file)
      })
    },
    async sendPromptAsync(sessionID, parts) {
      await context.request(`/session/${sessionID}/prompt_async`, {
        method: "POST",
        body: JSON.stringify({ parts }),
      })
    },
    async waitAssistantReply(sessionID, since) {
      const deadline = Date.now() + pollTimeoutMs
      while (Date.now() < deadline) {
        const payload = await context.request(`/session/${sessionID}/message?limit=80`)
        const messages = listFromMessagesPayload(payload)
        const hit = findAssistantReply(messages, since)
        if (hit) return hit
        await sleep(pollIntervalMs)
      }
      return ""
    },
  }
  return context
}

function bindBrowserProjectHandlers(projectConfig, context, startDance) {
  const elements = context.elements
  context.startDance = startDance
  elements.addProjectBtn.addEventListener("click", () => {
    startDance(projectConfig.ui.dances.addProject, {
      type: projectConfig.ui.honeyTypes.addProject,
      payload: {},
    })
  })
  elements.attachBtnEl.addEventListener("click", () => {
    elements.fileInputEl.click()
  })
  elements.fileInputEl.addEventListener("change", () => {
    startDance(projectConfig.ui.dances.attachmentUpdate, {
      type: projectConfig.ui.honeyTypes.updateAttachments,
      payload: {
        files: Array.from(elements.fileInputEl.files || []),
      },
    })
  })
  elements.composerEl.addEventListener("submit", (event) => {
    event.preventDefault()
    const project = context.activeProject()
    if (!project) return
    const text = elements.promptEl.value.trim()
    if (!text && context.state.files.length === 0) return
    startDance(projectConfig.ui.dances.submitPrompt, {
      type: projectConfig.ui.honeyTypes.submitPrompt,
      payload: {
        projectId: project.id,
        text,
        files: Array.from(context.state.files),
      },
    })
  })
}

function createBunProjectContext(projectConfig, options = {}) {
  const state = cloneValue(projectConfig.initialState)
  const apiBase = options.apiBase || projectConfig?.api?.base || "http://127.0.0.1:3000"
  const helpers = createContractHelpers()
  return {
    state,
    resolveWithReport: helpers.resolveWithReport,
    rejectWithReport: helpers.rejectWithReport,
    ensureProjectMessages(projectId) {
      if (!state.messages[projectId]) state.messages[projectId] = []
    },
    pushMessage(projectId, role, content) {
      if (!state.messages[projectId]) state.messages[projectId] = []
      state.messages[projectId].push({ role, content })
    },
    renderProjectList() {},
    renderMessages() {},
    renderAttachments() {},
    syncFiles(files) {
      state.files = Array.from(files || [])
    },
    clearComposer() {
      state.files = []
    },
    async request(path, init = {}) {
      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      })
      const text = await response.text()
      if (!response.ok) throw new Error(text || `${response.status} ${response.statusText}`)
      if (!text) return null
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    },
    async ensureSession(projectId, projectName) {
      const existing = state.sessionIDs[projectId]
      if (existing) return existing
      const created = await this.request("/session", {
        method: "POST",
        body: JSON.stringify({ title: projectName }),
      })
      const sessionID = created?.id
      if (!sessionID) throw new Error("创建会话失败：后端未返回 sessionID")
      state.sessionIDs[projectId] = sessionID
      return sessionID
    },
    async fileToDataUrl(file) {
      if (typeof file === "string") {
        const bytes = await Bun.file(file).arrayBuffer()
        const base64 = Buffer.from(bytes).toString("base64")
        return `data:application/octet-stream;base64,${base64}`
      }
      throw new Error("Bun 运行时默认仅支持 string 路径附件")
    },
    async sendPromptAsync(sessionID, parts) {
      await this.request(`/session/${sessionID}/prompt_async`, {
        method: "POST",
        body: JSON.stringify({ parts }),
      })
    },
    async waitAssistantReply() {
      return ""
    },
  }
}

export async function createBrowserLoadedProgram(loadedProject, options = {}) {
  if (!loadedProject || typeof loadedProject !== "object") throw new Error("loadedProject 必须是对象")
  if (!loadedProject.projectConfig) throw new Error("loadedProject.projectConfig 缺失")
  const projectConfig = loadedProject.projectConfig
  const context = createBrowserProjectContext(projectConfig, createBrowserElements(projectConfig), options)
  return {
    registerBees(hive) {
      registerLoadedBees(hive, context, loadedProject.beeDescriptors || [])
    },
    async loadDances() {
      return loadedProject.dances || []
    },
    bind(runtime) {
      bindBrowserProjectHandlers(projectConfig, context, runtime.startDance)
    },
    bootstrap: projectConfig.bootstrap,
  }
}

export async function createBunLoadedProgram(loadedProject, options = {}) {
  if (!loadedProject || typeof loadedProject !== "object") throw new Error("loadedProject 必须是对象")
  if (!loadedProject.projectConfig) throw new Error("loadedProject.projectConfig 缺失")
  const context = options.context || createBunProjectContext(loadedProject.projectConfig, options)
  return {
    registerBees(hive) {
      registerLoadedBees(hive, context, loadedProject.beeDescriptors || [])
    },
    async loadDances() {
      return loadedProject.dances || []
    },
    bind(runtime) {
      if (typeof options.bind === "function") options.bind(runtime, context)
    },
    bootstrap: options.bootstrap === undefined ? loadedProject.projectConfig.bootstrap : options.bootstrap,
  }
}

export async function bootBrowserLoadedProject(loadedProject, options = {}) {
  const program = await createBrowserLoadedProgram(loadedProject, options)
  return createSwarmRuntime(program, {
    logger: options.logger ?? resolveLogger(options),
    autoBootstrap: options.autoBootstrap,
  })
}

export async function bootBunLoadedProject(loadedProject, options = {}) {
  const program = await createBunLoadedProgram(loadedProject, options)
  return createSwarmRuntime(program, {
    logger: options.logger ?? resolveLogger(options),
    autoBootstrap: options.autoBootstrap,
  })
}

export function danceFileToPath(url) {
  return fileUrlToPath(url)
}
