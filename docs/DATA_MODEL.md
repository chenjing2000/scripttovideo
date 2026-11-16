# ScriptToVideo — current data model (M6.22)

## Source subtitle and immutable anchors

The normal import entry is `<stem>.script.json`: English (`language: "en"`), `script_to_video.format: "script-to-video"`, and source schema version 3, with mandatory string `title` (empty is allowed). The original JSON and media are never rewritten by title, word, project or MP4 edits.

Words carry the source `word`, `start`, `end` and optional `score` fields. Paragraph boundaries are word-local `segments[].words[].breakParagraph: true`; omission means no boundary. Do not infer breaks from punctuation, segments or timestamps. The parser derives internal IDs such as `s0w1`, rather than writing IDs into the source.

The desktop import boundary, revised-open planner, CLI and paragraph Skill require a v3 **original**. Original `.script.json` and independently stored `.script.revise.json` are both v3 but have different file roles; original is never edited.

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

## Current-version creation and saving (breaking change)

When a valid v3 original subtitle is first opened without a project or revised copy, the application creates a new v3 revise working file and derived TXT. An existing v3 revise file is authoritative and must match the source word/time anchors. An existing project must be a valid v3 presentation-only project; a v3 project without its revised working file is blocked, not recreated.

**No old-format compatibility or migration:** original subtitle v2 files, project v2 files, `<stem>.script.refined.json`, and their old save journals are not recognized as working data, renamed, imported or repaired. The application does not delete them. Any existing project v2 is rejected rather than overwritten. To start a fresh project, manually move old work files out of the companion directory after backing them up.

Only the **current v3 three-file save transaction** retains guarded journal recovery for interrupted Ctrl+S and pre-export saves. A failed or conflicting recovery leaves the journal and user files intact. The original v3 subtitle never changes.

## Preview and export

The title is rendered only on the first page, between the media slot and the body, and the first page must fit at least one complete body row. The right editor's title input follows the right-pane body typography but is bold; its visual styling does not override video title presentation settings.

The WPF host renders MP4 from immutable staged inputs through Remotion, preserving the selected source's audio once. Output uses the next available `<stem>.exported.mp4` or numbered variant without overwriting a previous MP4. Temporary task files live under the work directory's `cache/` tree. An unsuccessful commit retains the recoverable temporary MP4 when available.

## Global settings

`scripttovideo.settings.json` lives beside `ScriptToVideo.exe`, uses marker `scripttovideo-settings` and schema version 1, and is separate from per-subtitle project JSON. It provides default left/right font settings and default title presentation style. Older title styles lacking `bold` are interpreted using the default bold behavior by the presentation layer.
