// smoke.mjs — 배포된 화면이 **실제로 그려지는가**를 브라우저로 확인한다
//
// 왜 필요한가(2026-08-27, v01.101.10): `authHeaders` 무한 재귀로 /admin 이 완전한
// 백지였는데, 배포 전후의 신호는 **전부 정상**이었다 —
//   · wrangler deploy 성공   · HTTP 200   · 라이브 HTML 이 로컬과 바이트 단위로 동일
//   · preflight 통과         · JSX 구문검사 통과
// 다섯 개의 초록불 뒤에서 화면은 죽어 있었다. 정적 검사로는 원리상 알 수 없다 —
// 그 코드는 문법상 완벽하기 때문이다. **실행해 보는 것 외에 방법이 없다.**
//
// 왜 CDP 인가(첫 판을 버리고 다시 만든 이유): 처음에는 Chrome 의 --dump-dom 에
// --virtual-time-budget 을 붙여 한 방에 DOM 을 떴다. 그런데 virtual time 은
// **시계를 앞으로 감는다** — 부트 워치독의 setTimeout(9000) 이 곧바로 터져서,
// 실제로는 멀쩡한 홈 화면을 "앱이 마운트되지 못했다"고 보고했다. 관리자는
// 인라인이라 살아남고 홈만 걸렸다(홈은 .jsx 21개를 네트워크로 받는다).
// **검사기가 틀리면 사람은 검사기를 끈다**(rules/04-history-failure.md) — 문턱을
// 만지는 대신 방식을 바꿨다. 지금은 DevTools Protocol 로 붙어 **실제 시간**
// 기준으로 마운트될 때까지 폴링한다. 덤으로 콘솔 오류까지 읽는다.
//
// 의존성 0: puppeteer 를 받지 않는다. 이미 깔린 Chrome + Node 내장 WebSocket 뿐이다.
//
// Chrome 이 없으면 **"못 돌렸다"고 말한다.** 통과로 세지 않는다 —
// rules/04-history-failure.md 「못 읽은 것을 없다고 말했다」. 부정 검사는 못 읽으면
// 언제나 조용히 통과하므로, 그 경우를 소리 나게 만드는 것이 검사의 절반이다.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.DP_SMOKE_BASE || 'https://koreadreampath.com';
const MOUNT_TIMEOUT_MS = 30000;   // 마운트를 기다리는 실제 시간
const LAUNCH_TIMEOUT_MS = 15000;

const PAGES = [
  { path: '/admin', mustHave: ['관리자'], label: '관리자' },
  { path: '/',      mustHave: [],         label: '홈' },
];

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

