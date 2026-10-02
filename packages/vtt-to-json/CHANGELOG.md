# @cbcruk/vtt-to-json

## 0.0.2

### Patch Changes

- d41f92c: 같은 인스턴스에서 `toJson()`을 다시 호출해도 결과가 오염되지 않고, 시가 생략된 `mm:ss.SSS` 타임스탬프를 인식하며, cue 식별자와 `NOTE`/`STYLE`/`REGION` 블록을 자막 텍스트로 넣지 않습니다. (#11)
