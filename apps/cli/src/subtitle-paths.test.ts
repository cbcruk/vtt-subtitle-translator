import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { muxedPath, subtitleLanguage, subtitlePath, transcriptPath } from './subtitle-paths.ts'

describe('subtitle paths', () => {
  test('derives the target subtitle from a VTT or a yap transcript', () => {
    assert.equal(subtitlePath('subtitles/talk [x1].en.vtt', 'ko'), 'subtitles/talk [x1].ko.vtt')
    assert.equal(subtitlePath('media/talk.words.json', 'ko'), 'media/talk.ko.vtt')
    assert.equal(subtitlePath('media/talk.words.json', 'en'), 'media/talk.en.vtt')
  })

  test('derives transcript and mux outputs from the media file', () => {
    assert.equal(transcriptPath('media/talk.mp4'), 'media/talk.words.json')
    assert.equal(muxedPath('media/talk.mp4'), 'media/talk.subtitled.mkv')
  })

  test('reads the language tag from a subtitle file name', () => {
    assert.equal(subtitleLanguage('media/talk.ko.vtt'), 'ko')
    assert.equal(subtitleLanguage('media/talk.vtt'), undefined)
  })
})
