# ScriptToVideo — 开发交接（Handoff）

> **下次继续开发时先读本文。** 本文是开发状态快照和工作入口，不替代现行规范。遇到冲突，以当前 `main` 的实际代码及 [DATA_MODEL.md](DATA_MODEL.md)、[ARCHITECTURE.md](ARCHITECTURE.md)、[EXPORT_LIFECYCLE.md](EXPORT_LIFECYCLE.md)、[DEVELOPMENT.md](DEVELOPMENT.md) 为准。
>
> **交接日期：2026-11-17**。代码基线：`de620a9a2fc801bd84215585969dfc9e2f49b516`（PR #14 合并提交）；本文为其后的纯文档交接，不代表此后代码不会变化。

## 1. 项目与当前状态

- 仓库：[chenjing2000/scripttovideo](https://github.com/chenjing2000/scripttovideo)，本地通常为 `C:\Projects\ScriptToVideo`。
- 用途：Windows 英语逐词时间轴阅读视频编辑器，支持字幕编辑、预览、同步高亮、视频导出。
- 栈：.NET 10 WPF + WebView2（桌面宿主）、React 19 / TypeScript / Vite（编辑器）、共享 `src/core/`（数据与分页）、Remotion（MP4 渲染）、Node.js CLI。
- **六批审查和精简已全部合并：A、B、C、D、E1、E2**。截至交接时，用户已确认本地 `main` 与 `origin/main` 均在 `de620a9`，`git status --short` 为空，仅保留本地 `main` 及 `origin/main` 跟踪引用；审查分支已删除。
- 目前**没有待合并的审查 PR，也没有已批准而尚未实施的代码修改**。不要自动启动下一轮无目标精简。

## 2. 本轮完成工作与合并记录

| 批次 | PR | 结果 |
| --- | --- | --- |
| A | [#9](https://github.com/chenjing2000/scripttovideo/pull/9) | 清理构建脚本、CI 和文档 |
| B | [#10](https://github.com/chenjing2000/scripttovideo/pull/10) | 删除废弃连续滚动算法及相应引用 |
| C | [#11](https://github.com/chenjing2000/scripttovideo/pull/11) | 对齐 Core 与 CLI 的 v3 数据校验 |
| D | [#12](https://github.com/chenjing2000/scripttovideo/pull/12) | 修复 CLI 跨文件系统输出：EXDEV 后同卷私有暂存并独占发布，防覆盖 |
| E1 | [#13](https://github.com/chenjing2000/scripttovideo/pull/13) | 删除未读取的 `Word.sourceDisplay` / `sourceBreakParagraph`；`createProject()` 只保留字幕名参数；同步相关测试 |
| E2 | [#14](https://github.com/chenjing2000/scripttovideo/pull/14) | 删除 `desktop/M1Capture.cs`、M1 环境变量截图入口和专用 `render.log`；净删除 88 行 |

最新代码合并为 `de620a9`（PR #14）。E2 **没有**改变正常导出进程、进度回调、取消、MP4 验证和安全提交。

## 3. 不可随意改变的数据与行为契约

### 数据文件与目录

仅支持 ScriptToVideo **v3**，原始字幕文件为 `<stem>.script.json`；原始 JSON 和原始音视频不可修改。目录示例：

```text
lesson.script.json                  # 原始 v3，必需，保持只读
lesson.mp4                          # 同名媒体（也可为受支持的其他后缀）
lesson/
  lesson.script.revise.json         # 可选；保存后的 v3 编辑稿
  lesson.txt                        # 根据当前标题和可见单词生成
  lesson.project.json               # v3 展示设置，引用原字幕文件名
  cache/                            # 可清理的临时文件
  lesson.exported.mp4               # 最终输出；已有同名则使用 (1)、(2)……
```

- 原始与 revise 都必须是 v3；`title` 必须为字符串，`language='en'`。段落标记只能在 `segments[].words[].breakParagraph: true`；时间锚点、词数和段结构必须符合现行契约。不得重新引入 v2、旧 override 或自动迁移。
- 导入时优先读取可用的 revise；缺少 revise 不妨碍导入。TXT 不是导入前置条件。
- Project v3 只保存展示信息和 `script.filename`；若已有项目无效或引用其他字幕，现行行为是使用当前默认项目**原子替换**，不提示。缺失项目则等保存时创建。
- `Ctrl+S` 每次生成 revise、TXT、project 三件文件；每个文件单独原子替换，**不是三个文件整体事务**。编辑中未提交的草稿、已提交修订和已保存修订有不同状态；过期保存回执不得清除未保存标记。
- `minScrollDuration` 是已废弃滚动算法留下的无业务作用字段，但现存 Project v3 可能包含它。**E2 明确决定保留类型、默认值和 Core/CLI 校验**，不为删除几个字段而引入新迁移层或破坏已有项目。除非有新需求及兼容论证，不要修改。
- 旧版 Project 的 `mediaKind` 可以被读取后忽略，保存时不保留；真正的媒体模式由实际选中媒体决定。

### 媒体导入与预览

- 桌面只从原始 `*.script.json` 发起导入；同目录同 stem 按 **MP4 → MKV → M4A → MP3 → WAV** 查找，依次尝试初始解码；失败不会覆盖当前媒体、预览或未保存编辑。播放过程中发生的新故障不触发下一格式回退。MKV 是否可播放取决于 WebView2 解码器。
- `ReaderCanvas` 和 Remotion 共用分页/标题布局思想及导出快照；页面切换由时间确定，不得引入依赖播放历史的状态。
- 音视频播放器、导入事务、媒体 Token、WebView2 资源生命周期及取消/回滚路径是有效保护逻辑；不要仅因状态变量多而合并或删除。
- 窗口最小化保留任务栏入口；WinForms `NotifyIcon` 用于托盘，WPF 负责主窗口和菜单；保持单实例及激活行为。

### MP4 导出与取消

- 桌面导出前先按同一修订完成三文件保存，再冻结源媒体、revise、project、page-plan 和任务路径；进行一个活动导出，WPF 负责子进程树及取消等待。
- 临时 MP4 在正式提交前进行 `ftyp` / `moov` / `mdat` **结构校验**，这不是完整解码质量检查；已有正式 MP4 不可覆盖，冲突时选择最小空闲序号。
- 进入最终提交阶段时不可取消，退出应等待提交完成；提交失败要保留可恢复的临时产物。关闭/托盘/取消导出的交互遵循 [EXPORT_LIFECYCLE.md](EXPORT_LIFECYCLE.md)。
- CLI 单独接收明确媒体文件，不进行桌面式媒体查找；其输出逻辑由 `scripts/cli-output-commit.mjs` 负责：同卷独占硬链接；跨卷 `EXDEV` 时复制完整文件到目标卷私有目录，再独占链接，不暴露半成品。
- **旧 M1 截图能力已移除**：不要恢复 `M1Capture.cs`、`SCRIPT_TO_VIDEO_M1_EVIDENCE` 或相应截图测试，除非有新的明确产品需求。

## 4. 关键代码位置

| 路径 | 职责 |
| --- | --- |
| `desktop/ReaderWindow.cs` | WPF/WebView2 宿主、导入、保存、依赖准备、导出及关闭协调 |
| `desktop/AppLifecycle/` | 单实例、托盘、日志与窗口激活 |
| `desktop/LocalMediaServer.cs` | Token 绑定媒体访问，防止读取其他本地文件 |
| `desktop/Export/` | 导出任务、进程取消、桌面 MP4 唯一文件名提交 |
| `src/main.tsx`, `src/ui/` | 编辑器、播放控制、设置、通知、脏状态和预览 |
| `src/core/` | v3 验证/修订、分页、布局、快照、媒体探测和状态转换 |
| `src/remotion/`, `scripts/export.mjs` | Remotion 渲染与 CLI 调用 |
| `scripts/script-to-video-contract.mjs` | CLI 数据准入校验；修改时须同步 Core |
| `scripts/cli-output-commit.mjs` | 跨卷安全输出提交 |
| `docs/skills/` | 字幕分段和代码审查 Skill；不要无授权改写 |

现有代码可能比较集中（尤其 `ReaderWindow.cs`、`src/main.tsx`），但其异步状态和生命周期保护有实际用途。**不要为拆分或降低代码行数而重构已验证的行为。**

## 5. Windows 验证与实际状态

截至交接，E2 审查分支 `c0e775a` 已在用户 Windows PowerShell 实机执行并通过：

| 项目 | 最近已验证结果 |
| --- | --- |
| `npm run verify` 中的 TS 类型检查和 Vite 构建 | 通过 |
| Node 测试 | **264 / 264** |
| Python paragraph Skill 测试 | **12 / 12** |
| .NET revise-storage 测试 | **5 / 5** |
| .NET UniqueOutputCommit 测试 | **10 / 10** |
| `dotnet publish desktop/ScriptToVideo.csproj -c Release -o dist/wpf` | 成功 |
| `git status --short` | 无输出 |

这批日志对应 **E2 代码提交 `c0e775a`**；随后以 Merge Commit 合并为 `de620a9`，并完成本地同步及分支清理。合并本身未引入其它代码变更。**E2 尚无独立的真实 MP4 导出/音轨播放实机记录**：自动化和编译成功不等于实际输出质量已经测试。下次有正常视频导出场景时，建议顺手检验一次真实 MP4 的画面、声音和同步。

在开发分支上运行：

```powershell
cd C:\Projects\ScriptToVideo
git status --short
git pull --ff-only
npm.cmd ci                          # 若已有正确依赖，可按需省略
npm.cmd run verify
dotnet run --project tests/dotnet-revise-storage/ReviseStorage.Tests.csproj -c Release
dotnet run --project tests/UniqueOutputCommit.Tests/UniqueOutputCommit.Tests.csproj -c Release
dotnet publish desktop/ScriptToVideo.csproj -c Release -o dist/wpf
git status --short
```

发布项目 `desktop/ScriptToVideo.csproj` 当前配置 **`SelfContained=false`、`PublishSingleFile=true`、`RuntimeIdentifier=win-x64`**，且发布前自动构建嵌入 WebView2 的 UI。不要依据过去的部署讨论推断当前构建选项；以项目文件为准。运行时仍需 .NET Desktop Runtime 10、WebView2 Runtime；MP4 导出需 Node.js 22+ / npm，并可能需要经用户确认安装 Remotion 相关依赖。

## 6. 下次开发工作流程

1. **首先阅读** `docs/HANDOFF.md`（本文）、`README.md`、相关当前规范，并用 `git status --short`、`git branch -a`、`git log -1 --oneline` 检查实际仓库状态；本文的 SHA 可能已不再是最新版本。
2. 先理解新需求和现有实现，提出最小修改方案与风险。坚持**第一性原理／如非必要勿增实体**：能删除旧规则就不增加补丁层；不为单纯代码行数而改变已正确的功能。
3. 正常功能变更使用独立审查分支，提交 **英语、描述实际变化的 Conventional Commit**；必要时 Draft PR。不要未经确认直接合并到 `main`。
4. 先做静态差异核查，再由 Windows 运行完整验证、必要的真实 UI/导出手工验收。用户确认后才将 PR 以 **Merge Commit** 合并；之后同步本地 `main` 并清理已合并的本地/远端分支。
5. 不修改原始字幕、原始媒体或用户其他未提交文件；不得擅自进行格式迁移、跨文件事务架构重做或全局无目标精简。
6. 若更改了数据契约、输出行为、测试数目或发布形式，更新对应的当前文档及本 handoff 中过时内容；具体规范优先看 [DEVELOPMENT.md](DEVELOPMENT.md)。

## 7. 已明确的后续边界

- **没有**已批准的后续重构任务；以用户下一次的具体需求为准。
- `minScrollDuration` 保留是已讨论的决定，不是漏删。
- M1 截图诊断功能已按用户批准移除，不是回归缺失。
- 不需要再延续 A–E2 的清理批次，也不必在没有具体缺陷的情况下拆分 WPF/React 主入口。
- 如需再次做审查，先依据现有代码和测试给出证据、预期收益与回归风险，再申请明确的实施范围。

---

**下一次对话建议**：请先读取 `docs/HANDOFF.md`，核实当前 `main`，然后说明希望修改的功能或具体问题；不要从旧 milestone 计划或已关闭 PR 推断还有未完成的任务。
