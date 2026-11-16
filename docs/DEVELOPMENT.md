# Development and verification

## Windows build

```powershell
git switch feature/m6-22-refined-data
git pull --ff-only origin feature/m6-22-refined-data
npm.cmd ci
npm.cmd run verify
dotnet publish desktop/ScriptToVideo.csproj -c Release -o dist/wpf
.\dist\wpf\ScriptToVideo.exe
```

For a framework-dependent single-file release, use:

```powershell
dotnet publish desktop/ScriptToVideo.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o dist/wpf
```

The host requires .NET Desktop Runtime 10 and WebView2 Runtime; Node.js 22+ and npm are required for MP4 export. The app does not install these system prerequisites. Remotion browser/npm dependencies may be prepared with user consent.

## Automated checks

`npm.cmd run verify` performs TypeScript checking, Vite build, Node tests and Python paragraph-Skill tests. Do not claim WPF runtime, codec support or actual MP4 output were verified by these checks alone.

## Windows manual acceptance

- Import MP4/MKV/M4A/MP3/WAV, verify exact priority and fallback after initial decode failures; reject unsupported extensions.
- Verify cancel/reimport races and all-candidates-failed preserve the previous project, preview and unsaved changes.
- Edit words and paragraph breaks, save/reopen and compare `.script.revise.json`, `.txt` and presentation-only `.project.json`; verify output MP4 audio, dimensions, playback, seeking and synchronization.
- Verify taskbar icon remains on minimization, taskbar and tray restore, single-instance activation, settings persistence, dialog cancellation, and close-during-export behavior.
- Verify title editing (empty placeholder `title`, adaptive height), first-page-only title rendering, bold and color persistence, and export with the Settings button disabled.
- Verify export cancellation terminates only its child process tree; failed output commit does not destroy the previous MP4.
- Confirm preview does not blank or flicker during editing, saving, importing or exporting.

Work on the active feature branch. Use English descriptive commit messages, run checks, open a Draft PR if useful, and merge only after Windows acceptance and the final review. Do not merge as a side effect of documentation updates.

## Documentation maintenance

`README.md` is the entry point; `DATA_MODEL.md` defines current file contracts; `ARCHITECTURE.md` documents boundaries; `EXPORT_LIFECYCLE.md` defines safe export behavior. Keep Skills and their references intact. Historical implementation plans and superseded milestone notes are recoverable from Git history rather than maintained as live specifications.
