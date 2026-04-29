#!/usr/bin/env python3
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan-file", required=True)
    parser.add_argument("--max-chars", type=int, default=12000)
    args = parser.parse_args()

    plan_file = Path(args.plan_file).resolve()
    if not plan_file.exists():
        raise SystemExit(f"Plan file not found: {plan_file}")

    content = plan_file.read_text(encoding="utf-8")
    content = content.replace("\r\n", "\n").strip()

    suffix = "\n\n[文档内容过长，已截断显示。完整文件见上方路径。]"
    if len(content) > args.max_chars:
        keep = max(0, args.max_chars - len(suffix))
        content = content[:keep] + suffix

    prompt = (
        f"请先审查以下拆解文档，再选择操作。\n"
        f"文件路径：{plan_file}\n\n"
        f"--- 文档内容开始 ---\n"
        f"{content}\n"
        f"--- 文档内容结束 ---\n\n"
        f"请选择：确认 或 修改"
    )
    print(prompt)


if __name__ == "__main__":
    main()
