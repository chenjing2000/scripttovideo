# Playback shortcuts

Shortcuts apply when focus is outside text fields, selects, editable content and controls. They are defined in `src/core/player-shortcuts.ts` and dispatched by `src/main.tsx`.

| 功能 | 快捷键 |
| --- | --- |
| 播放 / 暂停 | Space |
| 停止并回到开头 | X |
| 下一帧 / 上一帧 | F / D |
| 快进 / 快退 10 秒 | → / ← |
| 快进 / 快退 30 秒 | Ctrl+→ / Ctrl+← |
| 恢复正常速度 | Z |
| 增加 / 减少音量 | ↑ / ↓ |
| 静音 / 取消静音 | M |
| 导入 `<stem>.script.json` | Ctrl+O |
| 保存工程 | Ctrl+S |

Frame stepping pauses playback; frame duration uses the project's export FPS (default 30). Seeking is clamped to the media duration. The on-screen volume slider was removed; volume/mute shortcuts remain.
