import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { renderComparisonHtml } from './compare-html.ts'

describe('renderComparisonHtml', () => {
  test('renders one escaped row per sentence pair', () => {
    const html = renderComparisonHtml('v.en.vtt', 'v.ko.vtt', [
      { id: 0, text: 'Use <script>', translation: '<script> 사용', start: 61.5, end: 63 },
      { id: 1, text: 'Tom & Jerry', translation: '톰과 제리', start: 64, end: 65 },
    ])

    assert.equal(html.match(/<tr>/g)?.length, 3)
    assert.match(html, /<td class="ts">00:01:01\.500<\/td>/)
    assert.match(html, /<td class="en" lang="en">Use &lt;script&gt;<\/td>/)
    assert.match(html, /<td class="ko" lang="ko">톰과 제리<\/td>/)
    assert.match(html, /<span id="count">2개 항목<\/span>/)
  })
})
