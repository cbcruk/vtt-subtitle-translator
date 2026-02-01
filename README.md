# VTT Subtitle Translator

영어 VTT 자막 파일을 한국어로 번역하는 자동화 도구.
YouTube 자동 생성 자막의 단어별 타이밍 태그를 처리하고, Claude Code를 통해 병렬 번역을 수행합니다.

## Directory Structure

```
vtts/
├── translate-vtt.py                  # 번역 자동화 스크립트
├── .gitignore                        # 임시 파일 제외
├── .claude/
│   ├── settings.local.json           # python3 실행 권한 설정
│   └── skills/
│       └── translate-vtt/
│           └── SKILL.md              # /translate-vtt 슬래시 명령어
└── subtitles/
    ├── *.en.vtt                      # 영어 자막 원본
    └── *.ko.vtt                      # 한국어 자막
```

## Usage

### Claude Code 슬래시 명령어

```
/translate-vtt subtitles/filename.en.vtt
```

이 명령어가 전체 파이프라인(추출 → 번역 → 재구성 → 정리)을 자동 실행합니다.

### 수동 실행

#### 1. Extract - 텍스트 추출 및 배치 분할

```bash
python3 translate-vtt.py extract "subtitles/video.en.vtt" [--batch-size 200]
```

VTT를 파싱하여 고유 텍스트를 추출하고 배치 JSON 파일로 분할합니다.

- 출력: `batch_0.json` ~ `batch_N.json`, `_mapping.json`

#### 2. Reconstruct - 번역 결과로 VTT 재구성

```bash
python3 translate-vtt.py reconstruct "subtitles/video.en.vtt" [output.ko.vtt]
```

번역된 `trans_N.json` 파일들을 병합하여 한국어 VTT를 생성합니다.
출력 파일명 미지정 시 `.en.vtt` → `.ko.vtt`로 자동 변환.

#### 3. Cleanup - 임시 파일 제거

```bash
python3 translate-vtt.py cleanup [directory]
```

`batch_*.json`, `trans_*.json`, `_mapping.json`을 삭제합니다.

## Translation Guidelines

- 자연스러운 구어체 한국어 (YouTube 튜토리얼 톤)
- 기술 용어는 영어 유지: API, GitHub, CLI, JSON, npm, TypeScript, React, VS Code 등
- 고유명사(인명, 제품명, 회사명)는 영어 유지
- 숫자/단위는 그대로
- 큐 타임스탬프는 절대 수정하지 않음
- 단어별 타이밍 태그(`<00:00:03.040><c>...</c>`)는 제거 후 번역
