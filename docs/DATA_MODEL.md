# ScriptToVideo — current data model (M6.16)

## Subtitle input

The app accepts only `<stem>.script.json` with:

- `language: "en"`;
- `script_to_video.format: "script-to-video"`;
- `script_to_video.schemaVersion: 2`;
- word-local `segments[].words[].breakParagraph: true` markers.

An omitted `breakParagraph` means no boundary. `false`, `null`, strings and numbers are invalid in subtitle input. The final word cannot carry a marker. `word_segments` remains an unchanged WhisperX copy without paragraph markers. The parser generates internal IDs `s<segmentIndex>w<wordIndex>`; IDs are not written into source words.

## Runtime word model

Each parsed word contains its stable ID, segment ID, original text, display text, source/display baselines, start/end times, optional score, hidden state and effective paragraph-break state. Editing display text never changes source timestamps. Hiding a word does not erase a paragraph boundary attached to that word; layout and plain-text export preserve the visible boundary without emitting the hidden token.

## Project model

Project files remain `format: "script-to-video-project"`, `schemaVersion: 2`. They contain source media/subtitle names, subtitle SHA-256, sparse word overrides, canvas dimensions, reading style and export settings.

For `lesson01.script.json`, the current path is:

```text
<subtitle-directory>/
├── lesson01.script.json
├── lesson01.mp4                 # or .mkv / .mp3 / .wav
└── lesson01/
    ├── lesson01.project.json
    ├── lesson01.exported.mp4       # created after successful MP4 export
    ├── lesson01.article.txt        # created after plain-text export
    └── cache/                      # temporary task data; failed renders may be retained for recovery
```

The application accepts only the current ScriptToVideo v2 project layout and does not discover or migrate old project directories. Work directories are created only on the first save or export. A malformed existing project blocks overwrite.

An override can contain `display`, `hidden` and/or `breakParagraph`. `breakParagraph: true` adds a boundary, `false` removes a source boundary, and omission inherits the source value. Source subtitle bytes remain unchanged.

## Plain-text article export

The current right-pane visible text is written to `<subtitle-directory>/<stem>/<stem>.article.txt` without a file picker. Output is UTF-8 without BOM, Windows CRLF, one blank line between paragraphs, no trailing blank line, no timestamps or styling, and no automatic spelling/punctuation correction. Hidden tokens are omitted while their paragraph boundary is retained. Exporting text does not save the project or clear its dirty state.

## MP4 export

The WPF host passes an immutable project and page-plan snapshot to Remotion. The renderer uses the selected media once (video audio remains part of `OffthreadVideo`; audio-only sources use one `Audio` component). The default desktop MP4 output is `<subtitle-directory>/<stem>/<stem>.exported.mp4`, in the same directory as `<stem>.project.json`. Temporary render data is isolated under that work directory's `cache/render/job-<guid>/` and `cache/temp/` folders. A failed final commit retains the rendered `<stem>.exported-<guid>.mp4.tmp` for manual recovery. The project and source subtitle are not modified by rendering.

## Global settings

`scripttovideo.settings.json` lives beside `ScriptToVideo.exe`, is created with defaults on first launch and is atomically replaced after valid setting changes. Its JSON marker is `scripttovideo-settings` (schema version 1). There is no legacy settings migration in M6.16. Existing settings from earlier releases remain untouched and are not loaded. Global settings are separate from per-subtitle project files.