export function findChrome() {
  if (process.env.DP_CHROME && fs.existsSync(process.env.DP_CHROME)) return process.env.DP_CHROME;
  return CHROME_CANDIDATES.find(p => fs.existsSync(p)) || null;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function launch(chrome) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-smoke-'));
  const proc = spawn(chrome, [
    '--headless', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--disable-background-networking',
    '--remote-debugging-port=0',
    '--user-data-dir=' + profile,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  // 포트는 Chrome 이 고른다(0). 고정 포트를 쓰면 다른 세션과 부딪힌다.
  let stderr = '';
  const wsUrl = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('DevTools 주소를 못 받았다')), LAUNCH_TIMEOUT_MS);
    proc.stderr.on('data', (c) => {
      stderr += c;
      const m = stderr.match(/ws:\/\/[^\s]+/);
      if (m) { clearTimeout(t); resolve(m[0]); }
    });
    proc.on('error', (e) => { clearTimeout(t); reject(e); });
    proc.on('exit', () => { clearTimeout(t); reject(new Error('Chrome 이 곧바로 종료됐다')); });
  });

  const kill = () => {
    // stderr 를 붙잡고 있으면 Chrome 을 죽여도 Node 의 이벤트 루프가 안 끝난다.
    // 실측으로 프로세스가 10분을 더 살아 있었다 — 스트림을 명시적으로 끊는다.
    try { proc.stderr.destroy(); } catch {}
    try { proc.kill('SIGKILL'); } catch {}
    try { proc.unref(); } catch {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  // stderr 로 오는 주소는 **브라우저 타깃**이다. Runtime/Log/Page 는 거기 없고
  // 페이지 타깃에만 있다 — 첫 판에 이걸 몰라 'Runtime.enable' wasn't found 를 받았다.
  const port = (wsUrl.match(/:(\d+)\//) || [])[1];
  if (!port) throw new Error('DevTools 포트를 못 읽었다');
  return { port, kill };
}

// 새 탭을 열고 그 탭의 소켓 주소를 받는다. 화면마다 새 탭이라 앞 화면의
// 콘솔 오류가 다음 화면 것으로 섞이지 않는다.
async function newTab(port, url) {
  const r = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!r.ok) throw new Error(`탭 생성 실패 — HTTP ${r.status}`);
  const j = await r.json();
  if (!j.webSocketDebuggerUrl) throw new Error('탭 소켓 주소가 없다');
  return { ws: j.webSocketDebuggerUrl, id: j.id };
}

async function closeTab(port, id) {
  try { await fetch(`http://127.0.0.1:${port}/json/close/${id}`); } catch {}
}

// 아주 작은 CDP 클라이언트. 필요한 것은 명령 하나와 이벤트 하나뿐이라
// 라이브러리를 들이지 않는다.
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve());
    ws.addEventListener('error', () => reject(new Error('DevTools 소켓 연결 실패')));
  });
  ws.addEventListener('message', (ev) => {
    let msg; try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    // 페이지가 뱉은 오류를 모은다 — 백지가 아니어도 무언가 터졌으면 알아야 한다.
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params && msg.params.exceptionDetails;
      const text = (d && d.exception && d.exception.description) || (d && d.text) || 'exception';
      consoleErrors.push(String(text).split('\n')[0].slice(0, 200));
    }
    if (msg.method === 'Log.entryAdded') {
      const e = msg.params && msg.params.entry;
      if (e && e.level === 'error') consoleErrors.push(String(e.text).slice(0, 200));
    }
  });
  const send = (method, params) => new Promise((resolve, reject) => {
    const myId = ++id;
    pending.set(myId, { resolve, reject });
    ws.send(JSON.stringify({ id: myId, method, params: params || {} }));
    setTimeout(() => {
      if (pending.has(myId)) { pending.delete(myId); reject(new Error(method + ' 응답 없음')); }
    }, 20000);
  });
  return { ready, send, consoleErrors, close: () => { try { ws.close(); } catch {} } };
}

async function checkPage(port, url) {
  const tab = await newTab(port, url);
  const c = connect(tab.ws);
  try {
    await c.ready;
    await c.send('Runtime.enable');
    await c.send('Log.enable');
    await c.send('Page.enable');

    // 마운트될 때까지 **실제 시간** 기준으로 기다린다. 가상 시계를 쓰지 않는
    // 이유가 이것이다 — 워치독 타이머와 경주하면 검사가 거짓말을 한다.
    const deadline = Date.now() + MOUNT_TIMEOUT_MS;
    let last = { mounted: false, watchdog: false, text: '' };
    while (Date.now() < deadline) {
      await sleep(700);
      let r;
      try {
        r = await c.send('Runtime.evaluate', {
          expression: `(() => {
            const el = document.getElementById('root');
            return JSON.stringify({
              mounted: !!(el && el.childElementCount > 0),
              watchdog: !!document.getElementById('dp-boot-retry'),
              text: (document.body ? document.body.innerText : '').slice(0, 4000),
            });
          })()`,
          returnByValue: true,
        });
      } catch { continue; }
      const v = r && r.result && r.result.value;
      if (!v) continue;
      try { last = JSON.parse(v); } catch { continue; }
      // 워치독 안내가 떴다면 #root 에 자식은 있지만 **실패**다. 이 구분이 없으면
      // "뭔가 그려졌으니 통과"가 되어 검사가 백지를 통과시킨다.
      if (last.watchdog) break;
      if (last.mounted) break;
    }
    return { ...last, consoleErrors: c.consoleErrors.slice(0, 5) };
  } finally {
    c.close();
    await closeTab(port, tab.id);
  }
}

