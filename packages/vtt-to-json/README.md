# @cbcruk/vtt-to-json

WebVTT 자막을 중복 제거된 cue 배열로 파싱합니다.

YouTube 자동 생성 자막처럼 같은 줄이 다음 cue에 반복되고 단어별 `<c>` 태그가 섞인 형식을
염두에 둔 가벼운 파서입니다. 전체 WebVTT 명세를 구현하지는 않습니다.

## 설치

```bash
pnpm add @cbcruk/vtt-to-json
```

## 사용법

```ts
import { readFile } from 'node:fs/promises'
import { VttParser } from '@cbcruk/vtt-to-json'

const vtt = await readFile('captions.vtt', 'utf-8')
const cues = new VttParser(vtt).toJson()
// [
//   { seconds: 2.63, timestamp: '00:00:02.630', text: '[Music]' },
//   { seconds: 8.679, timestamp: '00:00:08.679', text: "Yeah, I love you. I'm in a funk, so I" },
//   ...
// ]
```

## API

### `new VttParser(data)`

WebVTT 원본 텍스트를 받습니다.

### `parser.toJson()`

`Cue[]`를 반환합니다. JSON 문자열이 아니라 객체 배열입니다. 파싱 상태는 호출할 때마다 새로 만들므로 같은
인스턴스에서 여러 번 호출해도 결과가 같습니다.

- 각 cue에서 **새로 추가된 줄**만 읽습니다. `<c>` 태그가 있는 YouTube 롤링 자막이면 cue의 마지막 줄만,
  그 외에는 공백이 아닌 모든 본문 줄을 읽습니다.
- 각 줄의 시각은 그 줄이 **처음 나온 cue의 시작 시각**입니다.
- 줄마다 cue 하나가 됩니다. 여러 줄짜리 cue는 같은 시각의 cue 여러 개가 됩니다.
- 태그를 제거하고 HTML 엔티티(`&amp;` 등)를 복원하며, 연속 공백은 하나로 합칩니다.
- **바로 직전 cue와 같은 텍스트**는 건너뜁니다.
- cue 식별자 줄과 `NOTE` / `STYLE` / `REGION` 블록, 첫 cue 이전의 헤더는 무시합니다.

### `Cue`

| 필드        | 타입     | 설명                                        |
| ----------- | -------- | ------------------------------------------- |
| `seconds`   | `number` | 시작 시각(초)                               |
| `timestamp` | `string` | 시작 시각 (`HH:mm:ss.SSS`로 정규화)         |
| `text`      | `string` | 태그를 제거하고 엔티티를 복원한 자막 텍스트 |

## 제약

- 전체 WebVTT 명세를 검증하지 않습니다. cue 설정과 종료 시각은 결과에 넣지 않습니다.
- 단어 단위 시각이나 문장 재조립이 필요하면 같은 저장소의 `subtitle-core`를 참고하세요.
