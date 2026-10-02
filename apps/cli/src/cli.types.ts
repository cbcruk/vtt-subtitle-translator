/** Parsed command-line options shared by all commands. */
export type CliOptions = {
  batchSize: number
  /** Source locale; when absent it comes from the transcript or is detected. */
  locale?: string
  maxSentenceChars: number
  /** Target subtitle language, e.g. `ko`. */
  language: string
  output?: string
}
