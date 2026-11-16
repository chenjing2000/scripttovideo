using System;
using System.IO;
using System.Text;
using System.Text.Json;

namespace ScriptToVideo;

/// <summary>Disk-only storage primitives for M6.22. No source subtitle is ever written.</summary>
internal static class RefinedStorage
{
    internal sealed record Paths(string Folder, string Refined, string Text);

    internal static Paths Resolve(string originalSubtitle)
    {
        var full = Path.GetFullPath(originalSubtitle);
        var name = Path.GetFileName(full);
        const string suffix = ".script.json";
        if (!name.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("必须选择 .script.json 原始字幕。");
        var stem = name[..^suffix.Length];
        if (string.IsNullOrWhiteSpace(stem) || stem is "." or "..")
            throw new InvalidDataException("字幕文件名无效。");
        var folder = Path.Combine(Path.GetDirectoryName(full)!, stem);
        return new Paths(folder, Path.Combine(folder, stem + ".script.refined.json"),
            Path.Combine(folder, stem + ".txt"));
    }

    internal static string? ReadExisting(Paths paths)
    {
        if (Directory.Exists(paths.Refined))
            throw new IOException("refined 文件路径被目录占用。");
        if (!File.Exists(paths.Refined)) return null;
        var json = File.ReadAllText(paths.Refined, Encoding.UTF8);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Object ||
            !root.TryGetProperty("script_to_video", out var meta) ||
            meta.ValueKind != JsonValueKind.Object ||
            !meta.TryGetProperty("schemaVersion", out var version) ||
            version.ValueKind != JsonValueKind.Number || version.GetInt32() != 3 ||
            !root.TryGetProperty("title", out var title) ||
            title.ValueKind != JsonValueKind.String)
            throw new InvalidDataException("已有 refined 文件不是合法的 v3 字幕，已禁止覆盖。");
        return json;
    }

