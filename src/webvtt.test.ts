import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { formatTimestamp, toWebVtt } from './webvtt.ts'

describe('formatTimestamp', () => {
  test('carries rounded milliseconds into the next unit', () => {
    assert.equal(formatTimestamp(59.9996), '00:01:00.000')
    assert.equal(formatTimestamp(3723.25), '01:02:03.250')
  })
})

describe('toWebVtt', () => {
  test('writes a header and numbered, escaped cues', () => {
    assert.equal(
      toWebVtt(
        [
          { start: 0, end: 1.5, lines: ['A & B', '<tag>'] },
          { start: 2, end: 3, lines: ['끝'] },
        ],
        'ko',
      ),
      'WEBVTT\nKind: captions\nLanguage: ko\n\n1\n00:00:00.000 --> 00:00:01.500\nA &amp; B\n&lt;tag&gt;\n\n2\n00:00:02.000 --> 00:00:03.000\n끝\n',
    )
  })
})
