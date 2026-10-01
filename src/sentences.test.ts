import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { toSentences } from './sentences.ts'
import type { Word } from './subtitle.types.ts'

function timed(text: string, durations: number[] = []): Word[] {
  let cursor = 0
  return text.split(' ').map((word, i) => {
    const start = cursor
    cursor += durations[i] ?? 0.3
    return { text: word, start, end: cursor }
  })
}

describe('toSentences', () => {
  test('groups words into sentences spanning their timings', () => {
    const words = timed('Hey friends. I am Dan. Look at this.')

    assert.deepEqual(toSentences(words, { locale: 'en', maxChars: 160 }), [
      { id: 0, text: 'Hey friends.', start: 0, end: 0.6 },
      { id: 1, text: 'I am Dan.', start: 0.6, end: 1.5 },
      { id: 2, text: 'Look at this.', start: 1.5, end: 2.4 },
    ])
  })

  test('splits overlong sentences at the longest pause', () => {
    const words = timed('so we open the editor and then we run the command', [
      0.3, 0.3, 0.3, 0.3, 0.3, 2, 0.3, 0.3, 0.3, 0.3, 0.3,
    ])

    const sentences = toSentences(words, { locale: 'en', maxChars: 30 })

    assert.deepEqual(
      sentences.map((sentence) => sentence.text),
      ['so we open the editor and', 'then we run the command'],
    )
    assert.deepEqual(
      sentences.map((sentence) => sentence.id),
      [0, 1],
    )
  })
})