    /// <summary>Creates a file exclusively. Never replaces existing user content.</summary>
    internal static void CreateNew(string path, string content)
    {
        var folder = Path.GetDirectoryName(Path.GetFullPath(path))!;
        Directory.CreateDirectory(folder);
        var temp = Path.Combine(folder, "." + Path.GetFileName(path) + "." + Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write,
                FileShare.None, 4096, FileOptions.WriteThrough))
            {
                var bytes = new UTF8Encoding(false).GetBytes(content);
                stream.Write(bytes);
                stream.Flush(true);
            }
            File.Move(temp, path, overwrite: false);
        }
        finally
        {
            if (File.Exists(temp)) File.Delete(temp);
        }
    }

    /// <summary>
    /// Replace an existing derived file only when its on-disk bytes still match
    /// the snapshot opened by the editor. Never use this for original subtitles.
    /// The temporary file is flushed before the atomic same-volume replacement.
    /// </summary>
    internal static void ReplaceIfUnchanged(string path, string expectedContent, string newContent)
    {
        if (Directory.Exists(path) || !File.Exists(path))
            throw new IOException("目标文件已丢失或被目录占用，禁止覆盖。");
        var existing = File.ReadAllText(path, Encoding.UTF8);
        if (!string.Equals(existing, expectedContent, StringComparison.Ordinal))
            throw new IOException("文件已被外部修改，禁止覆盖。");
        if (string.Equals(existing, newContent, StringComparison.Ordinal)) return;

        var folder = Path.GetDirectoryName(Path.GetFullPath(path))!;
        var temp = Path.Combine(folder, "." + Path.GetFileName(path) + "." +
            Guid.NewGuid().ToString("N") + ".tmp");
        try
        {
            using (var stream = new FileStream(temp, FileMode.CreateNew, FileAccess.Write,
                FileShare.None, 4096, FileOptions.WriteThrough))
            {
                var bytes = new UTF8Encoding(false).GetBytes(newContent);
                stream.Write(bytes);
                stream.Flush(true);
            }
            // Recheck immediately before replacement. This is not an interprocess
            // lock: the caller must serialize all writes from this application.
            if (!File.Exists(path) ||
                !string.Equals(File.ReadAllText(path, Encoding.UTF8), expectedContent, StringComparison.Ordinal))
                throw new IOException("写入前检测到文件变化，禁止覆盖。");
            File.Replace(temp, path, null);
        }
        finally
        {
            if (File.Exists(temp)) File.Delete(temp);
        }
    }

    private sealed record PendingPair(string OldRefined, string NewRefined,
        string OldText, string NewText);

    private static string JournalPath(Paths paths) => paths.Refined + ".save-journal";

    internal static void EnsureNoPendingPair(Paths paths)
    {
        if (File.Exists(JournalPath(paths)) || Directory.Exists(JournalPath(paths)))
            throw new IOException("存在未完成的 refined/TXT 保存日志，禁止修改工程。");
    }

    /// <summary>
    /// Resume a previously interrupted save only when each file is exactly
    /// the old or new version in the durable journal. Never overwrite a
    /// third-party edit. Leave the journal in place on conflict.
    /// </summary>
    internal static void RecoverPendingPair(Paths paths)
    {
        var journalPath = JournalPath(paths);
        if (!File.Exists(journalPath)) return;
        var pending = JsonSerializer.Deserialize<PendingPair>(
            File.ReadAllText(journalPath, Encoding.UTF8))
            ?? throw new InvalidDataException("refined 保存日志无效。");
        if (!File.Exists(paths.Refined) || !File.Exists(paths.Text))
            throw new IOException("保存日志存在，但 refined/TXT 不完整，拒绝自动恢复。");
        var refined = File.ReadAllText(paths.Refined, Encoding.UTF8);
        var text = File.ReadAllText(paths.Text, Encoding.UTF8);
        if ((refined != pending.OldRefined && refined != pending.NewRefined) ||
            (text != pending.OldText && text != pending.NewText))
            throw new IOException("保存日志与磁盘内容冲突，拒绝自动覆盖。");
        ReplaceIfUnchanged(paths.Refined, refined, pending.NewRefined);
        ReplaceIfUnchanged(paths.Text, text, pending.NewText);
        File.Delete(journalPath);
    }

    /// <summary>
    /// Persist the authoritative refined and its derived TXT together as far as
    /// the filesystem permits. If the second replacement fails, restore refined
    /// only when its bytes still equal the version written by this operation.
    /// A process crash between replacements still requires journal recovery.
    /// </summary>
    internal static void ReplaceContentPair(Paths paths,
        string expectedRefined, string nextRefined,
        string expectedText, string nextText)
    {
        EnsureNoPendingPair(paths);
        if (!File.Exists(paths.Refined) || !File.Exists(paths.Text) ||
            Directory.Exists(paths.Refined) || Directory.Exists(paths.Text))
            throw new IOException("refined/TXT 文件不完整，禁止保存。");
        if (!string.Equals(File.ReadAllText(paths.Refined, Encoding.UTF8), expectedRefined, StringComparison.Ordinal) ||
            !string.Equals(File.ReadAllText(paths.Text, Encoding.UTF8), expectedText, StringComparison.Ordinal))
            throw new IOException("refined/TXT 已被外部修改，禁止保存。");

        // The journal is created exclusively before either file is changed.
        // On failure it remains available for a later guarded recovery.
        var journalPath = JournalPath(paths);
        CreateNew(journalPath, JsonSerializer.Serialize(new PendingPair(
            expectedRefined, nextRefined, expectedText, nextText)));
        ReplaceIfUnchanged(paths.Refined, expectedRefined, nextRefined);
        ReplaceIfUnchanged(paths.Text, expectedText, nextText);
        File.Delete(journalPath);
    }

    /// <summary>Repair only a missing TXT. Never replace an existing file, even if
    /// its content differs; reconciliation requires a separate explicit operation.</summary>
    internal static bool CreateMissingText(Paths paths, string text)
    {
        if (!File.Exists(paths.Refined) || Directory.Exists(paths.Refined))
            throw new InvalidOperationException("没有有效的 refined 文件，不能恢复 TXT。");
        if (Directory.Exists(paths.Text))
            throw new IOException("TXT 路径被目录占用，禁止覆盖。");
        if (File.Exists(paths.Text)) return false;
        CreateNew(paths.Text, text);
        return true;
    }

    /// <summary>First creation: never overwrite refined. A TXT failure leaves refined intact
    /// for recovery on reopen. Caller validates JSON and TXT before invoking this method.</summary>
    internal static void CreateInitial(Paths paths, string refinedJson, string text)
    {
        if (File.Exists(paths.Refined) || Directory.Exists(paths.Refined))
            throw new IOException("refined 已存在，禁止覆盖。");
        if (File.Exists(paths.Text) || Directory.Exists(paths.Text))
            throw new IOException("TXT 路径已存在，禁止覆盖。");
        CreateNew(paths.Refined, refinedJson);
        CreateNew(paths.Text, text);
    }
}
