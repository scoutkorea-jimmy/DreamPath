// jsx-check.mjs — 배포 전 .jsx 구문검사
//
// 왜 필요한가: 이 사이트는 빌드 스텝이 없다. 브라우저의 Babel 이 .jsx 를 그
// 자리에서 파싱하므로, 파일 **하나**에 구문 오류가 있으면 SPA 전체가 뜨지
// 않는다. 그런데 배포 전에 그것을 잡는 것이 아무것도 없었다(2026-08-27 확인).
// 부트 워치독(v01.098.04)은 백지를 막을 뿐 원인을 배포 전에 잡지 못한다.
//
// 왜 이 방식인가: 검사에 쓰는 파서가 **브라우저가 실제로 쓰는 것과 같아야**
// 의미가 있다. 다른 파서로 통과시켜 놓고 브라우저에서 깨지면 검사가 오히려
// 거짓 안심을 준다. 그래서 index.html 이 로드하는 바로 그 버전의
// @babel/standalone 을 내려받아 쓴다 — 버전은 소스에서 읽으므로, 사이트가
// 버전을 올리면 검사도 따라 올라간다.
//
// 의존성 0 원칙은 지킨다: npm install 이 아니라 파일 하나를 캐시한다
// (.wrangler/ 아래 — .assetsignore 가 이미 제외한다).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const SITE = path.join(ROOT, 'ui_kits/website');
const CACHE_DIR = path.join(ROOT, '.wrangler');

function babelVersion() {
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const m = html.match(/@babel\/standalone@([\d.]+)/);
  if (!m) throw new Error('index.html 에서 @babel/standalone 버전을 못 찾았다');
  return m[1];
}

