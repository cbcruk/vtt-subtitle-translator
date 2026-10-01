import type { Word } from './subtitle.types.ts'

const TIMESTAMP = String.raw`(?:\d+:)?\d{2}:\d{2}\.\d{3}`
const TIMING_LINE = new RegExp(`^(${TIMESTAMP})\\s+-->\\s+(${TIMESTAMP})`)
const INLINE_TIMESTAMP = new RegExp(`<(${TIMESTAMP})>`)
const TAG = /<[^>]*>/g
const ENTITY = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * Converts a WebVTT timestamp to seconds.
 *
 * @param value `HH:mm:ss.SSS`, or `mm:ss.SSS` without hours.
 */
export function parseTimestamp(value: string): number {
  return value
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0)
}

/**
 * Extracts timed words from a WebVTT file, recovering word timings from YouTube auto captions.
 *
 * YouTube auto captions roll: each cue repeats the previous line above the new
 * one, and the new line carries `<00:00:01.230><c> word</c>` timing tags. When
 * the file contains such tags, only the last line of each cue is read so no
 * word appears twice. Otherwise every body line is read.
 *
 * Words without an inline timestamp share their segment's time span evenly.
 *
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises'
 * import { parseYoutubeVtt } from './youtube-vtt.ts'
 *
 * const words = parseYoutubeVtt(await readFile('video.en.vtt', 'utf-8'))
 * // [{ text: 'Hey', start: 0.08, end: 0.4 }, { text: 'friends,', start: 0.4, end: 0.88 }, ...]
 * ```
 */
export function parseYoutubeVtt(source: string): Word[] {
  const normalized = source.replace(/\r\n?/g, '\n')
  const rolling = normalized.includes('<c>')
  const words: Word[] = []

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.replace(/\n+$/, '').split('\n')
    const timingIndex = lines.findIndex((line) => TIMING_LINE.test(line.trim()))
    const timing = lines[timingIndex]?.trim().match(TIMING_LINE)
    if (!timing?.[1] || !timing[2]) continue

    const body = lines.slice(timingIndex + 1)
    const text = (rolling ? body.slice(-1) : body).join(' ')
    if (!text.trim()) continue

    words.push(...lineToWords(text, parseTimestamp(timing[1]), parseTimestamp(timing[2])))
  }

  return words
}

function lineToWords(line: string, start: number, end: number): Word[] {
  const parts = line.split(INLINE_TIMESTAMP)
  const segments = [{ text: parts[0] ?? '', start }]
  for (let i = 1; i < parts.length; i += 2) {
    segments.push({ text: parts[i + 1] ?? '', start: parseTimestamp(parts[i] ?? '') })
  }

  return segments.flatMap((segment, index) => {
    const segmentEnd = segments[index + 1]?.start ?? end
    const tokens = decodeEntities(segment.text.replace(TAG, '')).split(/\s+/).filter(Boolean)
    const step = (segmentEnd - segment.start) / tokens.length

    return tokens.map((text, i) => ({
      text,
      start: segment.start + step * i,
      end: segment.start + step * (i + 1),
    }))
  })
}

function decodeEntities(text: string): string {
  return text.replace(ENTITY, (match: string, name: string) => {
    if (name.startsWith('#x') || name.startsWith('#X')) {
      return String.fromCodePoint(parseInt(name.slice(2), 16))
    }
    if (name.startsWith('#')) return String.fromCodePoint(parseInt(name.slice(1), 10))
    return NAMED_ENTITIES[name.toLowerCase()] ?? match
  })
}
