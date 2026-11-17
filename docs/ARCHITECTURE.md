# ScriptToVideo architecture

## Responsibilities

- **WPF / WebView2 (`desktop/`)**: native window, single-instance activation, tray, trusted file access, project/settings persistence, media token server, dependency preparation and export process lifetime.
- **React (`src/main.tsx`, `src/ui/`)**: editing, preview, keyboard commands, dialogs, task notices and dirty-state reporting.
- **Core (`src/core/`)**: ScriptToVideo v3 original/revised validation, optional-revise open and three-file snapshot generation, media candidate priority, initial decode probing, deterministic pagination, title layout, page plans and derived text.
- **Remotion (`src/remotion/`, `scripts/export.mjs`)**: renders the shared reader canvas from an immutable export snapshot. CLI validates source/project independently.

## Media import transaction

Only `<stem>.script.json` starts desktop import. Find same-stem media in the same directory, case-insensitively: MP4 → MKV → M4A → MP3 → WAV. Probe candidates sequentially using detached, muted WebView2 media elements. Video must expose decoded frame data; audio must advance during muted playback. Metadata alone is insufficient.

Do not replace active media tokens, project, preview or unsaved edits during probing. Failed candidates release their resources; cancelled or stale imports cannot commit. Once imported, playback errors do not trigger another candidate. No automatic transcode.

## Persistence and edit safety

Global `scripttovideo.settings.json` is next to the EXE. Original `<stem>.script.json` and the selected media are read-only. The optional edited transcript lives in `<stem>/<stem>.script.revise.json`; when absent, the original subtitle is read directly. TXT is a derived output, not an import prerequisite. Project v3 at `<stem>/<stem>.project.json` contains presentation settings and `script.filename`, not SHA or media type. On import, a mismatched or invalid existing project is replaced atomically with current default settings without a warning; a missing project remains absent until save. Old project v2 and obsolete revised filenames are not migrated.

React tracks edit revisions and active inline drafts; a save acknowledgment only clears dirty state for the matching revision. Import, close and export protect unsaved changes. Settings changes do not mutate an active export snapshot. Manual save and pre-export save always write revise, TXT and project using the same revision-bound request and individual atomic file replacements; export snapshots the revised subtitle, project and page plan.

## Window lifecycle

`desktop/AppLifecycle/SingleInstanceManager.cs` coordinates a per-user mutex and activation pipe. `desktop/AppLifecycle/TrayIconManager.cs` uses Windows Forms `NotifyIcon`; the main window and tray menu are WPF. Minimizing keeps the native WPF taskbar button and WebView2 state; clicking the taskbar button restores the window. The WinForms notification-area icon and its Open action remain available. Closing during export follows the cancellation/shutdown contract.

## Export

One active export at a time. WPF owns the task, Node process tree, task cache and atomic final-output commit; React shows a cancellable progress notice. The CLI uses a separate per-invocation cache job and does **not** automatically select media. See [export lifecycle](EXPORT_LIFECYCLE.md) and [data model](DATA_MODEL.md).
