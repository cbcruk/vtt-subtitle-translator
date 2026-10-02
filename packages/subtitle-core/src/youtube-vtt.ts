import type { SourceCue, Word } from './subtitle.types.ts'

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
 * Reads the cues of a WebVTT file, keeping only the lines each cue adds.
 *
 * YouTube auto captions roll: each cue repeats the previous line above the new
 * one, and the new line carries `<00:00:01.230><c> word</c>` timing tags. When
 * the file contains such tags, only the last line of each cue is kept so no
 * line appears twice. Otherwise every non-blank body line is kept. Cue
 * identifiers and `NOTE` / `STYLE` / `REGION` blocks are skipped.
 *
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises'
 * import { parseCaptionCues } from '@vtts/subtitle-core'
 *
 * const cues = parseCaptionCues(await readFile('video.en.vtt', 'utf-8'))
 * // [{ start: 0.08, end: 2.869, lines: ["Hey<00:00:00.400><c> friends,</c>..."] }, ...]
 * ```
 */
export function parseCaptionCues(source: string): SourceCue[] {
  const normalized = source.replace(/\r\n?/g, '\n')
  const rolling = normalized.includes('<c>')
  const cues: SourceCue[] = []

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.replace(/\n+$/, '').split('\n')
    const timingIndex = lines.findIndex((line) => TIMING_LINE.test(line.trim()))
    const timing = lines[timingIndex]?.trim().match(TIMING_LINE)
    if (!timing?.[1] || !timing[2]) continue

    const body = lines.slice(timingIndex + 1)
    const added = (rolling ? body.slice(-1) : body).filter((line) => line.trim())
    if (added.length === 0) continue

    cues.push({ start: parseTimestamp(timing[1]), end: parseTimestamp(timing[2]), lines: added })
  }

  return cues
}

/**
 * Converts a raw cue line to plain text by removing tags, decoding entities, and collapsing whitespace.
 *
 * @example
 * ```ts
 * import { cueLineText } from '@vtts/subtitle-core'
 *
 * cueLineText('A<00:00:05.500><c> &gt;</c>') // 'A >'
 * ```
 */
export function cueLineText(line: string): string {
  return decodeEntities(line.replace(TAG, '')).replace(/\s+/g, ' ').trim()
}

/**
 * Extracts timed words from a WebVTT file, recovering word timings from YouTube auto captions.
 *
 * Reads lines with {@linkcode parseCaptionCues}. Words without an inline
 * timestamp share their segment's time span evenly.
 *
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises'
 * import { parseYoutubeVtt } from '@vtts/subtitle-core'
 *
 * const words = parseYoutubeVtt(await readFile('video.en.vtt', 'utf-8'))
 * // [{ text: 'Hey', start: 0.08, end: 0.4 }, { text: 'friends,', start: 0.4, end: 0.88 }, ...]
 * ```
 */
export function parseYoutubeVtt(source: string): Word[] {
  return parseCaptionCues(source).flatMap((cue) => lineToWords(cue.lines.join(' '), cue.start, cue.end))
}

function lineToWords(line: string, start: number, end: number): Word[] {
  const parts = line.split(INLINE_TIMESTAMP)
  const segments = [{ text: parts[0] ?? '', start }]
  for (let i = 1; i < parts.length; i += 2) {
    segments.push({ text: parts[i + 1] ?? '', start: parseTimestamp(parts[i] ?? '') })
  }

  return segments.flatMap((segment, index) => {
    const segmentEnd = segments[index + 1]?.start ?? end
    const tokens = cueLineText(segment.text).split(' ').filter(Boolean)
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
