#!/usr/bin/env python3
import argparse
from datetime import datetime
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--change-note", required=True)
    parser.add_argument("--plan-file", required=False, default="")
    parser.add_argument("--version", required=False, type=int)
    parser.add_argument("--status", required=True)
    parser.add_argument("--phase", required=False, default="拆解阶段")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    readme = root / "README.md"
    plan_file = Path(args.plan_file).resolve() if args.plan_file else None
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    change_note = (args.change_note or "").strip() or "(空)"
    rel_plan = "(未生成)"
    if plan_file:
        rel_plan = plan_file
        try:
            rel_plan = plan_file.relative_to(root)
        except ValueError:
            pass

    version_text = str(args.version) if args.version is not None else "(未生成)"

    entry = (
        f"\n## 需求记录 - {now}\n\n"
        f"- 提交时间：{now}\n"
        f"- 阶段：{args.phase}\n"
        f"- 修改意见：{change_note}\n"
        f"- 拆解文件：{rel_plan}\n"
        f"- 版本号：{version_text}\n"
        f"- 状态：{args.status}\n"
    )

    if not readme.exists():
        readme.write_text("# 项目需求记录\n", encoding="utf-8")

    current = readme.read_text(encoding="utf-8")
    readme.write_text(current.rstrip() + "\n" + entry, encoding="utf-8")
    print(str(readme))


if __name__ == "__main__":
    main()
