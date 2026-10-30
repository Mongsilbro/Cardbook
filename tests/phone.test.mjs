// 전화번호 형식 정리 회귀 테스트: node tests/phone.test.mjs
// index.html에서 digits와 전화번호 구획을 잘라 실행하므로 항상 실제 코드를 검사한다.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const grab = (re, what) => { const m = html.match(re); if (!m) throw new Error(what + "를 index.html에서 찾지 못함"); return m[0]; };
const normalizePhone = new Function([
  grab(/const digits = .*;/, "digits"),
  grab(/\/\/ =+ 전화번호[\s\S]*?(?=\/\/ =+ AI 읽기)/, "전화번호 구획"),
  "return normalizePhone;"
].join("\n"))();

const cases = [
  ["010-1234-5678", "010-1234-5678"],
  ["010 1234 5678", "010-1234-5678"],
  ["01012345678", "010-1234-5678"],
  ["+82 10 9876 5432", "010-9876-5432"],
  ["+82-2-555-1234", "02-555-1234"],
  ["(02) 555-1234", "02-555-1234"],
  ["031.228.1234", "031-228-1234"],
  ["1588-1234", "1588-1234"],
  ["070-4321-8765", "070-4321-8765"],
  ["내선 123", null],
  ["12345", null]
];
let fail = 0;
for (const [input, want] of cases) {
  try { assert.equal(normalizePhone(input), want); console.log("✓", input, "→", want); }
  catch { fail++; console.log("✗", input, "기대:", want, "실제:", normalizePhone(input)); }
}
console.log(fail ? `\n${fail}건 실패 / ${cases.length}건` : `\n모두 통과 (${cases.length}건)`);
process.exit(fail ? 1 : 0);
