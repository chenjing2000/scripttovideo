---
name: script-to-video-paragraphs
description: Segment WhisperX English word-timestamped transcripts semantically and generate strictly validated ScriptToVideo v3 JSON, preserving all original recognition fields.
---

# ScriptToVideo Paragraph Skill — v3

## Goal
Convert a raw WhisperX English JSON into `<video-stem>.script.json`, with **word-level** `segments[].words[].breakParagraph: true` at the end of each semantic paragraph. Produce `<video-stem>.paragraphs.txt` for human review.

## Required workflow
1. Read the **entire** WhisperX transcript and this Skill's `references/PARAGRAPH_RULES.md`, `TRANSCRIPT_SCHEMA.md` and `EXAMPLES.md`.
2. Inspect a word-indexed transcript via `python scripts/transcript_tool.py inspect SOURCE.json --out indexed.md` (paths relative to this Skill folder).
3. Decide natural paragraphs using **meaning and speaker turns**, not sentence punctuation, WhisperX segment boundaries, pauses, or video page size. Do not infer speakers when uncertain. Review complete paragraphs for cohesion.
4. Write a temporary decision file such as `{"breakAfterWordIds": ["s3w2", "s10w38"]}` with valid ordered anchors. These IDs belong **only to the Skill's processing decisions and application editing**; never add IDs to the actual JSON words or emit an `paragraphBreaksAfter` subtitle property.
5. Build: `python scripts/transcript_tool.py build SOURCE.json --boundaries decisions.json --output VIDEO.script.json --preview VIDEO.paragraphs.txt`.
6. Validate: `python scripts/transcript_tool.py validate VIDEO.script.json --source SOURCE.json`. Resolve every error before delivery.
7. Review plain-text paragraphs manually. Preserve original `.json` separately; do not overwrite source or media.

## Revise an existing v3 subtitle
Use `python scripts/transcript_tool.py edit EXISTING.script.json --boundaries revised_decisions.json --output NEW.script.json --preview NEW.paragraphs.txt`. The decisions file is a **complete replacement** list `breakAfterWordIds`, not a patch. All original words, fields, time stamps and display corrections are preserved. The original file is never overwritten. Validate the new file against the raw WhisperX source before delivery.

## Strict rules
- Only `script_to_video: {"format":"script-to-video", "schemaVersion":3}` is accepted by the app. The top-level `title` is mandatory (empty string is allowed). `displayOverrides` is forbidden; words and raw timing are preserved.
- For every paragraph boundary (except the end of the file), add `breakParagraph: true` to the **last word of that paragraph** inside `segments[].words[]`. An absent marker means continue. Explicit `false`, `null`, string, number are invalid.
- Never put `breakParagraph` on `segments[]`, `word_segments[]`, or the final word. `word_segments` remains an unchanged original WhisperX copy.
- Never change original `word`, `start`, `end`, `score`, `segments[].text` or any other raw source field.
- One natural paragraph may cross several source segments and may contain several sentences. Only markers define paragraph ends.
- The Skill does not do screen pagination, line wrapping, font/layout decisions, word synchronization or video export.
- No v1/Enscript input or project migration. Use fresh raw WhisperX to build v3; never convert existing v2 subtitles.

## Deliverables
- `<stem>.script.json` (program input)
- `<stem>.paragraphs.txt` (UTF-8 plain-text review, with one blank line between semantic paragraphs; not program input)
- A clear result indicating word count, paragraph count, and validation with original source.
