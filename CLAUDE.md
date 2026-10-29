# 명함첩 (cardbook)

아이폰에서 명함을 스캔해 보관하고 아이폰 연락처에 저장하는 개인용 웹앱.
사용자는 Mac이 없어서 네이티브 앱 대신 **GitHub Pages에 올린 정적 웹앱**을 Safari(또는 크롬)에서 열고
홈 화면에 추가해 쓴다. 답변·UI 문구는 모두 한국어.

## 구조

| 경로 | 내용 |
|---|---|
| `index.html` | 앱 전체 (HTML·CSS·JS 한 파일, 빌드 단계 없음) |
| `manifest.webmanifest`, `apple-touch-icon.png`, `icon-512.png` | 홈 화면 아이콘·이름 |
| `tests/parser.test.mjs` | 명함 텍스트 분류기 회귀 테스트 (`node tests/parser.test.mjs`) |
| `ios/` | 초기에 만든 SwiftUI 네이티브 앱 (Vision OCR, Contacts). Mac이 없어 **현재 사용하지 않음**. 참고용 |

`index.html` 스크립트 구획 (주석 `// ===== ... =====`로 구분):
- **storage**: 명함은 `localStorage("cardbook.cards.v1")` + IndexedDB(`cardbook`/`kv`) 이중 저장, 한쪽이 비면 복구.
  AI 설정(`{key, model, groq, groqModel}`, 이름은 예전 그대로 gemini)은 `localStorage("cardbook.gemini.v1")` + IndexedDB + 쿠키 `cbk` + **URL 해시 `#k=<base64url JSON>`**.
  해시는 홈 화면 아이콘 URL에 키를 담아 저장소가 지워져도 복구하려는 목적. `navigator.storage.persist()` 요청.
- **parser** (`parseCardText`): 줄 단위 규칙 기반 분류. 정규식(이메일·전화·웹·주소), 직함 사전 `TITLES`,
  성씨 `SURNAMES`, 회사 키워드 `COMPANY_WORDS`. 분류 못 한 줄은 `memo`로. `ios/.../CardParser.swift`를 JS로 옮긴 것.
  전화: `010`대는 휴대폰, 라벨에 fax/팩스/F면 팩스, 나머지 사무실. `+82`는 `0`으로 정규화.
