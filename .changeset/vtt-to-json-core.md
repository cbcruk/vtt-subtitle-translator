---
'@cbcruk/vtt-to-json': minor
---

eunsoolib에서 vtt-subtitle-translator 저장소로 옮기고, 파싱을 subtitle-core 위에 다시 구현했습니다.

- `seconds`/`timestamp`가 줄이 끝난 시각이 아니라 그 줄이 처음 나온 cue의 시작 시각이 됩니다.
- 한 번만 나오고 반복되지 않는 마지막 줄(`</c>`로 끝나는 줄)을 더 이상 빠뜨리지 않습니다.
- `timestamp`는 항상 `HH:mm:ss.SSS`로 정규화됩니다.
- `text`에서 태그를 제거하고 HTML 엔티티를 복원합니다.
