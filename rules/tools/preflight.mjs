#!/usr/bin/env node
/**
 * 배포 전 자동 점검 (rules/tools/preflight.mjs)
 *
 * 왜 있는가: 같은 함정에 세 번 걸렸다.
 *   8/22 상단 배너 · 8/23 CUFS · 8/23 레거시 DreamPath TF — 전부
 *   "KV 는 고쳤는데 **코드 기본값**은 그대로" 였다.
 *   규칙으로 적어 뒀는데도 또 걸렸으므로, 이제 기계가 막는다.
 *
 * 무엇을 보는가 (전부 실측):
 *   A. 스위치 드리프트  — DEFAULT_CONTENT vs 라이브 KV vs worker 상수
 *   B. 금지 문자열      — 코드 기본값 · 라이브 콘텐츠 · 소스 파일
 *   C. 상태 정합성      — 내려둔 것이 기계가 읽는 곳(사이트맵·JSON-LD·llms.txt)에 남아 있지 않은지
 *   D. 라이브 스모크    — 접수 차단이 서버에서 실제로 걸리는지
 *
 * 쓰는 법:
 *   node rules/tools/preflight.mjs            # 전체
 *   node rules/tools/preflight.mjs --offline  # 네트워크 없이 A·B 만
 *
 * 실패가 하나라도 있으면 exit 1. 배포 전에 반드시 통과시킨다.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const ORIGIN = 'https://koreadreampath.com';
const OFFLINE = process.argv.includes('--offline');

const fails = [], warns = [], notes = [];
const fail = (t, d) => fails.push([t, d]);
const warn = (t, d) => warns.push([t, d]);

// ── 코드 기본값(DEFAULT_CONTENT)을 실제로 로드한다 ────────────────────────
// 정규식으로 긁지 않는다 — 브라우저 IIFE 를 그대로 실행해 진짜 객체를 얻는다.
function loadDefaults() {
  const src = fs.readFileSync(path.join(ROOT, 'ui_kits/website/content-store.js'), 'utf8');
  const g = globalThis;
  // ⚠️ 브라우저 IIFE 를 돌리려면 window/fetch 등을 흉내내야 하는데, 그때
  //    node 의 진짜 fetch 를 덮어쓰면 아래 라이브 점검이 통째로 죽는다.
  //    (실제로 처음 작성했을 때 이걸로 한 번 깨졌다) → 원본을 보관했다 되돌린다.
  const realFetch = g.fetch;
  g.window = g;
  g.document = { documentElement: {}, addEventListener() {}, querySelector: () => null };
  g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  g.location = { search: '', pathname: '/', origin: ORIGIN };
  g.fetch = async () => ({ ok: false, json: async () => ({}) });
  g.addEventListener = () => {};
  new Function(src)();
  const D = g.DreamPathContent && g.DreamPathContent.DEFAULT;
  g.fetch = realFetch;                       // 원상 복구
  if (!D) throw new Error('DEFAULT_CONTENT 를 읽지 못했다');
  return D;
}

const readFile = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const getJson = async (url) => {
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
  return r.json();
};
const getText = async (url) => {
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  return r.text();
};

// ── A. 스위치 드리프트 ────────────────────────────────────────────────────
// SPA 는 원격 콘텐츠 도착 전 **첫 페인트를 코드 기본값으로** 그리고,
// KV 가 초기화되면 기본값이 곧 라이브 값이 된다. 둘이 어긋나면
// "껐는데 화면에는 떠 있는" 상태가 만들어진다.
const SWITCHES = [
  ['apply_gate.closed',    'apply_gate',    'closed'],
  ['programs_gate.hidden', 'programs_gate', 'hidden'],
  ['entry_gate.enabled',   'entry_gate',    'enabled'],
  ['notice.enabled',       'notice',        'enabled'],
];
// worker.js 안의 짝 상수 (SPA 는 기본값을 병합하고 워커는 KV 원본을 읽는다)
const WORKER_MIRRORS = [
  ['apply_gate.closed',    /const APPLY_GATE_DEFAULT_CLOSED\s*=\s*(true|false)/],
  ['programs_gate.hidden', /const PROGRAMS_GATE_DEFAULT_HIDDEN\s*=\s*(true|false)/],
];

// ── B. 금지 문자열 ───────────────────────────────────────────────────────
// 한 번 지우기로 결정한 것들. 되살아나면 여기서 걸린다.
const BANNED = [
  { re: /CUFS|사이버한국외국어대/,               why: '파트너 기관명 — 협의 정리 전까지 노출 금지 (2026-08-22 결정)' },
  { re: /DreamPath TF/,                          why: '레거시 팀 표기 → "KoreaDreamPath 팀"' },
  { re: /(?<!Korea)(?<!\w)DreamPath(?!\w)/,      why: '브랜드 규칙 위반 — 사업명은 "Dream Path" / "드림패스" (CLAUDE.md §8)' },
  { re: /[Ss]emester|학기/,                      why: '학기 프레이밍 제거 (2026-08-23 결정)' },
  { re: /mid-June|late June|6월 말|6월 중순/,     why: '지난 날짜가 박힌 문구 — 코드에 날짜를 넣지 않는다' },
  { re: /August 31, 2026|2026년 8월 31일/,       why: '확정되지 않은 일정 단정' },
];
// 오탐을 줄이는 규칙 (첫 실행에서 8건 중 5건이 오탐이었다):
//   · 주석 줄            — 수정 이유를 적은 주석이 스스로 걸린다
//   · 속성 이름(`semester:`) — 값이 아니라 키. 값만 본다
//   · 파일 경로           — /Users/.../VS_Code/DreamPath
//   · 식별자             — DreamPathAuth 등
const CODE_FILES = [
  'worker.js', 'ui_kits/website/content-store.js', 'ui_kits/website/admin.html',
  ...fs.readdirSync(path.join(ROOT, 'ui_kits/website')).filter(f => f.endsWith('.jsx')).map(f => 'ui_kits/website/' + f),
];
// 규칙을 글로만 적어 두면 다음 라운드에 잊힌다 — 8/22 배너 · 8/23 CUFS 가 그랬다.
//
// 판정은 **성질**로 한다: 컬러로 렌더되는 그림문자만 잡고, 흑백 타이포그래피
// 기호(→ ▶ ✓ ★ ⛶ ≡ ▦ …)는 통과시킨다. 저장소에 `→` 만 332개다 — 성질 대신
// 이름(=비ASCII)으로 잡으면 멀쩡한 문서와 UI 를 함께 죽인다.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{1F004}\u{1F0CF}]|[\u{2600}-\u{27BF}]\u{FE0F}|\u{26A0}\u{FE0F}|[\u2705\u274C\u2764\u2b50\u2728]/gu;
const IDENTIFIER_SAFE = /DreamPathAuth|DreamPathContent|DREAMPATH_VERSION|window\.DreamPath/;
const isComment = (l) => /^\s*(\/\/|\*|\/\*)/.test(l);

// 한 줄에서 **진짜 문자열 리터럴만** 뽑는다.
// 왜 이렇게까지: 처음엔 정규식으로 "따옴표 뒤에 금지어가 오면 문자열"이라고 봤는데,
// 그 방식은 **닫는 따옴표**부터 매칭을 시작해 그 뒤의 코드를 문자열로 착각했다
// (`className="pd-course-sem">{course.semester}` 가 오탐으로 잡혔다).
// 리터럴을 실제로 잘라 내면 속성 이름·속성 접근·경로가 자연히 빠진다.
function stringLiterals(line) {
  const out = [];
  const re = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m;
  while ((m = re.exec(line))) out.push(m[2]);
  return out;
}
// 리터럴이 **낱말 그 자체**면 코드 키다 (`updCourse(ci, 'semester', v)`).
const isBareKey = (lit, hit) => lit.trim().toLowerCase() === hit.toLowerCase();
// 리터럴 안이라도 **파일 경로**면 브랜드 표기가 아니다
// (`cd /Users/…/VS_Code/DreamPath` 같은 관리자 안내문).
const isPathLike = (lit, hit) => new RegExp('[/\\\\]' + hit, 'i').test(lit);

// 문서화된 예외. **최소로 유지한다** — 목록이 자라기 시작하면 검사가 무의미해진다.
const ALLOW = [
  { path: /^project_team\./, re: /CUFS|사이버한국외국어대/,
    why: '구성원 개인 경력 기록 — 특정인의 이력 사실이라 임의 수정하지 않는다 (2026-08-22 결정)' },
];

function scanStrings(label, obj) {
  const hits = [];
  (function walk(n, p) {
    if (n && typeof n === 'object') {
      for (const k of Object.keys(n)) walk(n[k], p ? p + (Array.isArray(n) ? '[' + k + ']' : '.' + k) : String(k));
    } else if (typeof n === 'string') {
      for (const b of BANNED) {
        const m = n.match(b.re);
        if (!m) continue;
        if (ALLOW.some(a => a.path.test(p) && a.re.test(m[0]))) continue;
        hits.push([p, m[0], b.why]);
      }
    }
  })(obj, '');
  for (const [p, hit, why] of hits) fail(label + ' `' + p + '` 에 "' + hit + '"', why);
}

// ── 실행 ─────────────────────────────────────────────────────────────────
const D = loadDefaults();
const workerSrc = readFile('worker.js');

// A-1. 코드 기본값 ↔ worker 상수
for (const [name, re] of WORKER_MIRRORS) {
  const [grp, key] = name.split('.');
  const m = workerSrc.match(re);
  if (!m) { warn(name + ' 의 worker 짝 상수를 못 찾음', String(re)); continue; }
  const wv = m[1] === 'true';
  const dv = !!(D[grp] || {})[key];
  if (wv !== dv) fail(name + ' 기본값 불일치', `content-store=${dv} vs worker=${wv} — SPA 는 기본값 병합, 워커는 KV 원본을 읽는다. 화면과 API 가 다른 말을 하게 된다`);
}

// B-1. 코드 기본값 안의 금지 문자열
scanStrings('DEFAULT_CONTENT(코드 기본값)', D);

// B-2. 소스 파일의 사용자 노출 문자열
for (const rel of CODE_FILES) {
  const src = readFile(rel);
  for (const b of BANNED) {
    for (const line of src.split('\n')) {
      if (IDENTIFIER_SAFE.test(line)) continue;
      if (isComment(line)) continue;
      // 사용자에게 보이는 것은 문자열 리터럴 안의 내용뿐이다.
      const hit = stringLiterals(line)
        .map(lit => [lit, (lit.match(b.re) || [])[0]])
        .find(([lit, h]) => h && !isBareKey(lit, h) && !isPathLike(lit, h));
      if (!hit) continue;
      fail(rel + ' 에 "' + hit[1] + '"', b.why + '  ›  ' + line.trim().slice(0, 90)); break;
    }
  }
}

if (!OFFLINE) {
  const live = await getJson(ORIGIN + '/api/content?_pf=' + Date.now());

  // A-2. 코드 기본값 ↔ 라이브 KV
  for (const [name, grp, key] of SWITCHES) {
    const dv = !!(D[grp] || {})[key];
    const lv = !!(live[grp] || {})[key];
    if (dv !== lv) fail(name + ' 드리프트', `코드 기본값=${dv} vs 라이브 KV=${lv} — 원격 콘텐츠 도착 전 첫 페인트와 KV 초기화 시 기본값이 이긴다`);
  }

  // B-3. 라이브 콘텐츠
  scanStrings('라이브 KV 콘텐츠', live);
  // 코드 기본값만 고치고 KV 를 놔두면 화면은 그대로다 — 실제로 이모지 6곳이
  // KV 쪽에만 남아 있었다(2026-08-27).
  {
    const blob = JSON.stringify(live);
    const found = blob.match(EMOJI_RE);
    if (found) fail(`라이브 KV 콘텐츠에 이모지 ${found.length}개`,
      [...new Set(found)].join(' ') + ' — dp_content_v1 을 고쳐야 화면이 바뀐다');
    else notes.push('이모지 없음 (라이브 KV)');
  }

  // C. 상태 정합성 — 내려둔 것이 기계가 읽는 곳에 남아 있지 않은지
  const hidden = !!(live.programs_gate || {}).hidden;
  const closed = !!(live.apply_gate || {}).closed;
  if (hidden) {
    const sitemap = await getText(ORIGIN + '/sitemap.xml');
    if (/\/program\//.test(sitemap)) fail('사이트맵에 프로그램 상세 URL', '프로그램을 내렸는데 색인 제출은 그대로 — 화면에 없는 것을 기계에만 남기면 거짓말이 된다');
    const home = await getText(ORIGIN + '/?_pf=' + Date.now());
    if (/"@type":"Course"/.test(home)) fail('홈 JSON-LD 에 Course', '프로그램 비공개인데 구조화 데이터에 과정이 남아 있다');
    const llms = await getText(ORIGIN + '/llms.txt');
    if (/^## Programs/m.test(llms)) fail('llms.txt 에 Programs 섹션', '답변 엔진에 내려둔 프로그램을 계속 알리고 있다');
  }
  // D. 접수 차단이 서버에서 실제로 걸리는지 (화면만 막으면 API 로 우회된다)
  if (closed) {
    const r = await fetch(ORIGIN + '/api/applications', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
    if (r.status !== 503) fail('접수 차단이 서버에서 안 걸림', `POST /api/applications → HTTP ${r.status} (503 이어야 한다)`);
    else notes.push('접수 차단 서버 확인 OK (503)');
  }
  // 등록금이 미공개인데 화면 어딘가에 금액이 남아 있지는 않은지 (라이브 값 기준)
  const priced = (live.programs || []).filter(p => Number(p.tuition) > 0);
  if (priced.length && hidden) warn('등록금이 설정된 프로그램이 있는데 프로그램은 비공개', priced.map(p => p.id).join(', '));
}

// ── E. 이모지 금지 (2026-08-27 운영자 지시) ──────────────────────────────
{
  const hitsByFile = [];
  for (const rel of CODE_FILES.concat(['ui_kits/website/index.html'])) {
    let src;
    try { src = readFile(rel); } catch { continue; }
    src.split('\n').forEach((line, i) => {
      const m = line.match(EMOJI_RE);
      if (m) hitsByFile.push(`${rel}:${i + 1}  ${m.join(' ')}`);
    });
  }
  if (hitsByFile.length) {
    fail(`이모지 ${hitsByFile.length}곳`,
      hitsByFile.slice(0, 8).join('\n      ')
      + (hitsByFile.length > 8 ? `\n      … 외 ${hitsByFile.length - 8}곳` : '')
      + '\n      → lucide 아이콘 · 토큰 색 · 말로 쓴 라벨로 바꿔라 (rules/05-do-not.md 2026-08-27)');
  } else {
    notes.push('이모지 없음 (UI 소스)');
  }
}

// ── F. JSX 구문검사 (2026-08-27) ─────────────────────────────────────────
// 빌드 스텝이 없으므로 .jsx 하나의 구문 오류가 SPA 전체를 죽인다. 브라우저가
// 쓰는 것과 같은 버전의 Babel 로 검사한다 — 다른 파서로 통과시키면 검사가
// 거짓 안심을 준다. Babel 은 한 번 받아 .wrangler/ 에 캐시하므로 --offline
// 에서도 두 번째부터는 돈다.
{
  try {
    const { checkJsx } = await import('./jsx-check.mjs');
    const { files, errors, version } = await checkJsx();
    if (errors.length) {
      fail(`JSX 구문 오류 ${errors.length}건`,
        errors.map(e => `${e.file} — ${e.message}`).join('\n      ')
        + '\n      이 상태로 배포하면 SPA 전체가 뜨지 않는다.');
    } else {
      notes.push(`JSX 구문검사 통과 (${files}개 · Babel ${version})`);
    }
  } catch (e) {
    // 검사를 못 돌린 것과 통과한 것은 다르다. 못 읽었으면 그렇게 말한다.
    warn('JSX 구문검사를 돌리지 못했다', String(e && e.message || e).slice(0, 200)
      + ' — 네트워크가 없고 캐시도 없으면 이렇게 된다. 통과가 아니다.');
  }
}

// ── 결과 ─────────────────────────────────────────────────────────────────
const line = '─'.repeat(72);
console.log(line);
console.log('배포 전 점검' + (OFFLINE ? ' (offline)' : ''));
console.log(line);
for (const n of notes) console.log('  ✓ ' + n);
for (const [t, d] of warns) console.log('  ⚠ ' + t + '\n      ' + d);
for (const [t, d] of fails) console.log('  ✗ ' + t + '\n      ' + d);
console.log(line);
if (fails.length) {
  console.log(`실패 ${fails.length}건 — 배포하지 말 것.`);
  process.exit(1);
}
console.log(`통과 (경고 ${warns.length}건).`);
