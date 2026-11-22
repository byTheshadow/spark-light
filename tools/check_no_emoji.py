#!/usr/bin/env python3
"""全站禁止 emoji（硬性规定）。扫描项目里的文本文件，发现 emoji 或会被渲染成 emoji 的符号就报错。
用法：在项目根目录运行  python3 tools/check_no_emoji.py"""
import os, re, sys

PATTERN = re.compile(
    "[\U0001F000-\U0001FAFF"   # 绝大多数 emoji
    "\u2600-\u27BF"            # 杂项符号与装饰符号（含对勾、星形、心形等，易被渲染成彩色）
    "\u2B50\u2B55\u2B1B\u2B1C"
    "\u231A\u231B\u23E9-\u23FA"
    "\uFE0F\u20E3]"
)
TEXT_EXT = {'.html', '.css', '.js', '.json', '.md', '.txt', '.svg', '.py'}
SKIP_DIRS = {'.git', 'node_modules'}

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bad = 0
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for f in fn:
            if os.path.splitext(f)[1].lower() not in TEXT_EXT:
                continue
            p = os.path.join(dp, f)
            try:
                text = open(p, encoding='utf-8').read()
            except Exception:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                m = PATTERN.search(line)
                if m:
                    bad += 1
                    print(f'{os.path.relpath(p, root)}:{i}: 发现 U+{ord(m.group()):04X}')
    print('通过：没有发现 emoji' if not bad else f'共 {bad} 处，请处理')
    sys.exit(1 if bad else 0)

main()
