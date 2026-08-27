// recursion-check.mjs — 무조건 자기 자신을 부르는 함수 찾기 (무한 재귀)
//
// 왜 필요한가(2026-08-27, v01.101.10): 헬퍼 넷을 하나로 합치다가 함수 **본체가
// 통째로 빠지고** 자기 호출만 남았다.
//
//     function authHeaders(extra) { return Object.assign(authHeaders(), extra || {}); }
//
// RangeError → React 트리 언마운트 → /admin 이 완전한 백지. 그런데 이 코드는
// **문법상 완벽하다** — 구문검사(jsx-check)를 그냥 통과한다. 문법이 아니라
// **의미**를 봐야 잡힌다.
//
// 무엇을 성질로 보는가: "종료 조건 없이 자기를 부른다".
// 정확히는 함수 본문에서 자기 이름 호출까지 가는 길에 **분기가 하나도 없는**
// 경우다. if · 삼항 · && · || · ?? · switch · try · 반복문 중 무엇이든 사이에
// 있으면 종료할 길이 있다는 뜻이므로 건드리지 않는다. 콜백 안(setTimeout 등)의
// 자기 호출도 즉시 실행이 아니므로 제외한다.
//
// 이 규칙을 좁게 잡은 이유: **오탐이 나면 사람은 검사를 끈다**
// (rules/04-history-failure.md 「검사기가 클래스를 못 읽었다」). 잡는 범위를
// 넓히는 것보다 잡은 것이 언제나 진짜인 편이 오래 간다.
//
// 텍스트 스캔이 아니라 AST 로 본다 — 주석·문자열 안의 이름에 걸리면 그것도 오탐이다.
// 의존성 0: jsx-check 이 이미 캐시해 둔 @babel/standalone 의 parser/traverse 를 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { loadBabelPackages, collectTargets } from './jsx-check.mjs';

// 자기 호출까지의 길에 이것들이 있으면 "조건이 있다"고 본다.
const BRANCHING = new Set([
  'IfStatement', 'ConditionalExpression', 'LogicalExpression', 'SwitchStatement',
  'SwitchCase', 'TryStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement',
  'WhileStatement', 'DoWhileStatement',
]);

const FUNCTIONISH = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
  'ObjectMethod', 'ClassMethod', 'ClassPrivateMethod',
]);

// 이 함수 노드가 스스로를 가리키는 이름. 없으면(익명) 판정 대상이 아니다.
function ownName(node, parent) {
  if (node.id && node.id.name) return node.id.name;                       // function foo() {}
  if (parent && parent.type === 'VariableDeclarator'
      && parent.id && parent.id.name) return parent.id.name;              // const foo = () => {}
  return null;
}

export function findInfiniteRecursion(code, label) {
  const { parser, traverse } = loadBabelPackages();
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'script',
      plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    });
  } catch (e) {
    // 파싱이 안 되는 것은 구문검사가 따로 말한다. 여기서 조용히 통과시키지 않는다.
    return { parsed: false, hits: [], error: String(e && e.message || e).split('\n')[0] };
  }

  const hits = [];
  traverse.default ? traverse.default(ast, visitor(hits, label)) : traverse(ast, visitor(hits, label));
  return { parsed: true, hits, error: null };
}

function visitor(hits, label) {
  return {
    CallExpression(p) {
      const callee = p.node.callee;
      if (!callee || callee.type !== 'Identifier') return;
      const name = callee.name;

      // 이 호출을 담고 있는 가장 가까운 함수를 찾되, 그 사이에 분기나 다른
      // 함수 경계가 있으면 그 시점에서 판정을 접는다.
      let cur = p.parentPath;
      while (cur) {
        const t = cur.node.type;
        if (BRANCHING.has(t)) return;          // 조건이 있다 — 종료할 길이 있다
        if (FUNCTIONISH.has(t)) {
          const self = ownName(cur.node, cur.parent);
          // 규칙 2 (2026-08-27 오탐을 보고 추가): 자기 호출 자체가 분기 밖에 있어도,
          // 함수 안 **다른 자리**에 조건부 탈출구가 있으면 종료할 길이 있는 것이다.
          //
          //     function setDeep(obj, pathArr, val) {
          //       if (pathArr.length === 0) return val;   // ← 탈출구. 앞선 별개 문장이라
          //       ...                                     //   규칙 1 만으로는 안 보였다
          //       next[head] = setDeep(...);
          //     }
          //
          // 첫 판에 이걸 오탐으로 잡았다. 그때 문턱을 낮추는 대신 규칙을 하나 더
          // 읽게 했다 — 검사기가 틀리면 사람은 검사기를 끈다.
          if (self === name && !hasConditionalExit(cur)) {
            hits.push({
              file: label,
              line: p.node.loc ? p.node.loc.start.line : 0,
              name,
            });
          }
          return;                              // 첫 함수 경계에서 끝 — 콜백 안은 즉시 실행이 아니다
        }
        cur = cur.parentPath;
      }
    },
  };
}

// 이 함수 안에 "조건이 붙은 return/throw" 가 하나라도 있는가. 있으면 재귀가
// 끝날 수 있다는 뜻이므로 무한이라고 단정하지 않는다. 중첩된 다른 함수 안의
// return 은 세지 않는다 — 그것은 이 함수의 탈출구가 아니다.
function hasConditionalExit(fnPath) {
  let found = false;
  fnPath.traverse({
    Function(p) { p.skip(); },                 // 안쪽 함수는 남의 사정이다
    'ReturnStatement|ThrowStatement'(p) {
      if (found) return;
      // 조건 안에 있는가 — if · switch · 삼항 · 반복문 어디든.
      let cur = p.parentPath;
      while (cur && cur.node !== fnPath.node) {
        if (BRANCHING.has(cur.node.type)) { found = true; return; }
        cur = cur.parentPath;
      }
    },
  });
  return found;
}

export function checkRecursion() {
  const targets = collectTargets();
  const hits = [];
  const unreadable = [];
  for (const t of targets) {
    const r = findInfiniteRecursion(t.code, t.label);
    if (!r.parsed) unreadable.push({ file: t.label, message: r.error });
    else hits.push(...r.hits);
  }
  return { files: targets.length, hits, unreadable };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { files, hits, unreadable } = checkRecursion();
  for (const u of unreadable) console.log(`  ⚠ 못 읽음: ${u.file} — ${u.message}`);
  if (hits.length) {
    console.log(`무한 재귀 ${hits.length}건`);
    for (const h of hits) console.log(`  ✗ ${h.file}:${h.line}  ${h.name}() 가 조건 없이 자기를 부른다`);
    process.exit(1);
  }
  console.log(`무한 재귀 없음 — ${files}개 대상`);
}
