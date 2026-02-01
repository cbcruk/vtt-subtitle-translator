#!/usr/bin/env python3
"""VTT subtitle translation automation tool.

Usage:
    python3 translate-vtt.py extract <input.vtt> [--batch-size 200]
    python3 translate-vtt.py reconstruct <input.vtt> [<output.vtt>]
    python3 translate-vtt.py cleanup
"""

import argparse
import json
import math
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

DEFAULT_BATCH_SIZE = 200
TIMESTAMP_RE = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}")
WORD_TIMING_RE = re.compile(r"<\d{2}:\d{2}:\d{2}\.\d{3}>")
C_TAG_RE = re.compile(r"</?c>")


@dataclass
class CueData:
    timestamp: str
    line1_text: str
    line2_text: str
    line2_had_tags: bool


def strip_timing_tags(text: str) -> str:
    result = WORD_TIMING_RE.sub("", text)
    result = C_TAG_RE.sub("", result)
    return result.strip()


def has_timing_tags(text: str) -> bool:
    return bool(WORD_TIMING_RE.search(text))


def parse_vtt(filepath: Path) -> tuple[list[str], list[CueData]]:
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    header_lines: list[str] = []
    cues: list[CueData] = []
    i = 0

    while i < len(lines):
        line = lines[i].rstrip("\n")
        if TIMESTAMP_RE.match(line.strip()):
            break
        header_lines.append(line)
        i += 1

    while i < len(lines):
        line = lines[i].rstrip("\n")
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if TIMESTAMP_RE.match(stripped):
            timestamp = stripped
            line1_raw = lines[i + 1].rstrip("\n") if i + 1 < len(lines) else ""
            line2_raw = lines[i + 2].rstrip("\n") if i + 2 < len(lines) else ""

            had_tags = has_timing_tags(line2_raw)
            line1_text = (
                strip_timing_tags(line1_raw)
                if has_timing_tags(line1_raw)
                else line1_raw.strip()
            )
            line2_text = strip_timing_tags(line2_raw) if had_tags else line2_raw.strip()

            cues.append(
                CueData(
                    timestamp=timestamp,
                    line1_text=line1_text,
                    line2_text=line2_text,
                    line2_had_tags=had_tags,
                )
            )
            i += 3
        else:
            i += 1

    return header_lines, cues


def extract_unique_texts(cues: list[CueData]) -> list[str]:
    seen: dict[str, int] = {}
    unique: list[str] = []
    for cue in cues:
        for text in [cue.line1_text, cue.line2_text]:
            clean = text.strip()
            if clean and clean not in seen:
                seen[clean] = len(unique)
                unique.append(clean)
    return unique


