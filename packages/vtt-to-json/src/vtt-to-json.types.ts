/** One caption line with the time it starts. */
export type Cue = {
  /** Start time in seconds. */
  seconds: number
  /** Start time as a normalized `HH:mm:ss.SSS` timestamp. */
  timestamp: string
  /** Caption text with tags removed and entities decoded. */
  text: string
}
