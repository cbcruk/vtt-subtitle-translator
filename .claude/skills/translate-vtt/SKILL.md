---
name: translate-vtt
description: Translate an English VTT subtitle file, or a video, to Korean subtitles
disable-model-invocation: true
argument-hint: "[subtitles/filename.en.vtt | path/to/video.mp4]"
---

# VTT Subtitle Translation

Translate the given English subtitles to Korean, sentence by sentence.
`$ARGUMENTS` is either a YouTube VTT file or a video/audio file.

Below, `INPUT` is the file the pipeline reads and `DIR` is its directory:
- For a `.vtt` argument, `INPUT` is `$ARGUMENTS`.
- For a video or audio argument, `INPUT` is the `.words.json` that Step 0 writes.

## Step 0: Transcribe (video or audio input only)

Skip this step for a `.vtt` argument.

```bash
pnpm vtt doctor
pnpm vtt transcribe "$ARGUMENTS"
```

If doctor fails, stop and report what is missing (`brew install yap` for yap).
transcribe detects the spoken language from the first 60 seconds unless
`--locale` is given, and writes `<name>.words.json` next to the video. Use that
file as `INPUT`.

## Step 1: Extract

Run:
```bash
pnpm vtt extract "INPUT"
```

This rebuilds whole sentences from the word timings and writes `_sentences.json`
plus `batch_N.json` files in `DIR`. Note the batch count from the output. For a
`.words.json` input it also writes the source-language subtitle, e.g. `<name>.en.vtt`.

## Step 2: Translate (Parallel)

Launch one general-purpose agent per batch file.
All agents MUST be launched in a single message (parallel execution).

For each `batch_N.json` (N = 0 to batch_count - 1), use this prompt:

```
Read batch_N.json in DIR (replace DIR with the absolute directory path).
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
pnpm vtt reconstruct "INPUT"
```

This splits each translated sentence into readable cues within the sentence's
time span and writes the `.ko.vtt` file. It fails if any id is missing,
duplicated, or empty.

## Step 4: Verify

Check:
- Output `.ko.vtt` file exists and reconstruct reported no errors
- The CPS and line-length violation rates from the output (report them)
- Spot-check cues near the start, middle, and end against the source timing

## Step 5: Comparison HTML

Generate a self-contained, searchable side-by-side EN/KO comparison of every
sentence. It reads the work files, so run it before cleanup:

```bash
pnpm vtt compare "INPUT"
```

Output: `<name>.ko.compare.html` in `DIR`. Report the path to
the user so they can review the translation quality in a browser.

## Step 6: Cleanup

```bash
pnpm vtt cleanup "DIR"
```

Cleanup only removes intermediate JSON files; the `.ko.vtt` and
`.compare.html` deliverables, and any `.words.json` transcript, are kept.

## Step 7: Mux (video input only)

Skip this step for a `.vtt` argument. Put both subtitle tracks into a Matroska
copy of the video, Korean first so it is the default track:

```bash
pnpm vtt mux "$ARGUMENTS" "DIR/<name>.ko.vtt" "DIR/<name>.en.vtt"
```

Output: `<name>.subtitled.mkv` next to the video. MP4 cannot hold WebVTT
tracks, so to keep the MP4 use the `.vtt` files as sidecars instead.

## Error Recovery

- If reconstruct reports missing ids or files, re-run only the affected batch
- Re-running extract deletes all work files, including finished translations
