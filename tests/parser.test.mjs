// 명함 텍스트 분류기 회귀 테스트: node tests/parser.test.mjs
// index.html에서 FIELDS·digits·blankCard와 parser 구획을 잘라 실행하므로 항상 실제 코드를 검사한다.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const grab = (re, what) => { const m = html.match(re); if (!m) throw new Error(what + "를 index.html에서 찾지 못함"); return m[0]; };
const src = [
  grab(/const FIELDS = .*;/, "FIELDS"),
  grab(/const digits = .*;/, "digits"),
  grab(/const blankCard = .*;/, "blankCard"),
  grab(/\/\/ =+ parser[\s\S]*?(?=\/\/ =+ AI 읽기)/, "parser 구획"),
  "return parseCardText;"
].join("\n");
const parseCardText = new Function(src)();

const cases = [
  {
    name: "기본 한국 명함",
    text: "(주)한빛소프트\n개발팀\n홍길동 팀장\nM. 010-1234-5678\nT. 02-555-1234\nF. 02-555-1235\nhong@hanbit.co.kr\nwww.hanbit.co.kr\n서울특별시 강남구 테헤란로 123\n한빛빌딩 5층",
    want: { company: "(주)한빛소프트", department: "개발팀", name: "홍길동", jobTitle: "팀장", mobile: "010-1234-5678", phone: "02-555-1234", fax: "02-555-1235", email: "hong@hanbit.co.kr", website: "www.hanbit.co.kr", address: "서울특별시 강남구 테헤란로 123 한빛빌딩 5층" }
  },
  {
    name: "+82 국제번호 정규화",
    text: "김철수\nMobile +82 10 9876 5432\nTel +82-31-123-4567",
    want: { name: "김철수", mobile: "010-9876-5432", phone: "031-123-4567" }
  },
  {
    name: "직함이 이름에 붙은 경우",
    text: "이영희과장\n주식회사 다온",
    want: { name: "이영희", jobTitle: "과장", company: "주식회사 다온" }
  },
  {
    name: "팩스 라벨(팩스/Fax)",
    text: "박민수\n전화 031-111-2222 팩스 031-111-3333",
    want: { name: "박민수", phone: "031-111-2222", fax: "031-111-3333" }
  },
  {
    name: "영문 이름·직함",
    text: "John Smith\nSenior Engineer\njohn.smith@example.com",
    want: { name: "John Smith", jobTitle: "Senior Engineer", email: "john.smith@example.com" }
  },
  {
    name: "대표번호 1588",
    text: "최지훈 대표\n고객센터 1588-1234",
    want: { name: "최지훈", jobTitle: "대표", phone: "1588-1234" }
  },
  {
    name: "공공기관",
    text: "수원시청\n정보통신과\n정수진 주무관\n031-228-1234",
    want: { company: "수원시청", department: "정보통신과", name: "정수진", jobTitle: "주무관", phone: "031-228-1234" }
  },
  {
    name: "분류 못 한 줄은 메모로",
    text: "한상우\n고객의 꿈을 함께합니다",
    want: { name: "한상우", memo: "고객의 꿈을 함께합니다" }
  }
];

let fail = 0;
for (const c of cases) {
  const got = parseCardText(c.text);
  try {
    for (const [k, v] of Object.entries(c.want)) assert.equal(got[k], v, `${k}`);
    console.log("✓", c.name);
  } catch (e) {
    fail++;
    console.log("✗", c.name, "—", e.message.split("\n")[0], "\n   기대:", JSON.stringify(e.expected), "실제:", JSON.stringify(e.actual));
  }
}
console.log(fail ? `\n${fail}건 실패 / ${cases.length}건` : `\n모두 통과 (${cases.length}건)`);
process.exit(fail ? 1 : 0);
