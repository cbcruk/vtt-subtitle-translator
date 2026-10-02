import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { countViolations, DEFAULT_CUE_CONFIG, splitBalanced, toCues } from './cues.ts'

describe('splitBalanced', () => {
  test('splits into parts of similar length at word boundaries', () => {
    assert.deepEqual(splitBalanced('하나 둘 셋 넷', 2), ['하나 둘', '셋 넷'])
    assert.deepEqual(splitBalanced('가 나나 다다다 라라라라 마마마마마', 3), ['가 나나 다다다', '라라라라', '마마마마마'])
  })

  test('keeps consecutive Latin words together but breaks after punctuation', () => {
    assert.deepEqual(splitBalanced('저는 GitHub의 새 프로젝트인 Spec Kit의 메인테이너예요', 2), [
      '저는 GitHub의 새 프로젝트인',
      'Spec Kit의 메인테이너예요',
    ])
    assert.deepEqual(splitBalanced("바로 'needs clarification'이 없을 것", 2), [
      "바로 'needs clarification'이",
      '없을 것',
    ])
    assert.deepEqual(splitBalanced('YouTube, TikTok, Instagram', 3), ['YouTube,', 'TikTok,', 'Instagram'])
  })

  test('never returns more parts than words', () => {
    assert.deepEqual(splitBalanced('두 단어', 5), ['두', '단어'])
  })
})

describe('toCues', () => {
  test('keeps cues of a long sentence inside its span without overlap', () => {
    const text = '이 프로젝트는 GitHub에서 새로 공개한 실험인데요 요즘 여기저기서 정말 많이 들으셨을 거예요'
    const cues = toCues([{ id: 0, text, start: 10, end: 16 }], DEFAULT_CUE_CONFIG)

    assert.ok(cues.length > 1)
    assert.equal(cues[0]?.start, 10)
    assert.ok((cues.at(-1)?.end ?? Infinity) <= 16)
    for (const [i, cue] of cues.entries()) {
      assert.ok(cue.lines.length <= DEFAULT_CUE_CONFIG.maxLines)
      assert.ok(cue.end <= (cues[i + 1]?.start ?? Infinity))
    }
    assert.equal(cues.flatMap((cue) => cue.lines).join(' '), text)
  })

  test('uses fewer cues than the text needs when the span is too short', () => {
    const cues = toCues(
      [{ id: 0, text: '아주 길지만 아주 빠르게 지나가는 한 문장을 짧은 구간에 넣어 봅니다', start: 0, end: 1.5 }],
      DEFAULT_CUE_CONFIG,
    )

    assert.equal(cues.length, 1)
  })

  test('extends short cues into the following silence but not past the next cue', () => {
    const cues = toCues(
      [
        { id: 0, text: '네', start: 0, end: 0.2 },
        { id: 1, text: '좋아요', start: 0.6, end: 2 },
        { id: 2, text: '시작', start: 5, end: 5.3 },
      ],
      DEFAULT_CUE_CONFIG,
    )

    assert.deepEqual(
      cues.map((cue) => [cue.start, cue.end]),
      [
        [0, 0.6],
        [0.6, 2],
        [5, 6],
      ],
    )
  })
})

describe('countViolations', () => {
  test('counts fast and overlong cues', () => {
    const violations = countViolations(
      [
        { start: 0, end: 1, lines: ['열두 글자보다 훨씬 긴 문장입니다'] },
        { start: 1, end: 3, lines: ['짧음'] },
      ],
      DEFAULT_CUE_CONFIG,
    )

    assert.deepEqual(violations, { cps: 1, lineLength: 0 })
  })
})
