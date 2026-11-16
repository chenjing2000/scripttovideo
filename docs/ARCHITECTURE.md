# ScriptToVideo architecture

## Responsibilities

- **WPF / WebView2 (`desktop/`)**: native window, single-instance activation, tray, trusted file access, project/settings persistence, media token server, dependency preparation and export process lifetime.
- **React (`src/main.tsx`, `src/ui/`)**: editing, preview, keyboard commands, dialogs, task notices and dirty-state reporting.
- **Core (`src/core/`)**: ScriptToVideo v2 source/v3 revised validation, current-format open and save planning, media candidate priority, initial decode probing, deterministic pagination, title layout, page plans and derived text.
- **Remotion (`src/remotion/`, `scripts/export.mjs`)**: renders the shared reader canvas from an immutable export snapshot. CLI validates source/project independently.

## Media import transaction

Only `<stem>.script.json` starts desktop import. Find same-stem media in the same directory, case-insensitively: MP4 → MKV → M4A → MP3 → WAV. Probe candidates sequentially using detached, muted WebView2 media elements. Video must expose decoded frame data; audio must advance during muted playback. Metadata alone is insufficient.

Do not replace active media tokens, project, preview or unsaved edits during probing. Failed candidates release their resources; cancelled or stale imports cannot commit. Once imported, playback errors do not trigger another candidate. No automatic transcode.

## Persistence and edit safety

Global `scripttovideo.settings.json` is next to the EXE. Project state is `<stem>/<stem>.project.json` relative to the source JSON folder; the original subtitle is never rewritten. Revised word/title content belongs in `<stem>/<stem>.script.revise.json` (v3), derived text in `<stem>/<stem>.txt`, and presentation settings in `<stem>/<stem>.project.json` (v3). First opening a source may create the revised working copy and TXT. Project v2 and the previous `.script.refined.json` filename are not migrated or loaded. Only current project v3 and revise v3 are accepted; invalid or source-mismatched projects cannot be overwritten. Recovery applies only to current v3 three-file save journals.

React tracks edit revisions and active inline drafts; a save acknowledgment only clears dirty state for the matching revision. Import, close and export protect unsaved changes. Settings changes do not mutate an active export snapshot. Manual save and pre-export save use one revision-bound, guarded three-file transaction; export snapshots the revised subtitle, project and page plan.

## Window lifecycle

`desktop/AppLifecycle/SingleInstanceManager.cs` coordinates a per-user mutex and activation pipe. `desktop/AppLifecycle/TrayIconManager.cs` uses Windows Forms `NotifyIcon`; the main window and tray menu are WPF. Minimizing keeps the native WPF taskbar button and WebView2 state; clicking the taskbar button restores the window. The WinForms notification-area icon and its Open action remain available. Closing during export follows the cancellation/shutdown contract.

## Export

One active export at a time. WPF owns the task, Node process tree, task cache and atomic final-output commit; React shows a cancellable progress notice. The CLI uses a separate per-invocation cache job and does **not** automatically select media. See [export lifecycle](EXPORT_LIFECYCLE.md) and [data model](DATA_MODEL.md).
