/** A word as written by `yap transcribe --json --word-timestamps`, without punctuation. */
export type YapWord = {
  text: string
  start: number
  end: number
}

/** A sentence-like segment of a yap JSON transcript. */
export type YapSegment = {
  id: number
  start: number
  end: number
  /** Segment text including punctuation. */
  text: string
  speaker?: string
  /** Present only when yap ran with `--word-timestamps`. */
  words?: YapWord[]
}

/** The document written by `yap transcribe --json`. */
export type YapTranscript = {
  metadata?: {
    /** BCP 47 locale the transcription ran with, e.g. `en-US`. */
    language?: string
    duration?: number
    created?: string
    speakers?: string[]
  }
  segments: YapSegment[]
}
