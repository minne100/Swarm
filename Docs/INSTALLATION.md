# 安装说明（MemPalace + graphify）

本文档记录本项目当前使用的两个开源工具的安装方式与校验命令：

- MemPalace（AI 记忆系统）
- graphify（知识图谱构建工具）

## 官方链接

- MemPalace（GitHub）：https://github.com/MemPalace/mempalace
- MemPalace（文档）：https://mempalaceofficial.com/guide/getting-started
- graphify（GitHub）：https://github.com/safishamsi/graphify

## 环境要求

- Python 3.9+
- pip 可用

## 安装命令

在 Windows PowerShell（或其他终端）执行：

```bash
python -m pip install -U mempalace
python -m pip install -U graphifyy
```

如果遇到权限问题，可使用：

```bash
python -m pip install --user -U mempalace
python -m pip install --user -U graphifyy
```

## 安装校验

```bash
mempalace --version
graphify --help
```

当前仓库环境已验证：

- `mempalace --version` -> `MemPalace 3.3.3`
- `graphify --help` 可正常输出命令列表

## 快速开始（MemPalace）

```bash
mempalace init ./mempalace_data
mempalace mine .
mempalace search "Skill-First"
mempalace wake-up
```

## 快速开始（graphify）

在本仓库建议流程：

```bash
/graphify .
```

说明：本项目约定为 **每次提交前先跑一遍 `/graphify`**，确保图谱和文档一致。

