# ScriptToVideo

Windows desktop editor for English word-timed reading videos. Built with .NET 10 WPF, WebView2, React/TypeScript and Remotion.

## Import and edit

Import only `<stem>.script.json` (ScriptToVideo v2, English). The desktop app looks in the same folder for matching media, case-insensitively, in this order:

`.mp4` → `.mkv` → `.m4a` → `.mp3` → `.wav`

Missing or initially undecodable candidates are skipped. The first successfully decoded candidate is used. If all fail, the existing project and preview remain unchanged. No recursive search, automatic transcoding or fallback after a later playback failure. MKV playback depends on WebView2 codec support.

Edit word display, visibility and paragraph boundaries without rewriting the original transcript. Export plain text or H.264/AAC MP4.

## Files

For `lesson01.script.json`, the application stores edits in `lesson01/lesson01.project.json`, plain text in `lesson01/lesson01.article.txt`, rendered video in `lesson01/lesson01.exported.mp4`, and temporary render files in `lesson01/cache/`. The source JSON and media remain untouched. Old project/settings formats are not migrated.

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
npm.cmd run export -- --media "video/lesson01.m4a" --json "video/lesson01.script.json" --out "video/lesson01.mp4"
```

## Documentation

- [Data contract and output paths](docs/DATA_MODEL.md)
- [Architecture and lifecycle](docs/ARCHITECTURE.md)
- [Build, tests and Windows acceptance](docs/DEVELOPMENT.md)
- [Export cancellation and safe replacement](docs/EXPORT_LIFECYCLE.md)
- [Paragraph-generation Skill](docs/skills/script-to-video-paragraphs/SKILL.md)
- [Code-review Skill](docs/skills/script-to-video-code-review/SKILL.md)
- [M6.17 release and acceptance](M6.17_RELEASE_NOTES.md)

Commit messages must be in English and describe the actual change.
