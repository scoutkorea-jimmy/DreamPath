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
  return { Babel, version: v };
}

export async function checkJsx() {
  const { Babel, version } = await loadBabel();
  const files = fs.readdirSync(SITE).filter(f => f.endsWith('.jsx')).sort();
  const errors = [];
  for (const f of files) {
    const code = fs.readFileSync(path.join(SITE, f), 'utf8');
    try {
      // 브라우저의 <script type="text/babel"> 과 같은 조건으로 변환한다.
      Babel.transform(code, { presets: ['react'], filename: f, sourceType: 'script' });
    } catch (e) {
      errors.push({ file: f, message: String(e && e.message || e).split('\n')[0].slice(0, 200) });
    }
  }
  return { files: files.length, errors, version };
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
