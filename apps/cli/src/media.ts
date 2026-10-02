import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { toMatroskaLanguage } from './languages.ts'
import { subtitleLanguage } from './subtitle-paths.ts'

const run = promisify(execFile)
const MAX_BUFFER = 64 * 1024 * 1024

/**
 * Runs an external tool and returns its standard output.
 *
 * @throws With the tool's standard error when it exits non-zero or is not installed.
 */
export async function runTool(command: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await run(command, args, { maxBuffer: MAX_BUFFER })
    return stdout
  } catch (error) {
    const detail = error as { code?: string; stderr?: string; message?: string }
    if (detail.code === 'ENOENT') throw new Error(`${command} is not installed`)
    throw new Error(`${command} failed: ${(detail.stderr || detail.message || '').trim()}`)
  }
}

/** Transcribes a media file with yap into a JSON transcript with word timestamps. */
export async function transcribeToJson(media: string, output: string, locale: string): Promise<void> {
  await runTool('yap', ['transcribe', media, '--json', '--word-timestamps', '--locale', locale, '--output-file', output])
}

/** Transcribes a media file with yap and returns plain text. */
export async function transcribeToText(media: string, locale: string): Promise<string> {
  return runTool('yap', ['transcribe', media, '--txt', '--locale', locale])
}

/**
 * Extracts the audio track of a media file as mono 16-bit PCM WAV.
 *
 * Keeps the source sample rate to avoid an extra resampling pass.
 *
 * @param seconds Extract only the first `seconds` when given.
 */
export async function extractAudio(media: string, output: string, seconds?: number): Promise<void> {
  const limit = seconds === undefined ? [] : ['-t', String(seconds)]
  await runTool('ffmpeg', ['-y', '-v', 'error', '-i', media, ...limit, '-vn', '-ac', '1', '-c:a', 'pcm_s16le', output])
}

/**
 * Muxes WebVTT subtitles into a Matroska file, copying the video and audio streams.
 *
 * Each track's language comes from its file name (`talk.ko.vtt` → `kor`) and
 * the first subtitle becomes the default track. MP4 only accepts `mov_text`
 * subtitles, so the output is always Matroska.
 *
 * @throws When `output` already exists.
 */
export async function muxSubtitles(video: string, subtitles: string[], output: string): Promise<void> {
  const inputs = [video, ...subtitles].flatMap((path) => ['-i', path])
  const maps = ['-map', '0:v?', '-map', '0:a?', ...subtitles.flatMap((_, i) => ['-map', String(i + 1)])]
  const metadata = subtitles.flatMap((path, i) => [
    `-metadata:s:s:${i}`,
    `language=${toMatroskaLanguage(subtitleLanguage(path) ?? 'und')}`,
  ])

  await runTool('ffmpeg', [
    '-n',
    '-v',
    'error',
    ...inputs,
    ...maps,
    '-c',
    'copy',
    '-c:s',
    'webvtt',
    ...metadata,
    '-disposition:s:0',
    'default',
    output,
  ])
}