async function loadBabel() {
  const v = babelVersion();
  const cached = path.join(CACHE_DIR, `babel-standalone-${v}.js`);
  let src;
  if (fs.existsSync(cached)) {
    src = fs.readFileSync(cached, 'utf8');
  } else {
    const url = `https://unpkg.com/@babel/standalone@${v}/babel.min.js`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Babel ${v} 내려받기 실패 — HTTP ${r.status}`);
    src = await r.text();
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cached, src);
  }
  // babel.min.js 는 UMD 다. module/exports 를 주면 거기에 실린다.
  const module = { exports: {} };
  new Function('module', 'exports', 'self', 'window', src)(module, module.exports, {}, {});
  const Babel = module.exports;
  if (!Babel || typeof Babel.transform !== 'function') throw new Error('Babel 로드는 됐는데 transform 이 없다');
  _loaded = Babel;
  return { Babel, version: v };
}

// recursion-check 가 같은 캐시본을 쓰도록 열어 둔다. 파서가 서로 다르면 한쪽이
// 통과시킨 것을 다른 쪽이 못 읽는 일이 생긴다 — 브라우저와 같은 파서 하나로 맞춘다.
let _loaded = null;
export function loadBabelPackages() {
  if (!_loaded) {
    const v = babelVersion();
    const cached = path.join(CACHE_DIR, `babel-standalone-${v}.js`);
    if (!fs.existsSync(cached)) {
      throw new Error(`Babel ${v} 캐시가 없다 — 먼저 jsx-check 을 온라인에서 한 번 돌려라`);
    }
    const module = { exports: {} };
    new Function('module', 'exports', 'self', 'window', fs.readFileSync(cached, 'utf8'))(module, module.exports, {}, {});
    _loaded = module.exports;
  }
  const pk = _loaded.packages || {};
  if (!pk.parser || !pk.traverse) throw new Error('Babel standalone 에 parser/traverse 가 없다');
  return { parser: pk.parser, traverse: pk.traverse, types: pk.types };
}

// HTML 안의 <script type="text/babel"> ... </script> 인라인 블록을 뽑는다.
// 왜 필요한가(2026-08-27): 이 검사는 처음에 .jsx 파일만 봤다. 그런데 관리자
// 앱은 **통째로 admin.html 의 인라인 블록**(50만 자)이다 — 관리자 화면 전체가
// 구문검사 밖에 있었다. 파일이냐 인라인이냐는 브라우저에게 아무 차이가 없다.
function inlineBabelBlocks(htmlFile) {
  const html = fs.readFileSync(path.join(SITE, htmlFile), 'utf8');
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    if (!/type\s*=\s*["']text\/babel["']/i.test(attrs)) continue;
    if (/\bsrc\s*=/i.test(attrs)) continue; // 외부 파일은 .jsx 쪽에서 이미 본다
    const code = m[2];
    if (!code.trim()) continue;
    // 오류 줄번호가 파일 기준이 되도록 앞을 개행으로 채운다 — 인라인 블록의
    // 상대 줄번호만 알려주면 50만 자에서 자리를 못 찾는다.
    const before = html.slice(0, m.index);
    const pad = '\n'.repeat(before.split('\n').length - 1);
    out.push({ label: `${htmlFile} (인라인 babel)`, code: pad + code });
  }
  return out;
}

// HTML 이 <script type="text/babel" src="..."> 로 실제 로드하는 파일 목록.
// **확장자로 고르지 않는다**(2026-08-27): 브라우저가 Babel 로 넘기는 기준은
// script 태그의 type 속성이지 파일 이름이 아니다. 확장자로 목록을 만들면
// `.js` 로 이름을 바꾸는 순간 그 파일이 조용히 검사 밖으로 나간다 — 방금
// 「관리자 앱 전체가 구문검사 밖이었다」를 고쳐 놓고 같은 구멍을 다시 파는 셈이다.
// 목록은 **이름이 아니라 성질로**(rules/04-history-failure.md).
export function babelSrcFiles(htmlFile) {
  const html = fs.readFileSync(path.join(SITE, htmlFile), 'utf8');
  const out = [];
  const re = /<script\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    if (!/type\s*=\s*["']text\/babel["']/i.test(attrs)) continue;
    const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!src) continue;
    // /ui_kits/website/Foo.jsx → Foo.jsx
    const name = src.split('/').pop();
    const full = path.join(SITE, name);
    if (fs.existsSync(full)) out.push(name);
  }
  return out;
}

// 검사 대상 = HTML 이 실제로 로드하는 babel 파일 + 남은 .jsx + HTML 안 인라인 블록.
// 두 검사기가 같은 목록을 봐야 한다 — 한쪽만 보는 파일이 생기면 그게 다음 사고의 자리다.
export function collectTargets() {
  const seen = new Set();
  const targets = [];
  const add = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    targets.push({ label: name, code: fs.readFileSync(path.join(SITE, name), 'utf8') });
  };
  // 1) HTML 이 실제로 로드하는 것 (확장자 무관)
  for (const html of ['index.html', 'admin.html']) for (const f of babelSrcFiles(html)) add(f);
  // 2) 아직 아무 HTML 도 안 싣는 .jsx 도 본다 — 만드는 중인 파일이 검사 밖에 있으면
  //    구문 오류를 실을 때 알게 된다.
  for (const f of fs.readdirSync(SITE).filter(f => f.endsWith('.jsx')).sort()) add(f);
  // 3) 인라인 블록
  for (const html of ['index.html', 'admin.html']) targets.push(...inlineBabelBlocks(html));
  return targets;
}

export async function checkJsx() {
  const { Babel, version } = await loadBabel();
  const targets = collectTargets();
  const errors = [];
  for (const t of targets) {
    try {
      // 브라우저의 <script type="text/babel"> 과 같은 조건으로 변환한다.
      Babel.transform(t.code, { presets: ['react'], filename: t.label, sourceType: 'script' });
    } catch (e) {
      errors.push({ file: t.label, message: String(e && e.message || e).split('\n')[0].slice(0, 200) });
    }
  }
  return { files: targets.length, errors, version };
}

// 단독 실행도 지원한다 — 배포와 무관하게 편집 중에 돌려볼 수 있어야 한다.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { files, errors, version } = await checkJsx();
  if (errors.length) {
    console.log(`JSX 구문검사 실패 ${errors.length}건 (Babel ${version}, ${files}개 파일)`);
    for (const e of errors) console.log(`  ✗ ${e.file}\n      ${e.message}`);
    process.exit(1);
  }
  console.log(`JSX 구문검사 통과 — ${files}개 파일 (Babel ${version})`);
}
