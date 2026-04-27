# skill-learning-loop

version: 0.1.0
owner: swarm
type: evolution

## 目标

在每次任务后执行复盘，把经验沉淀为下一版技能规则，实现“可控进化”。

## 交互卡片

```text
[Skill: Learning Loop]
请选择本次复盘模式：
1) 快速复盘（只抓关键问题）
2) 标准复盘（推荐）
3) 深度复盘（高风险或失败任务）
0) 其他（自定义）
```

```text
[Skill: Learning Loop]
请选择改进方向：
1) 生成质量
2) 执行稳定性
3) 成本优化（Token/时间）
4) 审核体验（Beekeeping）
0) 其他（自定义）
```

## 输入

- `task_context`
- `artifacts`（Bee/Honey/Dance/日志/测试报告）
- `outcome`（success/failure）
- `human_feedback`

## 输出

```json
{
  "postmortem": {
    "what_went_well": [],
    "what_failed": [],
    "root_causes": []
  },
  "skill_patches": [
    {
      "target_skill": "",
      "patch_type": "rule|prompt|contract|gate",
      "proposal": "",
      "risk": "low|medium|high"
    }
  ],
  "recommended_version_bump": [
    {
      "skill": "",
      "from": "0.1.0",
      "to": "0.1.1"
    }
  ]
}
```

## 安全边界

1. 学习循环只生成“补丁建议”，不直接自动生效
2. 所有技能升级必须经人类 Beekeeping 审核
3. 高风险补丁必须要求二次确认

