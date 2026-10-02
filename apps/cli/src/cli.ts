import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  countViolations,
  DEFAULT_CUE_CONFIG,
  parseYoutubeVtt,
  toCues,
  toSentences,
  toWebVtt,
} from '@vtts/subtitle-core'
import { renderComparisonHtml } from './compare-html.ts'
import { readSentencePairs, removeWorkFiles, writeWorkFiles } from './work-files.ts'

const USAGE = `Usage:
  pnpm vtt extract <input.en.vtt> [--batch-size 100] [--locale en] [--max-sentence-chars 160]
  pnpm vtt reconstruct <input.en.vtt> [output.vtt] [--language ko]
  pnpm vtt compare <input.en.vtt> [--output out.html] [--language ko]
  pnpm vtt cleanup [directory]`

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    'batch-size': { type: 'string', default: '100' },
    locale: { type: 'string', default: 'en' },
    'max-sentence-chars': { type: 'string', default: '160' },
    language: { type: 'string', default: 'ko' },
    output: { type: 'string' },
  },
})

const [command, ...args] = positionals

try {
  if (command === 'extract' && args[0]) await extract(args[0])
  else if (command === 'reconstruct' && args[0]) await reconstruct(args[0], args[1])
  else if (command === 'compare' && args[0]) await compare(args[0])
  else if (command === 'cleanup') await cleanup(args[0] ?? '.')
  else {
    console.error(USAGE)
    process.exitCode = 1
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

async function extract(input: string): Promise<void> {
  const source = await readFile(input, 'utf-8')
  if (!source.trimStart().startsWith('WEBVTT')) throw new Error(`${input} is not a WebVTT file`)

  const words = parseYoutubeVtt(source)
  if (words.length === 0) throw new Error(`No subtitle text found in ${input}`)

  const sentences = toSentences(words, {
    locale: values.locale,
    maxChars: Number(values['max-sentence-chars']),
  })
  const dir = dirname(input)
  await removeWorkFiles(dir)
  const batchCount = await writeWorkFiles(
    dir,
    { source_file: basename(input), locale: values.locale, sentences },
    Number(values['batch-size']),
  )

  const longest = Math.max(...sentences.map((sentence) => sentence.text.length))
  console.log(`Extracted ${words.length} words into ${sentences.length} sentences (longest: ${longest} chars)`)
  console.log(`Wrote _sentences.json and batch_0.json - batch_${batchCount - 1}.json (${batchCount} batches)`)
}

async function reconstruct(input: string, output?: string): Promise<void> {
  const pairs = await readSentencePairs(dirname(input))
  const cues = toCues(
    pairs.map(({ translation, ...sentence }) => ({ ...sentence, text: translation })),
    DEFAULT_CUE_CONFIG,
  )
  const target = output ?? defaultOutputPath(input, values.language)
  await writeFile(target, toWebVtt(cues, values.language), 'utf-8')

  const violations = countViolations(cues, DEFAULT_CUE_CONFIG)
  const percent = (count: number): string => `${((count / cues.length) * 100).toFixed(1)}%`
  console.log(`Reconstructed ${pairs.length} sentences into ${cues.length} cues -> ${target}`)
  console.log(`Over ${DEFAULT_CUE_CONFIG.maxCps} CPS: ${violations.cps} (${percent(violations.cps)})`)
  console.log(
    `Lines over ${DEFAULT_CUE_CONFIG.maxCharsPerLine} chars: ${violations.lineLength} (${percent(violations.lineLength)})`,
  )
}

async function compare(input: string): Promise<void> {
  const pairs = await readSentencePairs(dirname(input))
  const translatedPath = defaultOutputPath(input, values.language)
  const target = values.output ?? translatedPath.replace(/\.vtt$/, '.compare.html')
  await writeFile(target, renderComparisonHtml(basename(input), basename(translatedPath), pairs), 'utf-8')

  console.log(`Wrote comparison with ${pairs.length} sentence pairs -> ${target}`)
}

async function cleanup(dir: string): Promise<void> {
  console.log(`Removed ${await removeWorkFiles(dir)} work files from ${dir}`)
}

function defaultOutputPath(input: string, language: string): string {
  const name = basename(input).replace(/(?:\.[a-z]{2}(?:-[A-Za-z]+)?)?\.vtt$/, `.${language}.vtt`)
  return join(dirname(input), name)
}
