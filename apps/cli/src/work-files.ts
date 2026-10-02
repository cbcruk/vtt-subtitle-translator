import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Sentence } from '@vtts/subtitle-core'
import type { BatchFile, SentencePair, SentencesFile, TranslatedEntry } from './work-files.types.ts'

const SENTENCES_FILE = '_sentences.json'
const WORK_FILE = /^(?:batch_\d+\.json|trans_\d+\.json|_sentences\.json)$/

/**
 * Writes `_sentences.json` and one `batch_N.json` per `batchSize` sentences into `dir`.
 *
 * @returns The number of batch files written.
 */
export async function writeWorkFiles(
  dir: string,
  manifest: Omit<SentencesFile, 'batch_count'>,
  batchSize: number,
): Promise<number> {
  const batchCount = Math.ceil(manifest.sentences.length / batchSize)

  await writeJson(join(dir, SENTENCES_FILE), { ...manifest, batch_count: batchCount })
  for (let index = 0; index < batchCount; index++) {
    const batch: BatchFile = {
      source_file: manifest.source_file,
      batch_index: index,
      total_batches: batchCount,
      entries: manifest.sentences
        .slice(index * batchSize, (index + 1) * batchSize)
        .map(({ id, text }) => ({ id, text })),
    }
    await writeJson(join(dir, `batch_${index}.json`), batch)
  }

  return batchCount
}

/**
 * Reads `_sentences.json` and every `trans_N.json` in `dir`, pairing each sentence with its translation.
 *
 * @throws When a translation file is missing or the translations do not match the sentences one-to-one.
 */
export async function readSentencePairs(dir: string): Promise<SentencePair[]> {
  const manifest = await readJson<SentencesFile>(join(dir, SENTENCES_FILE)).catch(() => {
    throw new Error(`${SENTENCES_FILE} not found in ${dir}. Run 'extract' first.`)
  })

  const entries: TranslatedEntry[] = []
  const missing: string[] = []
  for (let index = 0; index < manifest.batch_count; index++) {
    const name = `trans_${index}.json`
    const batch = await readJson<BatchFile<TranslatedEntry>>(join(dir, name)).catch(() => null)
    if (batch) entries.push(...batch.entries)
    else missing.push(name)
  }
  if (missing.length > 0) throw new Error(`Missing translation files: ${missing.join(', ')}`)

  return pairTranslations(manifest.sentences, entries)
}

/**
 * Pairs each sentence with its translation, matched by id.
 *
 * Translators must neither merge, split, nor drop sentences: any change to
 * the set of ids would shift every later timestamp, so it is rejected
 * instead of repaired.
 *
 * @throws When ids are missing, duplicated, unknown, or a translation is empty.
 */
export function pairTranslations(sentences: Sentence[], entries: TranslatedEntry[]): SentencePair[] {
  const translations = new Map<number, string>()
  const problems: string[] = []

  for (const entry of entries) {
    const translation = entry.translation?.trim()
    if (translations.has(entry.id)) problems.push(`duplicate id ${entry.id}`)
    if (!translation) problems.push(`empty translation for id ${entry.id}`)
    translations.set(entry.id, translation ?? '')
  }

  const known = new Set(sentences.map((sentence) => sentence.id))
  const missing = sentences.filter((sentence) => !translations.has(sentence.id))
  if (missing.length > 0) problems.push(`missing ids ${missing.map((s) => s.id).join(', ')}`)
  const unknown = [...translations.keys()].filter((id) => !known.has(id))
  if (unknown.length > 0) problems.push(`unknown ids ${unknown.join(', ')}`)

  if (problems.length > 0) throw new Error(`Translations do not match sentences: ${problems.join('; ')}`)

  return sentences.map((sentence) => ({ ...sentence, translation: translations.get(sentence.id) ?? '' }))
}

/**
 * Deletes `_sentences.json`, `batch_N.json`, and `trans_N.json` from `dir`.
 *
 * @returns The number of files removed.
 */
export async function removeWorkFiles(dir: string): Promise<number> {
  const names = (await readdir(dir)).filter((name) => WORK_FILE.test(name))
  await Promise.all(names.map((name) => rm(join(dir, name))))
  return names.length
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}
