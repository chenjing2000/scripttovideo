# ScriptToVideo v3 JSON Contract

The only accepted subtitle filename is `<video-stem>.script.json` next to the MP4. The original same-stem `.json` is never loaded by the program. M4/Enscript v1 is unsupported.

```json
{
  "title": "",
  "language": "en",
  "segments": [
    {
      "start": 0.1,
      "end": 0.9,
      "text": " Hello. Next sentence.",
      "words": [
        {"word": "Hello.", "start": 0.1, "end": 0.4, "score": 0.95},
        {"word": "Next", "start": 0.5, "end": 0.7, "score": 0.94},
        {"word": "sentence.", "start": 0.72, "end": 0.9, "score": 0.93, "breakParagraph": true}
      ]
    },
    {
      "start": 1.0,
      "end": 1.3,
      "text": " Continue.",
      "words": [{"word": "Continue.", "start": 1.0, "end": 1.3, "score": 0.9}]
    }
  ],
  "script_to_video": {"format": "script-to-video", "schemaVersion": 3}
}
```

The example illustrates format, not speech recognition. The final word must not have a marker. **No other paragraph-break representation is permitted** in standard input. The *absence* of a word marker means no break, regardless of punctuation. `word_segments`, if provided, must be an untouched raw copy without markers.

Top-level `title` is required as a string (it may be empty). `script_to_video.displayOverrides` is forbidden in v3. Source words and timing are stored directly; revised working subtitles are separate v3 JSON files under `<stem>/`, while project v3 stores presentation settings only. Old v2 subtitle/project files are rejected without migration.

Time checks: each word must have finite nonnegative `start` and `end > start`; word starts must be nondecreasing; overlapping word end/start intervals can exist, but may produce page-switch warnings. Every segment must have at least one word. No final-word break. Unknown `script_to_video` keys are rejected.
