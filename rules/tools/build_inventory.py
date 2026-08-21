#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""rules/01-inventory.md 를 저장소에서 다시 만들어 낸다.

왜 스크립트인가: 손으로 적은 목록은 3개월이면 거짓말이 된다. 새 기능을
시작하기 전에 이걸 돌려서 "이미 있는 것"을 사실로 확인하라.

    python3 rules/tools/build_inventory.py

출력은 rules/01-inventory.md 를 통째로 덮어쓴다(수기 메모를 넣지 말 것 —
설명은 rules/02-design-system.md 나 CLAUDE.md 에).
"""
import os, re, subprocess, io, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def rp(*p): return os.path.join(ROOT, *p)
def read(path):
    try:
        return io.open(rp(path), encoding='utf-8').read()
    except OSError:
        return ''

def sh(cmd):
    try:
        return subprocess.check_output(cmd, cwd=ROOT, shell=True, text=True).strip()
    except Exception:
        return ''

worker = read('worker.js')
store  = read('ui_kits/website/content-store.js')
admin  = read('ui_kits/website/admin.html')
site   = read('ui_kits/website/site.css')
tokens = read('colors_and_type.css')

# ── API 엔드포인트 ────────────────────────────────────────────────────────
api = set()
for m in re.finditer(r"path === '(/api/[^']+)'", worker):
    api.add(m.group(1))
for m in re.finditer(r"path\.match\(/\^\\/api\\/([^/]*(?:\\/[^/]*)*)\$/", worker):
    api.add('/api/' + m.group(1).replace('\\/', '/'))
api = sorted(api)

# ── SPA 화면(window 전역) ─────────────────────────────────────────────────
views = []
for fn in sorted(os.listdir(rp('ui_kits/website'))):
    if not fn.endswith('.jsx'):
        continue
    src = read('ui_kits/website/' + fn)
    globs = sorted(set(re.findall(r'window\.([A-Za-z0-9_]+)\s*=', src)))
    lines = len(src.splitlines())
    views.append((fn, lines, ', '.join(globs) or '—'))

# ── 콘텐츠 스키마 최상위 키 ────────────────────────────────────────────────
keys = []
m = re.search(r'const DEFAULT_CONTENT = \{(.*)', store, re.S)
if m:
    depth = 0
    for line in m.group(1).splitlines():
        if depth == 0:
            k = re.match(r'\s{4}([a-z_0-9]+):', line)
            if k:
                keys.append(k.group(1))
        depth += line.count('{') + line.count('[') - line.count('}') - line.count(']')
        if depth < 0:
            break

# ── 관리자 탭 ─────────────────────────────────────────────────────────────
tabs = sorted(set(re.findall(r"\{ id: '([a-z_0-9]+)',\s*group: '([A-Za-z]+)'", admin)))

# ── D1 테이블 ─────────────────────────────────────────────────────────────
tables = set()
mig_dir = rp('migrations')
for fn in sorted(os.listdir(mig_dir)):
    if fn.endswith('.sql'):
        for t in re.findall(r'CREATE TABLE (?:IF NOT EXISTS )?([a-z_0-9]+)', read('migrations/' + fn), re.I):
            tables.add(t)
tables = sorted(tables)

# ── 재사용 가능한 CSS 클래스(공개 사이트) ──────────────────────────────────
css = sorted(set(re.findall(r'^\.([a-z][a-z0-9-]{2,})\b', site, re.M)))
token_names = sorted(set(re.findall(r'^\s*(--[a-z0-9-]+):', tokens, re.M)))

version = ''
mv = re.search(r"DREAMPATH_VERSION = '([^']+)'", read('ui_kits/website/version.js'))
if mv:
    version = mv.group(1)

out = []
w = out.append
w('# 01 · 구현 인벤토리 (자동 생성)')
w('')
w('> **손대지 말 것 — 생성물이다.** `python3 rules/tools/build_inventory.py` 로 다시 만든다.')
w('> 새 기능·새 화면·새 API 를 만들기 전에 **먼저 여기서 이미 있는 것을 찾아라.**')
w('> 같은 일을 하는 두 번째 구현이 스파게티의 시작이다.')
w('')
w('- 생성 시각: `%s`' % sh("date '+%Y-%m-%d %H:%M:%S %Z'"))
w('- 기준 커밋: `%s`' % (sh('git rev-parse --short HEAD') or '—'))
w('- 사이트 버전: `%s`' % (version or '—'))
w('')
w('## 화면 (SPA `.jsx`)')
w('')
w('| 파일 | 줄 수 | `window.*` 전역 |')
w('|---|---:|---|')
for fn, ln, g in views:
    w('| `ui_kits/website/%s` | %d | %s |' % (fn, ln, g))
w('')
w('## API 엔드포인트 (`worker.js`) — %d개' % len(api))
w('')
for p in api:
    w('- `%s`' % p)
w('')
w('## 콘텐츠 스키마 최상위 키 (`content-store.js` → KV `dp_content_v1`) — %d개' % len(keys))
w('')
w(', '.join('`%s`' % k for k in keys))
w('')
w('## 관리자 탭 (`admin.html` TABS) — %d개' % len(tabs))
w('')
for tid, grp in tabs:
    w('- `%s` · %s' % (tid, grp))
w('')
w('## D1 테이블 (`migrations/`) — %d개' % len(tables))
w('')
w(', '.join('`%s`' % t for t in tables))
w('')
w('## 공개 사이트 CSS 클래스 (`site.css`) — %d개' % len(css))
w('')
w('> 새 컴포넌트를 만들기 전에 이 목록에서 쓸 수 있는 것을 먼저 찾아라.')
w('')
w(', '.join('`.%s`' % c for c in css))
w('')
w('## 디자인 토큰 (`colors_and_type.css`) — %d개' % len(token_names))
w('')
w('> 색·간격·반경·그림자는 **여기 있는 것만** 쓴다. 없으면 토큰을 먼저 추가한다.')
w('')
w(', '.join('`%s`' % t for t in token_names))
w('')

io.open(rp('rules/01-inventory.md'), 'w', encoding='utf-8').write('\n'.join(out))
print('rules/01-inventory.md 생성 — 화면 %d · API %d · 콘텐츠키 %d · 탭 %d · 테이블 %d · CSS %d · 토큰 %d'
      % (len(views), len(api), len(keys), len(tabs), len(tables), len(css), len(token_names)))
