#!/usr/bin/env python3
import argparse
from datetime import datetime
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan-file", required=True)
    parser.add_argument("--sign-name", required=True)
    args = parser.parse_args()

    plan = Path(args.plan_file).resolve()
    if not plan.exists():
        raise SystemExit(f"Plan file not found: {plan}")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    content = plan.read_text(encoding="utf-8")

    signature_block = (
        "\n\n## 用户签名\n"
        f"- 签名：{args.sign_name}\n"
        f"- 签名时间：{now}\n"
    )

    plan.write_text(content.rstrip() + signature_block + "\n", encoding="utf-8")
    print(str(plan))


if __name__ == "__main__":
    main()
