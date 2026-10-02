/**
 * Turns YouTube WebVTT captions into timed sentences for translation, then back into readable WebVTT cues.
 *
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises'
 * import { DEFAULT_CUE_CONFIG, parseYoutubeVtt, toCues, toSentences, toWebVtt } from '@vtts/subtitle-core'
 *
 * const words = parseYoutubeVtt(await readFile('video.en.vtt', 'utf-8'))
 * const sentences = toSentences(words, { locale: 'en', maxChars: 160 })
 * const translated = sentences.map((sentence) => ({ ...sentence, text: translate(sentence.text) }))
 * const vtt = toWebVtt(toCues(translated, DEFAULT_CUE_CONFIG), 'ko')
 * ```
 *
 * @module
 */
export { countViolations, DEFAULT_CUE_CONFIG, splitBalanced, toCues } from './cues.ts'
export { toSentences } from './sentences.ts'
export type {
  Cue,
  CueConfig,
  CueViolations,
  Sentence,
  SentenceOptions,
  SourceCue,
  Word,
} from './subtitle.types.ts'
export { formatTimestamp, toWebVtt } from './webvtt.ts'
export { cueLineText, parseCaptionCues, parseTimestamp, parseYoutubeVtt } from './youtube-vtt.ts'
