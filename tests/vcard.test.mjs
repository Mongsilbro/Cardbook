// 연락처 파일(vCard) 회귀 테스트: node tests/vcard.test.mjs
// index.html에서 vCard 구획을 잘라 실행하므로 항상 실제 코드를 검사한다. (2026-10 COMPOUND 삭제로 연락처 저장이 멈춘 일 재발 방지)
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sec = html.match(/\/\/ =+ vCard[\s\S]*?(?=\s*function downloadFile)/);
if (!sec) throw new Error("vCard 구획을 index.html에서 찾지 못함");
const toVCard = new Function(sec[0] + "\nreturn toVCard;")();

const cases = [
  { name: "한국 이름 3글자", card: { name: "홍길동", company: "(주)한빛소프트", department: "개발팀", jobTitle: "팀장", mobile: "010-1234-5678", phone: "02-555-1234", email: "hong@hanbit.co.kr" },
    has: ["N:홍;길동;;;", "FN:홍길동", "ORG:(주)한빛소프트;개발팀", "TITLE:팀장", "TEL;TYPE=CELL:010-1234-5678", "TEL;TYPE=WORK,VOICE:02-555-1234", "EMAIL;TYPE=INTERNET,WORK:hong@hanbit.co.kr"] },
  { name: "두 글자 성", card: { name: "남궁민수" }, has: ["N:남궁;민수;;;"] },
  { name: "외자 이름", card: { name: "김 결" }, has: ["N:김;결;;;"] },
  { name: "영문 이름", card: { name: "John Smith" }, has: ["N:Smith;John;;;"] },
  { name: "이름 없이 회사만", card: { company: "수원시청" }, has: ["FN:수원시청"] },
  { name: "특수문자 이스케이프", card: { name: "이영희", address: "서울, 강남구; 1층", memo: "첫줄\n둘째줄" }, has: ["ADR;TYPE=WORK:;;서울\\, 강남구\\; 1층;;;;", "NOTE:첫줄\\n둘째줄"] }
];
let fail = 0;
for (const c of cases) {
  try {
    const v = toVCard(c.card);
    assert.ok(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n") && v.endsWith("END:VCARD\r\n"), "BEGIN/END");
    for (const line of c.has) assert.ok(v.split("\r\n").includes(line), line);
    console.log("✓", c.name);
  } catch (e) { fail++; console.log("✗", c.name, "—", e.message); }
}
console.log(fail ? `\n${fail}건 실패 / ${cases.length}건` : `\n모두 통과 (${cases.length}건)`);
process.exit(fail ? 1 : 0);
