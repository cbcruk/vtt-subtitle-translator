import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseYapJson } from '@vtts/subtitle-core'
import type { CliOptions } from './cli.types.ts'
import { detectLocale } from './languages.ts'
import { extractAudio, muxSubtitles, runTool, transcribeToJson, transcribeToText } from './media.ts'
import { muxedPath, transcriptPath } from './subtitle-paths.ts'

const PROBE_SECONDS = 60
const PROBE_LOCALE = 'en-US'
const MIN_MACOS_MAJOR = 26

/**
 * Checks that macOS, yap, and ffmpeg are ready for on-device transcription.
 *
 * yap downloads speech assets the first time a locale is used, so the first
 * run for each language must be online.
 */
export async function doctor(): Promise<void> {
  const checks: [string, () => Promise<string>][] = [
    [
      `macOS ${MIN_MACOS_MAJOR} or later`,
      async () => {
        const version = (await runTool('sw_vers', ['-productVersion'])).trim()
        if (Number(version.split('.')[0]) < MIN_MACOS_MAJOR) throw new Error(`found ${version}`)
        return version
      },
    ],
    [
      'yap with --word-timestamps',
      async () => {
        const help = await runTool('yap', ['transcribe', '--help'])
        if (!help.includes('--word-timestamps')) throw new Error('installed yap is too old; run brew upgrade yap')
        return 'ok'
      },
    ],
    ['ffmpeg', async () => (await runTool('ffmpeg', ['-version'])).split('\n')[0] ?? 'ok'],
  ]

  let failed = false
  for (const [name, check] of checks) {
    try {
      console.log(`✓ ${name}: ${await check()}`)
    } catch (error) {
      failed = true
      console.log(`✗ ${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  console.log('Note: the first transcription in each language downloads speech assets and needs a network connection.')
  if (failed) process.exitCode = 1
}

/**
 * Transcribes a video or audio file with yap into `<name>.words.json`.
 *
 * Without `--locale`, the first 60 seconds are transcribed and the language
 * detected first. When yap cannot open the file, its audio is extracted with
 * ffmpeg and transcribed instead.
 */
export async function transcribe(media: string, options: CliOptions): Promise<void> {
  const workDir = await mkdtemp(join(tmpdir(), 'vtts-'))
  try {
    const locale = options.locale ?? (await probeLocale(media, workDir))
    const target = options.output ?? transcriptPath(media)

    try {
      await transcribeToJson(media, target, locale)
    } catch (error) {
      console.log(`yap could not read ${media} (${error instanceof Error ? error.message : String(error)})`)
      console.log('Extracting audio with ffmpeg and retrying')
      const audio = join(workDir, 'audio.wav')
      await extractAudio(media, audio)
      await transcribeToJson(audio, target, locale)
    }

    const { words } = parseYapJson(await readFile(target, 'utf-8'))
    console.log(`Transcribed ${words.length} words (locale: ${locale}) -> ${target}`)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

/** Muxes subtitle files into `<name>.subtitled.mkv` next to the video. */
export async function mux(video: string, subtitles: string[], options: CliOptions): Promise<void> {
  if (subtitles.length === 0) throw new Error('Pass at least one subtitle file to mux')
  const target = options.output ?? muxedPath(video)
  if (existsSync(target)) throw new Error(`${target} already exists; remove it or pass --output`)

  await muxSubtitles(video, subtitles, target)
  console.log(`Muxed ${subtitles.length} subtitle tracks -> ${target}`)
}

async function probeLocale(media: string, workDir: string): Promise<string> {
  const probe = join(workDir, 'probe.wav')
  await extractAudio(media, probe, PROBE_SECONDS)
  const text = await transcribeToText(probe, PROBE_LOCALE)
  const locale = detectLocale(text)
  if (!locale) throw new Error('Could not detect the spoken language; pass --locale, e.g. --locale en-US')

  console.log(`Detected locale ${locale} from the first ${PROBE_SECONDS} seconds`)
  return locale
}
