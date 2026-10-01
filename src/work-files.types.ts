import type { Sentence } from './subtitle.types.ts'

/** Contents of `_sentences.json`: the full transcript that `reconstruct` maps translations back onto. */
export type SentencesFile = {
  source_file: string
  locale: string
  batch_count: number
  sentences: Sentence[]
}

/** One sentence handed to a translator. */
export type BatchEntry = {
  id: number
  text: string
}

/** A {@linkcode BatchEntry} after translation. */
export type TranslatedEntry = BatchEntry & {
  translation: string
}

/** Contents of `batch_N.json`, or of `trans_N.json` when `E` is {@linkcode TranslatedEntry}. */
export type BatchFile<E extends BatchEntry = BatchEntry> = {
  source_file: string
  batch_index: number
  total_batches: number
  entries: E[]
}
