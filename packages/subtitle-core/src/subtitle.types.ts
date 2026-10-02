/** A single spoken word with its timing in seconds. */
export type Word = {
  text: string
  start: number
  end: number
}

/** A cue as read from a WebVTT file, before any text cleanup. */
export type SourceCue = {
  start: number
  end: number
  /** Non-blank lines this cue adds, still containing tags and entities. */
  lines: string[]
}

/** A translation unit reassembled from consecutive words. */
export type Sentence = {
  /** Stable index that must survive translation unchanged. */
  id: number
  text: string
  start: number
  end: number
}

/** A subtitle cue ready to be serialized. */
export type Cue = {
  start: number
  end: number
  /** Display lines, already wrapped. */
  lines: string[]
}

/** Options for reassembling words into sentences with {@linkcode toSentences}. */
export type SentenceOptions = {
  /** BCP 47 locale of the source speech, used by `Intl.Segmenter`. */
  locale: string
  /** Sentences longer than this are split at the most likely pause. */
  maxChars: number
}

/** Readability limits used when splitting translated sentences into cues. */
export type CueConfig = {
  maxCharsPerLine: number
  maxLines: number
  /** Minimum seconds a cue stays on screen. */
  minDuration: number
  /** Maximum seconds a cue stays on screen. */
  maxDuration: number
  /** Reading speed limit in characters per second, used for reporting only. */
  maxCps: number
}

/** Number of cues breaking each {@linkcode CueConfig} limit. */
export type CueViolations = {
  /** Cues read faster than `maxCps`. */
  cps: number
  /** Cues with a line longer than `maxCharsPerLine`. */
  lineLength: number
}
