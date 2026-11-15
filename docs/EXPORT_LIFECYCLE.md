# MP4 export lifecycle

## Task ownership and cancellation

WPF permits one active export. Each task captures immutable media, transcript, project, output and cache paths plus its own cancellation source. Dependency preparation and rendering observe cancellation. Cancel terminates only the launched Node process tree and waits for process exit/output drainage; it does not exit the application.

The progress notice offers `取消` while cancellation is possible. During final `Committing`, cancellation is disabled and shutdown waits for commit completion. Closing during a cancellable export offers `继续导出` and `取消导出并退出`. Confirmations must not silently discard unsaved edits.

## Safe output transaction

The final output is `<stem>/<stem>.exported.mp4` beside the project JSON. Per-task data is under `<stem>/cache/render/job-<guid>/`; temporary snapshots are under `cache/temp/`.

Remotion renders an intermediate `.mp4` (for container inference), then renames it to `<stem>.exported-<guid>.mp4.tmp`. The WPF host checks MP4 top-level `ftyp`, `moov`, and `mdat` boxes before replacing the final file. This is a structural check, **not** a full decode/track-quality verification.

The existing MP4 is replaced only after validation; a failed commit preserves the prior output where possible and retains the temporary result for recovery. Cache cleanup is best-effort and only targets eligible stale task data older than seven days; never delete an active task.

## CLI distinction

`npm run export -- --media ... --json ... --out ...` accepts one explicit media file and does not do desktop candidate discovery/fallback. It uses a separate `job-*` under the supplied `--cache-dir` or default `.script-to-video-cache/` beside output; CLI caches are retained for diagnostics.

Test actual playback and audio after rendering. Automated tests alone cannot establish codec compatibility or final media quality.
