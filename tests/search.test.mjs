// 한글 검색(초성·띄어쓰기 무시) 회귀 테스트: node tests/search.test.mjs
// index.html에서 CHO와 hangulMatch를 잘라 실행하므로 항상 실제 코드를 검사한다.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const m = html.match(/const CHO = [\s\S]*?\n  function hangulMatch[\s\S]*?\n  }\n/);
if (!m) throw new Error("hangulMatch를 index.html에서 찾지 못함");
const hangulMatch = new Function(m[0] + "\nreturn hangulMatch;")();

const cases = [
  ["홍길동", "ㅎㄱㄷ", true],
  ["홍길동", "ㄱㄷ", true],
  ["홍길동", "홍ㄱ", true],
  ["홍길동", "홍 길동", true],
  ["홍 길동", "홍길동", true],
  ["(주)한빛소프트", "ㅎㅂ", true],
  ["(주)한빛소프트", "ㅅㅍㅌ", true],
  ["김영희", "ㅎㄱㄷ", false],
  ["홍길동", "ㄷㄱ", false],
  ["John Smith", "smith", true],
  ["", "ㅎ", false],
  ["홍길동", "", false]
];
let fail = 0;
for (const [text, q, want] of cases) {
  try { assert.equal(hangulMatch(text, q), want); console.log("✓", `"${text}" ← "${q}"`, want); }
  catch { fail++; console.log("✗", `"${text}" ← "${q}"`, "기대:", want); }
}
console.log(fail ? `\n${fail}건 실패 / ${cases.length}건` : `\n모두 통과 (${cases.length}건)`);
process.exit(fail ? 1 : 0);
