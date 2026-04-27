#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function getArg(flag, fallback = "") {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readFileSafe(p) {
  if (!p) return "";
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function detectScopeByInput(text) {
  const normalized = (text || "").replace(/^\uFEFF/, "").trimStart();
  return normalized.startsWith("@MVP") ? "mvp" : "swarm";
}

function slugify(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "conversation";
}

function stamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

const projectRoot = process.env.PROJECT_ROOT || process.cwd();
const userInputText = getArg("--user-input-text", "");
const userInputFileForRoute = getArg("--user-input-route-file", "");
const routeByInput = getArg("--route-by-input", "false").toLowerCase() === "true";
let scope = getArg("--history-scope", "swarm").toLowerCase();
if (routeByInput) {
  const routeText = userInputText || readFileSafe(userInputFileForRoute);
  scope = detectScopeByInput(routeText);
}
const mvpRoot = getArg("--mvp-root", "");
let defaultHistoryRoot = path.join(projectRoot, "History");
if (scope === "mvp") {
  defaultHistoryRoot = path.join(
    path.resolve(mvpRoot || path.join(projectRoot, "Examples", "p2p-chatroom-4p")),
    "History"
  );
}
const historyRoot = path.resolve(getArg("--history-root", defaultHistoryRoot));
const topic = getArg("--topic", "conversation");
const userInputFile = getArg("--user-input-file");
const promptFile = getArg("--prompt-file");
const outputFile = getArg("--output-file");

const dirName = `${slugify(topic)}-${stamp()}`;
const roundDir = path.join(historyRoot, dirName);
ensureDir(roundDir);

fs.writeFileSync(path.join(roundDir, "user_input.md"), readFileSafe(userInputFile), "utf8");
fs.writeFileSync(path.join(roundDir, "prompt_submitted.md"), readFileSafe(promptFile), "utf8");
fs.writeFileSync(path.join(roundDir, "model_output.md"), readFileSafe(outputFile), "utf8");

console.log(`history_written: ${roundDir}`);
