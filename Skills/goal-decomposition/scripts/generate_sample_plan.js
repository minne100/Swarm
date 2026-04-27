#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`wrote: ${filePath}`);
}

function getArg(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function readFileSafe(filePath) {
  if (!filePath) return "";
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function detectScopeByInput(text) {
  const normalized = (text || "").replace(/^\uFEFF/, "").trimStart();
  return normalized.startsWith("@MVP") ? "mvp" : "swarm";
}

const projectRoot = process.env.PROJECT_ROOT || process.cwd();
const slug = getArg("--slug", "sample-project");
const projectName = getArg("--project", "Sample Project");
const mission = getArg(
  "--mission",
  "Build a web-based multi-user app with voice and text chat as an MVP."
);
const language = getArg("--language", "en").toLowerCase();
const routeByInput = getArg("--route-by-input", "false").toLowerCase() === "true";
const userInputText = getArg("--user-input-text", "");
const userInputFileForRoute = getArg("--user-input-route-file", "");
let scope = getArg("--scope", "swarm").toLowerCase();
if (routeByInput) {
  scope = detectScopeByInput(userInputText || readFileSafe(userInputFileForRoute));
}

const defaultOutRoot =
  scope === "mvp"
    ? path.join(projectRoot, "Examples", "p2p-chatroom-4p")
    : path.join(projectRoot, "Examples");

const outRoot = path.resolve(
  getArg("--out-root", process.env.PLAN_OUTPUT_ROOT || defaultOutRoot)
);
const outDir = path.join(outRoot, slug);
ensureDir(outDir);

const zhPlan = `# 用户可读计划：${projectName}

## 你的目标
- ${mission} -> dance_id: D-M0

## 这次先做哪三件大事
1. 先把会用到的技能准备好 -> dance_id: D-S1
2. 把运行环境搭好 -> dance_id: D-S2
3. 做完整测试，确认真的可用 -> dance_id: D-S3

## 每件大事拆成可执行小任务
### A. 技能准备（D-S1）
- 生成目标拆解技能（把目标拆清楚） -> dance_id: D-T1
- 生成 Bee 技能（执行单元） -> dance_id: D-T2
- 生成 Honey 技能（数据载体） -> dance_id: D-T3
- 生成 Dance 技能（流程编排） -> dance_id: D-T4
- 生成学习迭代技能（持续改进） -> dance_id: D-T5

### B. 环境搭建（D-S2）
- 搭建房间与连接机制 -> dance_id: D-T6
- 打通文字聊天 -> dance_id: D-T7
- 打通语音聊天 -> dance_id: D-T8
- 做一个简单好懂的网页界面 -> dance_id: D-T9

### C. 测试验收（D-S3）
- 做基础测试（规则、边界、异常） -> dance_id: D-T10
- 做4人房间完整流程测试 -> dance_id: D-T11
- 验证出错时也会产出可读报告 -> dance_id: D-T12

## 验收标准（通俗版）
- 1到4人可以顺利进同一个房间聊天
- 第5个人加入时会被拒绝，并看到明确提示
- 房间内可以同时语音和文字交流
- 成功和失败两种情况，都有清晰报告

## 你现在需要拍板
- 选项1：按这个计划继续
- 选项2：指出要改的地方，我改完再给你签

## 用户签名拍板（未签名不可进入下一步）
- reviewed_by:
- decision: [ ] approved  [ ] needs_changes
- signature:
- date:
- notes:
`;

const enPlan = `# User-Friendly Plan: ${projectName}

## Your Goal
- ${mission} -> dance_id: D-M0

## The Three Big Steps
1. Prepare the skills we need -> dance_id: D-S1
2. Set up the runtime environment -> dance_id: D-S2
3. Run full tests to prove it works -> dance_id: D-S3

## Actionable Tasks Under Each Step
### A. Skill preparation (D-S1)
- Goal decomposition skill -> dance_id: D-T1
- Bee generation skill -> dance_id: D-T2
- Honey generation skill -> dance_id: D-T3
- Dance generation skill -> dance_id: D-T4
- Skill learning-loop -> dance_id: D-T5

### B. Environment setup (D-S2)
- Build room and connection flow -> dance_id: D-T6
- Enable text chat -> dance_id: D-T7
- Enable voice chat -> dance_id: D-T8
- Build simple and clear web UI -> dance_id: D-T9

### C. Testing and acceptance (D-S3)
- Basic tests for rules and edge cases -> dance_id: D-T10
- End-to-end test for 4-user room -> dance_id: D-T11
- Verify readable reports on both success and failure -> dance_id: D-T12

## Acceptance Criteria (plain language)
- 1 to 4 users can join and chat in one room
- The 5th user is rejected with a clear reason
- Voice and text both work in the same room
- Both success and failure paths produce readable reports

## Sign-Off Needed
- Option 1: approve and continue
- Option 2: request changes and review again

## User Sign-Off (Required to Continue)
- reviewed_by:
- decision: [ ] approved  [ ] needs_changes
- signature:
- date:
- notes:
`;

const content = language.startsWith("zh") ? zhPlan : enPlan;
write(path.join(outDir, "PLAN_FOR_USER.md"), content);
