import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { detectLocale, toMatroskaLanguage } from './languages.ts'

describe('detectLocale', () => {
  test('maps detected languages to yap locales', () => {
    assert.equal(
      detectLocale('Hey friends, I am one of the maintainers for this new project from GitHub, and today we look at the numbers.'),
      'en-US',
    )
    assert.equal(detectLocale('안녕하세요 여러분, 오늘은 GitHub에서 새로 공개한 프로젝트를 함께 살펴보려고 합니다.'), 'ko-KR')
  })

  test('returns undefined for text too short to tell', () => {
    assert.equal(detectLocale('ok'), undefined)
  })
})

describe('toMatroskaLanguage', () => {
  test('converts BCP 47 tags to ISO 639-2/B codes', () => {
    assert.equal(toMatroskaLanguage('ko'), 'kor')
    assert.equal(toMatroskaLanguage('en-US'), 'eng')
    assert.equal(toMatroskaLanguage('xx'), 'und')
  })
})
