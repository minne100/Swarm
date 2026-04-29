#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    docs_dir = root / "docs" / "goal-decomposition"
    docs_dir.mkdir(parents=True, exist_ok=True)

    version_re = re.compile(r"_version_(\d+)\.md$", re.IGNORECASE)
    max_version = 0
    for p in docs_dir.glob("*_version_*.md"):
        m = version_re.search(p.name)
        if m:
            max_version = max(max_version, int(m.group(1)))

    version = max_version + 1
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"{stamp}_version_{version}.md"
    plan_file = docs_dir / file_name

    out = {
        "project_root": str(root),
        "docs_dir": str(docs_dir),
        "version": version,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "plan_file": str(plan_file),
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
