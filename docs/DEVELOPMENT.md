# Development and verification

## Windows build

Run these commands on the already selected development branch; do not switch branches during verification.

```powershell
git status --short
git pull --ff-only
npm.cmd ci
npm.cmd run verify
dotnet run --project tests/dotnet-refined-storage/RefinedStorageRecovery.Tests.csproj -c Release
dotnet publish desktop/ScriptToVideo.csproj -c Release -o dist/wpf
.\dist\wpf\ScriptToVideo.exe
```

For a framework-dependent single-file release, use:

```powershell
dotnet publish desktop/ScriptToVideo.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o dist/wpf
```

The host requires .NET Desktop Runtime 10 and WebView2 Runtime; Node.js 22+ and npm are required for MP4 export. The app does not install these system prerequisites. Remotion browser/npm dependencies may be prepared with user consent.

## Automated checks

`npm.cmd run verify` performs TypeScript checking, Vite build, Node tests and Python paragraph-Skill tests. The separate .NET storage runner exercises current v3 three-file save/recovery, crashes, conflicts and journal safety; run it explicitly as shown above. Do not claim WPF runtime, codec support or actual MP4 output were verified by these checks alone.

## Windows manual acceptance

- Import MP4/MKV/M4A/MP3/WAV, verify exact priority and fallback after initial decode failures; reject unsupported extensions.
- Verify cancel/reimport races and all-candidates-failed preserve the previous project, preview and unsaved changes.
- Edit words and paragraph breaks, save/reopen and compare `.script.revise.json`, `.txt` and presentation-only `.project.json`; verify output MP4 audio, dimensions, playback, seeking and synchronization.
- Verify old project v2 files are rejected and old `.script.refined.json` is never auto-renamed. Verify current v3 bundle recovery after an interrupted save.
- Verify taskbar icon remains on minimization, taskbar and tray restore, single-instance activation, settings persistence, dialog cancellation, and close-during-export behavior.
- Verify title editing (empty placeholder `title`, adaptive height), first-page-only title rendering, bold and color persistence, and export with the Settings button disabled. Test overwide single-character titles: preview should display an error, exporting should be blocked, and reducing the font size should restore preview.
- Verify export cancellation terminates only its child process tree; failed output commit does not destroy the previous MP4.
- Confirm preview does not blank or flicker during editing, saving, importing or exporting.

Work on the active feature branch. Use English descriptive commit messages, run checks, open a Draft PR if useful, and merge only after Windows acceptance and the final review. Do not merge as a side effect of documentation updates.

## Documentation maintenance

`README.md` is the entry point; `DATA_MODEL.md` defines current file contracts; `ARCHITECTURE.md` documents boundaries; `EXPORT_LIFECYCLE.md` defines safe export behavior. Keep Skills and their references intact. Historical implementation plans and superseded milestone notes are recoverable from Git history rather than maintained as live specifications.
