# ScriptToVideo

Windows desktop editor for English word-timed reading videos. Built with .NET 10 WPF, WebView2, React/TypeScript and Remotion.

## Import and edit

Import only `<stem>.script.json` (ScriptToVideo v2, English). The desktop app looks in the same folder for matching media, case-insensitively, in this order:

`.mp4` → `.mkv` → `.m4a` → `.mp3` → `.wav`

Missing or initially undecodable candidates are skipped. The first successfully decoded candidate is used. If all fail, the existing project and preview remain unchanged. No recursive search, automatic transcoding or fallback after a later playback failure. MKV playback depends on WebView2 codec support.

Edit the title, word display, visibility and paragraph boundaries without rewriting the original transcript. Save derives the revised subtitle and matching plain text; export H.264/AAC MP4 from a frozen snapshot.

## Files

For `lesson01.script.json`, the working directory contains `lesson01/lesson01.script.revise.json` (editable word/title content, v3), `lesson01/lesson01.txt` (derived plain text), and `lesson01/lesson01.project.json` (presentation settings, v3). MP4 output goes to `lesson01/lesson01.exported.mp4` or the next available numbered name; temporary render files are under `lesson01/cache/`. The original JSON and media remain untouched. This is a breaking change: existing project v2 files and old `.script.refined.json` working files are **not migrated**. Only source subtitle v2 and current project/revise v3 files are accepted. Current-version three-file save journals remain recoverable.

## Build on Windows (PowerShell)

```powershell
npm.cmd ci
npm.cmd run verify
dotnet publish desktop/ScriptToVideo.csproj -c Release -o dist/wpf
.\dist\wpf\ScriptToVideo.exe
```

.NET Desktop Runtime 10 and WebView2 Runtime are required. Node.js 22+ and npm are needed for MP4 export. Export may request permission to prepare npm packages and Remotion's rendering browser. The app does not silently install system prerequisites.

CLI export takes an **explicit** media path (no discovery or fallback):

```powershell
npm.cmd run export -- --media "video/lesson01.m4a" --source-json "video/lesson01.script.json" --json "video/lesson01/lesson01.script.revise.json" --project "video/lesson01/lesson01.project.json" --out "video/lesson01/lesson01.exported.mp4"
```

## Documentation

- [Data contract and output paths](docs/DATA_MODEL.md)
- [Architecture and lifecycle](docs/ARCHITECTURE.md)
- [Build, tests and Windows acceptance](docs/DEVELOPMENT.md)
- [Export cancellation and safe replacement](docs/EXPORT_LIFECYCLE.md)
- [Paragraph-generation Skill](docs/skills/script-to-video-paragraphs/SKILL.md)
- [Code-review Skill](docs/skills/script-to-video-code-review/SKILL.md)
- [M6.17 historical release and acceptance](M6.17_RELEASE_NOTES.md)

The current working branch implements M6.22; historical milestone notes may describe superseded behavior.

Commit messages must be in English and describe the actual change.
