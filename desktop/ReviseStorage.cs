using System;
using System.IO;
using System.Text;
using System.Text.Json;

namespace ScriptToVideo;

/// <summary>Read optional v3 revised subtitles and atomically write generated files.</summary>
internal static class ReviseStorage
{
    internal sealed record Paths(string Folder, string Revised, string Text);

    internal static Paths Resolve(string originalSubtitle)
    {
        var full=Path.GetFullPath(originalSubtitle);
        var name=Path.GetFileName(full);
        const string suffix=".script.json";
        if(!name.EndsWith(suffix,StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("必须选择 .script.json 原始字幕。");
        var stem=name[..^suffix.Length];
        if(string.IsNullOrWhiteSpace(stem)||stem is "." or "..")
            throw new InvalidDataException("字幕文件名无效。");
        var folder=Path.Combine(Path.GetDirectoryName(full)!,stem);
        return new Paths(folder,Path.Combine(folder,stem+".script.revise.json"),Path.Combine(folder,stem+".txt"));
    }

    internal static string? ReadExisting(Paths paths)
    {
        if(Directory.Exists(paths.Revised))
            throw new IOException("revise 路径被目录占用。");
        if(!File.Exists(paths.Revised))return null;
        var value=File.ReadAllText(paths.Revised,Encoding.UTF8);
        using var doc=JsonDocument.Parse(value);
        var root=doc.RootElement;
        if(root.ValueKind!=JsonValueKind.Object||
           !root.TryGetProperty("script_to_video",out var meta)||
           !meta.TryGetProperty("format",out var format)||format.GetString()!="script-to-video"||
           !meta.TryGetProperty("schemaVersion",out var version)||version.GetInt32()!=3||
           !root.TryGetProperty("title",out var title)||title.ValueKind!=JsonValueKind.String)
            throw new InvalidDataException("已有 revise 文件不是有效的 v3 字幕。");
        return value;
    }

    /// <summary>Write one complete UTF-8 file beside its destination, then atomically commit it.
    /// No stale-content check, backup, journal or compatibility branch.</summary>
    internal static void AtomicWrite(string path,string content)
    {
        var full=Path.GetFullPath(path);
        if(Directory.Exists(full))throw new IOException("目标文件路径被目录占用。");
        var folder=Path.GetDirectoryName(full)!;
        Directory.CreateDirectory(folder);
        var temp=Path.Combine(folder,"."+Path.GetFileName(full)+"."+Guid.NewGuid().ToString("N")+".tmp");
        try
        {
            using(var stream=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None,4096,FileOptions.WriteThrough))
            {
                var bytes=new UTF8Encoding(false).GetBytes(content);
                stream.Write(bytes);
                stream.Flush(true);
            }
            if(File.Exists(full))File.Replace(temp,full,null);
            else File.Move(temp,full,overwrite:false);
        }
        finally { if(File.Exists(temp))File.Delete(temp); }
    }

    /// <summary>Ctrl+S always writes all three current files even when content is unchanged.</summary>
    internal static void Save(Paths paths,string projectPath,string revised,string text,string project)
    {
        AtomicWrite(paths.Revised,revised);
        AtomicWrite(paths.Text,text);
        AtomicWrite(projectPath,project);
    }
}
