import type { Sentence, SentenceOptions, Word } from './subtitle.types.ts'

const CLAUSE_END = /[,;:]$/
const CLAUSE_BONUS = 0.5

/**
 * Reassembles timed words into sentences so translation sees whole sentences instead of caption fragments.
 *
 * Sentence boundaries come from `Intl.Segmenter`. Auto captions often lack
 * punctuation, so any sentence longer than `maxChars` is split again at the
 * word followed by the longest pause, preferring clause punctuation, until
 * every piece fits.
 *
 * @returns Sentences in time order with sequential ids starting at `0`.
 *
 * @example
 * ```ts
 * import { toSentences } from './sentences.ts'
 *
 * toSentences(words, { locale: 'en', maxChars: 160 })
 * // [{ id: 0, text: 'Hey friends, I am Dan.', start: 0.08, end: 1.68 }, ...]
 * ```
 */
export function toSentences(words: Word[], options: SentenceOptions): Sentence[] {
  return segmentWords(words, options.locale)
    .flatMap((group) => splitAtPauses(group, options.maxChars))
    .map((group, id) => ({
      id,
      text: joinWords(group),
      start: group[0]?.start ?? 0,
      end: group.at(-1)?.end ?? 0,
    }))
}

function segmentWords(words: Word[], locale: string): Word[][] {
  const offsets: number[] = []
  let position = 0
  for (const word of words) {
    offsets.push(position)
    position += word.text.length + 1
  }

  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' })
  const groups: Word[][] = []
  let wordIndex = 0

  for (const { index, segment } of segmenter.segment(joinWords(words))) {
    const limit = index + segment.length
    const group: Word[] = []
    while (wordIndex < words.length && (offsets[wordIndex] ?? Infinity) < limit) {
      const word = words[wordIndex++]
      if (word) group.push(word)
    }
    if (group.length > 0) groups.push(group)
  }

  return groups
}

function splitAtPauses(group: Word[], maxChars: number): Word[][] {
  const length = joinWords(group).length
  if (group.length < 2 || length <= maxChars) return [group]

  let cut = Math.floor(group.length / 2)
  let bestScore = -Infinity
  let consumed = 0

  for (let i = 1; i < group.length; i++) {
    const previous = group[i - 1]
    if (!previous) continue
    consumed += previous.text.length + 1
    if (consumed < length / 4 || consumed > (length * 3) / 4) continue

    const score =
      previous.end - previous.start + (CLAUSE_END.test(previous.text) ? CLAUSE_BONUS : 0)
    if (score > bestScore) {
      bestScore = score
      cut = i
    }
  }

  return [
    ...splitAtPauses(group.slice(0, cut), maxChars),
    ...splitAtPauses(group.slice(cut), maxChars),
  ]
}

function joinWords(words: Word[]): string {
  return words.map((word) => word.text).join(' ')
}