- **AI 읽기 (선택, `readCard`)**: 무료 AI 두 곳. 키는 둘 다 브라우저에서 바로 호출(CORS 허용 확인함).
  - **제미나이(주)**: `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, JSON 응답.
    기본 모델 `gemini-3.5-flash-lite`(2026-10 기준 제미나이 중 가장 빠름, 한글 정확도 좋음, 무료). 예전 기본값 `gemini-3.6-flash`로
    저장된 설정은 `OLD_MODELS`로 새 기본값으로 바꿔 씀. 모델 칸이 기본값이면 빈 문자열로 저장(기본값이 바뀌면 따라가게).
    `thinkingLevel`은 minimal→low→없음 순으로 모델이 받아 주는 값으로 물러남(세션 동안 기억). temperature는 기본값(제미나이 3은 낮추면 반복·지연 위험).
  - **Groq(예비)**: `api.groq.com/openai/v1/chat/completions`(OpenAI 형식), 기본 `qwen/qwen3.8-27b`(비전, 카드 등록 없는 무료).
    `reasoning_effort: none`, `reasoning_format: hidden`, `response_format: json_object` — 모델이 거부하는 옵션은 빼고 다시 보냄.
  - 둘 다 키가 있으면 제미나이 먼저, 4초(`HEDGE_MS`) 안에 답이 없거나 실패하면 Groq도 보내 먼저 온 답을 씀(나머지는 취소).
  - 명함 영역 화면이 떠 있는 동안 자동으로 찾은 영역(1200px)을 미리 보냄 → 완료 누를 때쯤 결과가 와 있음.
    모서리를 이미지 대각선의 4% 넘게 옮기면 취소하고 새로 자른 사진으로 다시 보냄.
- **명함 영역 찾기·펴기** (`findCardQuad`, `warpQuad`, `cropDialog`): 사진을 넣으면 400px로 줄여 색 채널별 소벨 경사 →
  경사 세기로 가중한 허프 변환으로 직선을 찾고, 직선 4개가 이루는 사각형 중 테두리가 이어지고 대비가 센 것을 고름
  (같은 각도 직선은 5개까지만 — 나뭇결 배경 대비). 모서리 4개를 끌어 고치는 화면(돋보기 포함)을 거쳐 원근을 펴서 명함만 남김.
  가로세로비는 원근 추정이 흔들려서 1.69~2.04면 한국 표준 90×50(1.8)으로 맞춤. 제미나이에도 자른 사진을 보냄.
  사진 아래 '명함 영역 다시 맞추기'로 다시 자를 수 있음(저장된 명함은 보관된 720px 사진에서 자르므로 화질이 낮음).
  검증은 Playwright로 CSS 3D 변형한 명함 장면(나뭇결·밝은 책상·어두운 명함·잡동사니·신문)을 스크린샷해 넣어 봄.
- **vCard**: `toVCard()`로 3.0 vCard 생성 → `<a download>`로 `.vcf` 내려받기 → iOS Safari가 연락처 추가 화면을 띄움.
- **UI**: 목록(검색) → 시트(새 명함/편집/상세/설정/백업). 새 명함 화면의 텍스트 칸은 iOS **텍스트 스캔(Live Text)**으로
  입력받아 350ms 디바운스 후 자동 분류. 사용자가 직접 고친 칸(`sheet.dirty`)은 자동 채우기가 덮어쓰지 않음.

## 지켜야 할 것

- 외부 라이브러리·빌드 도구 없이 `index.html` 한 파일 유지 (사용자가 GitHub 웹에서 파일 올려 배포).
- 개인정보(명함)는 기기에만 저장. 서버로 보내는 건 사용자가 키를 넣은 AI(제미나이·Groq) 호출뿐.
- 입력칸 글자 크기 16px 이상 (iOS 자동 확대 방지), safe-area inset 유지.
- 라이트/다크 모드 모두 `:root` 토큰으로 처리.
- 분류 규칙을 바꾸면 `tests/parser.test.mjs`에 사례를 추가하고 통과 확인.

## 테스트

- 분류기: `node tests/parser.test.mjs`
- 화면·저장: `python3 -m http.server` 후 Playwright로 열어 확인 (설정 저장 → 저장소 삭제 → 복구 등).
- iOS 전용 동작(텍스트 스캔, .vcf → 연락처 화면, 홈 화면 앱)은 자동 테스트 불가 → 사용자에게 확인 요청.

## 배포

GitHub 저장소 루트에 파일을 두고 Settings → Pages → `main` / root. 주소 `https://<아이디>.github.io/<저장소>/`.
push 권한이 있으면 커밋·푸시하면 1~2분 뒤 반영된다고 사용자에게 알리기.

## 지금까지의 결정 (배경)

- Claude 아티팩트 버전도 만들었으나: .vcf 다운로드가 막히고, 자동 인식이 Claude 사용량을 써서 사용자가 원치 않음 → 웹앱으로 이전.
- 네이티브 iOS 앱(`ios/`)은 Mac·서명 문제로 보류. Mac을 쓰게 되면 `ios/`를 Xcode로 빌드하는 것이 가장 완성도 높은 길.
- 크롬(iOS)도 같은 WebKit이라 동작하지만 저장소가 브라우저별로 분리됨. 연락처 저장은 Safari가 더 매끄러움.

## 추가 기능 후보 (사용자 요청 시)

- 명함 앞/뒷면 2장 보관, 태그·만난 날짜
- CSV(엑셀) 내보내기
- 중복 명함 감지(전화·이메일 기준)
- 분류 정확도 개선: 실제 명함에서 틀린 사례를 받아 테스트에 추가하며 규칙 보강
