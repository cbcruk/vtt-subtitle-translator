import { formatTimestamp } from '@vtts/subtitle-core'
import type { SentencePair } from './work-files.types.ts'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

const STYLE = `
  :root {
    --bg: #ffffff; --fg: #1a1a1a; --muted: #6b7280;
    --border: #e5e7eb; --row: #f9fafb; --accent: #2563eb;
    --ts: #7c3aed; --head-bg: #f3f4f6;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1115; --fg: #e6e6e6; --muted: #9ca3af;
      --border: #262a33; --row: #171a21; --accent: #60a5fa;
      --ts: #c4b5fd; --head-bg: #1b1f27;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
    line-height: 1.55;
  }
  header {
    position: sticky; top: 0; z-index: 5; background: var(--bg);
    border-bottom: 1px solid var(--border); padding: 16px 20px;
  }
  h1 { font-size: 1.1rem; margin: 0 0 4px; }
  .meta { font-size: 0.8rem; color: var(--muted); }
  .meta code { color: var(--fg); }
  .controls { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  #search {
    flex: 1 1 240px; min-width: 0; padding: 8px 12px; font-size: 0.9rem;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--bg); color: var(--fg);
  }
  #count { font-size: 0.8rem; color: var(--muted); white-space: nowrap; }
  .wrap { padding: 0 20px 40px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 12px; vertical-align: top; border-bottom: 1px solid var(--border); }
  thead th {
    position: sticky; top: 97px; background: var(--head-bg);
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--muted); z-index: 4;
  }
  tbody tr:nth-child(even) { background: var(--row); }
  td.num { color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; width: 3.5rem; }
  td.ts {
    color: var(--ts); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.78rem; white-space: nowrap; width: 6.5rem;
  }
  td.en { width: 44%; }
  td.ko { width: 44%; }
  tr.hidden { display: none; }
  @media (max-width: 640px) {
    td.ts { display: none; } thead th.ts { display: none; }
    td.en, td.ko { display: block; width: auto; }
    td.en { border-bottom: none; padding-bottom: 2px; }
    td.en::before { content: "EN"; display: block; font-size: 0.65rem; color: var(--muted); }
    td.ko::before { content: "KO"; display: block; font-size: 0.65rem; color: var(--muted); }
  }`

const SCRIPT = `
  const search = document.getElementById("search");
  const countEl = document.getElementById("count");
  const rows = Array.from(document.querySelectorAll("#rows tr"));
  const texts = rows.map((row) => row.textContent.toLowerCase());
  const total = rows.length;
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row, i) => {
      const hit = !query || texts[i].includes(query);
      row.classList.toggle("hidden", !hit);
      if (hit) shown++;
    });
    countEl.textContent = query ? shown + " / " + total + "개" : total + "개 항목";
  });`

/**
 * Renders a self-contained, searchable HTML page showing each source sentence beside its translation.
 *
 * The page has no external dependencies, follows the system light/dark
 * theme, and stacks the columns on narrow screens.
 *
 * @param sourceName Source subtitle file name shown in the header.
 * @param translatedName Translated subtitle file name shown in the header and title.
 *
 * @example
 * ```ts
 * import { writeFile } from 'node:fs/promises'
 * import { renderComparisonHtml } from './compare-html.ts'
 * import { readSentencePairs } from './work-files.ts'
 *
 * const pairs = await readSentencePairs('subtitles')
 * await writeFile('video.ko.compare.html', renderComparisonHtml('video.en.vtt', 'video.ko.vtt', pairs))
 * ```
 */
export function renderComparisonHtml(
  sourceName: string,
  translatedName: string,
  pairs: SentencePair[],
): string {
  const rows = pairs
    .map(
      (pair, i) =>
        '<tr>' +
        `<td class="num">${i + 1}</td>` +
        `<td class="ts">${formatTimestamp(pair.start)}</td>` +
        `<td class="en" lang="en">${escapeHtml(pair.text)}</td>` +
        `<td class="ko" lang="ko">${escapeHtml(pair.translation)}</td>` +
        '</tr>',
    )
    .join('\n')

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(translatedName)} — 번역 비교</title>
<style>${STYLE}
</style>
</head>
<body>
<header>
  <h1>번역 비교</h1>
  <div class="meta">
    원문 <code>${escapeHtml(sourceName)}</code> · 번역 <code>${escapeHtml(translatedName)}</code>
  </div>
  <div class="controls">
    <input id="search" type="search" placeholder="원문·번역 검색…" autocomplete="off" spellcheck="false">
    <span id="count">${pairs.length}개 항목</span>
  </div>
</header>
<div class="wrap">
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th class="ts">시각</th>
        <th>English</th>
        <th>한국어</th>
      </tr>
    </thead>
    <tbody id="rows">
${rows}
    </tbody>
  </table>
</div>
<script>${SCRIPT}
</script>
</body>
</html>
`
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}
