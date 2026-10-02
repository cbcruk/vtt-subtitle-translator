import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import {
  countViolations,
  cueConfigFor,
  parseYapJson,
  parseYoutubeVtt,
  toCues,
  toSentences,
  toWebVtt,
  type TranscriptWords,
} from '@vtts/subtitle-core'
import type { CliOptions } from './cli.types.ts'
import { renderComparisonHtml } from './compare-html.ts'
import { subtitlePath } from './subtitle-paths.ts'
import { readSentencePairs, removeWorkFiles, writeWorkFiles } from './work-files.ts'

/**
 * Rebuilds sentences from a YouTube VTT or yap transcript and writes translation batches next to it.
 *
 * For a yap transcript, which has no subtitle file yet, it also writes the
 * source-language subtitle `<name>.<language>.vtt`.
 */
export async function extract(input: string, options: CliOptions): Promise<void> {
  const source = await readFile(input, 'utf-8')
  const transcript = readTranscript(input, source)
  if (transcript.words.length === 0) throw new Error(`No subtitle text found in ${input}`)

  const locale = options.locale ?? transcript.locale ?? 'en'
  const sentences = toSentences(transcript.words, { locale, maxChars: options.maxSentenceChars })
  const dir = dirname(input)
  await removeWorkFiles(dir)
  const batchCount = await writeWorkFiles(
    dir,
    { source_file: basename(input), locale, sentences },
    options.batchSize,
  )

  const longest = Math.max(...sentences.map((sentence) => sentence.text.length))
  console.log(
    `Extracted ${transcript.words.length} words into ${sentences.length} sentences (locale: ${locale}, longest: ${longest} chars)`,
  )
  console.log(`Wrote _sentences.json and batch_0.json - batch_${batchCount - 1}.json (${batchCount} batches)`)

  if (input.endsWith('.json')) {
    const language = locale.split('-')[0] ?? locale
    const target = subtitlePath(input, language)
    await writeFile(target, toWebVtt(toCues(sentences, cueConfigFor(language)), language), 'utf-8')
    console.log(`Wrote source subtitles -> ${target}`)
  }
}

/** Splits the translated sentences into cues and writes the translated subtitle file. */
export async function reconstruct(input: string, output: string | undefined, options: CliOptions): Promise<void> {
  const config = cueConfigFor(options.language)
  const pairs = await readSentencePairs(dirname(input))
  const cues = toCues(
    pairs.map(({ translation, ...sentence }) => ({ ...sentence, text: translation })),
    config,
  )
  const target = output ?? subtitlePath(input, options.language)
  await writeFile(target, toWebVtt(cues, options.language), 'utf-8')

  const violations = countViolations(cues, config)
  const percent = (count: number): string => `${((count / cues.length) * 100).toFixed(1)}%`
  console.log(`Reconstructed ${pairs.length} sentences into ${cues.length} cues -> ${target}`)
  console.log(`Over ${config.maxCps} CPS: ${violations.cps} (${percent(violations.cps)})`)
  console.log(`Lines over ${config.maxCharsPerLine} chars: ${violations.lineLength} (${percent(violations.lineLength)})`)
}

/** Writes an HTML page comparing every source sentence with its translation. */
export async function compare(input: string, options: CliOptions): Promise<void> {
  const pairs = await readSentencePairs(dirname(input))
  const translatedPath = subtitlePath(input, options.language)
  const target = options.output ?? translatedPath.replace(/\.vtt$/, '.compare.html')
  await writeFile(target, renderComparisonHtml(basename(input), basename(translatedPath), pairs), 'utf-8')

  console.log(`Wrote comparison with ${pairs.length} sentence pairs -> ${target}`)
}

/** Deletes the work files `extract` and the translators wrote. */
export async function cleanup(dir: string): Promise<void> {
  console.log(`Removed ${await removeWorkFiles(dir)} work files from ${dir}`)
}

function readTranscript(input: string, source: string): TranscriptWords {
  if (input.endsWith('.json')) return parseYapJson(source)
  if (!source.trimStart().startsWith('WEBVTT')) throw new Error(`${input} is not a WebVTT file or yap transcript`)
  return { words: parseYoutubeVtt(source) }
}
