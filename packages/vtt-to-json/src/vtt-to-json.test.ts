import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, test } from 'node:test'
import { VttParser } from './vtt-to-json.ts'

describe('VttParser', () => {
  test('YouTube 자동 자막의 각 줄을 처음 나온 큐의 시작 시각으로 한 번씩 반환해야 함', async () => {
    const vtt = await readFile(new URL('../sample.vtt', import.meta.url), 'utf-8')
    const result = new VttParser(vtt).toJson()

    assert.equal(result.length, 26)
    assert.deepEqual(result.slice(0, 3), [
      { seconds: 2.63, timestamp: '00:00:02.630', text: '[Music]' },
      { seconds: 8.679, timestamp: '00:00:08.679', text: "Yeah, I love you. I'm in a funk, so I" },
      { seconds: 12.16, timestamp: '00:00:12.160', text: 'bought a bouquet of roses and cut them' },
    ])
    assert.equal(result.at(-1)?.text, '[Music]')
  })


  test('같은 인스턴스에서 toJson()을 다시 호출해도 같은 결과를 반환해야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '00:00:01.000 --> 00:00:02.000',
        '안녕하세요',
        '',
        '00:00:03.000 --> 00:00:04.000',
        '반갑습니다',
        '',
      ].join('\n'),
    )

    const first = parser.toJson()
    const second = parser.toJson()

    assert.deepEqual(first, [
      { seconds: 1, timestamp: '00:00:01.000', text: '안녕하세요' },
      { seconds: 3, timestamp: '00:00:03.000', text: '반갑습니다' },
    ])
    assert.deepEqual(second, first)
  })

  test('시가 생략된 mm:ss.SSS 타임스탬프를 인식해 HH:mm:ss.SSS로 정규화해야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '00:01.500 --> 00:02.000',
        '짧은 형식',
        '',
        '01:02:03.250 --> 01:02:04.000',
        '긴 형식',
        '',
      ].join('\n'),
    )

    assert.deepEqual(parser.toJson(), [
      { seconds: 1.5, timestamp: '00:00:01.500', text: '짧은 형식' },
      { seconds: 3723.25, timestamp: '01:02:03.250', text: '긴 형식' },
    ])
  })

  test('cue 식별자 줄은 텍스트로 넣지 않아야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '1',
        '00:00:01.000 --> 00:00:02.000',
        '첫 줄',
        '',
        'intro-2',
        '00:00:03.000 --> 00:00:04.000',
        '둘째 줄',
        '',
      ].join('\n'),
    )

    assert.deepEqual(parser.toJson().map((cue) => cue.text), ['첫 줄', '둘째 줄'])
  })

  test('NOTE / STYLE / REGION 블록은 텍스트로 넣지 않아야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        'STYLE',
        '::cue { color: red }',
        '',
        'REGION',
        'id:fred width:40%',
        '',
        '00:00:01.000 --> 00:00:02.000',
        '첫 줄',
        '',
        'NOTE 여러 줄짜리',
        '메모입니다',
        '',
        'NOTE',
        '',
        '00:00:03.000 --> 00:00:04.000',
        '둘째 줄',
        '',
      ].join('\n'),
    )

    assert.deepEqual(parser.toJson().map((cue) => cue.text), ['첫 줄', '둘째 줄'])
  })

  test('CRLF 줄바꿈과 여러 줄 cue 본문을 처리해야 함', () => {
    const parser = new VttParser(
      [
        'WEBVTT',
        '',
        '1',
        '00:00:01.000 --> 00:00:02.000',
        'NOTE 아님',
        '둘째 줄',
        '',
      ].join('\r\n'),
    )

    assert.deepEqual(parser.toJson(), [
      { seconds: 1, timestamp: '00:00:01.000', text: 'NOTE 아님' },
      { seconds: 1, timestamp: '00:00:01.000', text: '둘째 줄' },
    ])
  })

  test('태그를 제거하고 엔티티를 복원해야 함', () => {
    const parser = new VttParser(
      ['WEBVTT', '', '00:00:01.000 --> 00:00:02.000', '<i>Tom</i> &amp; <b>Jerry</b>', ''].join('\n'),
    )

    assert.deepEqual(parser.toJson(), [{ seconds: 1, timestamp: '00:00:01.000', text: 'Tom & Jerry' }])
  })
})
