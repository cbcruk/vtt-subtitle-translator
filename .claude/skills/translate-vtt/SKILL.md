---
name: translate-vtt
description: Translate an English VTT subtitle file to Korean
disable-model-invocation: true
argument-hint: "[subtitles/filename.en.vtt]"
---

# VTT Subtitle Translation

Translate the given English VTT subtitle file to Korean using `translate-vtt.py`.

## Step 1: Extract

Run:
```bash
python3 translate-vtt.py extract "$ARGUMENTS"
```

Note the batch count and total unique texts from the output.

## Step 2: Translate (Parallel)

Launch one Task agent (subagent_type: general-purpose) per batch file.
All tasks MUST be launched in a single message (parallel execution).

For each `batch_N.json` (N = 0 to batch_count - 1), use this prompt:

```
Read batch_N.json in the subtitles/ directory (same directory as the VTT file).
It contains English subtitle lines that need Korean translation.

For each entry in the "entries" array:
1. Keep all existing fields (id, text) exactly as-is
2. Add a "translation" field with the Korean translation

Write the result to trans_N.json in the same subtitles/ directory.
Keep all metadata fields (source_file, batch_index, total_batches) unchanged.

Translation rules:
- Natural conversational Korean (YouTube tutorial tone)
- Keep technical terms in English: API, GitHub, CLI, MCP, JSON, npm, git,
  TypeScript, JavaScript, React, Node.js, VS Code, Docker, SDK, etc.
- Keep proper nouns in English (people names, product names, company names)
- Numbers and units stay as-is
- Each translation is a single line (no line breaks)
- Translate EVERY entry without exception
- Output valid JSON with Korean characters (not unicode escapes)
```

Wait for ALL agents to complete before proceeding.

## Step 3: Reconstruct

```bash
python3 translate-vtt.py reconstruct "$ARGUMENTS"
```

## Step 4: Verify

Check:
- Output `.ko.vtt` file exists
- Cue count matches original
- Language header is `ko`
- Spot-check first and last few cues

## Step 5: Comparison HTML

Generate a self-contained, searchable side-by-side EN/KO comparison:

```bash
python3 translate-vtt.py compare "$ARGUMENTS"
```

Output: `<name>.ko.compare.html` next to the VTT files. Report the path to
the user so they can review the translation quality in a browser.

## Step 6: Cleanup

```bash
python3 translate-vtt.py cleanup subtitles
```

Cleanup only removes intermediate JSON files; the `.ko.vtt` and
`.compare.html` deliverables are kept.

## Error Recovery

- If a Task agent fails, re-run only that specific batch
- If reconstruct reports missing translations, check which `trans_N.json` is incomplete
- The extract step is idempotent (safe to re-run)
