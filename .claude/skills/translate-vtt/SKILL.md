---
name: translate-vtt
description: Translate an English VTT subtitle file to Korean
disable-model-invocation: true
argument-hint: "[subtitles/filename.en.vtt]"
---

# VTT Subtitle Translation

Translate the given English VTT subtitle file to Korean, sentence by sentence.

## Step 1: Extract

Run:
```bash
pnpm vtt extract "$ARGUMENTS"
```

This rebuilds whole sentences from the word timings and writes `_sentences.json`
plus `batch_N.json` files next to the VTT. Note the batch count from the output.

## Step 2: Translate (Parallel)

Launch one general-purpose agent per batch file.
All agents MUST be launched in a single message (parallel execution).

For each `batch_N.json` (N = 0 to batch_count - 1), use this prompt:

```
Read batch_N.json in the subtitles/ directory (same directory as the VTT file).
Each entry in "entries" is one English sentence from a video transcript.
For context, _sentences.json in the same directory holds the full transcript in order.

For each entry:
1. Keep "id" and "text" exactly as-is
2. Add a "translation" field with the Korean translation of that one sentence

Write the result to trans_N.json in the same directory.
Keep source_file, batch_index, and total_batches unchanged.

Rules:
- One translation per entry: never merge, split, skip, or reorder entries.
  Every id must appear exactly once, or the subtitles will be rejected.
- Natural conversational Korean (YouTube tutorial tone)
- Keep technical terms in English: API, GitHub, CLI, MCP, JSON, npm, git,
  TypeScript, JavaScript, React, Node.js, VS Code, Docker, SDK, etc.
- Keep proper nouns in English (people names, product names, company names)
- Use the full transcript to keep terms and names consistent and to restore
  subjects the sentence leaves implicit
- Drop filler words (um, uh, you know) and false starts
- Numbers and units stay as-is
- Each translation is a single line (no line breaks)
- Output valid JSON with Korean characters (not unicode escapes)
```

Wait for ALL agents to complete before proceeding.

## Step 3: Reconstruct

```bash
pnpm vtt reconstruct "$ARGUMENTS"
```

This splits each translated sentence into readable cues within the sentence's
time span and writes the `.ko.vtt` file. It fails if any id is missing,
duplicated, or empty.

## Step 4: Verify

Check:
- Output `.ko.vtt` file exists and reconstruct reported no errors
- The CPS and line-length violation rates from the output (report them)
- Spot-check cues near the start, middle, and end against the English VTT timing

## Step 5: Comparison HTML

Generate a self-contained, searchable side-by-side EN/KO comparison of every
sentence. It reads the work files, so run it before cleanup:

```bash
pnpm vtt compare "$ARGUMENTS"
```

Output: `<name>.ko.compare.html` next to the VTT files. Report the path to
the user so they can review the translation quality in a browser.

## Step 6: Cleanup

```bash
pnpm vtt cleanup subtitles
```

Cleanup only removes intermediate JSON files; the `.ko.vtt` and
`.compare.html` deliverables are kept.

## Error Recovery

- If reconstruct reports missing ids or files, re-run only the affected batch
- Re-running extract deletes all work files, including finished translations
