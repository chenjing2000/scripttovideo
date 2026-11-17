# MP4 export lifecycle

## Task ownership and cancellation

WPF permits one active export. Before rendering, the desktop confirms a revision-bound save of the revised subtitle, derived TXT and presentation project. Each file is replaced atomically; the three-file save is not a cross-file transaction. Each export task then captures immutable media, revised transcript, project, page-plan, output and cache paths plus its own cancellation source. Dependency preparation and rendering observe cancellation. Cancel terminates only the launched Node process tree and waits for process exit/output drainage; it does not exit the application.

The progress notice offers `取消` while cancellation is possible. During final `Committing`, cancellation is disabled and shutdown waits for commit completion. Closing during a cancellable export offers `继续导出` and `取消导出并退出`. Confirmations must not silently discard unsaved edits.

## Safe output transaction

The default output is `<stem>/<stem>.exported.mp4` beside the project JSON. Each successful desktop MP4 export creates a distinct file: if occupied, the application selects the lowest available `<stem>.exported (n).mp4` name immediately before committing. Existing MP4 files are never overwritten; a missing base name is reused even if numbered files remain. Per-task data is under `<stem>/cache/render/job-<guid>/`; temporary snapshots are under `cache/temp/`.

Remotion renders an intermediate `.mp4` (for container inference), then renames it to `<stem>.exported-<guid>.mp4.tmp`. The WPF host checks MP4 top-level `ftyp`, `moov`, and `mdat` boxes before committing a new final file. This is a structural check, **not** a full decode/track-quality verification.

Following validation, the WPF host moves the temporary file to a free destination without overwrite. If the destination is claimed concurrently, it retries the next available suffix; unrelated I/O errors fail immediately. A failed final commit preserves all existing MP4 files and retains the temporary result for recovery. Revised JSON, derived TXT and project are each saved by atomic replacement without old-content comparisons, journal or cross-file rollback. The original subtitle is not rewritten. Cache cleanup is best-effort and only targets eligible stale task data older than seven days; never delete an active task.

## Window and settings interaction

While exporting, the Settings button is disabled. Native minimization retains a taskbar entry and does not stop rendering; the WinForms tray icon also remains available. Restoring the editor does not replace the frozen export snapshot.

## CLI distinction

`npm run export -- --media ... --json <stem>.script.revise.json --source-json <stem>.script.json --project <stem>.project.json --out ...` accepts one explicit media file and does not do desktop candidate discovery/fallback. It uses a separate `job-*` under the supplied `--cache-dir` or default `.script-to-video-cache/` beside output; CLI caches are retained for diagnostics.

Test actual playback and audio after rendering. Automated tests alone cannot establish codec compatibility or final media quality.