def cmd_extract(args: argparse.Namespace) -> None:
    input_path = Path(args.input_vtt)
    if not input_path.exists():
        print(f"Error: {input_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        first_line = f.readline().strip()
    if first_line != "WEBVTT":
        print(f"Error: {input_path} is not a valid VTT file", file=sys.stderr)
        sys.exit(1)

    header_lines, cues = parse_vtt(input_path)
    unique_texts = extract_unique_texts(cues)
    batch_size = args.batch_size
    batch_count = math.ceil(len(unique_texts) / batch_size)
    output_dir = input_path.parent
    source_name = input_path.name

    for batch_idx in range(batch_count):
        start = batch_idx * batch_size
        end = min(start + batch_size, len(unique_texts))
        batch_entries = [{"id": i, "text": unique_texts[i]} for i in range(start, end)]
        batch_data = {
            "source_file": source_name,
            "batch_index": batch_idx,
            "total_batches": batch_count,
            "entries": batch_entries,
        }
        batch_path = output_dir / f"batch_{batch_idx}.json"
        with open(batch_path, "w", encoding="utf-8") as f:
            json.dump(batch_data, f, ensure_ascii=False, indent=2)

    mapping_data = {
        "source_file": source_name,
        "header_lines": [line.rstrip("\n") for line in header_lines],
        "total_unique_texts": len(unique_texts),
        "batch_count": batch_count,
        "batch_size": batch_size,
        "cues": [asdict(cue) for cue in cues],
    }
    mapping_path = output_dir / "_mapping.json"
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(mapping_data, f, ensure_ascii=False, indent=2)

    print(f"Extracted {len(unique_texts)} unique texts from {len(cues)} cues")
    print(f"Split into {batch_count} batches of ~{batch_size} lines each")
    last_batch_size = len(unique_texts) - (batch_count - 1) * batch_size
    print(
        f"  batch_0.json - batch_{batch_count - 1}.json (last batch: {last_batch_size} lines)"
    )
    print(f"  _mapping.json")


def cmd_reconstruct(args: argparse.Namespace) -> None:
    input_path = Path(args.input_vtt)
    output_dir = input_path.parent
    mapping_path = output_dir / "_mapping.json"

    if not mapping_path.exists():
        print("Error: _mapping.json not found. Run 'extract' first.", file=sys.stderr)
        sys.exit(1)

    with open(mapping_path, "r", encoding="utf-8") as f:
        mapping = json.load(f)

    batch_count = mapping["batch_count"]
    translations: dict[str, str] = {}
    missing_batches: list[int] = []

    for batch_idx in range(batch_count):
        trans_path = output_dir / f"trans_{batch_idx}.json"
        if not trans_path.exists():
            missing_batches.append(batch_idx)
            continue

        with open(trans_path, "r", encoding="utf-8") as f:
            trans_data = json.load(f)

        for entry in trans_data["entries"]:
            translation = entry.get("translation", "").strip()
            if not translation:
                print(
                    f"Warning: empty translation for id={entry['id']} in trans_{batch_idx}.json",
                    file=sys.stderr,
                )
                translation = entry["text"]
            translations[entry["text"]] = translation

    if missing_batches:
        print(
            f"Error: missing translation files: {', '.join(f'trans_{b}.json' for b in missing_batches)}",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.output_vtt:
        output_path = Path(args.output_vtt)
    else:
        name = input_path.name
        if name.endswith(".en.vtt"):
            output_path = input_path.parent / name.replace(".en.vtt", ".ko.vtt")
        else:
            output_path = input_path.parent / name.replace(".vtt", ".ko.vtt")

    with open(output_path, "w", encoding="utf-8") as f:
        for line in mapping["header_lines"]:
            if line.startswith("Language:"):
                f.write("Language: ko\n")
            else:
                f.write(line + "\n")

        for cue in mapping["cues"]:
            f.write("\n")
            f.write(cue["timestamp"] + "\n")

            line1 = cue["line1_text"]
            if not line1.strip():
                f.write(" \n")
            else:
                f.write(translations.get(line1, line1) + "\n")

            line2 = cue["line2_text"]
            if not line2.strip():
                f.write(" \n")
            else:
                f.write(translations.get(line2, line2) + "\n")

    cue_count = len(mapping["cues"])
    print(f"Reconstructed {cue_count} cues -> {output_path}")
    print(f"Language header: ko")


def cmd_cleanup(args: argparse.Namespace) -> None:
    work_dir = Path(args.directory) if args.directory else Path(".")
    patterns = ["batch_*.json", "trans_*.json", "_mapping.json"]
    removed = 0
    for pattern in patterns:
        for p in work_dir.glob(pattern):
            p.unlink()
            removed += 1
    print(f"Removed {removed} temporary files from {work_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description="VTT subtitle translation tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_extract = subparsers.add_parser(
        "extract", help="Extract text from VTT into batch files"
    )
    p_extract.add_argument("input_vtt", type=str, help="Input VTT file path")
    p_extract.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help="Lines per batch (default: 200)",
    )

    p_reconstruct = subparsers.add_parser(
        "reconstruct", help="Reconstruct VTT from translations"
    )
    p_reconstruct.add_argument(
        "input_vtt", type=str, help="Original input VTT file path"
    )
    p_reconstruct.add_argument(
        "output_vtt",
        type=str,
        nargs="?",
        default=None,
        help="Output VTT path (default: .ko.vtt)",
    )

    p_cleanup = subparsers.add_parser(
        "cleanup", help="Remove temporary batch/translation files"
    )
    p_cleanup.add_argument(
        "directory",
        type=str,
        nargs="?",
        default=None,
        help="Directory to clean (default: current dir)",
    )

    args = parser.parse_args()

    if args.command == "extract":
        cmd_extract(args)
    elif args.command == "reconstruct":
        cmd_reconstruct(args)
    elif args.command == "cleanup":
        cmd_cleanup(args)


if __name__ == "__main__":
    main()
