# Development and verification

## Windows build

Run these commands on the already selected development branch; do not switch branches during verification.

```powershell
git status --short
git pull --ff-only
npm.cmd ci
npm.cmd run verify
dotnet run --project tests/dotnet-revise-storage/ReviseStorage.Tests.csproj -c Release
dotnet run --project tests/UniqueOutputCommit.Tests/UniqueOutputCommit.Tests.csproj -c Release
dotnet publish desktop/ScriptToVideo.csproj -c Release -o dist/wpf
.\dist\wpf\ScriptToVideo.exe
```

The current desktop `.csproj` already enables framework-dependent, win-x64 single-file publishing (`SelfContained=false`, `PublishSingleFile=true`); the publish command above uses these defaults. This does not bundle the required .NET Desktop Runtime or WebView2 Runtime.

The desktop project automatically runs `npm run build` before selecting the bundled WebView2 UI files for every .NET build/publish. This prevents `dotnet publish` from embedding stale `dist/` JavaScript. It requires an installed Node/npm toolchain and dependencies (`npm ci` once per checkout); do not disable the `BuildEmbeddedWebUi` target when releasing.

The host requires .NET Desktop Runtime 10 and WebView2 Runtime; Node.js 22+ and npm are required for MP4 export. The app does not install these system prerequisites. Remotion browser/npm dependencies may be prepared with user consent.

## Automated checks

`npm.cmd run verify` performs TypeScript checking, Vite build, Node tests and Python paragraph-Skill tests. The separate .NET storage runner checks creation, unconditional overwrite and per-file atomic replacement.

## Windows manual acceptance

- Import MP4/MKV/M4A/MP3/WAV, verify exact priority and fallback after initial decode failures; reject unsupported extensions.
- Verify cancel/reimport races and all-candidates-failed preserve the previous project, preview and unsaved changes.
- Edit words and paragraph breaks, save/reopen and compare `.script.revise.json`, `.txt` and presentation-only `.project.json`; verify output MP4 audio, dimensions, playback, seeking and synchronization.
- Verify project v3 filename matching, automatic replacement of mismatched project, and optional revise without import-time writes.
- Verify taskbar icon remains on minimization, taskbar and tray restore, single-instance activation, settings persistence, dialog cancellation, and close-during-export behavior.
- Verify title editing (empty placeholder `title`, adaptive height), first-page-only title rendering, bold and color persistence, and export with the Settings button disabled. Test overwide single-character titles: preview should display an error, exporting should be blocked, and reducing the font size should restore preview.
- Verify export cancellation terminates only its child process tree; failed output commit does not destroy the previous MP4.
- Confirm preview does not blank or flicker during editing, saving, importing or exporting.

Work on the active feature branch. Use English descriptive commit messages, run checks, open a Draft PR if useful, and merge only after Windows acceptance and the final review. Do not merge as a side effect of documentation updates.

## Documentation maintenance

`README.md` is the entry point; `DATA_MODEL.md` defines current file contracts; `ARCHITECTURE.md` documents boundaries; `EXPORT_LIFECYCLE.md` defines safe export behavior. Keep Skills and their references intact. Historical implementation plans and superseded milestone notes are recoverable from Git history rather than maintained as live specifications.
