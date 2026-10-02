import type { Cue, CueConfig, CueViolations, Sentence } from './subtitle.types.ts'

/** Readability defaults tuned for Korean subtitles. */
export const DEFAULT_CUE_CONFIG: CueConfig = {
  maxCharsPerLine: 18,
  maxLines: 2,
  minDuration: 1,
  maxDuration: 7,
  maxCps: 12,
}

/** Readability defaults for languages written in Latin script. */
export const LATIN_CUE_CONFIG: CueConfig = {
  maxCharsPerLine: 42,
  maxLines: 2,
  minDuration: 1,
  maxDuration: 7,
  maxCps: 17,
}

const WIDE_SCRIPT_LANGUAGES = new Set(['ko', 'ja', 'zh'])

/**
 * Picks readability defaults for a subtitle language.
 *
 * @param language BCP 47 tag such as `ko` or `en-US`; only the primary subtag is used.
 * @returns {@linkcode DEFAULT_CUE_CONFIG} for Korean, Japanese, and Chinese, otherwise {@linkcode LATIN_CUE_CONFIG}.
 */
export function cueConfigFor(language: string): CueConfig {
  const primary = language.split('-')[0]?.toLowerCase() ?? ''
  return WIDE_SCRIPT_LANGUAGES.has(primary) ? DEFAULT_CUE_CONFIG : LATIN_CUE_CONFIG
}

const NON_LATIN_LETTER = /(?!\p{Script=Latin})\p{L}/u
const LATIN_WORD = /^['"‘“(]?[A-Za-z0-9][\w.\-/']*$/
const LATIN_START = /^[A-Za-z0-9]/

/**
 * Splits text at word boundaries into parts of roughly equal length.
 *
 * In text that mixes in a non-Latin script, consecutive Latin words such as
 * `Spec Kit` or `Claude Code의` are kept together, since there they are almost
 * always one name. A comma or other punctuation ending a word still allows a
 * break after it. Text written entirely in Latin script breaks at any space.
 *
 * @param parts Desired number of parts; fewer are returned when there are not enough words.
 *
 * @example
 * ```ts
 * import { splitBalanced } from '@vtts/subtitle-core'
 *
 * splitBalanced('Spec Kit은 정말 쓰기 쉬워요', 2) // ['Spec Kit은', '정말 쓰기 쉬워요']
 * ```
 */
export function splitBalanced(text: string, parts: number): string[] {
  const tokens = text.split(/\s+/).filter(Boolean)
  const words = NON_LATIN_LETTER.test(text) ? groupLatinRuns(tokens) : tokens
  const count = Math.min(parts, words.length)
  if (count <= 1) return [words.join(' ')]

  const ends: number[] = []
  let length = 0
  for (const [i, word] of words.entries()) {
    length += (i > 0 ? 1 : 0) + word.length
    ends.push(length)
  }

  const distance = (index: number, target: number): number =>
    Math.abs((ends[index] ?? Infinity) - target)

  const result: string[] = []
  let from = 0
  for (let k = 1; k < count; k++) {
    const target = (length * k) / count
    let cut = from + 1
    while (cut < words.length - (count - k) && distance(cut, target) < distance(cut - 1, target)) {
      cut++
    }
    result.push(words.slice(from, cut).join(' '))
    from = cut
  }
  result.push(words.slice(from).join(' '))

  return result
}

/**
 * Splits translated sentences into readable cues timed within each sentence's span.
 *
 * Each sentence becomes as many cues as its length requires, but never more
 * than its span can show for `minDuration` each, so timing never drifts past
 * the sentence. Time is shared in proportion to characters. Afterwards cues
 * are clamped so they never overlap, and cues shorter than `minDuration` are
 * extended into the silence before the next cue.
 *
 * @param sentences Sentences whose `text` is already translated.
 *
 * @example
 * ```ts
 * import { DEFAULT_CUE_CONFIG, toCues } from '@vtts/subtitle-core'
 *
 * toCues([{ id: 0, text: '안녕하세요 여러분', start: 0, end: 2 }], DEFAULT_CUE_CONFIG)
 * // [{ start: 0, end: 2, lines: ['안녕하세요 여러분'] }]
 * ```
 */
export function toCues(sentences: Sentence[], config: CueConfig): Cue[] {
  const cues = sentences.flatMap((sentence) => sentenceToCues(sentence, config))

  for (const [i, cue] of cues.entries()) {
    const limit = cues[i + 1]?.start ?? Infinity
    cue.end = Math.min(Math.max(cue.end, cue.start + config.minDuration), limit)
  }

  return cues
}

/**
 * Counts how many cues break the reading-speed or line-length limits.
 *
 * Use it to tune {@linkcode CueConfig} against real output.
 */
export function countViolations(cues: Cue[], config: CueConfig): CueViolations {
  let cps = 0
  let lineLength = 0

  for (const cue of cues) {
    if (cue.lines.join('').length / (cue.end - cue.start) > config.maxCps) cps++
    if (cue.lines.some((line) => line.length > config.maxCharsPerLine)) lineLength++
  }

  return { cps, lineLength }
}

function groupLatinRuns(tokens: string[]): string[] {
  const units: string[] = []
  let previous = ''
  for (const token of tokens) {
    const last = units.length - 1
    if (last >= 0 && LATIN_WORD.test(previous) && LATIN_START.test(token)) {
      units[last] = `${units[last]} ${token}`
    } else {
      units.push(token)
    }
    previous = token
  }
  return units
}

function sentenceToCues(sentence: Sentence, config: CueConfig): Cue[] {
  const span = sentence.end - sentence.start
  const wanted = Math.ceil(sentence.text.length / (config.maxCharsPerLine * config.maxLines))
  const affordable = Math.max(1, Math.floor(span / config.minDuration))
  const chunks = splitBalanced(sentence.text, Math.min(wanted, affordable))
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)

  let consumed = 0
  return chunks.map((chunk, i) => {
    const start = sentence.start + (span * consumed) / total
    consumed += chunk.length
    const boundary = i === chunks.length - 1 ? sentence.end : sentence.start + (span * consumed) / total

    return {
      start,
      end: Math.min(boundary, start + config.maxDuration),
      lines: splitBalanced(chunk, Math.min(config.maxLines, Math.ceil(chunk.length / config.maxCharsPerLine))),
    }
  })
}
