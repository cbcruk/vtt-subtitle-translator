import type { Cue } from './subtitle.types.ts'

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }

/**
 * Formats seconds as a WebVTT `HH:mm:ss.SSS` timestamp.
 *
 * Rounds to whole milliseconds first, so `59.9996` becomes `00:01:00.000` rather than `00:00:60.000`.
 */
export function formatTimestamp(seconds: number): string {
  const total = Math.round(seconds * 1000)
  const hours = Math.floor(total / 3_600_000)
  const minutes = Math.floor(total / 60_000) % 60
  const secs = Math.floor(total / 1000) % 60
  const millis = total % 1000

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(millis, 3)}`
}

/**
 * Serializes cues to a WebVTT document with numbered cues.
 *
 * @param language Value of the `Language:` header, e.g. `ko`.
 *
 * @example
 * ```ts
 * import { toWebVtt } from '@vtts/subtitle-core'
 *
 * toWebVtt([{ start: 0, end: 1.5, lines: ['안녕하세요'] }], 'ko')
 * // 'WEBVTT\nKind: captions\nLanguage: ko\n\n1\n00:00:00.000 --> 00:00:01.500\n안녕하세요\n'
 * ```
 */
export function toWebVtt(cues: Cue[], language: string): string {
  const header = `WEBVTT\nKind: captions\nLanguage: ${language}\n`
  const blocks = cues.map(
    (cue, i) =>
      `${i + 1}\n${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}\n${cue.lines.map(escapeText).join('\n')}\n`,
  )

  return [header, ...blocks].join('\n')
}

function escapeText(text: string): string {
  return text.replace(/[&<>]/g, (char) => ESCAPES[char] ?? char)
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}
