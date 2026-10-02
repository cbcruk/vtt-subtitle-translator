import { parseArgs } from 'node:util'
import type { CliOptions } from './cli.types.ts'
import { doctor, mux, transcribe } from './media-commands.ts'
import { cleanup, compare, extract, reconstruct } from './pipeline-commands.ts'

const USAGE = `Usage:
  pnpm vtt doctor
  pnpm vtt transcribe <video> [--locale en-US] [--output out.words.json]
  pnpm vtt extract <input.en.vtt | input.words.json> [--batch-size 100] [--locale en] [--max-sentence-chars 160]
  pnpm vtt reconstruct <input> [output.vtt] [--language ko]
  pnpm vtt compare <input> [--output out.html] [--language ko]
  pnpm vtt cleanup [directory]
  pnpm vtt mux <video> <subtitle.vtt>... [--output out.mkv]`

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    'batch-size': { type: 'string', default: '100' },
    locale: { type: 'string' },
    'max-sentence-chars': { type: 'string', default: '160' },
    language: { type: 'string', default: 'ko' },
    output: { type: 'string' },
  },
})

const options: CliOptions = {
  batchSize: Number(values['batch-size']),
  locale: values.locale,
  maxSentenceChars: Number(values['max-sentence-chars']),
  language: values.language,
  output: values.output,
}

const [command, ...args] = positionals
const [first, second] = args

try {
  if (command === 'doctor') await doctor()
  else if (command === 'transcribe' && first) await transcribe(first, options)
  else if (command === 'extract' && first) await extract(first, options)
  else if (command === 'reconstruct' && first) await reconstruct(first, second, options)
  else if (command === 'compare' && first) await compare(first, options)
  else if (command === 'cleanup') await cleanup(first ?? '.')
  else if (command === 'mux' && first) await mux(first, args.slice(1), options)
  else {
    console.error(USAGE)
    process.exitCode = 1
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
