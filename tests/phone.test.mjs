// 전화번호 형식 정리 회귀 테스트: node tests/phone.test.mjs
// index.html에서 digits와 전화번호 구획을 잘라 실행하므로 항상 실제 코드를 검사한다.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const grab = (re, what) => { const m = html.match(re); if (!m) throw new Error(what + "를 index.html에서 찾지 못함"); return m[0]; };
const { normalizePhone, dialable } = new Function([
  grab(/const digits = .*;/, "digits"),
  grab(/\/\/ =+ 전화번호[\s\S]*?(?=\/\/ =+ AI 읽기)/, "전화번호 구획"),
  "return { normalizePhone, dialable: typeof dialable === 'function' ? dialable : () => '(dialable 없음)' };"
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
  // 명함에 흔한 대표번호 범위(~5)와 내선: 번호를 바꾸지 않고 붙은 부분을 지킴
  ["02-555-1234~5", "02-555-1234~5"],
  ["02 555 1234 ~ 6", "02-555-1234~6"],
  ["02-555-1234~1235", "02-555-1234~1235"],
  ["02-555-1234(내선 123)", "02-555-1234 내선 123"],
  ["031-123-4567 ext. 89", "031-123-4567 내선 89"],
  ["010-1234-5678 #12", "010-1234-5678 내선 12"],
  ["+82 2 555 1234 (내선 7)", "02-555-1234 내선 7"],
  ["내선 123", null],
  ["12345", null]
];
let fail = 0;
for (const [input, want] of cases) {
  try { assert.equal(normalizePhone(input), want); console.log("✓", input, "→", want); }
  catch { fail++; console.log("✗", input, "기대:", want, "실제:", normalizePhone(input)); }
}
// 전화 걸기·연락처 파일용 번호: 범위는 빼고 대표번호만, 내선은 쉼표(잠시 멈춤) 뒤에
const dialCases = [
  ["010-1234-5678", "01012345678"],
  ["+82 10 1234 5678", "01012345678"],
  ["02-555-1234~5", "025551234"],
  ["02-555-1234 내선 123", "025551234,123"],
  ["02-555-1234(내선 123)", "025551234,123"],
  ["1588-1234", "15881234"]
];
for (const [input, want] of dialCases) {
  try { assert.equal(dialable(input), want); console.log("✓ 걸기", input, "→", want); }
  catch { fail++; console.log("✗ 걸기", input, "기대:", want, "실제:", dialable(input)); }
}
const total = cases.length + dialCases.length;
console.log(fail ? `\n${fail}건 실패 / ${total}건` : `\n모두 통과 (${total}건)`);
process.exit(fail ? 1 : 0);
