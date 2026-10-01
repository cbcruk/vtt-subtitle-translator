import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { pairTranslations } from './work-files.ts'

const sentences = [
  { id: 0, text: 'Hello.', start: 0, end: 1 },
  { id: 1, text: 'Bye.', start: 1, end: 2 },
]

describe('pairTranslations', () => {
  test('pairs translations by id regardless of entry order', () => {
    const result = pairTranslations(sentences, [
      { id: 1, text: 'Bye.', translation: '안녕히 가세요.' },
      { id: 0, text: 'Hello.', translation: ' 안녕하세요. ' },
    ])

    assert.deepEqual(
      result.map((pair) => [pair.text, pair.translation]),
      [
        ['Hello.', '안녕하세요.'],
        ['Bye.', '안녕히 가세요.'],
      ],
    )
    assert.equal(result[1]?.start, 1)
  })

  test('rejects merged, empty, or unknown translations', () => {
    assert.throws(
      () =>
        pairTranslations(sentences, [
          { id: 0, text: 'Hello. Bye.', translation: '' },
          { id: 2, text: '?', translation: '?' },
        ]),
      /empty translation for id 0; missing ids 1; unknown ids 2/,
    )
  })
})
