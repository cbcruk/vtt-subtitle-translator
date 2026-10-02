import { basename, dirname, extname, join } from 'node:path'

const SOURCE_SUFFIX = /(?:\.words\.json|(?:\.[a-z]{2,3}(?:-[A-Za-z0-9]+)?)?\.vtt)$/
const LANGUAGE_SUFFIX = /\.([a-z]{2,3}(?:-[A-Za-z0-9]+)?)\.vtt$/

/**
 * Builds the path of a subtitle file in `language` next to a source subtitle or transcript.
 *
 * @example
 * ```ts
 * import { subtitlePath } from './subtitle-paths.ts'
 *
 * subtitlePath('subtitles/talk.en.vtt', 'ko') // 'subtitles/talk.ko.vtt'
 * subtitlePath('media/talk.words.json', 'ko') // 'media/talk.ko.vtt'
 * ```
 */
export function subtitlePath(input: string, language: string): string {
  return join(dirname(input), basename(input).replace(SOURCE_SUFFIX, '') + `.${language}.vtt`)
}

/** Builds the path of the yap word-timestamp transcript for a media file, `<name>.words.json`. */
export function transcriptPath(media: string): string {
  return join(dirname(media), `${basename(media, extname(media))}.words.json`)
}

/** Builds the path of the Matroska file that `mux` writes for a video, `<name>.subtitled.mkv`. */
export function muxedPath(video: string): string {
  return join(dirname(video), `${basename(video, extname(video))}.subtitled.mkv`)
}

/**
 * Reads the language tag from a subtitle file name such as `talk.ko.vtt`.
 *
 * @returns The tag, or `undefined` when the name has none.
 */
export function subtitleLanguage(path: string): string | undefined {
  return basename(path).match(LANGUAGE_SUFFIX)?.[1]
}
