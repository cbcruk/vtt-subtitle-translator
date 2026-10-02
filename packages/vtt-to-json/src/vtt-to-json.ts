import { cueLineText, formatTimestamp, parseCaptionCues } from '@vtts/subtitle-core'
import type { Cue } from './vtt-to-json.types.ts'

/**
 * Parses WebVTT captions into one {@linkcode Cue} per caption line, without the repeats of YouTube auto captions.
 *
 * YouTube auto captions show each line twice as it rolls up. Each line is
 * returned once, timed from the cue where it first appears. Cue identifiers
 * and `NOTE` / `STYLE` / `REGION` blocks are skipped, and a line identical
 * to the previous one is dropped.
 *
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises'
 * import { VttParser } from '@cbcruk/vtt-to-json'
 *
 * const cues = new VttParser(await readFile('captions.vtt', 'utf-8')).toJson()
 * // [{ seconds: 1, timestamp: '00:00:01.000', text: '안녕하세요' }]
 * ```
 */
export class VttParser {
  private data: string

  /**
   * @param data Raw WebVTT text.
   */
  constructor(data: string) {
    this.data = data
  }

  /**
   * Parses the captions into cues in time order.
   *
   * Parsing state is created per call, so calling it again on the same
   * instance returns the same result.
   */
  toJson(): Cue[] {
    const cues: Cue[] = []
    let lastText = ''

    for (const cue of parseCaptionCues(this.data)) {
      for (const line of cue.lines) {
        const text = cueLineText(line)
        if (!text || text === lastText) continue

        cues.push({ seconds: cue.start, timestamp: formatTimestamp(cue.start), text })
        lastText = text
      }
    }

    return cues
  }
}
