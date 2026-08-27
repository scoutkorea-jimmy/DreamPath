// deploy.mjs — 배포 한 번을 끝까지 책임지는 래퍼
//
//   preflight  →  wrangler deploy  →  배포 후 렌더 스모크
//
// 왜 래퍼인가(2026-08-27, 운영자 결정): v01.101.10 의 백지 사고는 배포 **뒤에만**
// 드러나는 종류였다. 그런데 배포 후 확인은 절차서에만 적혀 있었고, 적어 두는
// 것만으로는 지켜지지 않는다는 것을 이 저장소는 이미 세 번 배웠다
// (rules/04-history-failure.md — 그래서 preflight 가 생겼다). 같은 이유로
// "배포하면 자동으로 확인까지" 를 한 명령에 묶는다.
//
// 스모크가 실패해도 **배포를 되돌리지는 않는다.** 자동 롤백은 더 위험하다 —
// 스모크가 틀렸을 수도 있고(실제로 첫 판이 멀쩡한 홈을 죽었다고 했다),
// 되돌리는 것 자체가 또 하나의 배포다. 대신 **크게 알리고 되돌리는 법을 적는다.**
// 판단은 사람이 한다.
import { spawn } from 'node:child_process';

const line = '─'.repeat(72);
const args = process.argv.slice(2);
const SKIP_SMOKE = args.includes('--no-smoke');

function run(cmd, cmdArgs, opts) {
  return new Promise((resolve) => {
    const p = spawn(cmd, cmdArgs, { stdio: 'inherit', shell: false, ...(opts || {}) });
    p.on('close', (code) => resolve(code === null ? 1 : code));
    p.on('error', () => resolve(127));
  });
}

function capture(cmd, cmdArgs) {
  return new Promise((resolve) => {
    const p = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    p.stdout.on('data', c => { out += c; });
    p.on('close', () => resolve(out));
    p.on('error', () => resolve(''));
  });
}

console.log(line);
console.log('배포 — preflight → deploy → 렌더 스모크');
console.log(line);

// 1) preflight
const pf = await run('node', ['rules/tools/preflight.mjs']);
if (pf !== 0) {
  console.log('\n배포하지 않았다 — preflight 가 막았다.');
  process.exit(1);
}

// 2) 남의 변경이 섞여 있는지 (CLAUDE.md §2 D-2)
// 배포는 작업트리 전체를 올린다. 다른 세션의 미완성 코드가 같이 나간다.
const status = await capture('git', ['status', '--short']);
const dirty = status.split('\n').filter(l => l.trim() && !l.startsWith('??'));
if (dirty.length) {
  console.log('\n' + line);
  console.log('작업트리에 커밋되지 않은 변경이 있다 — 이것들이 함께 배포된다:');
  for (const l of dirty) console.log('  ' + l);
  console.log('내가 만든 변경이 맞는지 확인할 것. 남의 것이면 운영자에게 알린다.');
  console.log(line);
}

// 3) 배포
console.log('\n' + line);
console.log('wrangler deploy');
console.log(line);
const dep = await run('npx', ['wrangler', 'deploy']);
if (dep !== 0) {
  console.log('\n배포 실패 — 종료코드 ' + dep);
  process.exit(1);
}

if (SKIP_SMOKE) {
  console.log('\n--no-smoke — 렌더 확인을 건너뛰었다. 화면이 뜨는지는 아직 아무도 확인하지 않았다.');
  process.exit(0);
}

// 4) 배포 후 렌더 스모크
console.log('');
const sm = await run('node', ['rules/tools/smoke.mjs']);
if (sm === 2) {
  console.log('\n' + line);
  console.log('경고 — 스모크를 돌리지 못했다. 배포는 됐지만 **화면 확인은 안 된 상태**다.');
  console.log('   브라우저로 직접 /admin 과 / 를 열어 볼 것.');
  console.log(line);
  process.exit(2);
}
if (sm !== 0) {
  console.log('\n' + line);
  console.log('실패 — 배포된 화면이 뜨지 않는다.');
  console.log('   되돌리려면: npx wrangler rollback');
  console.log('   (스모크가 틀렸을 수도 있다 — 되돌리기 전에 브라우저로 직접 확인할 것.)');
  console.log(line);
  process.exit(1);
}

console.log('\n' + line);
console.log('배포 완료 — 화면이 실제로 그려지는 것까지 확인했다.');
console.log(line);
