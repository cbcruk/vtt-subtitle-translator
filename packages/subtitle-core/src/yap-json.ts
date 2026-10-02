import type { TranscriptWords, Word } from './subtitle.types.ts'
import type { YapTranscript, YapWord } from './yap-json.types.ts'

/**
 * Reads timed words from a `yap transcribe --json --word-timestamps` transcript, restoring their punctuation.
 *
 * yap tokenizes words with `NLTokenizer`, which drops punctuation, so
 * sentence segmentation would find no sentence ends. Each segment's text
 * still has it, so the gaps between words are reattached: punctuation
 * before a space joins the previous word, punctuation after a space joins
 * the next one, a gap without spaces (`spec-driven`) merges both words, and
 * untimed words found in a gap are kept on the previous word.
 *
 * @throws When the document is not a yap transcript or lacks word timestamps.
 *
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises'
 * import { parseYapJson } from '@vtts/subtitle-core'
 *
 * const { words, locale } = parseYapJson(await readFile('talk.words.json', 'utf-8'))
 * // words: [{ text: 'Hello,', start: 0.1, end: 0.4 }, { text: 'world.', start: 0.5, end: 0.9 }], locale: 'en-US'
 * ```
 */
export function parseYapJson(source: string): TranscriptWords {
  const transcript = JSON.parse(source) as YapTranscript
  if (!Array.isArray(transcript.segments)) {
    throw new Error('Not a yap JSON transcript: missing "segments"')
  }

  const words = transcript.segments.flatMap((segment) => {
    if (!segment.words) {
      throw new Error('The yap transcript has no word timestamps. Run yap with --word-timestamps.')
    }
    return attachPunctuation(segment.text, segment.words)
  })

  return { words, locale: transcript.metadata?.language }
}

function attachPunctuation(text: string, timed: YapWord[]): Word[] {
  const words: Word[] = []
  let cursor = 0

  for (const word of timed) {
    const index = text.indexOf(word.text, cursor)
    const previous = words.at(-1)
    if (index === -1) {
      words.push({ ...word })
      continue
    }

    const gap = text.slice(cursor, index)
    cursor = index + word.text.length

    if (previous && gap !== '' && !/\s/.test(gap)) {
      previous.text += gap + word.text
      previous.end = word.end
      continue
    }

    const pieces = gap.split(/\s+/)
    const leading = pieces.length > 1 ? (pieces.pop() ?? '') : ''
    const trailing = pieces.filter(Boolean).join(' ')
    if (previous && trailing) previous.text += /^\p{P}/u.test(trailing) ? trailing : ` ${trailing}`
    words.push({ text: (previous ? '' : trailing) + leading + word.text, start: word.start, end: word.end })
  }

  const rest = text.slice(cursor).trim().replace(/\s+/g, ' ')
  const last = words.at(-1)
  if (last && rest) last.text += /^\p{P}/u.test(rest) ? rest : ` ${rest}`

  return words
}
