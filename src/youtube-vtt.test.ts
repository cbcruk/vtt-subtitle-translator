import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseTimestamp, parseYoutubeVtt } from './youtube-vtt.ts'

const ROLLING = `WEBVTT
Kind: captions
Language: en

00:00:00.080 --> 00:00:02.869 align:start position:0%
 
Hey<00:00:00.400><c> friends,</c><00:00:00.880><c> I'm</c>

00:00:02.869 --> 00:00:02.879 align:start position:0%
Hey friends, I'm
 

00:00:02.879 --> 00:00:05.030 align:start position:0%
Hey friends, I'm
Dan.

00:00:05.030 --> 00:00:05.040 align:start position:0%
Dan.
 

00:00:05.040 --> 00:00:06.000 align:start position:0%
Dan.
A<00:00:05.500><c> &gt;</c><00:00:05.600><c> B</c>
`

describe('parseTimestamp', () => {
  test('parses timestamps with and without hours', () => {
    assert.equal(parseTimestamp('01:02:03.250'), 3723.25)
    assert.equal(parseTimestamp('00:01.500'), 1.5)
  })
})

describe('parseYoutubeVtt', () => {
  test('reads each rolling line once with word timings', () => {
    assert.deepEqual(parseYoutubeVtt(ROLLING), [
      { text: 'Hey', start: 0.08, end: 0.4 },
      { text: 'friends,', start: 0.4, end: 0.88 },
      { text: "I'm", start: 0.88, end: 2.869 },
      { text: 'Dan.', start: 2.879, end: 5.03 },
      { text: 'A', start: 5.04, end: 5.5 },
      { text: '>', start: 5.5, end: 5.6 },
      { text: 'B', start: 5.6, end: 6 },
    ])
  })

  test('spreads untagged words evenly over plain multi-line cues', () => {
    const plain = 'WEBVTT\r\n\r\n1\r\n00:00:01.000 --> 00:00:03.000\r\nHello there\r\nfriend\r\n'

    assert.deepEqual(
      parseYoutubeVtt(plain).map((word) => word.text),
      ['Hello', 'there', 'friend'],
    )
    assert.equal(parseYoutubeVtt(plain)[2]?.end, 3)
  })
})
