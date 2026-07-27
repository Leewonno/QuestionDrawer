# 질문서랍 (Question Drawer)

<div align="center">
  
<br />

<img width="600" alt="질문서랍 — Question Drawer" src="docs/assets/banner.svg" />

<br />
<br />

![WXT](https://img.shields.io/badge/WXT-67D74E?style=for-the-badge&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)

</div>

## 시작하게 된 이유

Claude / ChatGPT / Gemini / Grok / Kimi / DeepSeek 답변을 읽다 보면 "이건 나중에 따로 물어봐야지" 싶은 단어들이 계속 쌓입니다. 하지만 새로 질문을 하다 보면, 정작 물어보려던 것들을 까먹기 쉽습니다.

**질문서랍**은 그런 질문을 놓치지 않으려고 만들었습니다. 궁금한 부분을 **드래그해 사이드 서랍에 담아두면**, 나중에 클릭 한 번으로 `"~에 대해 자세히 설명해줘"` 형태의 후속 질문을 대화 입력창에 넣어줍니다.

읽던 흐름을 끊지 않으면서 궁금증을 하나도 흘리지 않는 것, 질문서랍이 만들고 싶은 경험입니다.

## 주요 기능

### 서랍에 담기

- 드래그해서 텍스트를 선택하면 나타나는 _서랍에 담기_ 버튼으로 질문을 저장
- 서랍 상단의 **+** 버튼으로 드래그 없이 질문을 직접 입력해 담기

### 온디바이스 AI 질문 다듬기

- 길이가 30자 초과한 질문은 크롬 내장 AI(Gemini Nano)가 **핵심 주제 구절로 요약**한 뒤 저장
- 크롬 내장 AI를 쓸 수 없는 환경에서는 원문 질문을 그대로 유지 (요약은 전부 기기 안에서만 수행)

### 서랍에서 꺼내기

- 담아둔 항목을 클릭하면 대화 입력창에 질문을 채워 넣음
- 입력창을 찾지 못하면 클립보드에 복사하고 안내 토스트를 표시

### 담아둔 질문 관리

- 카드의 수정 버튼으로 저장된 질문 내용을 변경
- 삭제 버튼으로 필요 없어진 질문을 제거

### 한국어 / 영어 지원

- 브라우저 언어를 감지해 한국어·영어 UI를 자동 선택하고, 서랍 헤더의 토글로 언제든 전환 (선택은 저장됨)
- 질문 템플릿도 언어를 따라감 — `"~에 대해 자세히 설명해줘"` / `"Explain ~ in detail"`

### 대화별 분리

- URL의 대화 ID(`claude.ai/chat/<id>`, `chatgpt.com/c/<id>`, `gemini.google.com/app/<id>`, `grok.com/c/<id>`, `kimi.com/chat/<id>`, `chat.deepseek.com/a/chat/s/<id>`)를 기준으로 질문을 저장
- 아직 ID가 없는 새 대화에서 담은 질문은 첫 메시지를 보내 ID가 생기는 순간 그 대화로 귀속

<br />

> 모든 데이터는 브라우저 로컬 스토리지에만 저장되며 외부로 전송되지 않습니다.
> AI 다듬기도 크롬 내장 온디바이스 모델을 사용해 선택한 텍스트가 기기 밖으로 나가지 않습니다.

## 지원 사이트

| 사이트   | 도메인              |
| -------- | ------------------- |
| Claude   | `claude.ai`         |
| ChatGPT  | `chatgpt.com`       |
| Gemini   | `gemini.google.com` |
| Grok     | `grok.com`          |
| Kimi     | `kimi.com`          |
| DeepSeek | `chat.deepseek.com` |

## 시작하기

<a href="https://chromewebstore.google.com/detail/question-drawer/mipekafnkjahilpfjkfhmmjjbhkofnlj">🔗크롬 확장 프로그램</a>
