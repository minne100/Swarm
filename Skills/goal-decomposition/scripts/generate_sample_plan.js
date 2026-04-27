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

const projectRoot = process.env.PROJECT_ROOT || process.cwd();
const slug = getArg("--slug", "sample-project");
const projectName = getArg("--project", "Sample Project");
const mission = getArg(
  "--mission",
  "Build a web-based multi-user app with voice and text chat as an MVP."
);
const outRoot = path.resolve(
  getArg("--out-root", process.env.PLAN_OUTPUT_ROOT || path.join(projectRoot, "Examples"))
);
const outDir = path.join(outRoot, slug);
ensureDir(outDir);

const planTree = `# Plan Tree: ${projectName}

## L0 Mission
- M0: ${mission}

## L1 Streams
- S1: Skill generation -> dance_id: D-S1
- S2: Environment setup -> dance_id: D-S2
- S3: Project testing -> dance_id: D-S3

## L2 Packages
- WP1: Core skill package (parent: S1) -> dance_id: D-WP1
- WP2: Runtime and local deployment (parent: S2) -> dance_id: D-WP2
- WP3: Validation and QA workflow (parent: S3) -> dance_id: D-WP3

## L3 Executable Tasks (S1 sample)
- T1: Generate goal-decomposition skill (parent: WP1) -> dance_id: D-T1
- T2: Generate bee-generation skill (parent: WP1) -> dance_id: D-T2
- T3: Generate honey-generation skill (parent: WP1) -> dance_id: D-T3
- T4: Generate dance-generation skill (parent: WP1) -> dance_id: D-T4
- T5: Generate skill-learning-loop (parent: WP1) -> dance_id: D-T5
`;

const ceoReview = `# CEO Review: ${projectName}

## Scope Posture
- selected_mode: Hold MVP scope
- rationale: Validate core chat value before expansion.

## Value Check
- target users: non-technical builders and indie makers
- user value: turn concept into runnable app via guided chat
- non-goals: enterprise-grade compliance and ultra-low-latency infra
`;

const engReview = `# ENG Review: ${projectName}

## Engineering Posture
- selected_mode: Balanced
- rationale: keep delivery speed with reasonable reliability controls

## Architecture Notes
- runtime: native JavaScript frontend + backend
- transport: WebSocket with Honey payloads
- capability model: System Bees via unified interface
`;

const danceIndex = `# Dance Index: ${projectName}

| Node ID | Node Name | Level | Dance ID | Dance File |
|---|---|---|---|---|
| S1 | Skill generation | L1 | D-S1 | artifacts/dances/D-S1.md |
| S2 | Environment setup | L1 | D-S2 | artifacts/dances/D-S2.md |
| S3 | Project testing | L1 | D-S3 | artifacts/dances/D-S3.md |
| T1 | Goal decomposition skill | L3 | D-T1 | artifacts/dances/D-T1.md |
| T2 | Bee generation skill | L3 | D-T2 | artifacts/dances/D-T2.md |
| T3 | Honey generation skill | L3 | D-T3 | artifacts/dances/D-T3.md |
| T4 | Dance generation skill | L3 | D-T4 | artifacts/dances/D-T4.md |
| T5 | Skill learning-loop | L3 | D-T5 | artifacts/dances/D-T5.md |
`;

write(path.join(outDir, "PLAN_TREE.md"), planTree);
write(path.join(outDir, "CEO_REVIEW.md"), ceoReview);
write(path.join(outDir, "ENG_REVIEW.md"), engReview);
write(path.join(outDir, "DANCE_INDEX.md"), danceIndex);