export async function smoke() {
  const chrome = findChrome();
  if (!chrome) {
    return { ran: false, reason: 'Chrome/Chromium 을 찾지 못했다 (DP_CHROME 으로 경로 지정 가능)', results: [] };
  }
  let session;
  try {
    session = await launch(chrome);
  } catch (e) {
    return { ran: false, reason: 'Chrome 을 띄우지 못했다 — ' + (e.message || e), results: [] };
  }
  const results = [];
  try {
    // 탭을 나눠 병렬로 돌릴 수도 있으나, 순차라도 화면당 몇 초다. 병렬로 하면
    // 한 탭의 오류가 다른 탭 것으로 섞여 보고가 거짓이 된다.
    for (const page of PAGES) {
      const url = BASE + page.path;
      let r;
      try {
        r = await checkPage(session.port, url);
      } catch (e) {
        results.push({ ...page, url, pass: false, unreadable: true, why: '브라우저에 붙지 못했다 — ' + (e.message || e) });
        continue;
      }
      if (r.watchdog) {
        results.push({ ...page, url, pass: false, why: '부트 워치독 안내가 떴다 — 앱이 마운트되지 못했다', consoleErrors: r.consoleErrors });
        continue;
      }
      if (!r.mounted) {
        results.push({ ...page, url, pass: false, why: `${MOUNT_TIMEOUT_MS}ms 안에 #root 가 비어 있다`, consoleErrors: r.consoleErrors });
        continue;
      }
      const missing = page.mustHave.filter(t => !r.text.includes(t));
      if (missing.length) {
        results.push({ ...page, url, pass: false, why: `그려지긴 했는데 기대 문구가 없다: ${missing.join(', ')}`, consoleErrors: r.consoleErrors });
        continue;
      }
      results.push({ ...page, url, pass: true, why: '', consoleErrors: r.consoleErrors });
    }
  } finally {
    session.kill();
  }
  return { ran: true, reason: '', results, chrome };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const line = '─'.repeat(72);
  console.log(line);
  console.log('배포 후 렌더 스모크 — ' + BASE);
  console.log(line);
  const { ran, reason, results, chrome } = await smoke();
  if (!ran) {
    console.log('  ⚠ 돌리지 못했다: ' + reason);
    console.log(line);
    console.log('통과가 아니다 — 화면이 실제로 뜨는지는 아직 아무도 확인하지 않았다.');
    process.exit(2);   // 실패(1)와 구분한다. 못 돌린 것은 못 돌린 것이다.
  }
  console.log('  브라우저: ' + chrome);
  for (const r of results) {
    console.log(r.pass ? `  ✓ ${r.label} ${r.path} — 렌더 확인`
                       : `  ✗ ${r.label} ${r.path} — ${r.why}`);
    // 통과했어도 콘솔 오류는 보여준다. 그려졌다는 것과 이상이 없다는 것은 다르다.
    for (const e of (r.consoleErrors || [])) console.log(`      · 콘솔: ${e}`);
  }
  console.log(line);
  const bad = results.filter(r => !r.pass);
  const unread = bad.filter(r => r.unreadable);
  if (bad.length && unread.length === bad.length) {
    console.log(`읽지 못한 화면 ${unread.length}건 — 통과가 아니다.`);
    process.exit(2);
  }
  if (bad.length) {
    console.log(`실패 ${bad.length}건 — 배포된 화면이 뜨지 않는다. 즉시 확인할 것.`);
    process.exit(1);
  }
  console.log('통과 — 배포된 화면이 실제로 그려진다.');
  // 명시적으로 끝낸다. 소켓이나 자식 프로세스 핸들이 하나라도 남으면 Node 는
  // 조용히 기다린다 — 배포 래퍼가 그만큼 멎는다.
  process.exit(0);
}
