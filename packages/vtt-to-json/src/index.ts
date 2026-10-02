/**
 * Parses WebVTT captions into a deduplicated array of timed caption lines.
 *
 * @example
 * ```ts
 * import { readFile } from 'node:fs/promises'
 * import { VttParser } from '@cbcruk/vtt-to-json'
 *
 * const cues = new VttParser(await readFile('captions.vtt', 'utf-8')).toJson()
 * ```
 *
 * @module
 */
export { VttParser } from './vtt-to-json.ts'
export type { Cue } from './vtt-to-json.types.ts'
