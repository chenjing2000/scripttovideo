# ScriptToVideo — v3 data and file lifecycle

Only ScriptToVideo v3 subtitle JSON and project v3 are supported. No v2 migration.

## Storage layout

```text
lesson.script.json              # immutable v3 original, required
lesson.mp4                      # immutable source media (other supported inputs possible)
lesson/
  lesson.script.revise.json     # optional v3 edit, preferred on open
  lesson.txt                    # generated from current title and visible words
  lesson.project.json           # v3 presentation settings
  cache/                        # disposable
  lesson.exported.mp4           # new output; duplicates get (1), (2) ...
```

Original `script.json` and original media are never written. All workspace JSON is v3. The original and revise both carry the title, word timing anchors, optional hidden flags, and semantic paragraph breaks. Revise must preserve the original word count and start/end times.

## Import

Require the original `<stem>.script.json` and a decodable same-stem media file. If revise exists, validate its v3 format and time anchors and use it; otherwise read the original directly. TXT is not an input and its absence or stale contents must not block import.

For `<stem>.project.json`, validate `script.filename` against the base filename of the selected original subtitle (case-insensitive on Windows). If matching, load it. If missing, use default presentation settings without writing a project. If invalid, malformed, v2, or belonging to a different script, atomically replace the file with current default project v3; no user confirmation or migration.

Project v3 contains `format`, `schemaVersion: 3`, `script: {filename: "<stem>.script.json"}`, `canvas`, `style`, `titleStyle` and `export`. It does not contain SHA, `source`, `mediaKind`, `overrides`, or word edits. Existing v3 project files with `mediaKind` are readable, but the field is ignored and omitted the next time they are saved.

## Saving

Every Ctrl+S generates one immutable-in-intent snapshot from the current editor revision and always rewrites the revise v3, derived TXT and project v3. The WPF host writes each generated file via a same-directory temporary file and atomic replacement. No old-file comparison, cross-file journal, implicit migration, conditional content diff or no-op skip. A failed write leaves the unsaved indicator on and reports the error; successful preceding single-file writes are not rolled back. Three-file atomicity is not promised.

Browser-only mode requests three downloads but cannot confirm persistence, so it does not clear the unsaved marker.

## Export

Desktop export first performs the identical three-file save, then freezes render inputs. No source media is overwritten. Each new output uses the lowest available suffix, e.g. `lesson.exported.mp4`, `lesson.exported (1).mp4`. This naming rule is extension-independent; current encoder output remains MP4. Existing outputs and original files are never overwritten. Single export at a time, cancellation safety and temporary render output validation remain in force.

## Global settings

`scripttovideo.settings.json` beside the executable is separate from per-script project v3 and is not part of Ctrl+S's three work files.
