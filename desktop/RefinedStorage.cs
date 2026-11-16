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
