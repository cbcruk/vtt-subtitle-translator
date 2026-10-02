# VTT Subtitle Translator

영어 VTT 자막 파일을 한국어로 번역하는 자동화 도구.
YouTube 자동 생성 자막의 단어별 타이밍으로 문장을 재조립해 문장 단위로 번역하고, 번역문을 읽기 좋은 길이의 큐로 다시 나눕니다.

## Pipeline

```
YouTube VTT ─ parseYoutubeVtt ─▶ Word[] ─ toSentences ─▶ Sentence[] ─▶ 번역(Claude) ─ toCues ─▶ Cue[] ─ toWebVtt ─▶ .ko.vtt
```

| 단계 | 모듈 | 내용 |
| --- | --- | --- |
| 단어 추출 | `packages/subtitle-core/src/youtube-vtt.ts` | 롤링 자막에서 줄마다 한 번씩만 읽고 `<00:00:01.230><c>` 태그로 단어 시각 복원 |
| 문장 재조립 | `packages/subtitle-core/src/sentences.ts` | `Intl.Segmenter`로 문장 분리, 너무 긴 문장은 가장 긴 쉼에서 다시 분할 |
| 큐 재분할 | `packages/subtitle-core/src/cues.ts` | 문장 구간 안에서 글자 수 비율로 시간 배분, 겹침 제거, 짧은 큐는 뒤 공백으로 연장 |
| 직렬화 | `packages/subtitle-core/src/webvtt.ts` | 번호 붙은 WebVTT 출력 |
| 비교 HTML | `apps/cli/src/compare-html.ts` | 문장별 원문/번역 대조 페이지 |
| 작업 파일 | `apps/cli/src/work-files.ts` | 배치 입출력, 번역 id 일대일 검증 |

큐 단위가 아니라 문장 단위로 번역하므로 원본의 두 줄 롤링 표시는 유지하지 않습니다.

## Directory Structure

pnpm 워크스페이스 모노레포입니다.

```
vtts/
├── packages/
│   ├── subtitle-core/                # @vtts/subtitle-core (private): 파싱·문장·큐·WebVTT
│   └── vtt-to-json/                  # @cbcruk/vtt-to-json (npm 배포): subtitle-core를 번들
├── apps/
│   └── cli/                          # @vtts/cli (private): extract / reconstruct / compare / cleanup
├── .changeset/                       # 배포 패키지 버전 관리
├── .claude/skills/translate-vtt/
│   └── SKILL.md                      # /translate-vtt 슬래시 명령어
└── subtitles/
    ├── *.en.vtt                      # 영어 자막 원본
    └── *.ko.vtt                      # 한국어 자막
```

## Usage

Node 24 이상이 필요합니다. TypeScript를 빌드 없이 그대로 실행합니다.

```bash
pnpm install
```

### Claude Code 슬래시 명령어

```
/translate-vtt subtitles/filename.en.vtt
```

추출 → 병렬 번역 → 재구성 → 비교 HTML → 정리를 자동 실행합니다.

### 수동 실행

#### 1. Extract - 문장 추출 및 배치 분할

```bash
pnpm vtt extract "subtitles/video.en.vtt" [--batch-size 100] [--locale en] [--max-sentence-chars 160]
```

- 출력: `_sentences.json`, `batch_0.json` ~ `batch_N.json`
- 기존 작업 파일은 먼저 삭제합니다.

#### 2. Translate

각 `batch_N.json`의 `entries`에 `translation` 필드를 채워 `trans_N.json`으로 저장합니다. 문장을 합치거나 나누면 안 됩니다.

#### 3. Reconstruct - 번역문으로 VTT 생성

```bash
pnpm vtt reconstruct "subtitles/video.en.vtt" [output.vtt] [--language ko]
```

출력 파일명 미지정 시 `.en.vtt` → `.ko.vtt`. 번역 id가 문장 id와 일대일로 맞지 않으면 실패합니다.
CPS(초당 글자 수)와 줄 길이 위반 비율을 함께 출력합니다.

#### 4. Compare - 원문/번역 비교 HTML 생성

```bash
pnpm vtt compare "subtitles/video.en.vtt" [--output out.html] [--language ko]
```

원문 문장과 번역문을 id 기준으로 나란히 보여주는 단일 HTML을 생성합니다. 각 문장의 시작 시각이 함께 표시됩니다.
작업 파일(`_sentences.json`, `trans_N.json`)을 읽으므로 cleanup 전에 실행해야 합니다.

- 외부 의존성 없는 자체 완결형 HTML (오프라인 열람 가능)
- 원문·번역 실시간 검색 필터
- 라이트/다크 테마 자동 대응, 모바일 반응형
- 출력 미지정 시 `<name>.ko.compare.html`로 저장

#### 5. Cleanup - 작업 파일 제거

```bash
pnpm vtt cleanup [directory]
```

`_sentences.json`, `batch_*.json`, `trans_*.json`을 삭제합니다.
(`.ko.vtt`, `.compare.html` 산출물은 유지됩니다.)

## Development

```bash
pnpm test        # 모든 패키지의 node:test
pnpm typecheck
pnpm build       # 배포 패키지 빌드 (tsdown)
```

### Release

`@cbcruk/vtt-to-json`만 npm에 배포합니다. `subtitle-core`는 private이며 빌드할 때 vtt-to-json 안에 번들됩니다.

```bash
pnpm changeset             # 변경 기록 추가
pnpm changeset version     # 버전·CHANGELOG 반영
pnpm build
pnpm changeset publish
```

## Translation Guidelines

- 자연스러운 구어체 한국어 (YouTube 튜토리얼 톤)
- 기술 용어는 영어 유지: API, GitHub, CLI, JSON, npm, TypeScript, React, VS Code 등
- 고유명사(인명, 제품명, 회사명)는 영어 유지
- 숫자/단위는 그대로
- 문장 id는 반드시 보존 (병합·분할 금지)
