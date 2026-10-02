import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseYapJson } from './yap-json.ts'

function transcript(text: string, words: [string, number][]): string {
  return JSON.stringify({
    metadata: { language: 'en-US' },
    segments: [
      {
        id: 1,
        start: words[0]?.[1] ?? 0,
        end: 10,
        text,
        words: words.map(([word, start]) => ({ text: word, start, end: start + 0.5 })),
      },
    ],
  })
}

describe('parseYapJson', () => {
  test('reattaches punctuation dropped by the word tokenizer', () => {
    const { words, locale } = parseYapJson(
      transcript('"Hello, world." Bye!', [
        ['Hello', 0],
        ['world', 1],
        ['Bye', 2],
      ]),
    )

    assert.equal(locale, 'en-US')
    assert.deepEqual(
      words.map((word) => word.text),
      ['"Hello,', 'world."', 'Bye!'],
    )
  })

  test('merges words split inside a token and keeps untimed words', () => {
    const { words } = parseYapJson(
      transcript('Spec-driven, um, development works.', [
        ['Spec', 0],
        ['driven', 0.5],
        ['development', 2],
        ['works', 3],
      ]),
    )

    assert.deepEqual(words, [
      { text: 'Spec-driven, um,', start: 0, end: 1 },
      { text: 'development', start: 2, end: 2.5 },
      { text: 'works.', start: 3, end: 3.5 },
    ])
  })

  test('rejects transcripts without word timestamps', () => {
    assert.throws(
      () => parseYapJson(JSON.stringify({ segments: [{ id: 1, start: 0, end: 1, text: 'Hi.' }] })),
      /--word-timestamps/,
    )
  })
})
