# ScriptToVideo — current data model (M6.22)

## Source subtitle and immutable anchors

The normal import entry is `<stem>.script.json`: English (`language: "en"`), `script_to_video.format: "script-to-video"`, and source schema version 2. The original JSON and media are never rewritten by title, word, project or MP4 edits.

Words carry the source `word`, `start`, `end` and optional `score` fields. Paragraph boundaries are word-local `segments[].words[].breakParagraph: true`; omission means no boundary. Do not infer breaks from punctuation, segments or timestamps. The parser derives internal IDs such as `s0w1`, rather than writing IDs into the source.

**Review note:** the current WPF import guard permits a source `schemaVersion` of 2 *or* 3, even though the normal source contract and paragraph-generation skill specify v2. This compatibility behavior is tracked as a review decision; it must not be silently changed during cleanup.

## Working files

For `lesson01.script.json`, the active layout is:

```text
<subtitle-directory>/
├── lesson01.script.json                # immutable source
├── lesson01.mp4                        # illustrative same-stem media
└── lesson01/
    ├── lesson01.script.revise.json     # v3 effective title and word edits
    ├── lesson01.txt                    # derived article (UTF-8, no BOM)
    ├── lesson01.project.json           # v3 presentation-only settings
    ├── lesson01.exported.mp4           # first MP4 output
    ├── lesson01.exported (1).mp4       # next non-conflicting output
    └── cache/                          # isolated render inputs and temporary outputs
```

The revised JSON contains the current title and full edited word sequence (including hidden-word flags and paragraph boundaries), preserving the original word IDs' positional/timing anchors. A hidden word remains in the revised JSON but is omitted from TXT and rendered text.

`<stem>.txt` is regenerated from the same effective words/title as the revised JSON: Windows CRLF separators, one blank line between paragraphs and no timestamps or formatting. The title, when present, precedes body text with one blank line. There is **no separate plain-text export button or `<stem>.article.txt` output** in M6.22.

The v3 `<stem>.project.json` stores source/media identity and fingerprint, canvas, reading style, title presentation style and export settings. It does **not** store sparse word overrides. Title presentation style includes font family, font size, color, line height, following gap and bold state. Title/content edits and presentation edits remain separate.

## Creation, migration and saving

On first opening a valid source, a missing revised working copy and derived TXT can be created. An existing revised file is authoritative and must pass strict source-anchor checks. A v2 project may be migrated into v3 revised content plus a presentation-only v3 project, with guarded recovery on interruption.

The older `<stem>.script.refined.json` filename is replaced by `<stem>.script.revise.json` only if no target conflict and no pending old-name save journal exist. No automatic merge or overwrite occurs when both names exist. Internal symbols named `refined` currently remain in the code and message protocol; these are not user-facing filenames.

A user-triggered Ctrl+S save uses a revision-bound bundle snapshot. It validates the previously confirmed disk contents, then saves revised JSON, TXT and project with a journal and guarded recovery. No implicit autosave is introduced. An export first confirms the same bundle and then freezes the revised subtitle, presentation project and page plan. A stale save acknowledgment must not clear a newer dirty revision.

## Preview and export

The title is rendered only on the first page, between the media slot and the body, and the first page must fit at least one complete body row. The right editor's title input follows the right-pane body typography but is bold; its visual styling does not override video title presentation settings.

The WPF host renders MP4 from immutable staged inputs through Remotion, preserving the selected source's audio once. Output uses the next available `<stem>.exported.mp4` or numbered variant without overwriting a previous MP4. Temporary task files live under the work directory's `cache/` tree. An unsuccessful commit retains the recoverable temporary MP4 when available.

## Global settings

`scripttovideo.settings.json` lives beside `ScriptToVideo.exe`, uses marker `scripttovideo-settings` and schema version 1, and is separate from per-subtitle project JSON. It provides default left/right font settings and default title presentation style. Older title styles lacking `bold` are interpreted using the default bold behavior by the presentation layer.
