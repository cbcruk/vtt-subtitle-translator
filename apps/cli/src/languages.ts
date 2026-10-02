import { franc } from 'franc-min'

const YAP_LOCALES: Record<string, string> = {
  eng: 'en-US',
  kor: 'ko-KR',
  jpn: 'ja-JP',
  cmn: 'zh-CN',
  spa: 'es-ES',
  fra: 'fr-FR',
  deu: 'de-DE',
  ita: 'it-IT',
  por: 'pt-BR',
}

const MATROSKA_LANGUAGES: Record<string, string> = {
  en: 'eng',
  ko: 'kor',
  ja: 'jpn',
  zh: 'chi',
  es: 'spa',
  fr: 'fre',
  de: 'ger',
  it: 'ita',
  pt: 'por',
}

/**
 * Detects the language of a transcript sample and returns a locale yap can transcribe with.
 *
 * Text transcribed with the wrong locale comes out transliterated but still
 * carries enough signal for detection.
 *
 * @returns A BCP 47 locale such as `en-US`, or `undefined` when the language is unknown or unsupported.
 */
export function detectLocale(text: string): string | undefined {
  return YAP_LOCALES[franc(text, { minLength: 20 })]
}

/**
 * Converts a BCP 47 tag to the ISO 639-2/B code Matroska stores in track metadata.
 *
 * @returns The three-letter code, or `und` when the language is not in the table.
 */
export function toMatroskaLanguage(tag: string): string {
  return MATROSKA_LANGUAGES[tag.split('-')[0]?.toLowerCase() ?? ''] ?? 'und'
}
